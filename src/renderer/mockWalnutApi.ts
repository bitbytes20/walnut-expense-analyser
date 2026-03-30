import type {
  AppShellState,
  CompleteOnboardingInput,
  DeviceProfileSummary,
  SaveOnboardingProgressInput,
  WalnutApi
} from '../shared/contracts/app-state'
import type { AccountProfileDraft } from '../shared/contracts/account'
import type {
  ApplyRuleToExistingInput,
  ArchiveCategoryInput,
  CategoryTreeNode,
  CategorizationRuleSummary,
  CreateCategoryInput,
  CreateCategorizationRuleInput,
  DeleteCategoryInput,
  DeleteCategorizationRuleInput,
  MergeCategoryInput,
  MergeCategoryPreview,
  ReorderRulesInput,
  RuleApplyPreview,
  RulePreviewInput,
  RuleTestPreview,
  ToggleCategorizationRuleInput,
  UpdateCategoryInput,
  UpdateCategorizationRuleInput
} from '../shared/contracts/categories'
import type {
  ChooseImportSheetInput,
  CommitImportBatchInput,
  GetImportBatchDetailInput,
  GetReviewQueueInput,
  ImportBatchDetail,
  ImportAttemptSummary,
  ListImportHistoryInput,
  PriorImportBatchInspection,
  ReviewItemResolutionInput,
  ReviewItemRestoreInput,
  RemoveStagedFileInput,
  ReplaceStagedFileInput,
  StageImportFilesInput,
  StageImportFilesResult,
  StagedImportFile,
  WorksheetCandidate
} from '../shared/contracts/import'
import type {
  LockReason,
  RecoveryResetPayload,
  SecurityEvent,
  SecurityState,
  UnlockResult
} from '../shared/contracts/security'
import type {
  BulkUpdateTransactionsInput,
  DeleteFilterPresetInput,
  FilterPreset,
  GetTransactionDetailInput,
  RenameFilterPresetInput,
  SaveFilterPresetInput,
  TransactionDetail,
  TransactionLedgerQuery,
  TransactionLedgerRow,
  TransactionNormalizedType,
  TransactionReviewState,
  UpdateTransactionInput,
  UpdateTransactionResult
} from '../shared/contracts/transactions'
import type {
  DashboardPreferences,
  DashboardRange,
  DashboardRangePreset,
  DashboardRecurringDetail,
  DashboardRecurringDetailInput,
  DashboardRecurringItem,
  DashboardSnapshot,
  DashboardSnapshotQuery,
  DashboardTrendPoint
} from '../shared/contracts/dashboard'
import { generateRecoveryKey, isValidPin } from '../shared/security-utils'

const STORAGE_KEY = 'walnut.mock.app-state'
const EVENTS_KEY = 'walnut.mock.security-events'
const STAGED_FILES_KEY = 'walnut.mock.staged-import-files'
const IMPORT_HISTORY_KEY = 'walnut.mock.import-history'
const IMPORT_BATCH_DETAILS_KEY = 'walnut.mock.import-batch-details'
const RESOLVED_REVIEW_ITEMS_KEY = 'walnut.mock.resolved-review-items'
const DEVICE_PROFILES_KEY = 'walnut.mock.device-profiles'
const ACTIVE_PROFILE_KEY = 'walnut.mock.active-profile-id'
const PROFILE_SNAPSHOTS_KEY = 'walnut.mock.profile-snapshots'
const CATEGORIES_KEY = 'walnut.mock.categories'
const RULES_KEY = 'walnut.mock.rules'
const DASHBOARD_PREFERENCES_KEY = 'walnut.mock.dashboard-preferences'

type StoredState = AppShellState & {
  mockPin?: string
  mockRecoveryCode?: string
  mockRecoveryWords?: string
}

type MockWalnutApi = WalnutApi & {
  __mock: true
}

const defaultCategories = (): CategoryTreeNode[] => [
  {
    id: 'cat:food-dining',
    name: 'Food & Dining',
    kind: 'system',
    path: ['Food & Dining'],
    isActive: true,
    isArchived: false,
    isIncomeCategory: false,
    sortOrder: 10,
    counts: { directTransactionCount: 0, totalTransactionCount: 0 },
    children: []
  },
  {
    id: 'cat:income',
    name: 'Income',
    kind: 'system',
    path: ['Income'],
    isActive: true,
    isArchived: false,
    isIncomeCategory: true,
    sortOrder: 160,
    counts: { directTransactionCount: 0, totalTransactionCount: 0 },
    children: [
      {
        id: 'cat:income-salary',
        name: 'Salary',
        kind: 'system',
        parentId: 'cat:income',
        path: ['Income', 'Salary'],
        isActive: true,
        isArchived: false,
        isIncomeCategory: true,
        sortOrder: 161,
        counts: { directTransactionCount: 0, totalTransactionCount: 0 },
        children: []
      }
    ]
  },
  {
    id: 'cat:uncategorized',
    name: 'Uncategorized',
    kind: 'system',
    path: ['Uncategorized'],
    isActive: true,
    isArchived: false,
    isIncomeCategory: false,
    sortOrder: 190,
    counts: { directTransactionCount: 0, totalTransactionCount: 0 },
    children: []
  }
]

const defaultRules = (): CategorizationRuleSummary[] => []

const defaultState = (): StoredState => ({
  currentView: 'onboarding',
  onboarding: {
    currentStep: 'welcome',
    completedSteps: [],
    recoveryConfirmed: false,
    recoverySavedToDevice: false
  },
  security: {
    failedAttempts: 0,
    isLocked: false
  },
  dashboard: {
    heading: 'Ready for your first import',
    body: 'Add your first ICICI statement to create the account timeline and unlock dashboard insights.',
    primaryActionLabel: 'Import your first statement'
  },
  deviceProfiles: []
})

const readState = (): StoredState => {
  const raw = window.localStorage.getItem(STORAGE_KEY)
  return raw ? (JSON.parse(raw) as StoredState) : defaultState()
}

const writeState = (state: StoredState) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  return state
}

const readEvents = (): SecurityEvent[] => {
  const raw = window.localStorage.getItem(EVENTS_KEY)
  return raw ? (JSON.parse(raw) as SecurityEvent[]) : []
}

const writeEvents = (events: SecurityEvent[]) => {
  window.localStorage.setItem(EVENTS_KEY, JSON.stringify(events))
}

const readStagedFiles = (): StagedImportFile[] => {
  const raw = window.localStorage.getItem(STAGED_FILES_KEY)
  return raw ? (JSON.parse(raw) as StagedImportFile[]) : []
}

const writeStagedFiles = (files: StagedImportFile[]) => {
  window.localStorage.setItem(STAGED_FILES_KEY, JSON.stringify(files))
  return files
}

const readImportHistory = (): ImportAttemptSummary[] => {
  const raw = window.localStorage.getItem(IMPORT_HISTORY_KEY)
  return raw ? (JSON.parse(raw) as ImportAttemptSummary[]) : []
}

const writeImportHistory = (history: ImportAttemptSummary[]) => {
  window.localStorage.setItem(IMPORT_HISTORY_KEY, JSON.stringify(history))
  return history
}

const readImportBatchDetails = (): Record<string, ImportBatchDetail> => {
  const raw = window.localStorage.getItem(IMPORT_BATCH_DETAILS_KEY)
  return raw ? (JSON.parse(raw) as Record<string, ImportBatchDetail>) : {}
}

const readResolvedReviewItems = (): Record<string, ImportBatchDetail['reviewItems']> => {
  const raw = window.localStorage.getItem(RESOLVED_REVIEW_ITEMS_KEY)
  return raw ? (JSON.parse(raw) as Record<string, ImportBatchDetail['reviewItems']>) : {}
}

const orderReviewItems = (detail: ImportBatchDetail) => ({
  ...detail,
  reviewItems: [...detail.reviewItems]
    .filter((item) => item.state === 'pending')
    .sort((left, right) => {
      if (left.severity !== right.severity) {
        return left.severity === 'blocking' ? -1 : 1
      }

      const leftSource = left.snapshot.sourceFileName ?? ''
      const rightSource = right.snapshot.sourceFileName ?? ''
      if (leftSource !== rightSource) {
        return leftSource.localeCompare(rightSource)
      }

      return (left.snapshot.rowIndex ?? 0) - (right.snapshot.rowIndex ?? 0)
    })
})

const writeImportBatchDetails = (details: Record<string, ImportBatchDetail>) => {
  window.localStorage.setItem(IMPORT_BATCH_DETAILS_KEY, JSON.stringify(details))
  return details
}

const writeResolvedReviewItems = (items: Record<string, ImportBatchDetail['reviewItems']>) => {
  window.localStorage.setItem(RESOLVED_REVIEW_ITEMS_KEY, JSON.stringify(items))
  return items
}

const readDeviceProfiles = (): DeviceProfileSummary[] => {
  const raw = window.localStorage.getItem(DEVICE_PROFILES_KEY)
  return raw ? (JSON.parse(raw) as DeviceProfileSummary[]) : []
}

const writeDeviceProfiles = (profiles: DeviceProfileSummary[]) => {
  window.localStorage.setItem(DEVICE_PROFILES_KEY, JSON.stringify(profiles))
  return profiles
}

const readActiveProfileId = () => window.localStorage.getItem(ACTIVE_PROFILE_KEY) ?? undefined

const writeActiveProfileId = (profileId?: string) => {
  if (!profileId) {
    window.localStorage.removeItem(ACTIVE_PROFILE_KEY)
    return
  }

  window.localStorage.setItem(ACTIVE_PROFILE_KEY, profileId)
}

type ProfileSnapshot = {
  state: StoredState
  events: SecurityEvent[]
  importHistory: ImportAttemptSummary[]
  importBatchDetails: Record<string, ImportBatchDetail>
  resolvedReviewItems: Record<string, ImportBatchDetail['reviewItems']>
}

const readProfileSnapshots = (): Record<string, ProfileSnapshot> => {
  const raw = window.localStorage.getItem(PROFILE_SNAPSHOTS_KEY)
  return raw ? (JSON.parse(raw) as Record<string, ProfileSnapshot>) : {}
}

const writeProfileSnapshots = (snapshots: Record<string, ProfileSnapshot>) => {
  window.localStorage.setItem(PROFILE_SNAPSHOTS_KEY, JSON.stringify(snapshots))
  return snapshots
}

const readCategories = (): CategoryTreeNode[] => {
  const raw = window.localStorage.getItem(CATEGORIES_KEY)
  return raw ? (JSON.parse(raw) as CategoryTreeNode[]) : defaultCategories()
}

const writeCategories = (categories: CategoryTreeNode[]) => {
  window.localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories))
  return categories
}

const readRules = (): CategorizationRuleSummary[] => {
  const raw = window.localStorage.getItem(RULES_KEY)
  return raw ? (JSON.parse(raw) as CategorizationRuleSummary[]) : defaultRules()
}

const writeRules = (rules: CategorizationRuleSummary[]) => {
  window.localStorage.setItem(RULES_KEY, JSON.stringify(rules))
  return rules
}

const readDashboardPreferences = (): DashboardPreferences | undefined => {
  const raw = window.localStorage.getItem(DASHBOARD_PREFERENCES_KEY)
  return raw ? (JSON.parse(raw) as DashboardPreferences) : undefined
}

const writeDashboardPreferences = (preferences: DashboardPreferences) => {
  window.localStorage.setItem(DASHBOARD_PREFERENCES_KEY, JSON.stringify(preferences))
  return preferences
}

const syncHistorySummary = (batchId: string, detail: ImportBatchDetail) => {
  const history = readImportHistory().map((row) =>
    row.batchId === batchId
      ? {
          ...row,
          status: detail.summary.status,
          unresolvedReviewCount: detail.summary.unresolvedReviewCount,
          lastUpdatedAt: detail.summary.lastUpdatedAt
        }
      : row
  )

  writeImportHistory(history)
}

const applyReviewEdits = (detail: ImportBatchDetail, input: ReviewItemResolutionInput) => {
  if (!input.edits && !input.tag) {
    return detail
  }

  const targetIds = new Set(input.reviewItemIds)
  return {
    ...detail,
    transactionGroups: detail.transactionGroups.map((group) => ({
      ...group,
      transactions: group.transactions.map((transaction) => {
        const reviewItem = detail.reviewItems.find(
          (item) => targetIds.has(item.id) && item.snapshot.parsedRow?.reference === transaction.reference
        )
        if (!reviewItem) {
          return transaction
        }

        return {
          ...transaction,
          transactionDateRaw: input.edits?.transactionDateRaw ?? transaction.transactionDateRaw,
          cleanedDescription: input.edits?.cleanedDescription ?? transaction.cleanedDescription,
          reference: input.edits?.reference ?? transaction.reference,
          tags:
            input.action === 'apply-tag' && input.tag
              ? [...new Set([...(transaction.tags ?? []), input.tag])]
              : input.edits?.tags ?? transaction.tags
        }
      })
    }))
  }
}

const toSortableDateKey = (raw: string) => {
  const trimmed = raw.trim()
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed)
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`
  }

  const slashMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed)
  if (slashMatch) {
    const [, day, month, year] = slashMatch
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  return trimmed
}

const formatIsoDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const addDaysToIso = (iso: string, days: number) => {
  const date = new Date(`${iso}T00:00:00`)
  date.setDate(date.getDate() + days)
  return formatIsoDate(date)
}

const startOfMonthIso = (iso: string) => {
  const date = new Date(`${iso}T00:00:00`)
  date.setDate(1)
  return formatIsoDate(date)
}

const endOfMonthIso = (iso: string) => {
  const date = new Date(`${iso}T00:00:00`)
  date.setMonth(date.getMonth() + 1, 0)
  return formatIsoDate(date)
}

const startOfYearIso = (iso: string) => {
  const date = new Date(`${iso}T00:00:00`)
  date.setMonth(0, 1)
  return formatIsoDate(date)
}

const endOfYearIso = (iso: string) => {
  const date = new Date(`${iso}T00:00:00`)
  date.setMonth(11, 31)
  return formatIsoDate(date)
}

const startOfWeekIso = (iso: string) => {
  const date = new Date(`${iso}T00:00:00`)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  return formatIsoDate(date)
}

const endOfWeekIso = (iso: string) => addDaysToIso(startOfWeekIso(iso), 6)

const differenceInDaysInclusive = (from: string, to: string) => {
  const fromDate = new Date(`${from}T00:00:00`)
  const toDate = new Date(`${to}T00:00:00`)
  const diff = toDate.getTime() - fromDate.getTime()
  return Math.max(1, Math.round(diff / 86400000) + 1)
}

const formatTrendMonth = (iso: string) =>
  new Intl.DateTimeFormat('en-IN', {
    month: 'short'
  }).format(new Date(`${iso}T00:00:00`))

const formatTrendDay = (iso: string) =>
  new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short'
  }).format(new Date(`${iso}T00:00:00`))

const resolveDashboardRange = (range: DashboardRange, rows: TransactionLedgerRow[]): DashboardRange => {
  const ordered = [...rows].sort((left, right) => left.transactionDateSortable.localeCompare(right.transactionDateSortable))
  const first = ordered[0]?.transactionDateSortable ?? formatIsoDate(new Date())
  const last = ordered.at(-1)?.transactionDateSortable ?? first

  if (range.preset === 'custom' && range.from && range.to) {
    return {
      preset: 'custom',
      from: toSortableDateKey(range.from),
      to: toSortableDateKey(range.to)
    }
  }

  if (range.preset === 'all-time') {
    return { preset: 'all-time', from: first, to: last }
  }

  if (range.preset === 'year') {
    return { preset: 'year', from: startOfYearIso(last), to: endOfYearIso(last) }
  }

  if (range.preset === 'month') {
    return { preset: 'month', from: startOfMonthIso(last), to: endOfMonthIso(last) }
  }

  return { preset: 'week', from: startOfWeekIso(last), to: endOfWeekIso(last) }
}

const defaultDashboardPreferences = (rows: TransactionLedgerRow[]): DashboardPreferences => ({
  range: resolveDashboardRange({ preset: 'month' }, rows),
  compareEnabled: true
})

const resolveDashboardQuery = (query: DashboardSnapshotQuery, rows: TransactionLedgerRow[]): DashboardSnapshotQuery => {
  const range = resolveDashboardRange(query.range, rows)
  const compareEnabled = Boolean(query.compare?.enabled)
  if (!compareEnabled) {
    return { range, compare: { enabled: false } }
  }

  const span = differenceInDaysInclusive(range.from!, range.to!)
  const compareTo = addDaysToIso(range.from!, -1)
  const compareFrom = addDaysToIso(compareTo, -(span - 1))

  return {
    range,
    compare: {
      enabled: true,
      from: compareFrom,
      to: compareTo
    }
  }
}

const toTrend = (current: number, previous?: number) => {
  if (previous === undefined || current === previous) {
    return 'flat' as const
  }

  return current > previous ? 'up' as const : 'down' as const
}

const isSpendType = (type: TransactionNormalizedType) =>
  type === 'expense' || type === 'atm-withdrawal' || type === 'credit-card-payment'

const isIncomeType = (type: TransactionNormalizedType) => type === 'income' || type === 'refund'

const bucketForPreset = (row: TransactionLedgerRow, preset: DashboardRangePreset) => {
  if (preset === 'year' || preset === 'all-time') {
    const from = startOfMonthIso(row.transactionDateSortable)
    return {
      bucketKey: from,
      bucketLabel: formatTrendMonth(from),
      from,
      to: endOfMonthIso(row.transactionDateSortable)
    }
  }

  if (preset === 'month') {
    const from = startOfWeekIso(row.transactionDateSortable)
    const to = endOfWeekIso(row.transactionDateSortable)
    return {
      bucketKey: from,
      bucketLabel: `${formatTrendDay(from)} - ${formatTrendDay(to)}`,
      from,
      to
    }
  }

  return {
    bucketKey: row.transactionDateSortable,
    bucketLabel: formatTrendDay(row.transactionDateSortable),
    from: row.transactionDateSortable,
    to: row.transactionDateSortable
  }
}

const buildSpendTrend = (
  rows: TransactionLedgerRow[],
  compareRows: TransactionLedgerRow[],
  preset: DashboardRangePreset
): DashboardTrendPoint[] => {
  const aggregate = (inputRows: TransactionLedgerRow[]) => {
    const map = new Map<string, DashboardTrendPoint>()
    for (const row of inputRows) {
      const bucket = bucketForPreset(row, preset)
      const current = map.get(bucket.bucketKey) ?? {
        ...bucket,
        spendMinor: 0,
        incomeMinor: 0,
        ledgerQuery: {
          dateFrom: bucket.from,
          dateTo: bucket.to
        }
      }
      if (isSpendType(row.normalizedType)) {
        current.spendMinor += row.debitAmountMinor ?? Math.abs(Math.min(row.signedAmountMinor, 0))
      }
      if (isIncomeType(row.normalizedType)) {
        current.incomeMinor += row.creditAmountMinor ?? Math.abs(Math.max(row.signedAmountMinor, 0))
      }
      map.set(bucket.bucketKey, current)
    }

    return Array.from(map.values()).sort((left, right) => left.from.localeCompare(right.from))
  }

  const currentBuckets = aggregate(rows)
  const previousBuckets = aggregate(compareRows)

  return currentBuckets.map((bucket, index) => ({
    ...bucket,
    previousSpendMinor: previousBuckets[index]?.spendMinor,
    previousIncomeMinor: previousBuckets[index]?.incomeMinor
  }))
}

const buildRecurringItems = (rows: TransactionLedgerRow[], range: DashboardRange): DashboardRecurringItem[] => {
  const map = new Map<
    string,
    {
      id: string
      description: string
      direction: 'debit' | 'credit'
      normalizedType: TransactionNormalizedType
      occurrenceCount: number
      totalAmountMinor: number
      lastTransactionDateRaw: string
    }
  >()

  for (const row of rows) {
    const direction = row.signedAmountMinor >= 0 ? 'credit' : 'debit'
    const id = `${row.normalizedType}|${direction}|${row.description.trim().toLowerCase()}`
    const current = map.get(id) ?? {
      id,
      description: row.description,
      direction,
      normalizedType: row.normalizedType,
      occurrenceCount: 0,
      totalAmountMinor: 0,
      lastTransactionDateRaw: row.transactionDateRaw
    }
    current.occurrenceCount += 1
    current.totalAmountMinor += Math.abs(row.signedAmountMinor)
    if (toSortableDateKey(row.transactionDateRaw) > toSortableDateKey(current.lastTransactionDateRaw)) {
      current.lastTransactionDateRaw = row.transactionDateRaw
    }
    map.set(id, current)
  }

  return Array.from(map.values())
    .filter((item) => item.occurrenceCount >= 2)
    .sort((left, right) => right.occurrenceCount - left.occurrenceCount || right.totalAmountMinor - left.totalAmountMinor)
    .slice(0, 6)
    .map((item) => ({
      id: item.id,
      description: item.description,
      direction: item.direction,
      normalizedType: item.normalizedType,
      occurrenceCount: item.occurrenceCount,
      averageAmountMinor: Math.round(item.totalAmountMinor / item.occurrenceCount),
      lastTransactionDateRaw: item.lastTransactionDateRaw,
      cadenceLabel: `Repeats ${item.occurrenceCount} times`,
      ledgerQuery: {
        dateFrom: range.from,
        dateTo: range.to,
        search: item.description,
        types: [item.normalizedType]
      }
    }))
}

const deriveNormalizedType = (description: string, rawNarration: string, reference: string | undefined, direction: 'debit' | 'credit'): TransactionNormalizedType => {
  const text = `${description} ${rawNarration} ${reference ?? ''}`.toLowerCase()

  if (text.includes('atm')) {
    return 'atm-withdrawal'
  }
  if (text.includes('refund') && direction === 'credit') {
    return 'refund'
  }
  if (text.includes('credit card payment') || text.includes('card payment') || text.includes('cc payment')) {
    return 'credit-card-payment'
  }
  if (text.includes('transfer') || text.includes('imps') || text.includes('neft') || text.includes('rtgs') || text.includes('upi')) {
    return 'transfer'
  }

  return direction === 'credit' ? 'income' : 'expense'
}

const flattenTransactions = (): TransactionDetail[] => {
  const details = Object.values(readImportBatchDetails())

  return details.flatMap((detail) =>
    detail.transactionGroups.flatMap((group) =>
      group.transactions.map((transaction) => {
        const signedAmountMinor =
          transaction.creditAmountMinor !== undefined
            ? transaction.creditAmountMinor
            : -Math.abs(transaction.debitAmountMinor ?? 0)
        const reviewState: TransactionReviewState = detail.summary.unresolvedReviewCount > 0 ? 'pending-review' : 'clean'

        return {
          id: transaction.id,
          importBatchId: transaction.importBatchId,
          sourceFileId: transaction.sourceFileId,
          batchLabel: detail.summary.batchLabel,
          sourceFileName: group.sourceFileName,
          importedAt: detail.summary.importedAt,
          transactionDateRaw: transaction.transactionDateRaw,
          transactionDateSortable: toSortableDateKey(transaction.transactionDateRaw),
          valueDateRaw: transaction.valueDateRaw,
          rawNarration: transaction.rawNarration,
          description: transaction.cleanedDescription,
          signedAmountMinor,
          debitAmountMinor: transaction.debitAmountMinor ?? null,
          creditAmountMinor: transaction.creditAmountMinor ?? null,
          runningBalanceMinor: transaction.runningBalanceMinor,
          normalizedType: deriveNormalizedType(
            transaction.cleanedDescription,
            transaction.rawNarration,
            transaction.reference,
            transaction.direction
          ),
          categoryId: (transaction as typeof transaction & { categoryId?: string }).categoryId,
          categoryPath: (transaction as typeof transaction & { categoryPath?: string[] }).categoryPath,
          category: (transaction as typeof transaction & { category?: string }).category,
          tags: transaction.tags ?? [],
          reference: transaction.reference,
          reviewState,
          reviewStateOverride: null,
          direction: transaction.direction
        }
      })
    )
  )
}

const logEvent = (eventType: string, metadataJson?: string) => {
  const next: SecurityEvent = {
    id: crypto.randomUUID(),
    eventType,
    createdAt: new Date().toISOString(),
    metadataJson
  }
  writeEvents([next, ...readEvents()])
}

const withoutMocks = (state: StoredState): AppShellState => {
  const { mockPin: _mockPin, mockRecoveryCode: _mockRecoveryCode, mockRecoveryWords: _mockRecoveryWords, ...rest } = state
  const activeProfileId = readActiveProfileId()
  return {
    ...rest,
    activeProfileId,
    deviceProfiles: readDeviceProfiles().map((profile) => ({
      ...profile,
      isActive: profile.id === activeProfileId
    }))
  }
}

const createProfileSummary = (state: StoredState, profileId: string, existing?: DeviceProfileSummary): DeviceProfileSummary | undefined => {
  const householdName = state.onboarding.profile?.householdName?.trim()
  const ownerName = state.onboarding.profile?.ownerName?.trim()
  if (!householdName || !ownerName) {
    return undefined
  }

  const stamp = new Date().toISOString()
  return {
    id: profileId,
    householdName,
    ownerName,
    accountLabel: state.accountProfile?.displayName ?? state.security.lastUnlockedAccountLabel,
    lastUnlockedAt: state.security.lastUnlockedAt,
    createdAt: existing?.createdAt ?? stamp,
    updatedAt: stamp,
    isActive: true
  }
}

const captureProfileSnapshot = (state: StoredState): ProfileSnapshot => ({
  state,
  events: readEvents(),
  importHistory: readImportHistory(),
  importBatchDetails: readImportBatchDetails(),
  resolvedReviewItems: readResolvedReviewItems()
})

const persistActiveProfile = (state: StoredState) => {
  const activeProfileId = readActiveProfileId()
  if (!activeProfileId || !state.onboarding.profile) {
    return
  }

  const profiles = readDeviceProfiles()
  const existing = profiles.find((profile) => profile.id === activeProfileId)
  const summary = createProfileSummary(state, activeProfileId, existing)
  if (!summary) {
    return
  }

  writeDeviceProfiles([summary, ...profiles.filter((profile) => profile.id !== activeProfileId)])
  const snapshots = readProfileSnapshots()
  writeProfileSnapshots({
    ...snapshots,
    [activeProfileId]: captureProfileSnapshot(state)
  })
}

const updateSecurity = (update: Partial<SecurityState>) => {
  const current = readState()
  return writeState({
    ...current,
    security: {
      ...current.security,
      ...update
    }
  })
}

const createWorksheetCandidates = (): WorksheetCandidate[] => [
  {
    name: 'OpTransactionHistory',
    rowCount: 66,
    headerPreview: ['Transaction Date', 'Transaction Remarks', 'Withdrawal Amount(INR)', 'Deposit Amount(INR)', 'Balance(INR)'],
    recommended: true
  },
  {
    name: 'Transactions',
    rowCount: 64,
    headerPreview: ['Value Date', 'Narration', 'Debit', 'Credit', 'Balance'],
    recommended: false
  }
]

const statementAccountLabel = '187501504556 ( INR )  - OMPRAKASH HARISHCHANDRA GAUTAM'
const statementPeriodLabel = '01/07/2016 to 31/12/2016'

const createStagedFile = (rawPath: string, history: ImportAttemptSummary[]): StagedImportFile => {
  const normalizedPath = rawPath.replace(/\\/g, '/')
  const fileName = normalizedPath.split('/').pop() ?? rawPath
  const lowerName = fileName.toLowerCase()
  const extension = lowerName.endsWith('.csv') ? 'csv' : lowerName.endsWith('.xls') ? 'xls' : lowerName.endsWith('.xlsx') ? 'xlsx' : 'unknown'
  const latestHistory = history[0]

  if (lowerName.includes('unsupported')) {
    return {
      id: crypto.randomUUID(),
      fileName,
      fileExtension: extension,
      filePath: rawPath,
      status: 'rejected',
      accountLabel: statementAccountLabel,
      statementPeriodLabel,
      reasonCode: 'missing-columns',
      reasonTitle: 'ICICI columns were not recognized',
      reasonBody: 'Use an ICICI account statement in CSV, XLS, or XLSX with transaction date, narration, and debit or credit columns.'
    }
  }

  if (lowerName.includes('ambiguous')) {
    return {
      id: crypto.randomUUID(),
      fileName,
      fileExtension: extension,
      filePath: rawPath,
      status: 'needs-sheet-selection',
      accountLabel: statementAccountLabel,
      statementPeriodLabel,
      worksheetCandidates: createWorksheetCandidates(),
      reasonCode: 'ambiguous-sheet',
      reasonTitle: 'Choose the worksheet to import',
      reasonBody: 'More than one worksheet looks like an ICICI transaction sheet. Review the recommended sheet before continuing.'
    }
  }

  if (lowerName.includes('duplicate')) {
    const priorBatch = latestHistory

    return {
      id: crypto.randomUUID(),
      fileName,
      fileExtension: extension,
      filePath: rawPath,
      status: 'duplicate-blocked',
      accountLabel: statementAccountLabel,
      statementPeriodLabel,
      reasonCode: 'duplicate-file',
      reasonTitle: 'Walnut already imported this statement',
      reasonBody: 'This file matches a previously imported statement, even if the filename changed.',
      priorBatch: {
        priorBatchId: priorBatch?.batchId ?? 'mock-batch-earlier',
        batchLabel: priorBatch?.batchLabel ?? 'ICICI import 01/07/2016 to 31/12/2016',
        importedAt: priorBatch?.importedAt ?? new Date().toISOString(),
        fileCount: priorBatch?.fileCount ?? 1,
        matchedFileName: 'icici-valid.xlsx'
      }
    }
  }

  return {
    id: crypto.randomUUID(),
    fileName,
    fileExtension: extension,
    filePath: rawPath,
    status: 'ready',
    accountLabel: statementAccountLabel,
    statementPeriodLabel,
    warnings: lowerName.includes('warning') ? ['Check after import: balance continuity needs review.'] : undefined
  }
}

const mergeStagedFiles = (incoming: StagedImportFile[]) => {
  const existing = readStagedFiles()
  const next = [...existing, ...incoming]
  writeStagedFiles(next)
  return next
}

export const createMockWalnutApi = (): MockWalnutApi => ({
  __mock: true,
  async loadAppState() {
    return withoutMocks(readState())
  },
  async saveOnboardingProgress(input: SaveOnboardingProgressInput) {
    const current = readState()
    return withoutMocks(
      writeState({
        ...current,
        onboarding: {
          ...current.onboarding,
          ...input
        }
      })
    )
  },
  async startNewProfileSetup() {
    persistActiveProfile(readState())
    window.localStorage.removeItem(STORAGE_KEY)
    window.localStorage.removeItem(EVENTS_KEY)
    window.localStorage.removeItem(STAGED_FILES_KEY)
    window.localStorage.removeItem(IMPORT_HISTORY_KEY)
    window.localStorage.removeItem(IMPORT_BATCH_DETAILS_KEY)
    window.localStorage.removeItem(RESOLVED_REVIEW_ITEMS_KEY)
    writeActiveProfileId(undefined)
    const next = writeState(defaultState())
    return withoutMocks(next)
  },
  async completeOnboarding(input: CompleteOnboardingInput) {
    const current = readState()
    const recoveryKey = current.onboarding.recoveryKey ?? generateRecoveryKey()
    const next = writeState({
      ...current,
      currentView: 'dashboard',
      onboarding: {
        ...current.onboarding,
        profile: input.profile,
        accountDraft: input.accountDraft,
        completedSteps: ['welcome', 'household-profile', 'pin-setup', 'recovery-key', 'account-profile', 'finish'],
        currentStep: 'finish',
        recoveryConfirmed: true,
        recoverySavedToDevice: true,
        recoveryKey
      },
      security: {
        ...current.security,
        failedAttempts: 0,
        isLocked: false,
        recoverySetupConfirmedAt: new Date().toISOString()
      },
      accountProfile: input.accountDraft
        ? {
            id: 'account-primary',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ...input.accountDraft
          }
        : undefined,
      mockPin: input.pin,
      mockRecoveryCode: recoveryKey.code,
      mockRecoveryWords: recoveryKey.words.join(' ')
    })
    const profileId = readActiveProfileId() ?? crypto.randomUUID()
    writeActiveProfileId(profileId)
    persistActiveProfile(next)
    return withoutMocks(next)
  },
  async switchDeviceProfile(profileId: string) {
    persistActiveProfile(readState())
    const snapshot = readProfileSnapshots()[profileId]
    if (!snapshot) {
      throw new Error('This local profile is no longer available on the device.')
    }

    writeState({
      ...snapshot.state,
      currentView: 'locked',
      security: {
        ...snapshot.state.security,
        isLocked: true,
        lockReason: 'manual',
        lastLockedAt: new Date().toISOString()
      }
    })
    writeEvents(snapshot.events)
    writeImportHistory(snapshot.importHistory)
    writeImportBatchDetails(snapshot.importBatchDetails)
    writeResolvedReviewItems(snapshot.resolvedReviewItems)
    writeActiveProfileId(profileId)

    const next = readState()
    persistActiveProfile(next)
    return withoutMocks(next)
  },
  async lockNow(reason?: LockReason) {
    const next = updateSecurity({
        isLocked: true,
        lockReason: reason ?? 'manual',
        lastLockedAt: new Date().toISOString()
      })
    persistActiveProfile(next)
    return withoutMocks(next)
  },
  async unlockWithPin(pin: string): Promise<UnlockResult> {
    const current = readState()
    const failedAttempts = current.security.failedAttempts ?? 0
    const cooldownUntil = current.security.cooldownUntil ? new Date(current.security.cooldownUntil).getTime() : 0

    if (cooldownUntil > Date.now()) {
      return {
        ok: false,
        state: current.security,
        message: `Try again in ${Math.ceil((cooldownUntil - Date.now()) / 1000)}s`
      }
    }

    if (pin === current.mockPin) {
      const next = updateSecurity({
        isLocked: false,
        failedAttempts: 0,
        cooldownUntil: undefined,
        lastUnlockedAt: new Date().toISOString()
      })
      persistActiveProfile(next)
      logEvent('security.unlock_succeeded')
      return { ok: true, state: next.security }
    }

    const nextFailedAttempts = failedAttempts + 1
    const backoffMs = nextFailedAttempts >= 3 ? Math.min(30000 * 2 ** (nextFailedAttempts - 3), 600000) : 0
    const next = updateSecurity({
      isLocked: true,
      failedAttempts: nextFailedAttempts,
      cooldownUntil: backoffMs ? new Date(Date.now() + backoffMs).toISOString() : undefined
    })
    logEvent('security.unlock_failed')
    return {
      ok: false,
      state: next.security,
      message: backoffMs
        ? `Try again in ${Math.ceil(backoffMs / 1000)}s`
        : "We couldn't verify that PIN. Check the digits and try again. If you're locked out, use your recovery key."
    }
  },
  async beginRecoveryReset(payload: RecoveryResetPayload) {
    if (!isValidPin(payload.newPin)) {
      throw new Error('PIN must be numeric and at least 6 digits long.')
    }
    const current = readState()
    const normalized = payload.recoveryInput.trim().toUpperCase()
    const code = (current.mockRecoveryCode ?? '').toUpperCase()
    const words = (current.mockRecoveryWords ?? '').toUpperCase()
    if (normalized !== code && normalized !== words) {
      logEvent('security.recovery_key_failed')
      throw new Error('Recovery key did not match this device.')
    }
    const rotated = generateRecoveryKey()
    const next = writeState({
      ...current,
      currentView: 'locked',
      onboarding: {
        ...current.onboarding,
        recoveryKey: rotated
      },
      security: {
        ...current.security,
        isLocked: true,
        failedAttempts: 0,
        cooldownUntil: undefined,
        lockReason: 'manual',
        lastLockedAt: new Date().toISOString()
      },
      mockPin: payload.newPin,
      mockRecoveryCode: rotated.code,
      mockRecoveryWords: rotated.words.join(' ')
    })
    logEvent('security.recovery_key_rotated')
    return withoutMocks(next)
  },
  async saveAccountProfile(draft: AccountProfileDraft) {
    const current = readState()
    const next = writeState({
      ...current,
      accountProfile: {
        id: 'account-primary',
        createdAt: current.accountProfile?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...draft
      }
    })
    persistActiveProfile(next)
    return withoutMocks(next)
  },
  async copyRecoveryKeyAcknowledged() {
    const current = readState()
    return withoutMocks(
      writeState({
        ...current,
        onboarding: {
          ...current.onboarding,
          recoveryConfirmed: true,
          recoverySavedToDevice: true
        }
      })
    )
  },
  async downloadRecoveryKeyAcknowledged() {
    const current = readState()
    return withoutMocks(
      writeState({
        ...current,
        onboarding: {
          ...current.onboarding,
          recoveryConfirmed: true,
          recoverySavedToDevice: true
        }
      })
    )
  },
  async getSecurityEvents() {
    return readEvents()
  },
  async stageImportFiles(input?: StageImportFilesInput): Promise<StageImportFilesResult> {
    const history = readImportHistory()
    const staged = (input?.filePaths ?? []).map((filePath) => createStagedFile(filePath, history))
    return {
      stagedFiles: mergeStagedFiles(staged)
    }
  },
  async chooseImportSheet(input: ChooseImportSheetInput): Promise<StageImportFilesResult> {
    const updated = readStagedFiles().map((file) =>
      file.id === input.stagedFileId
        ? {
            ...file,
            status: 'ready' as const,
            selectedWorksheetName: input.worksheetName,
            worksheetCandidates: file.worksheetCandidates?.map((candidate) => ({
              ...candidate,
              recommended: candidate.name === input.worksheetName
            })),
            reasonCode: undefined,
            reasonTitle: undefined,
            reasonBody: undefined
          }
        : file
    )
    return {
      stagedFiles: writeStagedFiles(updated)
    }
  },
  async removeStagedFile(input: RemoveStagedFileInput): Promise<StageImportFilesResult> {
    return {
      stagedFiles: writeStagedFiles(readStagedFiles().filter((file) => file.id !== input.stagedFileId))
    }
  },
  async commitImportBatch(input?: CommitImportBatchInput) {
    const current = readState()
    const targetIds = input?.stagedFileIds?.length ? new Set(input.stagedFileIds) : undefined
    const stagedFiles = readStagedFiles().filter((file) => !targetIds || targetIds.has(file.id))
    const importedAt = new Date().toISOString()
    const importedFiles = stagedFiles
      .filter((file) => file.status === 'ready')
      .map((file) => ({
        ...file,
        status: 'imported' as const,
        importedTransactionCount: 8,
        warnings: file.warnings
      }))
    const rejectedFiles = stagedFiles.filter((file) => file.status === 'rejected')
    const duplicateBlockedFiles = stagedFiles.filter((file) => file.status === 'duplicate-blocked')
    const lazyAccountCreated = importedFiles.length > 0 && !current.accountProfile

    if (lazyAccountCreated) {
      writeState({
        ...current,
        accountProfile: {
          id: 'account-primary',
          bankName: 'ICICI',
          displayName: 'Primary ICICI',
          accountHolderName: current.onboarding.profile?.ownerName ?? 'Walnut Owner',
          baseCurrency: 'INR',
          createdAt: importedAt,
          updatedAt: importedAt
        }
      })
    }

    const batchId = crypto.randomUUID()
    const attemptId = crypto.randomUUID()
    if (importedFiles.length > 0) {
      const summary: ImportAttemptSummary = {
        attemptId,
        batchId,
        status: importedFiles.some((file) => file.warnings?.length) ? 'needs-review' : 'imported',
        importedAt,
        accountLabel: importedFiles[0]?.accountLabel,
        batchLabel: `ICICI import ${statementPeriodLabel}`,
        fileCount: stagedFiles.length,
        acceptedTransactionCount: importedFiles.length * 8,
        blockedDuplicateCount: duplicateBlockedFiles.length,
        unresolvedReviewCount: importedFiles.some((file) => file.warnings?.length) ? 1 : 0,
        errorCount: rejectedFiles.length,
        lastUpdatedAt: importedAt
      }
      writeImportHistory([summary, ...readImportHistory()])
      writeImportBatchDetails({
        ...readImportBatchDetails(),
        [batchId]: {
          summary,
          reviewItems:
            summary.unresolvedReviewCount > 0
              ? [
                  {
                    id: 'mock-review-item',
                    batchId,
                    importAttemptId: attemptId,
                    reasonCode: 'balance-continuity-warning',
                    severity: 'warning',
                    state: 'pending',
                    title: 'Balance continuity warning',
                    description: 'Check after import: balance continuity needs review.',
                    snapshot: {
                      sourceFileId: importedFiles[0]?.id,
                      sourceFileName: importedFiles[0]?.fileName,
                      message: 'Check after import: balance continuity needs review.'
                    },
                    createdAt: importedAt,
                    updatedAt: importedAt,
                    resolution: {
                      batchId,
                      reviewItemId: 'mock-review-item'
                    }
                  }
                ]
              : [],
          fileOutcomes: [
            ...importedFiles.map((file) => ({ ...file, outcome: 'imported' as const })),
            ...duplicateBlockedFiles.map((file) => ({ ...file, outcome: 'duplicate-blocked' as const })),
            ...rejectedFiles.map((file) => ({ ...file, outcome: 'rejected' as const }))
          ],
          transactionGroups: importedFiles.map((file) => ({
            sourceFileId: file.id,
            sourceFileName: file.fileName,
            transactions: [
              {
                id: `${file.id}-txn-1`,
                transactionDateRaw: '2024-01-01',
                rawNarration: 'Mock transaction',
                cleanedDescription: 'Mock transaction',
                debitAmountMinor: 120000,
                direction: 'debit' as const,
                sourceFileId: file.id,
                importBatchId: batchId
              }
            ]
          }))
        }
      })
    }

    writeStagedFiles(
      readStagedFiles().map((file) => {
        const imported = importedFiles.find((candidate) => candidate.id === file.id)
        return imported ?? file
      })
    )

    return {
      attemptId,
      batchId,
      status: importedFiles.length > 0 ? 'imported' : 'rejected',
      importedAt,
      importedFiles,
      rejectedFiles,
      duplicateBlockedFiles,
      transactionsCreated: importedFiles.length * 8,
      acceptedTransactionCount: importedFiles.length * 8,
      blockedDuplicateCount: duplicateBlockedFiles.length,
      reviewItems: [],
      summary: {
        attemptId,
        batchId,
        status: importedFiles.length > 0 ? 'imported' : 'rejected',
        importedAt,
        accountLabel: importedFiles[0]?.accountLabel,
        batchLabel: `ICICI import ${statementPeriodLabel}`,
        fileCount: stagedFiles.length,
        acceptedTransactionCount: importedFiles.length * 8,
        blockedDuplicateCount: duplicateBlockedFiles.length,
        unresolvedReviewCount: 0,
        errorCount: rejectedFiles.length,
        lastUpdatedAt: importedAt
      },
      lazyAccountCreated
    }
  },
  async inspectPriorImportBatch(priorBatchId: string): Promise<PriorImportBatchInspection> {
    const historyBatch = readImportHistory().find((batch) => batch.batchId === priorBatchId)
    return (
      (historyBatch
        ? {
            priorBatchId: historyBatch.batchId,
            batchLabel: historyBatch.batchLabel,
            importedAt: historyBatch.importedAt,
            fileCount: historyBatch.fileCount,
            importedTransactionCount: historyBatch.acceptedTransactionCount,
            fileNames: ['icici-valid.xlsx'],
            duplicateCauseFileName: 'icici-valid.xlsx'
          }
        : undefined) ?? {
        priorBatchId,
        batchLabel: 'Earlier import batch',
        importedAt: new Date().toISOString(),
        fileCount: 1,
        importedTransactionCount: 8,
        fileNames: ['icici-valid.xlsx'],
        duplicateCauseFileName: 'icici-valid.xlsx'
      }
    )
  },
  async listImportHistory(_input?: ListImportHistoryInput): Promise<ImportAttemptSummary[]> {
    return readImportHistory()
  },
  async getImportBatchDetail(input: GetImportBatchDetailInput): Promise<ImportBatchDetail> {
    const detail = readImportBatchDetails()[input.batchId]
    if (!detail) {
      throw new Error(`Import batch ${input.batchId} was not found.`)
    }
    return detail
  },
  async getReviewQueue(input?: GetReviewQueueInput): Promise<ImportBatchDetail[]> {
    const details = Object.values(readImportBatchDetails()).map(orderReviewItems)
    const filtered = input?.batchId ? details.filter((detail) => detail.summary.batchId === input.batchId) : details
    return filtered.filter((detail) => !input?.state || detail.reviewItems.every((item) => item.state === input.state))
  },
  async resolveReviewItems(input: ReviewItemResolutionInput): Promise<ImportBatchDetail> {
    const details = readImportBatchDetails()
    const detail = details[input.batchId]
    if (!detail) {
      throw new Error(`Import batch ${input.batchId} was not found.`)
    }

    const pendingIds = new Set(input.reviewItemIds)
    const now = new Date().toISOString()
    const archived = readResolvedReviewItems()
    const resolvedItems = detail.reviewItems
      .filter((item) => pendingIds.has(item.id))
      .map((item) => ({
        ...item,
        state: 'resolved' as const,
        updatedAt: now
      }))
    const remainingReviewItems = detail.reviewItems.filter((item) => !pendingIds.has(item.id))
    const nextDetail = applyReviewEdits(
      {
        ...detail,
        reviewItems: remainingReviewItems,
        summary: {
          ...detail.summary,
          unresolvedReviewCount: remainingReviewItems.length,
          status: remainingReviewItems.length === 0 ? 'imported' : 'needs-review',
          lastUpdatedAt: now
        }
      },
      input
    )

    writeResolvedReviewItems({
      ...archived,
      [input.batchId]: [...(archived[input.batchId] ?? []), ...resolvedItems]
    })

    writeImportBatchDetails({
      ...details,
      [input.batchId]: nextDetail
    })
    syncHistorySummary(input.batchId, nextDetail)
    logEvent(
      'import.review_item_resolved',
      JSON.stringify({
        batchId: input.batchId,
        reviewItemIds: input.reviewItemIds,
        action: input.action
      })
    )

    return nextDetail
  },
  async resolveReviewItemsBulk(input: ReviewItemResolutionInput): Promise<{ batchDetail: ImportBatchDetail; bulkResult: { approvedCount: number; skippedCount: number; skippedReason?: string } }> {
    const batchDetail = await this.resolveReviewItems(input)
    return {
      batchDetail,
      bulkResult: { approvedCount: input.reviewItemIds.length, skippedCount: 0 }
    }
  },
  async restoreReviewItems(input: ReviewItemRestoreInput): Promise<ImportBatchDetail> {
    const details = readImportBatchDetails()
    const detail = details[input.batchId]
    if (!detail) {
      throw new Error(`Import batch ${input.batchId} was not found.`)
    }

    const archived = readResolvedReviewItems()
    const available = archived[input.batchId] ?? []
    const restoreIds = new Set(input.reviewItemIds)
    const now = new Date().toISOString()
    const restoredItems = available
      .filter((item) => restoreIds.has(item.id))
      .map((item) => ({
        ...item,
        state: 'pending' as const,
        updatedAt: now
      }))
    const remainingArchived = available.filter((item) => !restoreIds.has(item.id))
    const nextItems = [...detail.reviewItems, ...restoredItems].sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    const nextDetail: ImportBatchDetail = {
      ...detail,
      reviewItems: nextItems,
      summary: {
        ...detail.summary,
        unresolvedReviewCount: nextItems.length,
        status: nextItems.length === 0 ? 'imported' : 'needs-review',
        lastUpdatedAt: now
      }
    }

    writeImportBatchDetails({
      ...details,
      [input.batchId]: nextDetail
    })
    writeResolvedReviewItems({
      ...archived,
      [input.batchId]: remainingArchived
    })
    syncHistorySummary(input.batchId, nextDetail)
    logEvent(
      'import.review_item_restored',
      JSON.stringify({
        batchId: input.batchId,
        reviewItemIds: input.reviewItemIds
      })
    )

    return nextDetail
  },
  async listTransactions(input?: TransactionLedgerQuery): Promise<TransactionLedgerRow[]> {
    const query = input ?? {}
    return flattenTransactions()
      .filter((row) => {
        if (query.search?.trim()) {
          const search = query.search.trim().toLowerCase()
          const haystack = `${row.description} ${row.reference ?? ''} ${row.tags.join(' ')}`.toLowerCase()
          if (!haystack.includes(search)) {
            return false
          }
        }

        if (query.dateFrom && row.transactionDateSortable < toSortableDateKey(query.dateFrom)) {
          return false
        }
        if (query.dateTo && row.transactionDateSortable > toSortableDateKey(query.dateTo)) {
          return false
        }
        if (query.types?.length && !query.types.includes(row.normalizedType)) {
          return false
        }
        if (query.reviewStates?.length && !query.reviewStates.includes(row.reviewState)) {
          return false
        }
        if (query.categories?.length) {
          const categories = query.categories.map((category) => category.toLowerCase())
          if (!row.category || !categories.includes(row.category.toLowerCase())) {
            return false
          }
        }
        if (query.tags?.length) {
          const rowTags = row.tags.map((tag) => tag.toLowerCase())
          const tags = query.tags.map((tag) => tag.toLowerCase())
          if (!tags.every((tag) => rowTags.includes(tag))) {
            return false
          }
        }

        const absoluteAmount = Math.abs(row.signedAmountMinor)
        if (query.amountMinMinor !== undefined && absoluteAmount < query.amountMinMinor) {
          return false
        }
        if (query.amountMaxMinor !== undefined && absoluteAmount > query.amountMaxMinor) {
          return false
        }

        return true
      })
      .sort((left, right) => right.transactionDateSortable.localeCompare(left.transactionDateSortable) || right.importedAt.localeCompare(left.importedAt))
      .map(({ transactionDateSortable: _sortable, importedAt: _importedAt, ...row }) => ({
        ...row,
        transactionDateSortable: _sortable
      }))
  },
  async getTransactionDetail(input: GetTransactionDetailInput): Promise<TransactionDetail> {
    const detail = flattenTransactions().find((transaction) => transaction.id === input.transactionId)
    if (!detail) {
      throw new Error(`Transaction ${input.transactionId} was not found.`)
    }

    return detail
  },
  async updateTransaction(input: UpdateTransactionInput): Promise<UpdateTransactionResult> {
    const details = readImportBatchDetails()
    let updatedDetail: TransactionDetail | undefined
    let previousType: TransactionNormalizedType | undefined

    const nextDetails = Object.fromEntries(
      Object.entries(details).map(([batchId, detail]) => [
        batchId,
        {
          ...detail,
          transactionGroups: detail.transactionGroups.map((group) => ({
            ...group,
            transactions: group.transactions.map((transaction) => {
              if (transaction.id !== input.transactionId) {
                return transaction
              }

              const existingSignedAmount =
                transaction.creditAmountMinor !== undefined
                  ? transaction.creditAmountMinor
                  : -Math.abs(transaction.debitAmountMinor ?? 0)
              const nextSignedAmount = input.signedAmountMinor ?? existingSignedAmount
              const nextDirection = nextSignedAmount >= 0 ? 'credit' : 'debit'
              previousType = deriveNormalizedType(transaction.cleanedDescription, transaction.rawNarration, transaction.reference, transaction.direction)

              const nextTransaction = {
                ...transaction,
                transactionDateRaw: input.transactionDateRaw ?? transaction.transactionDateRaw,
                cleanedDescription: input.description ?? transaction.cleanedDescription,
                debitAmountMinor: nextDirection === 'debit' ? Math.abs(nextSignedAmount) : undefined,
                creditAmountMinor: nextDirection === 'credit' ? Math.abs(nextSignedAmount) : undefined,
                direction: nextDirection,
                reference: input.reference === undefined ? transaction.reference : input.reference ?? undefined,
                tags: input.tags ?? transaction.tags,
                category: input.category === undefined ? (transaction as typeof transaction & { category?: string }).category : input.category ?? undefined,
                reviewStateOverride:
                  input.reviewStateOverride === undefined
                    ? (transaction as typeof transaction & { reviewStateOverride?: TransactionReviewState | null }).reviewStateOverride ?? undefined
                    : input.reviewStateOverride ?? undefined
              }

              updatedDetail = {
                id: nextTransaction.id,
                importBatchId: nextTransaction.importBatchId,
                sourceFileId: nextTransaction.sourceFileId,
                batchLabel: detail.summary.batchLabel,
                sourceFileName: group.sourceFileName,
                importedAt: detail.summary.importedAt,
                transactionDateRaw: nextTransaction.transactionDateRaw,
                transactionDateSortable: toSortableDateKey(nextTransaction.transactionDateRaw),
                valueDateRaw: nextTransaction.valueDateRaw,
                rawNarration: nextTransaction.rawNarration,
                description: nextTransaction.cleanedDescription,
                signedAmountMinor: nextSignedAmount,
                normalizedType:
                  input.normalizedType ??
                  deriveNormalizedType(nextTransaction.cleanedDescription, nextTransaction.rawNarration, nextTransaction.reference, nextDirection),
                category: nextTransaction.category,
                tags: nextTransaction.tags ?? [],
                reference: nextTransaction.reference,
                reviewState:
                  (nextTransaction.reviewStateOverride as TransactionReviewState | undefined) ??
                  (detail.summary.unresolvedReviewCount > 0 ? 'pending-review' : 'clean'),
                reviewStateOverride:
                  (nextTransaction.reviewStateOverride as TransactionReviewState | undefined) ?? null,
                runningBalanceMinor: nextTransaction.runningBalanceMinor,
                direction: nextDirection
              }

              return nextTransaction
            })
          }))
        }
      ])
    ) as Record<string, ImportBatchDetail>

    writeImportBatchDetails(nextDetails)

    if (!updatedDetail) {
      throw new Error(`Transaction ${input.transactionId} was not found.`)
    }

    return {
      detail: updatedDetail,
      ruleSuggestion:
        input.normalizedType && previousType && input.normalizedType !== previousType
          ? {
              field: 'type',
              fromType: previousType,
              toType: input.normalizedType,
              title: 'Create a rule from this type change later',
              description: 'Walnut can use this correction as a suggestion when reusable rules are introduced.',
              draft: {
                name: `${updatedDetail.description} rule`,
                condition: {
                  descriptionTerms: updatedDetail.description
                    .split(/\s+/)
                    .map((token) => token.trim().toLowerCase())
                    .filter((token) => token.length >= 3)
                    .slice(0, 3)
                    .map((value) => ({ op: 'contains' as const, value })),
                  transactionTypes: [previousType],
                  tags: updatedDetail.tags,
                  directions: [updatedDetail.direction]
                },
                action: {
                  categoryId: updatedDetail.categoryId,
                  type: input.normalizedType,
                  appendTags: updatedDetail.tags
                }
              }
            }
          : undefined
    }
  },
  async listCategories() {
    return readCategories()
  },
  async createCategory(input: CreateCategoryInput) {
    const next: CategoryTreeNode = {
      id: crypto.randomUUID(),
      name: input.name.trim(),
      kind: 'user',
      parentId: input.parentId,
      path: input.parentId ? ['Parent', input.name.trim()] : [input.name.trim()],
      isActive: true,
      isArchived: false,
      isIncomeCategory: Boolean(input.isIncomeCategory),
      sortOrder: Date.now(),
      counts: { directTransactionCount: 0, totalTransactionCount: 0 },
      children: []
    }
    return writeCategories([...readCategories(), next])
  },
  async updateCategory(input: UpdateCategoryInput) {
    return writeCategories(
      readCategories().map((category) =>
        category.id === input.categoryId
          ? {
              ...category,
              name: input.name ?? category.name,
              parentId: input.parentId === undefined ? category.parentId : input.parentId ?? undefined,
              isActive: input.isActive ?? category.isActive
            }
          : category
      )
    )
  },
  async mergeCategory(input: MergeCategoryInput) {
    return writeCategories(readCategories().filter((category) => category.id !== input.sourceCategoryId))
  },
  async mergeCategoryPreview(input: { sourceCategoryId: string; targetCategoryId: string }): Promise<MergeCategoryPreview> {
    return {
      sourceCategoryId: input.sourceCategoryId,
      targetCategoryId: input.targetCategoryId,
      affectedTransactionCount: 0,
      affectedRuleCount: 0,
      samples: []
    }
  },
  async archiveCategory(input: ArchiveCategoryInput) {
    return writeCategories(
      readCategories().map((category) =>
        category.id === input.categoryId ? { ...category, isArchived: input.isArchived } : category
      )
    )
  },
  async deleteCategory(input: DeleteCategoryInput) {
    return writeCategories(readCategories().filter((category) => category.id !== input.categoryId))
  },
  async listRules() {
    return readRules()
  },
  async createRule(input: CreateCategorizationRuleInput) {
    return writeRules([
      ...readRules(),
      {
        id: crypto.randomUUID(),
        name: input.name,
        kind: 'user',
        isEnabled: true,
        condition: input.condition,
        action: input.action,
        specificityScore: 1,
        sortOrder: readRules().length,
        affectedTransactionCount: 0,
        updatedAt: new Date().toISOString()
      }
    ])
  },
  async updateRule(input: UpdateCategorizationRuleInput) {
    return writeRules(
      readRules().map((rule) =>
        rule.id === input.ruleId
          ? {
              ...rule,
              name: input.name ?? rule.name,
              condition: input.condition ?? rule.condition,
              action: input.action ?? rule.action,
              isEnabled: input.isEnabled ?? rule.isEnabled,
              updatedAt: new Date().toISOString()
            }
          : rule
      )
    )
  },
  async toggleRule(input: ToggleCategorizationRuleInput) {
    return writeRules(readRules().map((rule) => (rule.id === input.ruleId ? { ...rule, isEnabled: input.isEnabled } : rule)))
  },
  async deleteRule(input: DeleteCategorizationRuleInput) {
    return writeRules(readRules().filter((rule) => rule.id !== input.ruleId))
  },
  async reorderRules(input: ReorderRulesInput) {
    const rules = readRules()
    const userRules = input.ruleIds
      .map((id, index) => {
        const rule = rules.find((r) => r.id === id && r.kind !== 'system')
        return rule ? { ...rule, sortOrder: index + 1 } : null
      })
      .filter(Boolean) as CategorizationRuleSummary[]
    const systemRules = rules.filter((r) => r.kind === 'system')
    return writeRules([...userRules, ...systemRules])
  },
  async testRule(_input: RulePreviewInput): Promise<RuleTestPreview> {
    return { matchCount: 0, samples: [] }
  },
  async previewRuleApplyToExisting(_input: RulePreviewInput | ApplyRuleToExistingInput): Promise<RuleApplyPreview> {
    return { matchCount: 0, samples: [] }
  },
  async applyRuleToExisting(_input: ApplyRuleToExistingInput) {
    return readRules()
  },
  async getDashboardPreferences() {
    const rows = flattenTransactions()
    return readDashboardPreferences() ?? defaultDashboardPreferences(rows)
  },
  async setDashboardPreferences(input: DashboardPreferences) {
    return writeDashboardPreferences(input)
  },
  async getDashboardSnapshot(input: DashboardSnapshotQuery): Promise<DashboardSnapshot> {
    const allRows = flattenTransactions()
    const query = resolveDashboardQuery(input, allRows)
    const rows = await this.listTransactions({
      dateFrom: query.range.from,
      dateTo: query.range.to
    })
    const compareRows =
      query.compare?.enabled && query.compare.from && query.compare.to
        ? await this.listTransactions({
            dateFrom: query.compare.from,
            dateTo: query.compare.to
          })
        : []

    const creditedTotalMinor = rows.reduce((total, row) => total + (row.creditAmountMinor ?? 0), 0)
    const debitedTotalMinor = rows.reduce((total, row) => total + (row.debitAmountMinor ?? 0), 0)
    const incomeTotalMinor = rows.reduce(
      (total, row) => total + (isIncomeType(row.normalizedType) ? row.creditAmountMinor ?? 0 : 0),
      0
    )
    const expenseTotalMinor = rows.reduce(
      (total, row) => total + (isSpendType(row.normalizedType) ? row.debitAmountMinor ?? 0 : 0),
      0
    )

    const compareCreditedMinor = compareRows.reduce((total, row) => total + (row.creditAmountMinor ?? 0), 0)
    const compareDebitedMinor = compareRows.reduce((total, row) => total + (row.debitAmountMinor ?? 0), 0)
    const compareIncomeMinor = compareRows.reduce(
      (total, row) => total + (isIncomeType(row.normalizedType) ? row.creditAmountMinor ?? 0 : 0),
      0
    )
    const compareExpenseMinor = compareRows.reduce(
      (total, row) => total + (isSpendType(row.normalizedType) ? row.debitAmountMinor ?? 0 : 0),
      0
    )

    const buildOperationalCard = (
      id: 'transfer' | 'refund' | 'atm-withdrawal' | 'credit-card-payment',
      label: string,
      type: TransactionNormalizedType
    ) => {
      const totalMinor = rows.reduce((total, row) => total + (row.normalizedType === type ? Math.abs(row.signedAmountMinor) : 0), 0)
      const previousTotalMinor = compareRows.reduce(
        (total, row) => total + (row.normalizedType === type ? Math.abs(row.signedAmountMinor) : 0),
        0
      )
      const transactionCount = rows.filter((row) => row.normalizedType === type).length

      return {
        id,
        label,
        totalMinor,
        transactionCount,
        previousTotalMinor: compareRows.length ? previousTotalMinor : undefined,
        deltaMinor: compareRows.length ? totalMinor - previousTotalMinor : undefined,
        trend: toTrend(totalMinor, compareRows.length ? previousTotalMinor : undefined),
        helper: `${transactionCount} matching transactions in the selected period.`
      }
    }

    const categorySpendRows = rows.filter((row) => isSpendType(row.normalizedType))
    const categoryMap = new Map<string, { categoryId?: string; label: string; totalMinor: number; transactionCount: number }>()
    for (const row of categorySpendRows) {
      const label = row.categoryPath?.join(' > ') || row.category || 'Uncategorized'
      const key = row.categoryId ?? label
      const current = categoryMap.get(key) ?? {
        categoryId: row.categoryId,
        label,
        totalMinor: 0,
        transactionCount: 0
      }
      current.totalMinor += row.debitAmountMinor ?? Math.abs(Math.min(row.signedAmountMinor, 0))
      current.transactionCount += 1
      categoryMap.set(key, current)
    }
    const totalSpendMinor = Array.from(categoryMap.values()).reduce((sum, item) => sum + item.totalMinor, 0)

    const merchantMap = new Map<string, { merchant: string; totalMinor: number; transactionCount: number }>()
    for (const row of categorySpendRows) {
      const current = merchantMap.get(row.description) ?? { merchant: row.description, totalMinor: 0, transactionCount: 0 }
      current.totalMinor += row.debitAmountMinor ?? Math.abs(Math.min(row.signedAmountMinor, 0))
      current.transactionCount += 1
      merchantMap.set(row.description, current)
    }

    return {
      query,
      summaryCards: [
        {
          id: 'credited',
          label: 'Total credited',
          totalMinor: creditedTotalMinor,
          previousTotalMinor: compareRows.length ? compareCreditedMinor : undefined,
          deltaMinor: compareRows.length ? creditedTotalMinor - compareCreditedMinor : undefined,
          trend: toTrend(creditedTotalMinor, compareRows.length ? compareCreditedMinor : undefined),
          helper: 'All credit activity in the selected period.'
        },
        {
          id: 'debited',
          label: 'Total debited',
          totalMinor: debitedTotalMinor,
          previousTotalMinor: compareRows.length ? compareDebitedMinor : undefined,
          deltaMinor: compareRows.length ? debitedTotalMinor - compareDebitedMinor : undefined,
          trend: toTrend(debitedTotalMinor, compareRows.length ? compareDebitedMinor : undefined),
          helper: 'All debit activity in the selected period.'
        },
        {
          id: 'difference',
          label: 'Difference',
          totalMinor: creditedTotalMinor - debitedTotalMinor,
          previousTotalMinor: compareRows.length ? compareCreditedMinor - compareDebitedMinor : undefined,
          deltaMinor:
            compareRows.length ? creditedTotalMinor - debitedTotalMinor - (compareCreditedMinor - compareDebitedMinor) : undefined,
          trend: toTrend(
            creditedTotalMinor - debitedTotalMinor,
            compareRows.length ? compareCreditedMinor - compareDebitedMinor : undefined
          ),
          helper: 'Credited minus debited for the selected period.'
        },
        {
          id: 'income',
          label: 'Income vs refunds',
          totalMinor: incomeTotalMinor,
          previousTotalMinor: compareRows.length ? compareIncomeMinor : undefined,
          deltaMinor: compareRows.length ? incomeTotalMinor - compareIncomeMinor : undefined,
          trend: toTrend(incomeTotalMinor, compareRows.length ? compareIncomeMinor : undefined),
          helper: 'Income includes refunds and reimbursements.'
        },
        {
          id: 'expense',
          label: 'Spend footprint',
          totalMinor: expenseTotalMinor,
          previousTotalMinor: compareRows.length ? compareExpenseMinor : undefined,
          deltaMinor: compareRows.length ? expenseTotalMinor - compareExpenseMinor : undefined,
          trend: toTrend(expenseTotalMinor, compareRows.length ? compareExpenseMinor : undefined),
          helper: 'Spend includes expenses, ATM withdrawals, and credit-card payments.'
        }
      ],
      operationalCards: [
        buildOperationalCard('transfer', 'Transfers', 'transfer'),
        buildOperationalCard('refund', 'Refunds', 'refund'),
        buildOperationalCard('atm-withdrawal', 'ATM withdrawals', 'atm-withdrawal'),
        buildOperationalCard('credit-card-payment', 'Credit card payments', 'credit-card-payment')
      ],
      spendTrend: buildSpendTrend(rows, compareRows, query.range.preset),
      categoryBreakdown: Array.from(categoryMap.values())
        .sort((left, right) => right.totalMinor - left.totalMinor)
        .slice(0, 8)
        .map((item) => ({
          ...item,
          percentageOfSpend: totalSpendMinor > 0 ? item.totalMinor / totalSpendMinor : 0,
          ledgerQuery: {
            dateFrom: query.range.from,
            dateTo: query.range.to,
            categories: item.categoryId ? [item.categoryId] : [item.label]
          }
        })),
      topMerchants: Array.from(merchantMap.values())
        .sort((left, right) => right.totalMinor - left.totalMinor)
        .slice(0, 8)
        .map((item) => ({
          ...item,
          ledgerQuery: {
            dateFrom: query.range.from,
            dateTo: query.range.to,
            search: item.merchant
          }
        })),
      largestTransactions: [...rows]
        .sort((left, right) => Math.abs(right.signedAmountMinor) - Math.abs(left.signedAmountMinor))
        .slice(0, 8)
        .map((row) => ({
          transactionId: row.id,
          description: row.description,
          transactionDateRaw: row.transactionDateRaw,
          amountMinor: Math.abs(row.signedAmountMinor),
          normalizedType: row.normalizedType,
          ledgerQuery: {
            dateFrom: query.range.from,
            dateTo: query.range.to,
            search: row.description
          }
        })),
      recentTransactions: [...rows]
        .sort((left, right) => right.transactionDateSortable.localeCompare(left.transactionDateSortable))
        .slice(0, 6)
        .map((row) => ({
          transactionId: row.id,
          description: row.description,
          transactionDateRaw: row.transactionDateRaw,
          signedAmountMinor: row.signedAmountMinor,
          normalizedType: row.normalizedType,
          ledgerQuery: {
            dateFrom: query.range.from,
            dateTo: query.range.to,
            search: row.description
          }
        })),
      recurringItems: buildRecurringItems(rows, query.range)
    }
  },
  async getRecurringDetail(input: DashboardRecurringDetailInput): Promise<DashboardRecurringDetail> {
    const snapshot = await this.getDashboardSnapshot(input.query)
    const item = snapshot.recurringItems.find((candidate) => candidate.id === input.recurringId)
    if (!item) {
      throw new Error(`Recurring pattern ${input.recurringId} was not found.`)
    }

    const transactions = (await this.listTransactions({
      dateFrom: snapshot.query.range.from,
      dateTo: snapshot.query.range.to,
      search: item.description,
      types: [item.normalizedType]
    }))
      .filter((row) => (item.direction === 'credit' ? row.signedAmountMinor >= 0 : row.signedAmountMinor < 0))
      .slice(0, 12)
      .map((row) => ({
        transactionId: row.id,
        transactionDateRaw: row.transactionDateRaw,
        description: row.description,
        signedAmountMinor: row.signedAmountMinor,
        normalizedType: row.normalizedType
      }))

    return {
      item,
      transactions
    }
  },
  async getAuditEvents(_filters?: { category?: string; entityId?: string }) {
    return []
  },
  async generateDiagnosticsBundle(input: { type: 'full' | 'redacted' }) {
    return JSON.stringify({ type: input.type, generatedAt: new Date().toISOString(), systemInfo: { nodeVersion: 'mock', platform: 'mock', appVersion: '0.0.0' }, transactions: [], auditEvents: [] }, null, 2)
  },
  async ping() {
    return 'pong'
  },
  async bulkUpdateTransactions(_input: BulkUpdateTransactionsInput) {
    return { updatedCount: 0 }
  },
  async replaceStagedFile(_input: ReplaceStagedFileInput): Promise<StageImportFilesResult> {
    return { stagedFiles: [] }
  },
  async listFilterPresets(): Promise<FilterPreset[]> {
    return []
  },
  async saveFilterPreset(_input: SaveFilterPresetInput): Promise<FilterPreset[]> {
    return []
  },
  async renameFilterPreset(_input: RenameFilterPresetInput): Promise<FilterPreset[]> {
    return []
  },
  async deleteFilterPreset(_input: DeleteFilterPresetInput): Promise<FilterPreset[]> {
    return []
  }
})
