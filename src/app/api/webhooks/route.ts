import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiHandler, validateBody, createdResponse, successResponse } from '@/lib/api/helpers';
import { createWebhookSchema } from '@/lib/validation/schemas';

/**
 * POST /api/webhooks
 * Create a new webhook
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const body = await validateBody(request, createWebhookSchema);

  const webhook = await prisma.webhook.create({
    data: {
      communityId: body.communityId,
      url: body.url,
      events: body.events,
      secret: body.secret,
      active: body.active ?? true,
    },
  });

  return createdResponse(webhook);
});

/**
 * GET /api/webhooks
 * List webhooks for a community
 */
export const GET = apiHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const communityId = searchParams.get('communityId');

  if (!communityId) {
    throw new Error('communityId is required');
  }

  const webhooks = await prisma.webhook.findMany({
    where: { communityId },
    orderBy: { createdAt: 'desc' },
  });

  return successResponse(webhooks);
});
