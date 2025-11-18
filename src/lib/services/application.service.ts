/**
 * Application Service
 * Handles membership tier applications and reviews
 */

import { prisma } from '../prisma';
import { ApplicationStatus } from '@prisma/client';
import { NotFoundError, ConflictError } from '../errors';
import { eventBus, createEvent, ApplicationSubmittedEvent, ApplicationReviewedEvent, TierChangedEvent } from '../events';
import { logger } from '../logger';
import { metrics, METRICS } from '../metrics';

export class ApplicationService {
  /**
   * Submit a new application for a tier
   */
  async submitApplication(input: {
    memberId: string;
    communityId: string;
    targetTierId: string;
    reason: string;
    metadata?: Record<string, unknown>;
  }) {
    // Verify tier exists
    const tier = await prisma.membershipTier.findUnique({
      where: { id: input.targetTierId },
      include: { community: true },
    });

    if (!tier || tier.communityId !== input.communityId) {
      throw new NotFoundError('Tier', input.targetTierId);
    }

    // Check for existing pending application
    const existingApplication = await prisma.membershipApplication.findFirst({
      where: {
        memberId: input.memberId,
        communityId: input.communityId,
        targetTierId: input.targetTierId,
        status: 'pending',
      },
    });

    if (existingApplication) {
      throw new ConflictError('An application for this tier is already pending');
    }

    // Create application
    const application = await prisma.membershipApplication.create({
      data: {
        memberId: input.memberId,
        communityId: input.communityId,
        targetTierId: input.targetTierId,
        reason: input.reason,
        metadata: input.metadata || {},
        status: 'pending',
      },
      include: {
        targetTier: true,
      },
    });

    logger.info('Application submitted', {
      applicationId: application.id,
      memberId: input.memberId,
      targetTierId: input.targetTierId,
    });

    metrics.incrementCounter(METRICS.APPLICATION_SUBMITTED, {
      communityId: input.communityId,
      tierKey: tier.key,
    });

    // Emit event
    await eventBus.emit(
      createEvent<ApplicationSubmittedEvent>('application.submitted', {
        applicationId: application.id,
        memberId: input.memberId,
        communityId: input.communityId,
        targetTierId: input.targetTierId,
        targetTierName: tier.name,
      })
    );

    return application;
  }

  /**
   * Review an application (approve or reject)
   */
  async reviewApplication(input: {
    applicationId: string;
    reviewerId: string;
    status: 'approved' | 'rejected';
    reviewNote?: string;
  }) {
    const application = await prisma.membershipApplication.findUnique({
      where: { id: input.applicationId },
      include: {
        targetTier: true,
        community: true,
      },
    });

    if (!application) {
      throw new NotFoundError('Application', input.applicationId);
    }

    if (application.status !== 'pending') {
      throw new ConflictError(`Application is already ${application.status}`);
    }

    // Update application
    const updated = await prisma.membershipApplication.update({
      where: { id: input.applicationId },
      data: {
        status: input.status as ApplicationStatus,
        reviewedBy: input.reviewerId,
        reviewedAt: new Date(),
        reviewNote: input.reviewNote,
      },
      include: {
        targetTier: true,
      },
    });

    logger.info('Application reviewed', {
      applicationId: input.applicationId,
      status: input.status,
      reviewerId: input.reviewerId,
    });

    metrics.incrementCounter(METRICS.APPLICATION_REVIEWED, {
      communityId: application.communityId,
      tierKey: application.targetTier.key,
      status: input.status,
    });

    // Emit event
    await eventBus.emit(
      createEvent<ApplicationReviewedEvent>('application.reviewed', {
        applicationId: application.id,
        memberId: application.memberId,
        communityId: application.communityId,
        targetTierId: application.targetTierId,
        status: input.status,
        reviewedBy: input.reviewerId,
      })
    );

    // If approved, assign the tier
    if (input.status === 'approved') {
      await this.assignTierFromApplication(application.memberId, application.communityId, application.targetTierId, input.reviewerId);
    }

    return updated;
  }

  /**
   * Assign tier when application is approved
   */
  private async assignTierFromApplication(
    memberId: string,
    communityId: string,
    newTierId: string,
    reviewerId: string
  ) {
    // Get current status
    const currentStatus = await prisma.memberTierStatus.findUnique({
      where: {
        memberId_communityId: {
          memberId,
          communityId,
        },
      },
      include: {
        currentTier: true,
      },
    });

    const previousTierId = currentStatus?.currentTierId || null;
    const previousTierName = currentStatus?.currentTier?.name || null;

    // Update or create status
    await prisma.memberTierStatus.upsert({
      where: {
        memberId_communityId: {
          memberId,
          communityId,
        },
      },
      create: {
        memberId,
        communityId,
        currentTierId: newTierId,
        evaluatedAt: new Date(),
      },
      update: {
        currentTierId: newTierId,
        evaluatedAt: new Date(),
      },
    });

    // Create history entry
    const newTier = await prisma.membershipTier.findUnique({
      where: { id: newTierId },
    });

    await prisma.tierHistory.create({
      data: {
        memberId,
        communityId,
        fromTierId: previousTierId,
        toTierId: newTierId,
        reason: 'Application approved',
        triggeredBy: reviewerId,
      },
    });

    // Emit tier changed event
    await eventBus.emit(
      createEvent<TierChangedEvent>('tier.changed', {
        memberId,
        communityId,
        fromTierId: previousTierId,
        toTierId: newTierId,
        fromTierName: previousTierName,
        toTierName: newTier?.name || null,
        reason: 'Application approved',
        triggeredBy: reviewerId,
      })
    );
  }

  /**
   * Get applications for a member
   */
  async getMemberApplications(memberId: string, communityId: string) {
    return prisma.membershipApplication.findMany({
      where: {
        memberId,
        communityId,
      },
      include: {
        targetTier: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get pending applications for a community
   */
  async getPendingApplications(communityId: string) {
    return prisma.membershipApplication.findMany({
      where: {
        communityId,
        status: 'pending',
      },
      include: {
        targetTier: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  /**
   * Withdraw an application
   */
  async withdrawApplication(applicationId: string, memberId: string) {
    const application = await prisma.membershipApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundError('Application', applicationId);
    }

    if (application.memberId !== memberId) {
      throw new ConflictError('You can only withdraw your own applications');
    }

    if (application.status !== 'pending') {
      throw new ConflictError(`Cannot withdraw ${application.status} application`);
    }

    return prisma.membershipApplication.update({
      where: { id: applicationId },
      data: {
        status: 'withdrawn',
      },
    });
  }
}

export const applicationService = new ApplicationService();
