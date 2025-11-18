import { NextRequest } from 'next/server';
import { tierEvaluator } from '@/lib/evaluation/tier-evaluator';
import { ReEvaluateResponse } from '@/types';
import { prisma } from '@/lib/prisma';
import { apiHandler, validateBody, successResponse, getParams } from '@/lib/api/helpers';
import { reEvaluateMemberSchema, memberIdSchema } from '@/lib/validation/schemas';
import { RateLimitError } from '@/lib/errors';
import { metrics, METRICS } from '@/lib/metrics';

/**
 * POST /api/re-evaluate/:memberId
 * Re-evaluate a member's tier eligibility
 */
export const POST = apiHandler(async (request: NextRequest, context: any) => {
  const params = await context.params;
  const { memberId } = validateParams(params, { memberId: memberIdSchema });
  const body = await validateBody(request, reEvaluateMemberSchema);

  // Get previous tier status
  const previousStatus = await prisma.memberTierStatus.findUnique({
    where: {
      memberId_communityId: {
        memberId,
        communityId: body.communityId,
      },
    },
  });

  const previousTierId = previousStatus?.currentTierId || null;

  // Check if recently evaluated (unless force is true)
  if (!body.force && previousStatus) {
    const timeSinceLastEval = Date.now() - previousStatus.evaluatedAt.getTime();
    const fiveMinutes = 5 * 60 * 1000;

    if (timeSinceLastEval < fiveMinutes) {
      throw new RateLimitError(
        `Member was evaluated recently at ${previousStatus.evaluatedAt.toISOString()}. Set force=true to re-evaluate anyway.`
      );
    }
  }

  // Perform evaluation with metrics
  const newStatus = await metrics.time(
    METRICS.TIER_EVALUATION,
    () => tierEvaluator.evaluateAndSaveMemberTier(memberId, body.communityId),
    { communityId: body.communityId }
  );

  // Track tier changes
  if (previousTierId !== newStatus.currentTierId) {
    metrics.incrementCounter(METRICS.TIER_CHANGED, {
      communityId: body.communityId,
      from: previousTierId || 'none',
      to: newStatus.currentTierId || 'none',
    });
  }

  const response: ReEvaluateResponse = {
    memberId,
    previousTierId,
    newTierId: newStatus.currentTierId,
    tierChanged: previousTierId !== newStatus.currentTierId,
    evaluationDetail: newStatus.evaluationDetailJson as any,
  };

  return successResponse(response);
});

function validateParams(params: Record<string, string>, schema: { memberId: any }) {
  return { memberId: schema.memberId.parse(params.memberId) };
}
