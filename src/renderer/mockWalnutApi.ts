import type {
  AppShellState,
  CompleteOnboardingInput,
  SaveOnboardingProgressInput,
  WalnutApi
} from '../shared/contracts/app-state'
import type { AccountProfileDraft } from '../shared/contracts/account'
import type {
  ChooseImportSheetInput,
  CommitImportBatchInput,
  GetImportBatchDetailInput,
  GetReviewQueueInput,
  ImportBatchDetail,
  ImportAttemptSummary,
  ListImportHistoryInput,
  PriorImportBatchInspection,
  RemoveStagedFileInput,
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
import { generateRecoveryKey, isValidPin } from '../shared/security-utils'

const STORAGE_KEY = 'walnut.mock.app-state'
const EVENTS_KEY = 'walnut.mock.security-events'
const STAGED_FILES_KEY = 'walnut.mock.staged-import-files'
const IMPORT_HISTORY_KEY = 'walnut.mock.import-history'
const IMPORT_BATCH_DETAILS_KEY = 'walnut.mock.import-batch-details'

type StoredState = AppShellState & {
  mockPin?: string
  mockRecoveryCode?: string
  mockRecoveryWords?: string
}

type MockWalnutApi = WalnutApi & {
  __mock: true
}

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
  }
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

const writeImportBatchDetails = (details: Record<string, ImportBatchDetail>) => {
  window.localStorage.setItem(IMPORT_BATCH_DETAILS_KEY, JSON.stringify(details))
  return details
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
  return rest
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
    return withoutMocks(next)
  },
  async lockNow(reason?: LockReason) {
    return withoutMocks(
      updateSecurity({
        isLocked: true,
        lockReason: reason ?? 'manual',
        lastLockedAt: new Date().toISOString()
      })
    )
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
  async getReviewQueue(_input?: GetReviewQueueInput): Promise<ImportBatchDetail[]> {
    return []
  },
  async ping() {
    return 'pong'
  }
})
