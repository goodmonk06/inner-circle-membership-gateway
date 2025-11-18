import { NextRequest } from 'next/server';
import { benefitService } from '@/lib/services/benefit.service';
import { apiHandler, successResponse } from '@/lib/api/helpers';

/**
 * GET /api/benefits/:id/check
 * Check if a member has access to a specific benefit by key
 * Query params: memberId, communityId, benefitKey
 */
export const GET = apiHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get('memberId');
  const communityId = searchParams.get('communityId');
  const benefitKey = searchParams.get('benefitKey');

  if (!memberId || !communityId || !benefitKey) {
    throw new Error('memberId, communityId, and benefitKey are required');
  }

  const result = await benefitService.checkBenefitAccess(memberId, communityId, benefitKey);

  return successResponse(result);
});
