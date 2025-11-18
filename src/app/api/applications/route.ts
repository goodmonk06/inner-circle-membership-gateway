import { NextRequest } from 'next/server';
import { applicationService } from '@/lib/services/application.service';
import { apiHandler, validateBody, createdResponse, successResponse } from '@/lib/api/helpers';
import { createApplicationSchema } from '@/lib/validation/schemas';

/**
 * POST /api/applications
 * Submit a new tier application
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const body = await validateBody(request, createApplicationSchema);

  const application = await applicationService.submitApplication({
    memberId: body.memberId,
    communityId: body.communityId,
    targetTierId: body.targetTierId,
    reason: body.reason,
    metadata: body.metadata,
  });

  return createdResponse(application);
});

/**
 * GET /api/applications
 * Get applications (filtered by query params)
 */
export const GET = apiHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const communityId = searchParams.get('communityId');
  const memberId = searchParams.get('memberId');
  const status = searchParams.get('status');

  if (!communityId) {
    throw new Error('communityId is required');
  }

  if (status === 'pending') {
    const applications = await applicationService.getPendingApplications(communityId);
    return successResponse(applications);
  }

  if (memberId) {
    const applications = await applicationService.getMemberApplications(memberId, communityId);
    return successResponse(applications);
  }

  // Default: return pending applications
  const applications = await applicationService.getPendingApplications(communityId);
  return successResponse(applications);
});
