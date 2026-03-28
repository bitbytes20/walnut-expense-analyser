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
  },
  deviceProfiles: []
}

const historyRows = [
  {
    attemptId: 'attempt-transactions',
    batchId: 'batch-transactions',
    status: 'needs-review',
    importedAt: '2026-03-27T10:00:00.000Z',
    accountLabel: 'ICICI - Household',
    batchLabel: 'Needs review batch',
    fileCount: 1,
    acceptedTransactionCount: 2,
    blockedDuplicateCount: 0,
    unresolvedReviewCount: 1,
    errorCount: 0,
    lastUpdatedAt: '2026-03-27T11:00:00.000Z'
  }
]

const batchDetails = {
  'batch-transactions': {
    summary: historyRows[0],
    reviewItems: [],
    fileOutcomes: [
      {
        id: 'file-1',
        fileName: 'january.xlsx',
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
        sourceFileId: 'file-1',
        sourceFileName: 'january.xlsx',
        transactions: [
          {
            id: 'txn-salary',
            transactionDateRaw: '2024-01-20',
            rawNarration: 'Salary credit',
            cleanedDescription: 'Salary credit',
            creditAmountMinor: 950000,
            direction: 'credit',
            reference: 'SAL-20',
            sourceFileId: 'file-1',
            importBatchId: 'batch-transactions',
            tags: ['salary']
          },
          {
            id: 'txn-coffee',
            transactionDateRaw: '2024-01-18',
            rawNarration: 'Coffee shop',
            cleanedDescription: 'Coffee shop',
            debitAmountMinor: 24000,
            runningBalanceMinor: 175000,
            direction: 'debit',
            reference: 'COF-18',
            sourceFileId: 'file-1',
            importBatchId: 'batch-transactions',
            tags: ['coffee']
          }
        ]
      }
    ]
  }
}

const seedTransactionState = async (page: import('@playwright/test').Page) => {
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

test('shows the transaction ledger, supports explicit search, and opens the drawer only from edit', async ({ page }) => {
  await seedTransactionState(page)
  await page.goto('/')

  await page.getByRole('button', { name: 'Open transactions workspace' }).click()
  await expect(page.getByRole('heading', { name: 'Transactions' })).toBeVisible()
  await expect(page.getByText('Salary credit')).toBeVisible()
  await expect(page.getByText('Coffee shop')).toBeVisible()
  await expect(page.getByText('2 total transactions')).toBeVisible()
  await expect(page.getByText('Total Debited')).toBeVisible()
  await expect(page.getByText('Total Credited')).toBeVisible()
  await expect(page.getByText('Difference')).toBeVisible()
  await expect(page.getByText(/9,260\.00/)).toBeVisible()
  await expect(page.getByText('Showing 1-2 of 2')).toBeVisible()
  await expect(page.getByText('Page 1 of 1')).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Rows per page' })).toHaveValue('50')
  await expect(page.getByRole('button', { name: 'Debited' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Credited' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Balance' })).toBeVisible()

  await page.getByRole('searchbox', { name: 'Search descriptions' }).fill('salary')
  await page.getByRole('button', { name: 'Search' }).click()
  await expect(page.getByText('Salary credit')).toBeVisible()
  await expect(page.getByText('1 total transactions')).toBeVisible()
  await expect(page.getByText('Total Credited').locator('..').getByText(/9,500\.00/)).toBeVisible()

  await page.getByRole('button', { name: 'Hide filters' }).click()
  await expect(page.getByRole('heading', { name: 'Quick type filters' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Show filters' }).click()
  await expect(page.getByRole('heading', { name: 'Quick type filters' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Advanced filters' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Expense' })).toBeVisible()
  await page.getByRole('button', { name: 'Show advanced filters' }).click()
  await expect(page.getByRole('heading', { name: 'Advanced filters' })).toBeVisible()

  await page.getByRole('searchbox', { name: 'Search descriptions' }).fill('')
  await page.getByRole('button', { name: 'Search' }).click()
  await expect(page.getByText('Coffee shop')).toBeVisible()
  await page.getByText('Coffee shop').click()
  await expect(page.getByRole('heading', { name: 'Coffee shop' })).toHaveCount(0)

  await page.getByRole('button', { name: 'Edit transaction Coffee shop' }).click()
  await expect(page.getByRole('heading', { name: 'Coffee shop' })).toBeVisible()

  await page.getByRole('textbox', { name: 'Description' }).fill('Coffee with team')
  await page.getByLabel('Type').selectOption('transfer')
  await page.getByRole('button', { name: 'Save transaction' }).click()

  await expect(page.getByRole('textbox', { name: 'Description' })).toHaveValue('Coffee with team')
  await expect(page.getByText('Create a rule from this type change later')).toBeVisible()

  await page.reload()
  await page.getByRole('button', { name: 'Open transactions workspace' }).click()
  await expect(page.getByText('Coffee with team')).toBeVisible()
})
