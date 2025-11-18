import { NextRequest } from 'next/server';
import { applicationService } from '@/lib/services/application.service';
import { apiHandler, validateBody, successResponse } from '@/lib/api/helpers';
import { reviewApplicationSchema } from '@/lib/validation/schemas';

/**
 * POST /api/applications/:id/review
 * Review an application (approve or reject)
 */
export const POST = apiHandler(async (request: NextRequest, context: any) => {
  const params = await context.params;
  const body = await validateBody(request, reviewApplicationSchema);

  const application = await applicationService.reviewApplication({
    applicationId: params.id,
    reviewerId: body.reviewerId,
    status: body.status,
    reviewNote: body.reviewNote,
  });

  return successResponse(application);
});
