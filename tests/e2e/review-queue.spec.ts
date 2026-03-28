import { expect, test } from '@playwright/test'

const dashboardState = {
  currentView: 'dashboard',
  onboarding: {
    currentStep: 'finish',
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
  }
]

const batchDetails = {
  'batch-needs-review': {
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
}

const seedReviewQueueState = async (page: import('@playwright/test').Page) => {
  await page.addInitScript(
    ({ appState, history, details }) => {
      if (!window.localStorage.getItem('walnut.mock.app-state')) {
        window.localStorage.setItem('walnut.mock.app-state', JSON.stringify(appState))
      }
      if (!window.localStorage.getItem('walnut.mock.security-events')) {
        window.localStorage.setItem('walnut.mock.security-events', '[]')
      }
      if (!window.localStorage.getItem('walnut.mock.staged-import-files')) {
        window.localStorage.setItem('walnut.mock.staged-import-files', '[]')
      }
      if (!window.localStorage.getItem('walnut.mock.import-history')) {
        window.localStorage.setItem('walnut.mock.import-history', JSON.stringify(history))
      }
      if (!window.localStorage.getItem('walnut.mock.import-batch-details')) {
        window.localStorage.setItem('walnut.mock.import-batch-details', JSON.stringify(details))
      }
      if (!window.localStorage.getItem('walnut.mock.resolved-review-items')) {
        window.localStorage.setItem('walnut.mock.resolved-review-items', '{}')
      }
    },
    {
      appState: dashboardState,
      history: historyRows,
      details: batchDetails
    }
  )
}

test('keeps partial review progress across reload and supports restoring destructive actions', async ({ page }) => {
  await seedReviewQueueState(page)
  await page.goto('/')

  await page.getByRole('button', { name: 'Import statements from dashboard' }).click()
  await page.getByRole('button', { name: 'Open import history workspace' }).click()
  await page.getByRole('button', { name: 'Open review queue for Needs review batch' }).click()
  await page.getByRole('button', { name: 'Open details for Possible duplicate candidate' }).click()
  await page.getByRole('button', { name: 'Mark as duplicate' }).click()

  await expect(page.getByText('Duplicate mark saved. Restore this review item if this was a mistake.')).toBeVisible()
  await page.getByRole('button', { name: 'Back to import history' }).click()
  await expect(page.getByText('Needs review: 2')).toBeVisible()

  await page.reload()
  await page.getByRole('button', { name: 'Import statements from dashboard' }).click()
  await page.getByRole('button', { name: 'Open import history workspace' }).click()
  await expect(page.getByText('Needs review: 2')).toBeVisible()

  await page.getByRole('button', { name: 'Open review queue for Needs review batch' }).click()
  await page.getByRole('button', { name: 'Restore' }).click()
  await expect(page.getByText('3 unresolved items')).toBeVisible()

  await page.getByRole('button', { name: 'Back to import history' }).click()
  await expect(page.getByText('Needs review: 3')).toBeVisible()
})
