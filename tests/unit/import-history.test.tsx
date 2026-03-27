import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/renderer/App'
import type { WalnutApi } from '../../src/shared/contracts/app-state'

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
  }
}

const historyRows = [
  {
    attemptId: 'attempt-failed',
    batchId: 'batch-failed',
    status: 'failed',
    importedAt: '2026-03-27T10:00:00.000Z',
    accountLabel: 'ICICI - Household',
    batchLabel: 'Failed batch',
    fileCount: 1,
    acceptedTransactionCount: 0,
    blockedDuplicateCount: 0,
    unresolvedReviewCount: 0,
    errorCount: 1,
    lastUpdatedAt: '2026-03-27T10:00:00.000Z'
  },
  {
    attemptId: 'attempt-needs-review',
    batchId: 'batch-needs-review',
    status: 'needs-review',
    importedAt: '2026-03-26T10:00:00.000Z',
    accountLabel: 'ICICI - Household',
    batchLabel: 'Needs review batch',
    fileCount: 2,
    acceptedTransactionCount: 3,
    blockedDuplicateCount: 1,
    unresolvedReviewCount: 2,
    errorCount: 0,
    lastUpdatedAt: '2026-03-26T11:00:00.000Z'
  },
  {
    attemptId: 'attempt-rejected',
    batchId: 'batch-rejected',
    status: 'rejected',
    importedAt: '2026-03-25T10:00:00.000Z',
    accountLabel: 'ICICI - Household',
    batchLabel: 'Rejected batch',
    fileCount: 1,
    acceptedTransactionCount: 0,
    blockedDuplicateCount: 0,
    unresolvedReviewCount: 0,
    errorCount: 1,
    lastUpdatedAt: '2026-03-25T10:00:00.000Z'
  },
  {
    attemptId: 'attempt-imported',
    batchId: 'batch-imported',
    status: 'imported',
    importedAt: '2026-03-24T10:00:00.000Z',
    accountLabel: 'ICICI - Household',
    batchLabel: 'Imported batch',
    fileCount: 1,
    acceptedTransactionCount: 4,
    blockedDuplicateCount: 0,
    unresolvedReviewCount: 0,
    errorCount: 0,
    lastUpdatedAt: '2026-03-24T10:00:00.000Z'
  }
] as const

const batchDetail = {
  summary: historyRows[1],
  reviewItems: [
    {
      id: 'review-1',
      batchId: 'batch-needs-review',
      importAttemptId: 'attempt-needs-review',
      reasonCode: 'duplicate-candidate',
      severity: 'blocking',
      state: 'pending',
      title: 'Possible duplicate candidate',
      description: 'Possible duplicate found.',
      snapshot: {
        sourceFileId: 'file-review',
        sourceFileName: 'review.xlsx',
        message: 'Possible duplicate found.'
      },
      createdAt: '2026-03-26T10:00:00.000Z',
      updatedAt: '2026-03-26T10:00:00.000Z',
      resolution: {
        batchId: 'batch-needs-review',
        reviewItemId: 'review-1'
      }
    }
  ],
  fileOutcomes: [
    {
      id: 'file-review',
      fileName: 'review.xlsx',
      fileExtension: 'xlsx',
      accountLabel: 'ICICI - Household',
      statementPeriodLabel: 'Jan 2024',
      status: 'imported',
      importedTransactionCount: 3,
      outcome: 'imported'
    },
    {
      id: 'file-duplicate',
      fileName: 'duplicate.xlsx',
      fileExtension: 'xlsx',
      accountLabel: 'ICICI - Household',
      statementPeriodLabel: 'Jan 2024',
      status: 'duplicate-blocked',
      reasonCode: 'duplicate-file',
      reasonTitle: 'Duplicate file',
      reasonBody: 'This statement was already imported.',
      outcome: 'duplicate-blocked'
    }
  ],
  transactionGroups: [
    {
      sourceFileId: 'file-review',
      sourceFileName: 'review.xlsx',
      transactions: [
        {
          id: 'txn-1',
          transactionDateRaw: '2024-01-01',
          rawNarration: 'Coffee shop',
          cleanedDescription: 'Coffee shop',
          debitAmountMinor: 24000,
          direction: 'debit',
          sourceFileId: 'file-review',
          importBatchId: 'batch-needs-review'
        }
      ]
    }
  ]
} as const

const createWalnutApi = (): WalnutApi =>
  ({
    loadAppState: vi.fn().mockResolvedValue(dashboardState),
    saveOnboardingProgress: vi.fn(),
    completeOnboarding: vi.fn(),
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
    getReviewQueue: vi.fn().mockResolvedValue([]),
    ping: vi.fn().mockResolvedValue('pong')
  }) as unknown as WalnutApi

beforeEach(() => {
  window.localStorage.clear()
  window.walnut = createWalnutApi()
})

afterEach(() => {
  window.localStorage.clear()
  delete (window as typeof window & { walnut?: unknown }).walnut
})

describe('import history', () => {
  it('renders newest-first history rows with canonical statuses, operational counts, and the empty-state copy', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Import statements from dashboard' }))
    await user.click(screen.getByRole('button', { name: 'Import history' }))

    await screen.findByRole('heading', { name: 'Import history' })

    expect(screen.getByText('Failed')).toBeVisible()
    expect(screen.getByText('Needs review')).toBeVisible()
    expect(screen.getByText('Rejected')).toBeVisible()
    expect(screen.getByText('Imported')).toBeVisible()
    expect(screen.getByText('Accepted: 3')).toBeVisible()
    expect(screen.getByText('Blocked duplicates: 1')).toBeVisible()
    expect(screen.getByText('Needs review: 2')).toBeVisible()

    ;(window.walnut.listImportHistory as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([])
    await user.click(screen.getByRole('button', { name: 'Refresh history' }))

    expect(await screen.findByRole('heading', { name: 'No imports yet' })).toBeVisible()
  })

  it('opens batch detail with summary, per-file outcomes, and read-only transaction drill-down', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Import statements from dashboard' }))
    await user.click(screen.getByRole('button', { name: 'Import history' }))

    await user.click(await screen.findByRole('button', { name: 'Open batch detail for Needs review batch' }))

    await screen.findByRole('heading', { name: 'Batch detail' })
    expect(screen.getByText('Review unresolved items')).toBeVisible()
    expect(screen.getByText('duplicate.xlsx')).toBeVisible()
    expect(screen.getByText('review.xlsx')).toBeVisible()
    expect(screen.getByText('Coffee shop')).toBeVisible()
  })

  it('preserves unresolved-batch re-entry actions from history into batch detail', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Import statements from dashboard' }))
    await user.click(screen.getByRole('button', { name: 'Import history' }))

    expect(screen.getByRole('button', { name: 'Open review queue for Needs review batch' })).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Open batch detail for Needs review batch' }))
    await screen.findByRole('heading', { name: 'Batch detail' })

    expect(screen.getByRole('button', { name: 'Review unresolved items' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Back to import history' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Open review queue for Needs review batch' })).toBeVisible())
  })
})
