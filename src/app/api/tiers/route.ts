import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CreateTierInput } from '@/types';

/**
 * GET /api/tiers
 * List all tiers for a community
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

    const tiers = await prisma.membershipTier.findMany({
      where: { communityId },
      include: {
        eligibilityRules: true,
        _count: {
          select: { memberStatuses: true },
        },
      },
      orderBy: { priority: 'desc' },
    });

    return NextResponse.json(tiers);
  } catch (error) {
    console.error('Error fetching tiers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tiers
 * Create a new membership tier
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateTierInput = await request.json();

    // Validate required fields
    if (!body.communityId || !body.key || !body.name || body.priority === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: communityId, key, name, priority' },
        { status: 400 }
      );
    }

    // Check if key already exists in this community
    const existing = await prisma.membershipTier.findUnique({
      where: {
        communityId_key: {
          communityId: body.communityId,
          key: body.key,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A tier with this key already exists in this community' },
        { status: 409 }
      );
    }

    const tier = await prisma.membershipTier.create({
      data: {
        communityId: body.communityId,
        key: body.key,
        name: body.name,
        descriptionMarkdown: body.descriptionMarkdown || null,
        priority: body.priority,
      },
    });

    return NextResponse.json(tier, { status: 201 });
  } catch (error) {
    console.error('Error creating tier:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
