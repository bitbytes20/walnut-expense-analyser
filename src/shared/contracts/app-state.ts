import type { AccountProfile, AccountProfileDraft } from './account'
import type {
  BulkResolveResult,
  ChooseImportSheetInput,
  CommitImportBatchInput,
  CommitImportBatchResult,
  GetImportBatchDetailInput,
  GetReviewQueueInput,
  ImportBatchDetail,
  ImportAttemptSummary,
  ListImportHistoryInput,
  PriorImportBatchInspection,
  ReplaceStagedFileInput,
  ReviewItemResolutionInput,
  ReviewItemRestoreInput,
  RemoveStagedFileInput,
  StageImportFilesInput,
  StageImportFilesResult
} from './import'
import type {
  LockReason,
  RecoveryKeyMaterial,
  RecoveryResetPayload,
  SecurityEvent,
  SecurityState,
  UnlockResult
} from './security'
import type { AuditEvent } from './audit'
import type { GenerateDiagnosticsBundleInput } from './diagnostics'
import type {
  ApplyRuleToExistingInput,
  ArchiveCategoryInput,
  CategorizationRuleSummary,
  CreateCategoryInput,
  CreateCategorizationRuleInput,
  DeleteCategoryInput,
  DeleteCategorizationRuleInput,
  MergeCategoryInput,
  MergeCategoryPreview,
  RuleApplyPreview,
  RuleConflict,
  RuleExportEntry,
  RuleImportResult,
  RulePreviewInput,
  RuleTestPreview,
  ToggleCategorizationRuleInput,
  UpdateCategoryInput,
  UpdateCategorizationRuleInput,
  CategoryTreeNode
} from './categories'
import type {
  BulkUpdateTransactionsInput,
  BulkUpdateTransactionsResult,
  DeleteFilterPresetInput,
  FilterPreset,
  GetTransactionDetailInput,
  RenameFilterPresetInput,
  SaveFilterPresetInput,
  TransactionDetail,
  TransactionLedgerQuery,
  TransactionLedgerRow,
  UpdateTransactionInput,
  UpdateTransactionResult
} from './transactions'
import type {
  DashboardPreferences,
  DashboardRecurringDetail,
  DashboardRecurringDetailInput,
  DashboardSnapshot,
  DashboardSnapshotQuery
} from './dashboard'

export type AppView = 'onboarding' | 'locked' | 'dashboard'

export type OnboardingStep =
  | 'welcome'
  | 'household-profile'
  | 'pin-setup'
  | 'recovery-key'
  | 'account-profile'
  | 'finish'

export interface HouseholdProfile {
  householdName: string
  ownerName: string
}

export interface OnboardingProgress {
  currentStep: OnboardingStep
  completedSteps: OnboardingStep[]
  profile?: HouseholdProfile
  draftPin?: string
  recoveryKey?: RecoveryKeyMaterial
  recoveryConfirmed: boolean
  recoverySavedToDevice: boolean
  accountDraft?: AccountProfileDraft
}

export interface DashboardState {
  heading: string
  body: string
  primaryActionLabel: string
}

export interface DeviceProfileSummary {
  id: string
  householdName: string
  ownerName: string
  accountLabel?: string
  lastUnlockedAt?: string
  createdAt: string
  updatedAt: string
  isActive: boolean
}

export interface AppShellState {
  currentView: AppView
  onboarding: OnboardingProgress
  accountProfile?: AccountProfile
  security: SecurityState
  dashboard: DashboardState
  activeProfileId?: string
  deviceProfiles: DeviceProfileSummary[]
}

export interface SaveOnboardingProgressInput extends Partial<OnboardingProgress> {
  currentStep: OnboardingStep
}

export interface CompleteOnboardingInput {
  profile: HouseholdProfile
  pin: string
  accountDraft?: AccountProfileDraft
}

export interface AppConfig {
  theme: 'light' | 'dark' | 'system'
  idleLockTimeoutMs: number
  featureFlags: {
    aiSummaries: boolean
  }
}

export interface BackupResult {
  ok: boolean
  filePath?: string
  error?: string
}

export interface RestoreResult {
  ok: boolean
  householdName?: string
  error?: string
}

export interface ChangePinInput {
  currentPin: string
  newPin: string
}

export interface ClearTransactionsResult {
  deletedCount: number
}

export interface BackupPayload {
  version: 1
  createdAt: string
  householdName: string
  tables: {
    onboardingProgress: Record<string, unknown>
    accountProfiles: Record<string, unknown>[]
    importBatches: Record<string, unknown>[]
    importAttempts: Record<string, unknown>[]
    importSourceFiles: Record<string, unknown>[]
    importedTransactions: Record<string, unknown>[]
    reviewItems: Record<string, unknown>[]
    categories: Record<string, unknown>[]
    categorizationRules: Record<string, unknown>[]
    auditEvents: Record<string, unknown>[]
    appSettings: Array<{ key: string; value: string }>
    filterPresets: Record<string, unknown>[]
  }
}

export interface WalnutApi {
  loadAppState: () => Promise<AppShellState>
  saveOnboardingProgress: (input: SaveOnboardingProgressInput) => Promise<AppShellState>
  completeOnboarding: (input: CompleteOnboardingInput) => Promise<AppShellState>
  startNewProfileSetup: () => Promise<AppShellState>
  switchDeviceProfile: (profileId: string) => Promise<AppShellState>
  lockNow: (reason?: LockReason) => Promise<AppShellState>
  unlockWithPin: (pin: string) => Promise<UnlockResult>
  beginRecoveryReset: (payload: RecoveryResetPayload) => Promise<AppShellState>
  saveAccountProfile: (draft: AccountProfileDraft) => Promise<AppShellState>
  copyRecoveryKeyAcknowledged: () => Promise<AppShellState>
  downloadRecoveryKeyAcknowledged: () => Promise<AppShellState>
  getSecurityEvents: () => Promise<SecurityEvent[]>
  getAuditEvents: (filters?: { category?: string; entityId?: string }) => Promise<AuditEvent[]>
  stageImportFiles: (input?: StageImportFilesInput) => Promise<StageImportFilesResult>
  chooseImportSheet: (input: ChooseImportSheetInput) => Promise<StageImportFilesResult>
  removeStagedFile: (input: RemoveStagedFileInput) => Promise<StageImportFilesResult>
  commitImportBatch: (input?: CommitImportBatchInput) => Promise<CommitImportBatchResult>
  inspectPriorImportBatch: (priorBatchId: string) => Promise<PriorImportBatchInspection>
  listImportHistory: (input?: ListImportHistoryInput) => Promise<ImportAttemptSummary[]>
  getImportBatchDetail: (input: GetImportBatchDetailInput) => Promise<ImportBatchDetail>
  getReviewQueue: (input?: GetReviewQueueInput) => Promise<ImportBatchDetail[]>
  resolveReviewItems: (input: ReviewItemResolutionInput) => Promise<ImportBatchDetail>
  resolveReviewItemsBulk: (input: ReviewItemResolutionInput) => Promise<{ batchDetail: ImportBatchDetail; bulkResult: BulkResolveResult }>
  restoreReviewItems: (input: ReviewItemRestoreInput) => Promise<ImportBatchDetail>
  listTransactions: (input?: TransactionLedgerQuery) => Promise<TransactionLedgerRow[]>
  getTransactionDetail: (input: GetTransactionDetailInput) => Promise<TransactionDetail>
  updateTransaction: (input: UpdateTransactionInput) => Promise<UpdateTransactionResult>
  listCategories: () => Promise<CategoryTreeNode[]>
  createCategory: (input: CreateCategoryInput) => Promise<CategoryTreeNode[]>
  updateCategory: (input: UpdateCategoryInput) => Promise<CategoryTreeNode[]>
  mergeCategory: (input: MergeCategoryInput) => Promise<CategoryTreeNode[]>
  mergeCategoryPreview: (input: { sourceCategoryId: string; targetCategoryId: string }) => Promise<MergeCategoryPreview>
  archiveCategory: (input: ArchiveCategoryInput) => Promise<CategoryTreeNode[]>
  deleteCategory: (input: DeleteCategoryInput) => Promise<CategoryTreeNode[]>
  listRules: () => Promise<CategorizationRuleSummary[]>
  createRule: (input: CreateCategorizationRuleInput) => Promise<CategorizationRuleSummary[]>
  updateRule: (input: UpdateCategorizationRuleInput) => Promise<CategorizationRuleSummary[]>
  toggleRule: (input: ToggleCategorizationRuleInput) => Promise<CategorizationRuleSummary[]>
  deleteRule: (input: DeleteCategorizationRuleInput) => Promise<CategorizationRuleSummary[]>
  testRule: (input: RulePreviewInput) => Promise<RuleTestPreview>
  previewRuleApplyToExisting: (input: RulePreviewInput | ApplyRuleToExistingInput) => Promise<RuleApplyPreview>
  applyRuleToExisting: (input: ApplyRuleToExistingInput) => Promise<CategorizationRuleSummary[]>
  exportRules: () => Promise<{ success: boolean; reason?: string; count?: number }>
  importRulesPrepare: () => Promise<{ result: RuleImportResult; entries: RuleExportEntry[] } | null>
  importRulesCommit: (input: { entries: RuleExportEntry[]; resolutions: Array<{ name: string; action: 'keep' | 'replace' | 'skip' }> }) => Promise<CategorizationRuleSummary[]>
  getDashboardPreferences: () => Promise<DashboardPreferences>
  setDashboardPreferences: (input: DashboardPreferences) => Promise<DashboardPreferences>
  getDashboardSnapshot: (input: DashboardSnapshotQuery) => Promise<DashboardSnapshot>
  getRecurringDetail: (input: DashboardRecurringDetailInput) => Promise<DashboardRecurringDetail>
  generateDiagnosticsBundle: (input: GenerateDiagnosticsBundleInput) => Promise<string>
  getAppConfig: () => Promise<AppConfig>
  setAppConfig: (input: Partial<AppConfig>) => Promise<AppConfig>
  changePin: (input: ChangePinInput) => Promise<{ ok: boolean; error?: string }>
  exportBackup: (pin: string) => Promise<BackupResult>
  importBackup: (pin: string) => Promise<RestoreResult>
  clearTransactions: () => Promise<ClearTransactionsResult>
  fullReset: () => Promise<AppShellState>
  ping: () => Promise<string>
  bulkUpdateTransactions: (input: BulkUpdateTransactionsInput) => Promise<BulkUpdateTransactionsResult>
  replaceStagedFile: (input: ReplaceStagedFileInput) => Promise<StageImportFilesResult>
  listFilterPresets: () => Promise<FilterPreset[]>
  saveFilterPreset: (input: SaveFilterPresetInput) => Promise<FilterPreset[]>
  renameFilterPreset: (input: RenameFilterPresetInput) => Promise<FilterPreset[]>
  deleteFilterPreset: (input: DeleteFilterPresetInput) => Promise<FilterPreset[]>
}
