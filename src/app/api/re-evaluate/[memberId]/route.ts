import { NextRequest, NextResponse } from 'next/server';
import { tierEvaluator } from '@/lib/evaluation/tier-evaluator';
import { ReEvaluateRequest, ReEvaluateResponse } from '@/types';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/re-evaluate/:memberId
 * Re-evaluate a member's tier eligibility
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { memberId: string } }
) {
  try {
    const memberId = params.memberId;
    const body: ReEvaluateRequest = await request.json();

    if (!body.communityId) {
      return NextResponse.json(
        { error: 'communityId is required in request body' },
        { status: 400 }
      );
    }

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
        return NextResponse.json(
          {
            error: 'Member was evaluated recently. Set force=true to re-evaluate anyway.',
            lastEvaluatedAt: previousStatus.evaluatedAt.toISOString(),
          },
          { status: 429 }
        );
      }
    }

    // Perform evaluation
    const newStatus = await tierEvaluator.evaluateAndSaveMemberTier(
      memberId,
      body.communityId
    );

    const response: ReEvaluateResponse = {
      memberId,
      previousTierId,
      newTierId: newStatus.currentTierId,
      tierChanged: previousTierId !== newStatus.currentTierId,
      evaluationDetail: newStatus.evaluationDetailJson as any,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error re-evaluating member:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
