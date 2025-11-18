import { z } from 'zod';
import { RuleType } from '@prisma/client';

// Common schemas
export const idSchema = z.string().cuid();
export const communityIdSchema = z.string().min(1).max(100);
export const memberIdSchema = z.string().min(1).max(100);

// Tier schemas
export const createTierSchema = z.object({
  communityId: communityIdSchema,
  key: z.string().min(1).max(50).regex(/^[a-z0-9-_]+$/, 'Key must be lowercase alphanumeric with hyphens/underscores'),
  name: z.string().min(1).max(200),
  descriptionMarkdown: z.string().max(10000).optional(),
  priority: z.number().int().min(0).max(1000),
});

export const updateTierSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  descriptionMarkdown: z.string().max(10000).optional(),
  priority: z.number().int().min(0).max(1000).optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

// Rule config schemas
const reputationRuleConfigSchema = z.object({
  type: z.literal('reputation'),
  minScore: z.number().min(0).max(1000),
  category: z.string().optional(),
  oracleEndpoint: z.string().url().optional(),
});

const currencyBalanceRuleConfigSchema = z.object({
  type: z.literal('currency_balance'),
  currencyId: z.string().min(1),
  minBalance: z.number().min(0),
  serviceEndpoint: z.string().url().optional(),
});

const manualRuleConfigSchema = z.object({
  type: z.literal('manual'),
  allowedAssigners: z.array(z.string()).optional(),
});

const customRuleConfigSchema = z.object({
  type: z.literal('custom'),
  expression: z.string().min(1).max(1000),
  description: z.string().max(500).optional(),
});

const ruleConfigSchema = z.discriminatedUnion('type', [
  reputationRuleConfigSchema,
  currencyBalanceRuleConfigSchema,
  manualRuleConfigSchema,
  customRuleConfigSchema,
]);

export const createRuleSchema = z.object({
  tierId: idSchema,
  ruleType: z.nativeEnum(RuleType),
  configJson: ruleConfigSchema,
});

export const updateRuleSchema = z.object({
  configJson: ruleConfigSchema,
});

// Member tier status schemas
export const getTierStatusSchema = z.object({
  memberId: memberIdSchema,
  communityId: communityIdSchema,
});

export const reEvaluateMemberSchema = z.object({
  communityId: communityIdSchema,
  force: z.boolean().optional().default(false),
});

// Query parameter schemas
export const listTiersQuerySchema = z.object({
  communityId: communityIdSchema,
});

export const distributionQuerySchema = z.object({
  communityId: communityIdSchema,
});

// Application schemas (for Phase 3)
export const createApplicationSchema = z.object({
  memberId: memberIdSchema,
  communityId: communityIdSchema,
  targetTierId: idSchema,
  reason: z.string().min(10).max(1000),
  metadata: z.record(z.unknown()).optional(),
});

export const reviewApplicationSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  reviewNote: z.string().max(1000).optional(),
  reviewerId: memberIdSchema,
});

// Benefit schemas (for Phase 3)
export const createBenefitSchema = z.object({
  tierId: idSchema,
  key: z.string().min(1).max(50).regex(/^[a-z0-9-_]+$/),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  benefitType: z.enum(['feature_flag', 'quota', 'perk', 'access']),
  configJson: z.record(z.unknown()),
});

export const updateBenefitSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  configJson: z.record(z.unknown()).optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

// Activity schemas (for Phase 3)
export const logActivitySchema = z.object({
  memberId: memberIdSchema,
  communityId: communityIdSchema,
  activityType: z.string().min(1).max(50),
  metadata: z.record(z.unknown()).optional(),
  points: z.number().int().optional(),
});

// Webhook schemas (for Phase 3)
export const createWebhookSchema = z.object({
  communityId: communityIdSchema,
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  secret: z.string().min(16).optional(),
  active: z.boolean().optional().default(true),
});

export const updateWebhookSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(z.string()).min(1).optional(),
  secret: z.string().min(16).optional(),
  active: z.boolean().optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

// Type inference helpers
export type CreateTierInput = z.infer<typeof createTierSchema>;
export type UpdateTierInput = z.infer<typeof updateTierSchema>;
export type CreateRuleInput = z.infer<typeof createRuleSchema>;
export type UpdateRuleInput = z.infer<typeof updateRuleSchema>;
export type ReEvaluateMemberInput = z.infer<typeof reEvaluateMemberSchema>;
export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type ReviewApplicationInput = z.infer<typeof reviewApplicationSchema>;
export type CreateBenefitInput = z.infer<typeof createBenefitSchema>;
export type UpdateBenefitInput = z.infer<typeof updateBenefitSchema>;
export type LogActivityInput = z.infer<typeof logActivitySchema>;
export type CreateWebhookInput = z.infer<typeof createWebhookSchema>;
export type UpdateWebhookInput = z.infer<typeof updateWebhookSchema>;
