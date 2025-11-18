import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * DELETE /api/rules/:id
 * Delete an eligibility rule
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.tierEligibilityRule.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting rule:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/rules/:id
 * Update an eligibility rule
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    const rule = await prisma.tierEligibilityRule.update({
      where: { id: params.id },
      data: {
        configJson: body.configJson,
      },
    });

    return NextResponse.json(rule);
  } catch (error) {
    console.error('Error updating rule:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
