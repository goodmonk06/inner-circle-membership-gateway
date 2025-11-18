import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TierStatusResponse } from '@/types';

/**
 * GET /api/members/:id/tier-status
 * Retrieve the current tier status for a member
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const memberId = params.id;
    const { searchParams } = new URL(request.url);
    const communityId = searchParams.get('communityId');

    if (!communityId) {
      return NextResponse.json(
        { error: 'communityId query parameter is required' },
        { status: 400 }
      );
    }

    // Fetch member tier status
    const memberStatus = await prisma.memberTierStatus.findUnique({
      where: {
        memberId_communityId: {
          memberId,
          communityId,
        },
      },
      include: {
        currentTier: true,
      },
    });

    if (!memberStatus) {
      return NextResponse.json(
        { error: 'Member tier status not found. Has the member been evaluated?' },
        { status: 404 }
      );
    }

    const response: TierStatusResponse = {
      memberId: memberStatus.memberId,
      communityId: memberStatus.communityId,
      currentTier: memberStatus.currentTier
        ? {
            id: memberStatus.currentTier.id,
            key: memberStatus.currentTier.key,
            name: memberStatus.currentTier.name,
            priority: memberStatus.currentTier.priority,
            descriptionMarkdown: memberStatus.currentTier.descriptionMarkdown,
          }
        : null,
      evaluatedAt: memberStatus.evaluatedAt.toISOString(),
      evaluationDetail: memberStatus.evaluationDetailJson as any,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching tier status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
