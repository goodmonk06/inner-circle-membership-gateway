import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CreateRuleInput } from '@/types';

/**
 * POST /api/rules
 * Create a new eligibility rule for a tier
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateRuleInput = await request.json();

    // Validate required fields
    if (!body.tierId || !body.ruleType || !body.configJson) {
      return NextResponse.json(
        { error: 'Missing required fields: tierId, ruleType, configJson' },
        { status: 400 }
      );
    }

    // Verify tier exists
    const tier = await prisma.membershipTier.findUnique({
      where: { id: body.tierId },
    });

    if (!tier) {
      return NextResponse.json(
        { error: 'Tier not found' },
        { status: 404 }
      );
    }

    const rule = await prisma.tierEligibilityRule.create({
      data: {
        tierId: body.tierId,
        ruleType: body.ruleType,
        configJson: body.configJson as any,
      },
    });

    return NextResponse.json(rule, { status: 201 });
  } catch (error) {
    console.error('Error creating rule:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
