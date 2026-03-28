import { z } from 'zod'
import { TransactionNormalizedTypeSchema } from './transactions'

export const CategoryKindSchema = z.enum(['system', 'user'])
export const CategoryDirectionSchema = z.enum(['debit', 'credit'])

export const CategoryCountSummarySchema = z.object({
  directTransactionCount: z.number().int().nonnegative(),
  totalTransactionCount: z.number().int().nonnegative()
})

export const CategoryTreeNodeSchema: z.ZodType<{
  id: string
  name: string
  kind: 'system' | 'user'
  parentId?: string
  path: string[]
  isActive: boolean
  isIncomeCategory: boolean
  sortOrder: number
  counts: { directTransactionCount: number; totalTransactionCount: number }
  children: Array<unknown>
}> = z.lazy(() =>
  z.object({
    id: z.string(),
    name: z.string(),
    kind: CategoryKindSchema,
    parentId: z.string().optional(),
    path: z.array(z.string()),
    isActive: z.boolean(),
    isIncomeCategory: z.boolean(),
    sortOrder: z.number().int(),
    counts: CategoryCountSummarySchema,
    children: z.array(CategoryTreeNodeSchema)
  })
)

export const CategoryOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  path: z.array(z.string()),
  kind: CategoryKindSchema,
  isActive: z.boolean()
})

export const CreateCategoryInputSchema = z.object({
  name: z.string().trim().min(1),
  parentId: z.string().optional(),
  isIncomeCategory: z.boolean().optional()
})

export const UpdateCategoryInputSchema = z.object({
  categoryId: z.string(),
  name: z.string().trim().min(1).optional(),
  parentId: z.string().nullable().optional(),
  isActive: z.boolean().optional()
})

export const MergeCategoryInputSchema = z.object({
  sourceCategoryId: z.string(),
  targetCategoryId: z.string()
})

export const DeleteCategoryInputSchema = z.object({
  categoryId: z.string()
})

export const CategorizationRuleConditionSchema = z.object({
  descriptionContains: z.array(z.string().trim().min(1)).default([]),
  amountMinMinor: z.number().optional(),
  amountMaxMinor: z.number().optional(),
  transactionTypes: z.array(TransactionNormalizedTypeSchema).default([]),
  tags: z.array(z.string().trim().min(1)).default([]),
  directions: z.array(CategoryDirectionSchema).default([])
})

export const CategorizationRuleActionSchema = z.object({
  categoryId: z.string().optional(),
  type: TransactionNormalizedTypeSchema.optional(),
  appendTags: z.array(z.string().trim().min(1)).default([])
})

export const RuleCountSummarySchema = z.object({
  affectedTransactionCount: z.number().int().nonnegative()
})

export const CategorizationRuleSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: CategoryKindSchema,
  isEnabled: z.boolean(),
  condition: CategorizationRuleConditionSchema,
  action: CategorizationRuleActionSchema,
  specificityScore: z.number().int().nonnegative(),
  affectedTransactionCount: z.number().int().nonnegative(),
  updatedAt: z.string()
})

export const RulePreviewSampleSchema = z.object({
  transactionId: z.string(),
  transactionDateRaw: z.string(),
  description: z.string(),
  signedAmountMinor: z.number(),
  currentCategoryPath: z.array(z.string()).optional(),
  nextCategoryPath: z.array(z.string()).optional(),
  currentType: TransactionNormalizedTypeSchema,
  nextType: TransactionNormalizedTypeSchema,
  tags: z.array(z.string())
})

export const RuleTestPreviewSchema = z.object({
  matchCount: z.number().int().nonnegative(),
  samples: z.array(RulePreviewSampleSchema)
})

export const RuleApplyPreviewSchema = z.object({
  matchCount: z.number().int().nonnegative(),
  samples: z.array(RulePreviewSampleSchema)
})

export const CreateCategorizationRuleInputSchema = z.object({
  name: z.string().trim().min(1),
  condition: CategorizationRuleConditionSchema,
  action: CategorizationRuleActionSchema,
  applyToExisting: z.boolean().optional()
})

export const UpdateCategorizationRuleInputSchema = z.object({
  ruleId: z.string(),
  name: z.string().trim().min(1).optional(),
  condition: CategorizationRuleConditionSchema.optional(),
  action: CategorizationRuleActionSchema.optional(),
  isEnabled: z.boolean().optional()
})

export const ToggleCategorizationRuleInputSchema = z.object({
  ruleId: z.string(),
  isEnabled: z.boolean()
})

export const DeleteCategorizationRuleInputSchema = z.object({
  ruleId: z.string()
})

export const RulePreviewInputSchema = z.object({
  condition: CategorizationRuleConditionSchema,
  action: CategorizationRuleActionSchema,
  excludeRuleId: z.string().optional()
})

export const ApplyRuleToExistingInputSchema = z.object({
  ruleId: z.string()
})

export type CategoryKind = z.infer<typeof CategoryKindSchema>
export type CategoryDirection = z.infer<typeof CategoryDirectionSchema>
export type CategoryCountSummary = z.infer<typeof CategoryCountSummarySchema>
export type CategoryTreeNode = z.infer<typeof CategoryTreeNodeSchema>
export type CategoryOption = z.infer<typeof CategoryOptionSchema>
export type CreateCategoryInput = z.infer<typeof CreateCategoryInputSchema>
export type UpdateCategoryInput = z.infer<typeof UpdateCategoryInputSchema>
export type MergeCategoryInput = z.infer<typeof MergeCategoryInputSchema>
export type DeleteCategoryInput = z.infer<typeof DeleteCategoryInputSchema>
export type CategorizationRuleCondition = z.infer<typeof CategorizationRuleConditionSchema>
export type CategorizationRuleAction = z.infer<typeof CategorizationRuleActionSchema>
export type CategorizationRuleSummary = z.infer<typeof CategorizationRuleSummarySchema>
export type RulePreviewSample = z.infer<typeof RulePreviewSampleSchema>
export type RuleTestPreview = z.infer<typeof RuleTestPreviewSchema>
export type RuleApplyPreview = z.infer<typeof RuleApplyPreviewSchema>
export type CreateCategorizationRuleInput = z.infer<typeof CreateCategorizationRuleInputSchema>
export type UpdateCategorizationRuleInput = z.infer<typeof UpdateCategorizationRuleInputSchema>
export type ToggleCategorizationRuleInput = z.infer<typeof ToggleCategorizationRuleInputSchema>
export type DeleteCategorizationRuleInput = z.infer<typeof DeleteCategorizationRuleInputSchema>
export type RulePreviewInput = z.infer<typeof RulePreviewInputSchema>
export type ApplyRuleToExistingInput = z.infer<typeof ApplyRuleToExistingInputSchema>
