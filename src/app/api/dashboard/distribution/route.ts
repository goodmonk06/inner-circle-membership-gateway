import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TierDistribution } from '@/types';

/**
 * GET /api/dashboard/distribution
 * Get tier distribution statistics for a community
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const communityId = searchParams.get('communityId');

    if (!communityId) {
      return NextResponse.json(
        { error: 'communityId query parameter is required' },
        { status: 400 }
      );
    }

    // Get all tiers for the community
    const tiers = await prisma.membershipTier.findMany({
      where: { communityId },
      include: {
        _count: {
          select: { memberStatuses: true },
        },
      },
      orderBy: { priority: 'desc' },
    });

    // Get total member count
    const totalMembers = await prisma.memberTierStatus.count({
      where: { communityId },
    });

    // Get unassigned count (members with null tier)
    const unassignedCount = await prisma.memberTierStatus.count({
      where: {
        communityId,
        currentTierId: null,
      },
    });

    // Build tier counts
    const tierCounts = tiers.map((tier) => ({
      tierId: tier.id,
      tierName: tier.name,
      tierKey: tier.key,
      priority: tier.priority,
      count: tier._count.memberStatuses,
      percentage: totalMembers > 0
        ? Math.round((tier._count.memberStatuses / totalMembers) * 100)
        : 0,
    }));

    const distribution: TierDistribution = {
      communityId,
      totalMembers,
      tierCounts,
      unassignedCount,
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(distribution);
  } catch (error) {
    console.error('Error fetching tier distribution:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
