/**
 * Domain Event System
 * Allows publishing and subscribing to events throughout the application
 */

import { logger } from '../logger';

export type EventHandler<T = any> = (event: T) => Promise<void> | void;

export interface DomainEvent {
  type: string;
  timestamp: string;
  data: unknown;
}

// Specific event types
export interface TierChangedEvent extends DomainEvent {
  type: 'tier.changed';
  data: {
    memberId: string;
    communityId: string;
    fromTierId: string | null;
    toTierId: string | null;
    fromTierName: string | null;
    toTierName: string | null;
    reason: string;
    triggeredBy?: string;
  };
}

export interface ApplicationSubmittedEvent extends DomainEvent {
  type: 'application.submitted';
  data: {
    applicationId: string;
    memberId: string;
    communityId: string;
    targetTierId: string;
    targetTierName: string;
  };
}

export interface ApplicationReviewedEvent extends DomainEvent {
  type: 'application.reviewed';
  data: {
    applicationId: string;
    memberId: string;
    communityId: string;
    targetTierId: string;
    status: 'approved' | 'rejected';
    reviewedBy: string;
  };
}

export interface MemberEvaluatedEvent extends DomainEvent {
  type: 'member.evaluated';
  data: {
    memberId: string;
    communityId: string;
    tierId: string | null;
    tierName: string | null;
  };
}

export interface ActivityLoggedEvent extends DomainEvent {
  type: 'activity.logged';
  data: {
    activityId: string;
    memberId: string;
    communityId: string;
    activityType: string;
    points?: number;
  };
}

export type KnownDomainEvent =
  | TierChangedEvent
  | ApplicationSubmittedEvent
  | ApplicationReviewedEvent
  | MemberEvaluatedEvent
  | ActivityLoggedEvent;

class EventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map();

  /**
   * Subscribe to an event type
   */
  on(eventType: string, handler: EventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }

    this.handlers.get(eventType)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.handlers.get(eventType)?.delete(handler);
    };
  }

  /**
   * Subscribe to all events
   */
  onAll(handler: EventHandler<DomainEvent>): () => void {
    return this.on('*', handler);
  }

  /**
   * Publish an event
   */
  async emit(event: KnownDomainEvent | DomainEvent): Promise<void> {
    logger.debug('Event emitted', { type: event.type, data: event.data });

    // Call specific handlers
    const handlers = this.handlers.get(event.type) || new Set();
    const allHandlers = this.handlers.get('*') || new Set();

    const allHandlersToCall = [...handlers, ...allHandlers];

    for (const handler of allHandlersToCall) {
      try {
        await handler(event);
      } catch (error) {
        logger.error(`Error in event handler for ${event.type}`, error);
      }
    }
  }

  /**
   * Clear all handlers (useful for testing)
   */
  clear(): void {
    this.handlers.clear();
  }

  /**
   * Get handler count for an event type
   */
  getHandlerCount(eventType: string): number {
    return this.handlers.get(eventType)?.size || 0;
  }
}

export const eventBus = new EventBus();

// Helper function to create events
export function createEvent<T extends DomainEvent>(
  type: T['type'],
  data: T['data']
): T {
  return {
    type,
    data,
    timestamp: new Date().toISOString(),
  } as T;
}
