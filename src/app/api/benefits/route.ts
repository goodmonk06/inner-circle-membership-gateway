import { NextRequest } from 'next/server';
import { benefitService } from '@/lib/services/benefit.service';
import { apiHandler, validateBody, createdResponse, successResponse } from '@/lib/api/helpers';
import { createBenefitSchema } from '@/lib/validation/schemas';

/**
 * POST /api/benefits
 * Create a new benefit for a tier
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const body = await validateBody(request, createBenefitSchema);

  const benefit = await benefitService.createBenefit({
    tierId: body.tierId,
    key: body.key,
    name: body.name,
    description: body.description,
    benefitType: body.benefitType,
    configJson: body.configJson,
  });

  return createdResponse(benefit);
});

/**
 * GET /api/benefits
 * Get benefits (by tier or member)
 */
export const GET = apiHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const tierId = searchParams.get('tierId');
  const memberId = searchParams.get('memberId');
  const communityId = searchParams.get('communityId');

  if (tierId) {
    const benefits = await benefitService.getTierBenefits(tierId);
    return successResponse(benefits);
  }

  if (memberId && communityId) {
    const benefits = await benefitService.getMemberBenefits(memberId, communityId);
    return successResponse(benefits);
  }

  throw new Error('Either tierId or (memberId + communityId) is required');
});
