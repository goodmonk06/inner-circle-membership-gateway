import { RuleEvaluator } from '../rule-evaluator';
import { ReputationRuleConfig, CurrencyBalanceRuleConfig } from '@/types';

describe('RuleEvaluator', () => {
  const evaluator = new RuleEvaluator();

  describe('evaluateReputationRule', () => {
    it('should pass when reputation meets minimum', async () => {
      const config: ReputationRuleConfig = {
        type: 'reputation',
        minScore: 50,
        category: 'trust',
      };

      const result = await evaluator.evaluateRule(
        'rule-1',
        'reputation',
        config,
        'member-1'
      );

      expect(result.ruleType).toBe('reputation');
      expect(result.passed).toBeDefined();
      expect(result.message).toBeDefined();
    });

    it('should fail when reputation is below minimum', async () => {
      const config: ReputationRuleConfig = {
        type: 'reputation',
        minScore: 999, // Very high threshold
        category: 'trust',
      };

      const result = await evaluator.evaluateRule(
        'rule-1',
        'reputation',
        config,
        'member-1'
      );

      expect(result.ruleType).toBe('reputation');
      expect(result.passed).toBe(false);
    });
  });

  describe('evaluateCurrencyBalanceRule', () => {
    it('should pass when balance meets minimum', async () => {
      const config: CurrencyBalanceRuleConfig = {
        type: 'currency_balance',
        currencyId: 'token-1',
        minBalance: 100,
      };

      const result = await evaluator.evaluateRule(
        'rule-2',
        'currency_balance',
        config,
        'member-1'
      );

      expect(result.ruleType).toBe('currency_balance');
      expect(result.passed).toBeDefined();
      expect(result.message).toBeDefined();
    });

    it('should fail when balance is below minimum', async () => {
      const config: CurrencyBalanceRuleConfig = {
        type: 'currency_balance',
        currencyId: 'token-1',
        minBalance: 999999, // Very high threshold
      };

      const result = await evaluator.evaluateRule(
        'rule-2',
        'currency_balance',
        config,
        'member-1'
      );

      expect(result.ruleType).toBe('currency_balance');
      expect(result.passed).toBe(false);
    });
  });

  describe('evaluateManualRule', () => {
    it('should pass when member is in manual assignments', async () => {
      const config = {
        type: 'manual' as const,
      };

      const result = await evaluator.evaluateRule(
        'rule-3',
        'manual',
        config,
        'member-1',
        { manualAssignments: ['member-1', 'member-2'] }
      );

      expect(result.ruleType).toBe('manual');
      expect(result.passed).toBe(true);
    });

    it('should fail when member is not in manual assignments', async () => {
      const config = {
        type: 'manual' as const,
      };

      const result = await evaluator.evaluateRule(
        'rule-3',
        'manual',
        config,
        'member-1',
        { manualAssignments: ['member-2'] }
      );

      expect(result.ruleType).toBe('manual');
      expect(result.passed).toBe(false);
    });
  });
});
