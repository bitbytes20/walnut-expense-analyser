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
  isArchived: boolean
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
    isArchived: z.boolean(),
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
  isActive: z.boolean(),
  isArchived: z.boolean()
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

export const DescriptionTermSchema = z.object({
  op: z.enum(['contains', 'starts-with', 'ends-with', 'regex']),
  value: z.string().trim().min(1)
})

export const CategorizationRuleConditionSchema = z.object({
  descriptionTerms: z.array(DescriptionTermSchema).default([]),
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
  sortOrder: z.number().int(),
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

export const ReorderRulesInputSchema = z.object({
  ruleIds: z.array(z.string())
})

export const RuleExportEntrySchema = z.object({
  name: z.string(),
  sortOrder: z.number().int(),
  descriptionTerms: z.array(DescriptionTermSchema).default([]),
  amountMinMinor: z.number().optional(),
  amountMaxMinor: z.number().optional(),
  transactionTypes: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  directions: z.array(z.string()).default([]),
  action: z.object({
    categoryName: z.string().optional(),
    type: z.string().optional(),
    appendTags: z.array(z.string()).default([])
  })
})

export const RuleConflictSchema = z.object({
  name: z.string(),
  existing: RuleExportEntrySchema,
  incoming: RuleExportEntrySchema
})

export const RuleImportResultSchema = z.object({
  imported: z.number().int(),
  skipped: z.number().int(),
  conflicts: z.array(RuleConflictSchema),
  warnings: z.array(z.string())
})

export const MergeCategoryPreviewSchema = z.object({
  sourceCategoryId: z.string(),
  targetCategoryId: z.string(),
  affectedTransactionCount: z.number().int().nonnegative(),
  affectedRuleCount: z.number().int().nonnegative(),
  samples: z.array(RulePreviewSampleSchema)
})

export const ArchiveCategoryInputSchema = z.object({
  categoryId: z.string(),
  isArchived: z.boolean()
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
export type DescriptionTerm = z.infer<typeof DescriptionTermSchema>
export type ReorderRulesInput = z.infer<typeof ReorderRulesInputSchema>
export type RuleExportEntry = z.infer<typeof RuleExportEntrySchema>
export type RuleConflict = z.infer<typeof RuleConflictSchema>
export type RuleImportResult = z.infer<typeof RuleImportResultSchema>
export type MergeCategoryPreview = z.infer<typeof MergeCategoryPreviewSchema>
export type ArchiveCategoryInput = z.infer<typeof ArchiveCategoryInputSchema>
