import { RuleType } from '@prisma/client';

// Domain types for membership tiers

export interface MembershipTier {
  id: string;
  communityId: string;
  key: string;
  name: string;
  descriptionMarkdown: string | null;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TierEligibilityRule {
  id: string;
  tierId: string;
  ruleType: RuleType;
  configJson: RuleConfig;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemberTierStatus {
  id: string;
  memberId: string;
  communityId: string;
  currentTierId: string | null;
  evaluatedAt: Date;
  evaluationDetailJson: EvaluationDetail | null;
  createdAt: Date;
  updatedAt: Date;
}

// Rule configuration types
export type RuleConfig =
  | ReputationRuleConfig
  | CurrencyBalanceRuleConfig
  | ManualRuleConfig
  | CustomRuleConfig;

export interface ReputationRuleConfig {
  type: 'reputation';
  minScore: number;
  category?: string; // e.g., 'trust', 'contribution'
  oracleEndpoint?: string;
}

export interface CurrencyBalanceRuleConfig {
  type: 'currency_balance';
  currencyId: string;
  minBalance: number;
  serviceEndpoint?: string;
}

export interface ManualRuleConfig {
  type: 'manual';
  allowedAssigners?: string[]; // List of admin IDs who can assign
}

export interface CustomRuleConfig {
  type: 'custom';
  expression: string; // Custom evaluation expression
  description?: string;
}

// Evaluation result types
export interface EvaluationDetail {
  evaluatedTiers: TierEvaluation[];
  assignedTier: string | null;
  assignedTierName: string | null;
  timestamp: string;
}

export interface TierEvaluation {
  tierId: string;
  tierName: string;
  tierKey: string;
  priority: number;
  eligible: boolean;
  ruleResults: RuleEvaluationResult[];
}

export interface RuleEvaluationResult {
  ruleId: string;
  ruleType: RuleType;
  passed: boolean;
  message: string;
  details?: Record<string, unknown>;
}

// API request/response types
export interface TierStatusResponse {
  memberId: string;
  communityId: string;
  currentTier: {
    id: string;
    key: string;
    name: string;
    priority: number;
    descriptionMarkdown: string | null;
  } | null;
  evaluatedAt: string;
  evaluationDetail: EvaluationDetail | null;
}

export interface ReEvaluateRequest {
  communityId: string;
  force?: boolean; // Force re-evaluation even if recently evaluated
}

export interface ReEvaluateResponse {
  memberId: string;
  previousTierId: string | null;
  newTierId: string | null;
  tierChanged: boolean;
  evaluationDetail: EvaluationDetail;
}

// External service types
export interface ReputationScore {
  memberId: string;
  score: number;
  category: string;
  lastUpdated: string;
}

export interface CurrencyBalance {
  memberId: string;
  currencyId: string;
  balance: number;
  lastUpdated: string;
}

// Admin UI types
export interface CreateTierInput {
  communityId: string;
  key: string;
  name: string;
  descriptionMarkdown?: string;
  priority: number;
}

export interface UpdateTierInput {
  name?: string;
  descriptionMarkdown?: string;
  priority?: number;
}

export interface CreateRuleInput {
  tierId: string;
  ruleType: RuleType;
  configJson: RuleConfig;
}

export interface TierDistribution {
  communityId: string;
  totalMembers: number;
  tierCounts: {
    tierId: string;
    tierName: string;
    tierKey: string;
    priority: number;
    count: number;
    percentage: number;
  }[];
  unassignedCount: number;
  lastUpdated: string;
}
