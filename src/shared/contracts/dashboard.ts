import { z } from 'zod'
import { TransactionLedgerQuerySchema, TransactionNormalizedTypeSchema } from './transactions'

export const DashboardRangePresetSchema = z.enum(['week', 'month', 'year', 'all-time', 'custom'])

export const DashboardRangeSchema = z.object({
  preset: DashboardRangePresetSchema,
  from: z.string().optional(),
  to: z.string().optional()
})

export const DashboardCompareSchema = z.object({
  enabled: z.boolean(),
  from: z.string().optional(),
  to: z.string().optional()
})

export const DashboardSnapshotQuerySchema = z.object({
  range: DashboardRangeSchema,
  compare: DashboardCompareSchema.optional()
})

export const DashboardPreferencesSchema = z.object({
  range: DashboardRangeSchema,
  compareEnabled: z.boolean()
})

export const DashboardSummaryCardSchema = z.object({
  id: z.enum(['credited', 'debited', 'difference', 'income', 'expense']),
  label: z.string(),
  totalMinor: z.number(),
  previousTotalMinor: z.number().optional(),
  deltaMinor: z.number().optional(),
  trend: z.enum(['up', 'down', 'flat']),
  helper: z.string()
})

export const DashboardOperationalCardSchema = z.object({
  id: z.enum(['transfer', 'refund', 'atm-withdrawal', 'credit-card-payment']),
  label: z.string(),
  totalMinor: z.number(),
  transactionCount: z.number().int().nonnegative(),
  previousTotalMinor: z.number().optional(),
  deltaMinor: z.number().optional(),
  trend: z.enum(['up', 'down', 'flat']),
  helper: z.string()
})

export const DashboardTrendPointSchema = z.object({
  bucketKey: z.string(),
  bucketLabel: z.string(),
  from: z.string(),
  to: z.string(),
  spendMinor: z.number(),
  incomeMinor: z.number(),
  previousSpendMinor: z.number().optional(),
  previousIncomeMinor: z.number().optional(),
  ledgerQuery: TransactionLedgerQuerySchema.optional()
})

export const DashboardCategoryBreakdownItemSchema = z.object({
  categoryId: z.string().optional(),
  label: z.string(),
  totalMinor: z.number(),
  transactionCount: z.number().int().nonnegative(),
  percentageOfSpend: z.number(),
  ledgerQuery: TransactionLedgerQuerySchema.optional()
})

export const DashboardMerchantItemSchema = z.object({
  merchant: z.string(),
  totalMinor: z.number(),
  transactionCount: z.number().int().nonnegative(),
  ledgerQuery: TransactionLedgerQuerySchema.optional()
})

export const DashboardLargestTransactionItemSchema = z.object({
  transactionId: z.string(),
  description: z.string(),
  transactionDateRaw: z.string(),
  amountMinor: z.number(),
  normalizedType: TransactionNormalizedTypeSchema,
  ledgerQuery: TransactionLedgerQuerySchema.optional()
})

export const DashboardRecentTransactionItemSchema = z.object({
  transactionId: z.string(),
  description: z.string(),
  transactionDateRaw: z.string(),
  signedAmountMinor: z.number(),
  normalizedType: TransactionNormalizedTypeSchema,
  ledgerQuery: TransactionLedgerQuerySchema.optional()
})

export const DashboardRecurringItemSchema = z.object({
  id: z.string(),
  description: z.string(),
  direction: z.enum(['debit', 'credit']),
  normalizedType: TransactionNormalizedTypeSchema,
  occurrenceCount: z.number().int().min(2),
  averageAmountMinor: z.number(),
  lastTransactionDateRaw: z.string(),
  cadenceLabel: z.string(),
  ledgerQuery: TransactionLedgerQuerySchema.optional()
})

export const DashboardRecurringDetailSchema = z.object({
  item: DashboardRecurringItemSchema,
  transactions: z.array(
    z.object({
      transactionId: z.string(),
      transactionDateRaw: z.string(),
      description: z.string(),
      signedAmountMinor: z.number(),
      normalizedType: TransactionNormalizedTypeSchema
    })
  )
})

export const DashboardSnapshotSchema = z.object({
  query: DashboardSnapshotQuerySchema,
  summaryCards: z.array(DashboardSummaryCardSchema),
  operationalCards: z.array(DashboardOperationalCardSchema),
  spendTrend: z.array(DashboardTrendPointSchema),
  categoryBreakdown: z.array(DashboardCategoryBreakdownItemSchema),
  topMerchants: z.array(DashboardMerchantItemSchema),
  largestTransactions: z.array(DashboardLargestTransactionItemSchema),
  recentTransactions: z.array(DashboardRecentTransactionItemSchema),
  recurringItems: z.array(DashboardRecurringItemSchema)
})

export const DashboardRecurringDetailInputSchema = z.object({
  recurringId: z.string(),
  query: DashboardSnapshotQuerySchema
})

export type DashboardRangePreset = z.infer<typeof DashboardRangePresetSchema>
export type DashboardRange = z.infer<typeof DashboardRangeSchema>
export type DashboardCompare = z.infer<typeof DashboardCompareSchema>
export type DashboardSnapshotQuery = z.infer<typeof DashboardSnapshotQuerySchema>
export type DashboardPreferences = z.infer<typeof DashboardPreferencesSchema>
export type DashboardSummaryCard = z.infer<typeof DashboardSummaryCardSchema>
export type DashboardOperationalCard = z.infer<typeof DashboardOperationalCardSchema>
export type DashboardTrendPoint = z.infer<typeof DashboardTrendPointSchema>
export type DashboardCategoryBreakdownItem = z.infer<typeof DashboardCategoryBreakdownItemSchema>
export type DashboardMerchantItem = z.infer<typeof DashboardMerchantItemSchema>
export type DashboardLargestTransactionItem = z.infer<typeof DashboardLargestTransactionItemSchema>
export type DashboardRecentTransactionItem = z.infer<typeof DashboardRecentTransactionItemSchema>
export type DashboardRecurringItem = z.infer<typeof DashboardRecurringItemSchema>
export type DashboardRecurringDetail = z.infer<typeof DashboardRecurringDetailSchema>
export type DashboardSnapshot = z.infer<typeof DashboardSnapshotSchema>
export type DashboardRecurringDetailInput = z.infer<typeof DashboardRecurringDetailInputSchema>
