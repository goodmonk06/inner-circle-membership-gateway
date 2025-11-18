/**
 * Webhook Dispatcher
 * Sends domain events to registered webhooks
 */

import { prisma } from '../prisma';
import { DomainEvent, eventBus } from '../events';
import { logger } from '../logger';
import { metrics, METRICS } from '../metrics';
import crypto from 'crypto';

export class WebhookDispatcher {
  /**
   * Initialize webhook dispatching
   * Sets up event listeners for all webhook-eligible events
   */
  init(): void {
    eventBus.onAll(async (event: DomainEvent) => {
      await this.dispatch(event);
    });

    logger.info('Webhook dispatcher initialized');
  }

  /**
   * Dispatch an event to all matching webhooks
   */
  private async dispatch(event: DomainEvent): Promise<void> {
    // Extract communityId from event data
    const communityId = this.extractCommunityId(event);
    if (!communityId) {
      return; // Can't dispatch without knowing which community
    }

    // Find all active webhooks for this community that listen to this event type
    const webhooks = await prisma.webhook.findMany({
      where: {
        communityId,
        active: true,
        events: {
          has: event.type,
        },
      },
    });

    if (webhooks.length === 0) {
      return;
    }

    logger.debug('Dispatching event to webhooks', {
      eventType: event.type,
      communityId,
      webhookCount: webhooks.length,
    });

    // Send to each webhook
    for (const webhook of webhooks) {
      try {
        await this.sendWebhook(webhook.id, webhook.url, webhook.secret || undefined, event);

        await prisma.webhook.update({
          where: { id: webhook.id },
          data: {
            successCount: { increment: 1 },
            lastTriggeredAt: new Date(),
          },
        });

        metrics.incrementCounter(METRICS.WEBHOOK_SENT, {
          communityId,
          eventType: event.type,
          status: 'success',
        });
      } catch (error) {
        logger.error('Webhook dispatch failed', error, {
          webhookId: webhook.id,
          url: webhook.url,
          eventType: event.type,
        });

        await prisma.webhook.update({
          where: { id: webhook.id },
          data: {
            failureCount: { increment: 1 },
          },
        });

        metrics.incrementCounter(METRICS.WEBHOOK_SENT, {
          communityId,
          eventType: event.type,
          status: 'failure',
        });
      }
    }
  }

  /**
   * Send HTTP request to webhook URL
   */
  private async sendWebhook(
    webhookId: string,
    url: string,
    secret: string | undefined,
    event: DomainEvent
  ): Promise<void> {
    const payload = JSON.stringify(event);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'InnerCircle-Webhook/1.0',
      'X-Webhook-ID': webhookId,
      'X-Event-Type': event.type,
      'X-Event-Timestamp': event.timestamp,
    };

    // Add signature if secret is provided
    if (secret) {
      const signature = this.generateSignature(payload, secret);
      headers['X-Webhook-Signature'] = signature;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: payload,
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`Webhook returned ${response.status}: ${response.statusText}`);
    }
  }

  /**
   * Generate HMAC signature for webhook payload
   */
  private generateSignature(payload: string, secret: string): string {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    return `sha256=${hmac.digest('hex')}`;
  }

  /**
   * Extract communityId from event data
   */
  private extractCommunityId(event: DomainEvent): string | null {
    if (typeof event.data === 'object' && event.data !== null) {
      const data = event.data as Record<string, unknown>;
      if (typeof data.communityId === 'string') {
        return data.communityId;
      }
    }
    return null;
  }
}

// Singleton instance
export const webhookDispatcher = new WebhookDispatcher();

// Auto-initialize in non-test environments
if (process.env.NODE_ENV !== 'test') {
  webhookDispatcher.init();
}
