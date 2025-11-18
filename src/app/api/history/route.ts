import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiHandler, successResponse } from '@/lib/api/helpers';

/**
 * GET /api/history
 * Get tier change history
 * Query params: memberId, communityId, limit, offset
 */
export const GET = apiHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get('memberId');
  const communityId = searchParams.get('communityId');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  const where: any = {};
  if (memberId) where.memberId = memberId;
  if (communityId) where.communityId = communityId;

  const history = await prisma.tierHistory.findMany({
    where,
    include: {
      fromTier: true,
      toTier: true,
    },
    orderBy: {
      changedAt: 'desc',
    },
    take: limit,
    skip: offset,
  });

  return successResponse(history);
});
