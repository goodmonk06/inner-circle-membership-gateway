/**
 * Benefit Service
 * Manages tier benefits and access checks
 */

import { prisma } from '../prisma';
import { BenefitType } from '@prisma/client';
import { NotFoundError } from '../errors';
import { logger } from '../logger';
import { metrics, METRICS } from '../metrics';

export class BenefitService {
  /**
   * Create a benefit for a tier
   */
  async createBenefit(input: {
    tierId: string;
    key: string;
    name: string;
    description?: string;
    benefitType: BenefitType;
    configJson: Record<string, unknown>;
  }) {
    const tier = await prisma.membershipTier.findUnique({
      where: { id: input.tierId },
    });

    if (!tier) {
      throw new NotFoundError('Tier', input.tierId);
    }

    return prisma.tierBenefit.create({
      data: {
        tierId: input.tierId,
        key: input.key,
        name: input.name,
        description: input.description,
        benefitType: input.benefitType,
        configJson: input.configJson,
      },
    });
  }

  /**
   * Get all benefits for a tier
   */
  async getTierBenefits(tierId: string) {
    return prisma.tierBenefit.findMany({
      where: { tierId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Check if a member has access to a specific benefit
   */
  async checkBenefitAccess(
    memberId: string,
    communityId: string,
    benefitKey: string
  ): Promise<{
    hasAccess: boolean;
    benefit?: any;
    config?: Record<string, unknown>;
  }> {
    // Get member's current tier
    const memberStatus = await prisma.memberTierStatus.findUnique({
      where: {
        memberId_communityId: {
          memberId,
          communityId,
        },
      },
      include: {
        currentTier: {
          include: {
            benefits: true,
          },
        },
      },
    });

    metrics.incrementCounter(METRICS.BENEFIT_CHECKED, {
      communityId,
      benefitKey,
      hasAccess: memberStatus?.currentTier ? 'true' : 'false',
    });

    if (!memberStatus?.currentTier) {
      return { hasAccess: false };
    }

    // Find the benefit in the tier
    const benefit = memberStatus.currentTier.benefits.find((b) => b.key === benefitKey);

    if (!benefit) {
      return { hasAccess: false };
    }

    return {
      hasAccess: true,
      benefit,
      config: benefit.configJson as Record<string, unknown>,
    };
  }

  /**
   * Get all benefits available to a member
   */
  async getMemberBenefits(memberId: string, communityId: string) {
    const memberStatus = await prisma.memberTierStatus.findUnique({
      where: {
        memberId_communityId: {
          memberId,
          communityId,
        },
      },
      include: {
        currentTier: {
          include: {
            benefits: true,
          },
        },
      },
    });

    if (!memberStatus?.currentTier) {
      return [];
    }

    return memberStatus.currentTier.benefits;
  }

  /**
   * Update a benefit
   */
  async updateBenefit(
    benefitId: string,
    input: {
      name?: string;
      description?: string;
      configJson?: Record<string, unknown>;
    }
  ) {
    return prisma.tierBenefit.update({
      where: { id: benefitId },
      data: input,
    });
  }

  /**
   * Delete a benefit
   */
  async deleteBenefit(benefitId: string) {
    return prisma.tierBenefit.delete({
      where: { id: benefitId },
    });
  }

  /**
   * Helper: Check feature flag benefit
   */
  async hasFeature(memberId: string, communityId: string, featureKey: string): Promise<boolean> {
    const result = await this.checkBenefitAccess(memberId, communityId, featureKey);
    if (!result.hasAccess || result.benefit?.benefitType !== 'feature_flag') {
      return false;
    }
    return result.config?.enabled === true;
  }

  /**
   * Helper: Get quota value for a member
   */
  async getQuota(
    memberId: string,
    communityId: string,
    quotaKey: string
  ): Promise<number | null> {
    const result = await this.checkBenefitAccess(memberId, communityId, quotaKey);
    if (!result.hasAccess || result.benefit?.benefitType !== 'quota') {
      return null;
    }
    return (result.config?.limit as number) || null;
  }
}

export const benefitService = new BenefitService();
