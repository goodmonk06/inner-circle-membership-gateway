import { prisma } from '../prisma';
import { ruleEvaluator } from './rule-evaluator';
import { EvaluationDetail, TierEvaluation, RuleConfig } from '@/types';

/**
 * Tier Evaluator
 * Main engine for evaluating member tier eligibility
 */
export class TierEvaluator {
  /**
   * Evaluate which tier a member should be assigned to
   * @param memberId - The member to evaluate
   * @param communityId - The community context
   * @param context - Additional evaluation context
   * @returns Detailed evaluation results
   */
  async evaluateMemberTier(
    memberId: string,
    communityId: string,
    context?: Record<string, unknown>
  ): Promise<EvaluationDetail> {
    // Fetch all tiers for the community, ordered by priority (highest first)
    const tiers = await prisma.membershipTier.findMany({
      where: { communityId },
      include: {
        eligibilityRules: true,
      },
      orderBy: { priority: 'desc' },
    });

    if (tiers.length === 0) {
      return {
        evaluatedTiers: [],
        assignedTier: null,
        assignedTierName: null,
        timestamp: new Date().toISOString(),
      };
    }

    // Evaluate each tier
    const tierEvaluations: TierEvaluation[] = [];

    for (const tier of tiers) {
      const ruleResults = await Promise.all(
        tier.eligibilityRules.map((rule) =>
          ruleEvaluator.evaluateRule(
            rule.id,
            rule.ruleType,
            rule.configJson as RuleConfig,
            memberId,
            context
          )
        )
      );

      // A tier is eligible if ALL rules pass (AND logic)
      // If there are no rules, the tier is not eligible by default
      const eligible = tier.eligibilityRules.length > 0 && ruleResults.every((r) => r.passed);

      tierEvaluations.push({
        tierId: tier.id,
        tierName: tier.name,
        tierKey: tier.key,
        priority: tier.priority,
        eligible,
        ruleResults,
      });
    }

    // Find the highest priority eligible tier
    const eligibleTiers = tierEvaluations.filter((t) => t.eligible);
    const assignedTier = eligibleTiers.length > 0 ? eligibleTiers[0] : null;

    return {
      evaluatedTiers: tierEvaluations,
      assignedTier: assignedTier?.tierId || null,
      assignedTierName: assignedTier?.tierName || null,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Evaluate and save member tier status
   * @param memberId - The member to evaluate
   * @param communityId - The community context
   * @param context - Additional evaluation context
   * @returns The updated member tier status
   */
  async evaluateAndSaveMemberTier(
    memberId: string,
    communityId: string,
    context?: Record<string, unknown>
  ) {
    const evaluationDetail = await this.evaluateMemberTier(
      memberId,
      communityId,
      context
    );

    // Upsert the member tier status
    const memberStatus = await prisma.memberTierStatus.upsert({
      where: {
        memberId_communityId: {
          memberId,
          communityId,
        },
      },
      create: {
        memberId,
        communityId,
        currentTierId: evaluationDetail.assignedTier,
        evaluatedAt: new Date(),
        evaluationDetailJson: evaluationDetail as any,
      },
      update: {
        currentTierId: evaluationDetail.assignedTier,
        evaluatedAt: new Date(),
        evaluationDetailJson: evaluationDetail as any,
      },
      include: {
        currentTier: true,
      },
    });

    return memberStatus;
  }

  /**
   * Batch evaluate members for a community
   * Useful for periodic re-evaluation of all members
   */
  async batchEvaluateMembers(
    memberIds: string[],
    communityId: string,
    context?: Record<string, unknown>
  ) {
    const results = [];

    for (const memberId of memberIds) {
      try {
        const result = await this.evaluateAndSaveMemberTier(
          memberId,
          communityId,
          context
        );
        results.push({ memberId, success: true, result });
      } catch (error) {
        console.error(`Error evaluating member ${memberId}:`, error);
        results.push({
          memberId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }
}

// Singleton instance
export const tierEvaluator = new TierEvaluator();
