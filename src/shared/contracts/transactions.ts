import { z } from 'zod'

export const TransactionNormalizedTypeSchema = z.enum([
  'expense',
  'income',
  'transfer',
  'refund',
  'atm-withdrawal',
  'credit-card-payment'
])

export const TransactionReviewStateSchema = z.enum(['clean', 'pending-review'])

export const TransactionRuleSuggestionSchema = z.object({
  field: z.enum(['type', 'category']),
  fromType: TransactionNormalizedTypeSchema.optional(),
  toType: TransactionNormalizedTypeSchema.optional(),
  title: z.string(),
  description: z.string(),
  draft: z.object({
    name: z.string(),
    condition: z.object({
      descriptionTerms: z.array(z.object({ op: z.enum(['contains', 'starts-with', 'ends-with', 'regex']), value: z.string() })),
      amountMinMinor: z.number().optional(),
      amountMaxMinor: z.number().optional(),
      transactionTypes: z.array(TransactionNormalizedTypeSchema),
      tags: z.array(z.string()),
      directions: z.array(z.enum(['debit', 'credit']))
    }),
    action: z.object({
      categoryId: z.string().optional(),
      type: TransactionNormalizedTypeSchema.optional(),
      appendTags: z.array(z.string())
    })
  })
})

export const TransactionLedgerRowSchema = z.object({
  id: z.string(),
  importBatchId: z.string(),
  sourceFileId: z.string(),
  transactionDateRaw: z.string(),
  transactionDateSortable: z.string(),
  description: z.string(),
  signedAmountMinor: z.number(),
  debitAmountMinor: z.number().nullable().optional(),
  creditAmountMinor: z.number().nullable().optional(),
  runningBalanceMinor: z.number().optional(),
  normalizedType: TransactionNormalizedTypeSchema,
  tags: z.array(z.string()),
  categoryId: z.string().optional(),
  categoryPath: z.array(z.string()).optional(),
  category: z.string().optional(),
  reference: z.string().optional(),
  reviewState: TransactionReviewStateSchema
})

export const TransactionLedgerQuerySchema = z.object({
  search: z.string().trim().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  types: z.array(TransactionNormalizedTypeSchema).optional(),
  tags: z.array(z.string()).optional(),
  reviewStates: z.array(TransactionReviewStateSchema).optional(),
  categories: z.array(z.string()).optional(),
  amountMinMinor: z.number().optional(),
  amountMaxMinor: z.number().optional()
})

export const GetTransactionDetailInputSchema = z.object({
  transactionId: z.string()
})

export const UpdateTransactionInputSchema = z.object({
  transactionId: z.string(),
  transactionDateRaw: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  signedAmountMinor: z.number().optional(),
  normalizedType: TransactionNormalizedTypeSchema.optional(),
  tags: z.array(z.string()).optional(),
  categoryId: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  reference: z.string().nullable().optional(),
  reviewStateOverride: TransactionReviewStateSchema.nullable().optional()
})

export const TransactionDetailSchema = z.object({
  id: z.string(),
  importBatchId: z.string(),
  sourceFileId: z.string(),
  batchLabel: z.string(),
  sourceFileName: z.string(),
  importedAt: z.string(),
  transactionDateRaw: z.string(),
  transactionDateSortable: z.string(),
  valueDateRaw: z.string().optional(),
  rawNarration: z.string(),
  description: z.string(),
  signedAmountMinor: z.number(),
  normalizedType: TransactionNormalizedTypeSchema,
  categoryId: z.string().optional(),
  categoryPath: z.array(z.string()).optional(),
  category: z.string().optional(),
  tags: z.array(z.string()),
  reference: z.string().optional(),
  reviewState: TransactionReviewStateSchema,
  reviewStateOverride: TransactionReviewStateSchema.nullable().optional(),
  runningBalanceMinor: z.number().optional(),
  direction: z.enum(['debit', 'credit'])
})

export const UpdateTransactionResultSchema = z.object({
  detail: TransactionDetailSchema,
  ruleSuggestion: TransactionRuleSuggestionSchema.optional()
})

export type TransactionNormalizedType = z.infer<typeof TransactionNormalizedTypeSchema>
export type TransactionReviewState = z.infer<typeof TransactionReviewStateSchema>
export type TransactionRuleSuggestion = z.infer<typeof TransactionRuleSuggestionSchema>
export type TransactionLedgerRow = z.infer<typeof TransactionLedgerRowSchema>
export type TransactionLedgerQuery = z.infer<typeof TransactionLedgerQuerySchema>
export type GetTransactionDetailInput = z.infer<typeof GetTransactionDetailInputSchema>
export type UpdateTransactionInput = z.infer<typeof UpdateTransactionInputSchema>
export type TransactionDetail = z.infer<typeof TransactionDetailSchema>
export type UpdateTransactionResult = z.infer<typeof UpdateTransactionResultSchema>
