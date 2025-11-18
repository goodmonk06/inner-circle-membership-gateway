import { NextRequest } from 'next/server';
import { activityService } from '@/lib/services/activity.service';
import { apiHandler, validateBody, createdResponse, successResponse } from '@/lib/api/helpers';
import { logActivitySchema } from '@/lib/validation/schemas';

/**
 * POST /api/activities
 * Log a new member activity
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const body = await validateBody(request, logActivitySchema);

  const activity = await activityService.logActivity({
    memberId: body.memberId,
    communityId: body.communityId,
    activityType: body.activityType,
    points: body.points,
    metadata: body.metadata,
  });

  return createdResponse(activity);
});

/**
 * GET /api/activities
 * Get member activities or community summary
 */
export const GET = apiHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get('memberId');
  const communityId = searchParams.get('communityId');
  const activityType = searchParams.get('activityType') || undefined;
  const action = searchParams.get('action');

  if (!communityId) {
    throw new Error('communityId is required');
  }

  // Community summary
  if (action === 'summary') {
    const summary = await activityService.getCommunitySummary(communityId);
    return successResponse(summary);
  }

  // Leaderboard
  if (action === 'leaderboard') {
    const limit = parseInt(searchParams.get('limit') || '100');
    const leaderboard = await activityService.getLeaderboard(communityId, { limit });
    return successResponse(leaderboard);
  }

  // Member activities
  if (memberId) {
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const activities = await activityService.getMemberActivities(memberId, communityId, {
      activityType,
      limit,
      offset,
    });
    return successResponse(activities);
  }

  throw new Error('memberId is required for activity listing, or use action=summary or action=leaderboard');
});
