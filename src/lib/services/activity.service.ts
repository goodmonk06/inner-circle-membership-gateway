/**
 * Activity Service
 * Tracks member activities and manages activity-based scoring
 */

import { prisma } from '../prisma';
import { eventBus, createEvent, ActivityLoggedEvent } from '../events';
import { logger } from '../logger';
import { metrics, METRICS } from '../metrics';

export class ActivityService {
  /**
   * Log a member activity
   */
  async logActivity(input: {
    memberId: string;
    communityId: string;
    activityType: string;
    points?: number;
    metadata?: Record<string, unknown>;
    occurredAt?: Date;
  }) {
    const activity = await prisma.memberActivity.create({
      data: {
        memberId: input.memberId,
        communityId: input.communityId,
        activityType: input.activityType,
        points: input.points,
        metadata: input.metadata || {},
        occurredAt: input.occurredAt || new Date(),
      },
    });

    logger.debug('Activity logged', {
      activityId: activity.id,
      memberId: input.memberId,
      activityType: input.activityType,
    });

    metrics.incrementCounter(METRICS.ACTIVITY_LOGGED, {
      communityId: input.communityId,
      activityType: input.activityType,
    });

    // Emit event
    await eventBus.emit(
      createEvent<ActivityLoggedEvent>('activity.logged', {
        activityId: activity.id,
        memberId: input.memberId,
        communityId: input.communityId,
        activityType: input.activityType,
        points: input.points,
      })
    );

    return activity;
  }

  /**
   * Get activity history for a member
   */
  async getMemberActivities(
    memberId: string,
    communityId: string,
    options?: {
      activityType?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    return prisma.memberActivity.findMany({
      where: {
        memberId,
        communityId,
        ...(options?.activityType && { activityType: options.activityType }),
      },
      orderBy: {
        occurredAt: 'desc',
      },
      take: options?.limit || 100,
      skip: options?.offset || 0,
    });
  }

  /**
   * Calculate total points for a member
   */
  async getMemberPoints(
    memberId: string,
    communityId: string,
    options?: {
      activityType?: string;
      since?: Date;
    }
  ) {
    const result = await prisma.memberActivity.aggregate({
      where: {
        memberId,
        communityId,
        ...(options?.activityType && { activityType: options.activityType }),
        ...(options?.since && { occurredAt: { gte: options.since } }),
        points: { not: null },
      },
      _sum: {
        points: true,
      },
      _count: true,
    });

    return {
      totalPoints: result._sum.points || 0,
      activityCount: result._count,
    };
  }

  /**
   * Get activity leaderboard for a community
   */
  async getLeaderboard(
    communityId: string,
    options?: {
      activityType?: string;
      since?: Date;
      limit?: number;
    }
  ) {
    // This is a simplified version. In production, you'd want to use a materialized view or caching
    const activities = await prisma.memberActivity.groupBy({
      by: ['memberId'],
      where: {
        communityId,
        ...(options?.activityType && { activityType: options.activityType }),
        ...(options?.since && { occurredAt: { gte: options.since } }),
        points: { not: null },
      },
      _sum: {
        points: true,
      },
      _count: true,
      orderBy: {
        _sum: {
          points: 'desc',
        },
      },
      take: options?.limit || 100,
    });

    return activities.map((entry) => ({
      memberId: entry.memberId,
      totalPoints: entry._sum.points || 0,
      activityCount: entry._count,
    }));
  }

  /**
   * Get activity summary for a community
   */
  async getCommunitySummary(communityId: string, since?: Date) {
    const activities = await prisma.memberActivity.groupBy({
      by: ['activityType'],
      where: {
        communityId,
        ...(since && { occurredAt: { gte: since } }),
      },
      _count: true,
      _sum: {
        points: true,
      },
    });

    return activities.map((entry) => ({
      activityType: entry.activityType,
      count: entry._count,
      totalPoints: entry._sum.points || 0,
    }));
  }
}

export const activityService = new ActivityService();
