import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { UpdateTierInput } from '@/types';

/**
 * GET /api/tiers/:id
 * Get a specific tier by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tier = await prisma.membershipTier.findUnique({
      where: { id: params.id },
      include: {
        eligibilityRules: true,
        _count: {
          select: { memberStatuses: true },
        },
      },
    });

    if (!tier) {
      return NextResponse.json(
        { error: 'Tier not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(tier);
  } catch (error) {
    console.error('Error fetching tier:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tiers/:id
 * Update a tier
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body: UpdateTierInput = await request.json();

    const tier = await prisma.membershipTier.update({
      where: { id: params.id },
      data: {
        name: body.name,
        descriptionMarkdown: body.descriptionMarkdown,
        priority: body.priority,
      },
    });

    return NextResponse.json(tier);
  } catch (error) {
    console.error('Error updating tier:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tiers/:id
 * Delete a tier
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.membershipTier.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting tier:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
