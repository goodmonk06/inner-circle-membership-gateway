import { RuleType } from '@prisma/client';
import {
  RuleConfig,
  RuleEvaluationResult,
  ReputationRuleConfig,
  CurrencyBalanceRuleConfig,
  ManualRuleConfig,
  CustomRuleConfig,
} from '@/types';
import { reputationOracle } from '../adapters/reputation-oracle';
import { currencyService } from '../adapters/currency-service';

/**
 * Rule Evaluator
 * Evaluates individual eligibility rules for tier membership
 */
export class RuleEvaluator {
  /**
   * Evaluate a single rule for a member
   * @param ruleId - The rule ID
   * @param ruleType - The type of rule
   * @param config - The rule configuration
   * @param memberId - The member to evaluate
   * @param context - Additional context (e.g., manual assignments)
   * @returns Evaluation result
   */
  async evaluateRule(
    ruleId: string,
    ruleType: RuleType,
    config: RuleConfig,
    memberId: string,
    context?: Record<string, unknown>
  ): Promise<RuleEvaluationResult> {
    try {
      switch (ruleType) {
        case 'reputation':
          return await this.evaluateReputationRule(
            ruleId,
            config as ReputationRuleConfig,
            memberId
          );

        case 'currency_balance':
          return await this.evaluateCurrencyBalanceRule(
            ruleId,
            config as CurrencyBalanceRuleConfig,
            memberId
          );

        case 'manual':
          return this.evaluateManualRule(
            ruleId,
            config as ManualRuleConfig,
            memberId,
            context
          );

        case 'custom':
          return await this.evaluateCustomRule(
            ruleId,
            config as CustomRuleConfig,
            memberId,
            context
          );

        default:
          return {
            ruleId,
            ruleType,
            passed: false,
            message: `Unknown rule type: ${ruleType}`,
          };
      }
    } catch (error) {
      console.error(`Error evaluating rule ${ruleId}:`, error);
      return {
        ruleId,
        ruleType,
        passed: false,
        message: `Error evaluating rule: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Evaluate reputation-based rule
   */
  private async evaluateReputationRule(
    ruleId: string,
    config: ReputationRuleConfig,
    memberId: string
  ): Promise<RuleEvaluationResult> {
    const score = await reputationOracle.getReputationScore(
      memberId,
      config.category
    );

    if (!score) {
      return {
        ruleId,
        ruleType: 'reputation',
        passed: false,
        message: 'Reputation score not found',
      };
    }

    const passed = score.score >= config.minScore;

    return {
      ruleId,
      ruleType: 'reputation',
      passed,
      message: passed
        ? `Reputation score ${score.score} meets minimum ${config.minScore}`
        : `Reputation score ${score.score} below minimum ${config.minScore}`,
      details: {
        score: score.score,
        minScore: config.minScore,
        category: config.category,
      },
    };
  }

  /**
   * Evaluate currency balance rule
   */
  private async evaluateCurrencyBalanceRule(
    ruleId: string,
    config: CurrencyBalanceRuleConfig,
    memberId: string
  ): Promise<RuleEvaluationResult> {
    const balance = await currencyService.getCurrencyBalance(
      memberId,
      config.currencyId
    );

    if (!balance) {
      return {
        ruleId,
        ruleType: 'currency_balance',
        passed: false,
        message: 'Currency balance not found',
      };
    }

    const passed = balance.balance >= config.minBalance;

    return {
      ruleId,
      ruleType: 'currency_balance',
      passed,
      message: passed
        ? `Balance ${balance.balance} meets minimum ${config.minBalance}`
        : `Balance ${balance.balance} below minimum ${config.minBalance}`,
      details: {
        balance: balance.balance,
        minBalance: config.minBalance,
        currencyId: config.currencyId,
      },
    };
  }

  /**
   * Evaluate manual assignment rule
   */
  private evaluateManualRule(
    ruleId: string,
    config: ManualRuleConfig,
    memberId: string,
    context?: Record<string, unknown>
  ): RuleEvaluationResult {
    // Check if member is in manual assignments
    const manualAssignments = (context?.manualAssignments as string[]) || [];
    const passed = manualAssignments.includes(memberId);

    return {
      ruleId,
      ruleType: 'manual',
      passed,
      message: passed
        ? 'Member manually assigned to this tier'
        : 'Member not in manual assignments',
      details: {
        manualAssignments,
      },
    };
  }

  /**
   * Evaluate custom rule with expression
   */
  private async evaluateCustomRule(
    ruleId: string,
    config: CustomRuleConfig,
    memberId: string,
    context?: Record<string, unknown>
  ): Promise<RuleEvaluationResult> {
    // This is a simplified implementation
    // In production, you'd want a proper expression parser/evaluator
    // For now, we'll return false with a note

    return {
      ruleId,
      ruleType: 'custom',
      passed: false,
      message: 'Custom rule evaluation not yet implemented',
      details: {
        expression: config.expression,
        description: config.description,
      },
    };
  }
}

// Singleton instance
export const ruleEvaluator = new RuleEvaluator();
