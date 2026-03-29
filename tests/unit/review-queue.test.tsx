import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/renderer/App'
import type { WalnutApi } from '../../src/shared/contracts/app-state'
import type { ImportBatchDetail, ImportAttemptSummary } from '../../src/shared/contracts/import'

const dashboardState = {
  currentView: 'dashboard' as const,
  onboarding: {
    currentStep: 'finish' as const,
    completedSteps: ['welcome', 'household-profile', 'pin-setup', 'recovery-key', 'account-profile', 'finish'],
    recoveryConfirmed: true,
    recoverySavedToDevice: true,
    profile: {
      householdName: 'Walnut Home',
      ownerName: 'Bit'
    }
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
}

const historyRows: ImportAttemptSummary[] = [
  {
    attemptId: 'attempt-needs-review',
    batchId: 'batch-needs-review',
    status: 'needs-review',
    importedAt: '2026-03-27T10:00:00.000Z',
    accountLabel: 'ICICI - Household',
    batchLabel: 'Needs review batch',
    fileCount: 2,
    acceptedTransactionCount: 4,
    blockedDuplicateCount: 1,
    unresolvedReviewCount: 3,
    errorCount: 0,
    lastUpdatedAt: '2026-03-27T11:00:00.000Z'
  },
  {
    attemptId: 'attempt-imported',
    batchId: 'batch-imported',
    status: 'imported',
    importedAt: '2026-03-26T10:00:00.000Z',
    accountLabel: 'ICICI - Household',
    batchLabel: 'Imported batch',
    fileCount: 1,
    acceptedTransactionCount: 2,
    blockedDuplicateCount: 0,
    unresolvedReviewCount: 0,
    errorCount: 0,
    lastUpdatedAt: '2026-03-26T11:00:00.000Z'
  }
]

const batchDetail: ImportBatchDetail = {
  summary: historyRows[0],
  reviewItems: [
    {
      id: 'warning-balance',
      batchId: 'batch-needs-review',
      importAttemptId: 'attempt-needs-review',
      sourceFileId: 'file-warning',
      reasonCode: 'balance-continuity-warning',
      severity: 'warning',
      state: 'pending',
      title: 'Balance continuity warning',
      description: 'Check the ledger continuity before accepting this row.',
      snapshot: {
        sourceFileId: 'file-warning',
        sourceFileName: 'warning-file.xlsx',
        rowIndex: 21,
        message: 'Balance continuity warning',
        parsedRow: {
          transactionDateRaw: '2024-01-21',
          rawNarration: 'Salary transfer',
          cleanedDescription: 'Salary transfer',
          creditAmountMinor: 250000,
          runningBalanceMinor: 450000,
          direction: 'credit',
          reference: 'SAL-21',
          sourceFileId: 'file-warning',
          importBatchId: 'batch-needs-review'
        }
      },
      createdAt: '2026-03-27T10:00:00.000Z',
      updatedAt: '2026-03-27T10:00:00.000Z',
      resolution: {
        batchId: 'batch-needs-review',
        reviewItemId: 'warning-balance'
      }
    },
    {
      id: 'blocking-duplicate',
      batchId: 'batch-needs-review',
      importAttemptId: 'attempt-needs-review',
      sourceFileId: 'file-blocking',
      reasonCode: 'duplicate-candidate',
      severity: 'blocking',
      state: 'pending',
      title: 'Possible duplicate candidate',
      description: 'This row matches an earlier imported transaction.',
      snapshot: {
        sourceFileId: 'file-blocking',
        sourceFileName: 'blocking-file.xlsx',
        rowIndex: 8,
        message: 'Possible duplicate candidate',
        parsedRow: {
          transactionDateRaw: '2024-01-08',
          rawNarration: 'Coffee shop',
          cleanedDescription: 'Coffee shop',
          debitAmountMinor: 24000,
          runningBalanceMinor: 175000,
          direction: 'debit',
          reference: 'COF-08',
          sourceFileId: 'file-blocking',
          importBatchId: 'batch-needs-review'
        }
      },
      createdAt: '2026-03-27T10:00:00.000Z',
      updatedAt: '2026-03-27T10:00:00.000Z',
      resolution: {
        batchId: 'batch-needs-review',
        reviewItemId: 'blocking-duplicate'
      }
    },
    {
      id: 'warning-parser',
      batchId: 'batch-needs-review',
      importAttemptId: 'attempt-needs-review',
      sourceFileId: 'file-warning',
      reasonCode: 'parser-uncertainty',
      severity: 'warning',
      state: 'pending',
      title: 'Parser uncertainty',
      description: 'The statement row needs a manual review before acceptance.',
      snapshot: {
        sourceFileId: 'file-warning',
        sourceFileName: 'warning-file.xlsx',
        rowIndex: 24,
        message: 'Parser uncertainty',
        parsedRow: {
          transactionDateRaw: '2024-01-24',
          rawNarration: 'Utility board',
          cleanedDescription: 'Utility board',
          debitAmountMinor: 75000,
          runningBalanceMinor: 375000,
          direction: 'debit',
          reference: 'UTL-24',
          sourceFileId: 'file-warning',
          importBatchId: 'batch-needs-review'
        }
      },
      createdAt: '2026-03-27T10:00:00.000Z',
      updatedAt: '2026-03-27T10:00:00.000Z',
      resolution: {
        batchId: 'batch-needs-review',
        reviewItemId: 'warning-parser'
      }
    }
  ],
  fileOutcomes: [
    {
      id: 'file-blocking',
      fileName: 'blocking-file.xlsx',
      fileExtension: 'xlsx',
      accountLabel: 'ICICI - Household',
      statementPeriodLabel: 'Jan 2024',
      status: 'imported',
      importedTransactionCount: 2,
      outcome: 'imported'
    },
    {
      id: 'file-warning',
      fileName: 'warning-file.xlsx',
      fileExtension: 'xlsx',
      accountLabel: 'ICICI - Household',
      statementPeriodLabel: 'Jan 2024',
      status: 'imported',
      importedTransactionCount: 2,
      outcome: 'imported'
    }
  ],
  transactionGroups: [
    {
      sourceFileId: 'file-blocking',
      sourceFileName: 'blocking-file.xlsx',
      transactions: [
        {
          id: 'txn-blocking',
          transactionDateRaw: '2024-01-08',
          rawNarration: 'Coffee shop',
          cleanedDescription: 'Coffee shop',
          debitAmountMinor: 24000,
          runningBalanceMinor: 175000,
          direction: 'debit',
          reference: 'COF-08',
          sourceFileId: 'file-blocking',
          importBatchId: 'batch-needs-review'
        }
      ]
    }
  ]
}

const emptyQueueDetail: ImportBatchDetail = {
  ...batchDetail,
  reviewItems: [],
  summary: {
    ...batchDetail.summary,
    unresolvedReviewCount: 0,
    status: 'imported'
  }
}

const createWalnutApi = () => {
  const api = {
    loadAppState: vi.fn().mockResolvedValue(dashboardState),
    saveOnboardingProgress: vi.fn(),
    completeOnboarding: vi.fn(),
    startNewProfileSetup: vi.fn(),
    switchDeviceProfile: vi.fn(),
    lockNow: vi.fn(),
    unlockWithPin: vi.fn(),
    beginRecoveryReset: vi.fn(),
    saveAccountProfile: vi.fn(),
    copyRecoveryKeyAcknowledged: vi.fn(),
    downloadRecoveryKeyAcknowledged: vi.fn(),
    getSecurityEvents: vi.fn().mockResolvedValue([]),
    stageImportFiles: vi.fn(),
    chooseImportSheet: vi.fn(),
    removeStagedFile: vi.fn(),
    commitImportBatch: vi.fn(),
    inspectPriorImportBatch: vi.fn(),
    listImportHistory: vi.fn().mockResolvedValue(historyRows),
    getImportBatchDetail: vi.fn().mockResolvedValue(batchDetail),
    getReviewQueue: vi.fn().mockResolvedValue([batchDetail]),
    resolveReviewItems: vi.fn().mockResolvedValue(batchDetail),
    restoreReviewItems: vi.fn().mockResolvedValue(batchDetail),
    ping: vi.fn().mockResolvedValue('pong')
  } satisfies Partial<WalnutApi>

  return api as WalnutApi & {
    listImportHistory: ReturnType<typeof vi.fn>
    getImportBatchDetail: ReturnType<typeof vi.fn>
    getReviewQueue: ReturnType<typeof vi.fn>
    resolveReviewItems: ReturnType<typeof vi.fn>
    restoreReviewItems: ReturnType<typeof vi.fn>
  }
}

const createMutationWalnutApi = () => {
  let history = structuredClone(historyRows)
  let detail = structuredClone(batchDetail)

  const api = {
    loadAppState: vi.fn().mockResolvedValue(dashboardState),
    saveOnboardingProgress: vi.fn(),
    completeOnboarding: vi.fn(),
    startNewProfileSetup: vi.fn(),
    switchDeviceProfile: vi.fn(),
    lockNow: vi.fn(),
    unlockWithPin: vi.fn(),
    beginRecoveryReset: vi.fn(),
    saveAccountProfile: vi.fn(),
    copyRecoveryKeyAcknowledged: vi.fn(),
    downloadRecoveryKeyAcknowledged: vi.fn(),
    getSecurityEvents: vi.fn().mockResolvedValue([]),
    stageImportFiles: vi.fn(),
    chooseImportSheet: vi.fn(),
    removeStagedFile: vi.fn(),
    commitImportBatch: vi.fn(),
    inspectPriorImportBatch: vi.fn(),
    listImportHistory: vi.fn(async () => history),
    getImportBatchDetail: vi.fn(async () => detail),
    getReviewQueue: vi.fn(async (input?: { batchId?: string }) => {
      if (input?.batchId && input.batchId !== detail.summary.batchId) {
        return []
      }

      return [detail]
    }),
    resolveReviewItems: vi.fn(async (input: { batchId: string; reviewItemIds: string[]; action: string }) => {
      detail = {
        ...detail,
        reviewItems: detail.reviewItems.filter((item) => !input.reviewItemIds.includes(item.id)),
        summary: {
          ...detail.summary,
          unresolvedReviewCount: detail.reviewItems.filter((item) => !input.reviewItemIds.includes(item.id)).length,
          status: detail.reviewItems.filter((item) => !input.reviewItemIds.includes(item.id)).length === 0 ? 'imported' : 'needs-review',
          lastUpdatedAt: '2026-03-27T12:00:00.000Z'
        }
      }
      history = history.map((row) =>
        row.batchId === input.batchId
          ? {
              ...row,
              unresolvedReviewCount: detail.summary.unresolvedReviewCount,
              status: detail.summary.status,
              lastUpdatedAt: detail.summary.lastUpdatedAt
            }
          : row
      )
      return detail
    }),
    restoreReviewItems: vi.fn(async (input: { batchId: string; reviewItemIds: string[] }) => {
      const restored = batchDetail.reviewItems.filter((item) => input.reviewItemIds.includes(item.id))
      detail = {
        ...detail,
        reviewItems: [...restored, ...detail.reviewItems],
        summary: {
          ...detail.summary,
          unresolvedReviewCount: detail.reviewItems.length + restored.length,
          status: 'needs-review',
          lastUpdatedAt: '2026-03-27T12:05:00.000Z'
        }
      }
      history = history.map((row) =>
        row.batchId === input.batchId
          ? {
              ...row,
              unresolvedReviewCount: detail.summary.unresolvedReviewCount,
              status: detail.summary.status,
              lastUpdatedAt: detail.summary.lastUpdatedAt
            }
          : row
      )
      return detail
    }),
    ping: vi.fn().mockResolvedValue('pong')
  } satisfies Partial<WalnutApi>

  return api as WalnutApi & {
    listImportHistory: ReturnType<typeof vi.fn>
    getImportBatchDetail: ReturnType<typeof vi.fn>
    getReviewQueue: ReturnType<typeof vi.fn>
    resolveReviewItems: ReturnType<typeof vi.fn>
    restoreReviewItems: ReturnType<typeof vi.fn>
  }
}

beforeEach(() => {
  window.localStorage.clear()
  window.sessionStorage.clear()
})

afterEach(() => {
  window.localStorage.clear()
  window.sessionStorage.clear()
  delete (window as typeof window & { walnut?: unknown }).walnut
})

describe('review queue', () => {
  it('reopens unresolved batches from history and batch detail into the dedicated queue', async () => {
    const user = userEvent.setup()
    const walnut = createWalnutApi()
    window.walnut = walnut
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Import statements from dashboard' }))
    await user.click(screen.getByRole('button', { name: 'Import history' }))
    await user.click(await screen.findByRole('button', { name: 'Open review queue for Needs review batch' }))

    expect(await screen.findByRole('heading', { name: 'Review queue' })).toBeVisible()
    expect(screen.getByText('Needs review batch')).toBeVisible()
    expect(walnut.getReviewQueue).toHaveBeenLastCalledWith({ batchId: 'batch-needs-review' })

    await user.click(screen.getByRole('button', { name: 'Back to import history' }))
    await user.click(screen.getByRole('button', { name: 'Open batch detail for Needs review batch' }))
    await user.click(await screen.findByRole('button', { name: 'Review unresolved items' }))

    expect(await screen.findByRole('heading', { name: 'Review queue' })).toBeVisible()
    expect(walnut.getReviewQueue).toHaveBeenLastCalledWith({ batchId: 'batch-needs-review' })
  })

  it('groups unresolved items by batch, keeps source context visible, and orders blocking items before warnings', async () => {
    const user = userEvent.setup()
    const walnut = createWalnutApi()
    window.walnut = walnut
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Import statements from dashboard' }))
    await user.click(screen.getByRole('button', { name: 'Import history' }))
    await user.click(await screen.findByRole('button', { name: 'Open review queue for Needs review batch' }))

    const batchGroup = await screen.findByLabelText('Review batch group Needs review batch')
    expect(within(batchGroup).getByText('3 unresolved items')).toBeVisible()
    expect(within(batchGroup).getByText('0 of 3 resolved')).toBeVisible()
    expect(within(batchGroup).getByText('blocking-file.xlsx')).toBeVisible()
    expect(within(batchGroup).getAllByText('warning-file.xlsx').length).toBeGreaterThan(0)

    const queueCards = within(batchGroup).getAllByRole('article')
    expect(within(queueCards[0] as HTMLElement).getByText('Blocking')).toBeVisible()
    expect(within(queueCards[1] as HTMLElement).getByText('Warning')).toBeVisible()
    expect(within(queueCards[2] as HTMLElement).getByText('Warning')).toBeVisible()
  })

  it('limits actions to the approved set and renders amount plus running balance as protected read-only fields', async () => {
    const user = userEvent.setup()
    const walnut = createWalnutApi()
    window.walnut = walnut
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Import statements from dashboard' }))
    await user.click(screen.getByRole('button', { name: 'Import history' }))
    await user.click(await screen.findByRole('button', { name: 'Open review queue for Needs review batch' }))

    await user.click(await screen.findByRole('button', { name: 'Open details for Possible duplicate candidate' }))

    expect(screen.getByRole('button', { name: 'Accept as-is' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Edit before accepting' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Mark as duplicate' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Mark as not duplicate' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Discard row' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Apply tag' })).toBeVisible()
    expect(screen.queryByRole('button', { name: /edit amount/i })).not.toBeInTheDocument()

    expect(screen.getByText('Amount')).toBeVisible()
    expect(screen.getByText('Running balance')).toBeVisible()
    expect(screen.getByText('Amount and running balance stay locked here to protect statement trust.')).toBeVisible()

    const amountField = screen.getByLabelText('Protected amount')
    const balanceField = screen.getByLabelText('Protected running balance')
    expect(amountField).toHaveAttribute('readonly')
    expect(balanceField).toHaveAttribute('readonly')

    expect(screen.getByRole('button', { name: 'Accept selected as-is' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Discard selected' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Mark selected as duplicate' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Mark selected as not duplicate' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Apply tag to selected' })).toBeDisabled()
  })

  it('renders the empty-state copy when no unresolved review items remain', async () => {
    const user = userEvent.setup()
    const walnut = createWalnutApi()
    walnut.getReviewQueue.mockResolvedValueOnce([emptyQueueDetail])
    window.walnut = walnut
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Import statements from dashboard' }))
    await user.click(screen.getByRole('button', { name: 'Import history' }))
    await user.click(await screen.findByRole('button', { name: 'Open review queue for Needs review batch' }))

    expect(await screen.findByRole('heading', { name: 'No unresolved review items' })).toBeVisible()
    expect(screen.getByText(/All current import issues have been resolved/i)).toBeVisible()
  })

  it('refetches queue, batch detail, and history after destructive actions and exposes a restore banner', async () => {
    const user = userEvent.setup()
    const walnut = createMutationWalnutApi()
    window.walnut = walnut
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Import statements from dashboard' }))
    await user.click(screen.getByRole('button', { name: 'Import history' }))
    await user.click(await screen.findByRole('button', { name: 'Open review queue for Needs review batch' }))
    await user.click(await screen.findByRole('button', { name: 'Open details for Possible duplicate candidate' }))
    await user.click(screen.getByRole('button', { name: 'Mark as duplicate' }))

    expect(walnut.resolveReviewItems).toHaveBeenCalledWith({
      action: 'mark-duplicate',
      batchId: 'batch-needs-review',
      reviewItemIds: ['blocking-duplicate']
    })

    await waitFor(() => expect(walnut.getReviewQueue).toHaveBeenCalledTimes(2))
    expect(walnut.listImportHistory.mock.calls.length).toBeGreaterThanOrEqual(1)
    expect(walnut.getImportBatchDetail.mock.calls.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('2 unresolved items')).toBeVisible()
    expect(screen.getByText('Duplicate mark saved. Restore this review item if this was a mistake.')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Restore' }))

    expect(walnut.restoreReviewItems).toHaveBeenCalledWith({
      batchId: 'batch-needs-review',
      reviewItemIds: ['blocking-duplicate']
    })
    await waitFor(() => expect(walnut.getReviewQueue).toHaveBeenCalledTimes(3))
    expect(screen.getByText('3 unresolved items')).toBeVisible()
  })

  it('keeps partial review progress consistent when the user leaves and returns later', async () => {
    const user = userEvent.setup()
    const walnut = createMutationWalnutApi()
    window.walnut = walnut
    const view = render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Import statements from dashboard' }))
    await user.click(screen.getByRole('button', { name: 'Import history' }))
    await user.click(await screen.findByRole('button', { name: 'Open review queue for Needs review batch' }))
    await user.click(await screen.findByRole('button', { name: 'Open details for Possible duplicate candidate' }))
    await user.click(screen.getByRole('button', { name: 'Mark as duplicate' }))
    await screen.findByText('2 unresolved items')

    view.unmount()
    window.walnut = walnut
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Import statements from dashboard' }))
    await user.click(screen.getByRole('button', { name: 'Import history' }))

    expect(await screen.findByText('Needs review: 2')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Open batch detail for Needs review batch' }))
    expect(await screen.findByText('Needs review: 2')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Review unresolved items' }))
    expect(await screen.findByText('2 unresolved items')).toBeVisible()
  })
})
