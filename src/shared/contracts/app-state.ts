import type { AccountProfile, AccountProfileDraft } from './account'
import type {
  ChooseImportSheetInput,
  CommitImportBatchInput,
  CommitImportBatchResult,
  GetImportBatchDetailInput,
  GetReviewQueueInput,
  ImportBatchDetail,
  ImportAttemptSummary,
  ListImportHistoryInput,
  PriorImportBatchInspection,
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

export interface AppShellState {
  currentView: AppView
  onboarding: OnboardingProgress
  accountProfile?: AccountProfile
  security: SecurityState
  dashboard: DashboardState
}

export interface SaveOnboardingProgressInput extends Partial<OnboardingProgress> {
  currentStep: OnboardingStep
}

export interface CompleteOnboardingInput {
  profile: HouseholdProfile
  pin: string
  accountDraft?: AccountProfileDraft
}

export interface WalnutApi {
  loadAppState: () => Promise<AppShellState>
  saveOnboardingProgress: (input: SaveOnboardingProgressInput) => Promise<AppShellState>
  completeOnboarding: (input: CompleteOnboardingInput) => Promise<AppShellState>
  lockNow: (reason?: LockReason) => Promise<AppShellState>
  unlockWithPin: (pin: string) => Promise<UnlockResult>
  beginRecoveryReset: (payload: RecoveryResetPayload) => Promise<AppShellState>
  saveAccountProfile: (draft: AccountProfileDraft) => Promise<AppShellState>
  copyRecoveryKeyAcknowledged: () => Promise<AppShellState>
  downloadRecoveryKeyAcknowledged: () => Promise<AppShellState>
  getSecurityEvents: () => Promise<SecurityEvent[]>
  stageImportFiles: (input?: StageImportFilesInput) => Promise<StageImportFilesResult>
  chooseImportSheet: (input: ChooseImportSheetInput) => Promise<StageImportFilesResult>
  removeStagedFile: (input: RemoveStagedFileInput) => Promise<StageImportFilesResult>
  commitImportBatch: (input?: CommitImportBatchInput) => Promise<CommitImportBatchResult>
  inspectPriorImportBatch: (priorBatchId: string) => Promise<PriorImportBatchInspection>
  listImportHistory: (input?: ListImportHistoryInput) => Promise<ImportAttemptSummary[]>
  getImportBatchDetail: (input: GetImportBatchDetailInput) => Promise<ImportBatchDetail>
  getReviewQueue: (input?: GetReviewQueueInput) => Promise<ImportBatchDetail[]>
  resolveReviewItems: (input: ReviewItemResolutionInput) => Promise<ImportBatchDetail>
  restoreReviewItems: (input: ReviewItemRestoreInput) => Promise<ImportBatchDetail>
  ping: () => Promise<string>
}
