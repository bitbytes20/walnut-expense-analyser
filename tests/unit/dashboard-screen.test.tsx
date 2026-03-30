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
  },
  deviceProfiles: []
}

const snapshot = {
  query: {
    range: { preset: 'month' as const, from: '2024-02-01', to: '2024-02-29' },
    compare: { enabled: true, from: '2024-01-01', to: '2024-01-31' }
  },
  summaryCards: [
    { id: 'credited' as const, label: 'Total credited', totalMinor: 1400000, previousTotalMinor: 1250000, deltaMinor: 150000, trend: 'up' as const, helper: 'All credit activity in the selected period.' },
    { id: 'debited' as const, label: 'Total debited', totalMinor: 620000, previousTotalMinor: 525000, deltaMinor: 95000, trend: 'up' as const, helper: 'All debit activity in the selected period.' },
    { id: 'difference' as const, label: 'Difference', totalMinor: 780000, previousTotalMinor: 725000, deltaMinor: 55000, trend: 'up' as const, helper: 'Credited minus debited for the selected period.' },
    { id: 'income' as const, label: 'Income vs refunds', totalMinor: 1400000, previousTotalMinor: 1250000, deltaMinor: 150000, trend: 'up' as const, helper: 'Income includes refunds and reimbursements.' },
    { id: 'expense' as const, label: 'Spend footprint', totalMinor: 620000, previousTotalMinor: 525000, deltaMinor: 95000, trend: 'up' as const, helper: 'Spend includes expenses, ATM withdrawals, and credit-card payments.' }
  ],
  operationalCards: [
    { id: 'transfer' as const, label: 'Transfers', totalMinor: 0, transactionCount: 0, trend: 'flat' as const, helper: '0 matching transactions in the selected period.' },
    { id: 'refund' as const, label: 'Refunds', totalMinor: 50000, transactionCount: 1, trend: 'up' as const, helper: '1 matching transactions in the selected period.' },
    { id: 'atm-withdrawal' as const, label: 'ATM withdrawals', totalMinor: 120000, transactionCount: 1, trend: 'up' as const, helper: '1 matching transactions in the selected period.' },
    { id: 'credit-card-payment' as const, label: 'Credit card payments', totalMinor: 175000, transactionCount: 1, trend: 'up' as const, helper: '1 matching transactions in the selected period.' }
  ],
  spendTrend: [
    { bucketKey: '2024-02-01', bucketLabel: '01 Feb - 07 Feb', from: '2024-02-01', to: '2024-02-07', spendMinor: 320000, incomeMinor: 1400000, previousSpendMinor: 250000, previousIncomeMinor: 1250000, ledgerQuery: { dateFrom: '2024-02-01', dateTo: '2024-02-07' } }
  ],
  categoryBreakdown: [
    { categoryId: 'cat:food', label: 'Food & Dining', totalMinor: 210000, transactionCount: 3, percentageOfSpend: 0.34, ledgerQuery: { categories: ['cat:food'], dateFrom: '2024-02-01', dateTo: '2024-02-29' } }
  ],
  topMerchants: [
    { merchant: 'Burger King', totalMinor: 90000, transactionCount: 2, ledgerQuery: { search: 'Burger King', dateFrom: '2024-02-01', dateTo: '2024-02-29' } }
  ],
  largestTransactions: [
    { transactionId: 'txn-largest', description: 'Salary credit', transactionDateRaw: '2024-02-02', amountMinor: 1250000, normalizedType: 'income' as const, ledgerQuery: { search: 'Salary credit', dateFrom: '2024-02-01', dateTo: '2024-02-29' } }
  ],
  recentTransactions: [
    { transactionId: 'txn-recent', description: 'Burger King', transactionDateRaw: '2024-02-20', signedAmountMinor: -45000, normalizedType: 'expense' as const, ledgerQuery: { search: 'Burger King', dateFrom: '2024-02-01', dateTo: '2024-02-29' } }
  ],
  recurringItems: [
    { id: 'rec-1', description: 'Salary credit', direction: 'credit' as const, normalizedType: 'income' as const, occurrenceCount: 2, averageAmountMinor: 1250000, lastTransactionDateRaw: '2024-02-02', cadenceLabel: 'Repeats 2 times', ledgerQuery: { search: 'Salary credit', types: ['income'], dateFrom: '2024-02-01', dateTo: '2024-02-29' } }
  ]
}

const ledgerRows = [
  {
    id: 'txn-recent',
    importBatchId: 'batch-1',
    sourceFileId: 'file-1',
    transactionDateRaw: '2024-02-20',
    transactionDateSortable: '2024-02-20',
    description: 'Burger King',
    signedAmountMinor: -45000,
    debitAmountMinor: 45000,
    creditAmountMinor: null,
    runningBalanceMinor: 900000,
    normalizedType: 'expense' as const,
    tags: [],
    reference: 'BG-1',
    reviewState: 'clean' as const
  }
]

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
    listImportHistory: vi.fn().mockResolvedValue([]),
    getImportBatchDetail: vi.fn(),
    getReviewQueue: vi.fn().mockResolvedValue([]),
    resolveReviewItems: vi.fn(),
    restoreReviewItems: vi.fn(),
    listTransactions: vi.fn().mockResolvedValue(ledgerRows),
    getTransactionDetail: vi.fn().mockResolvedValue({
      ...ledgerRows[0],
      batchLabel: 'Imported batch',
      sourceFileName: 'import.xlsx',
      importedAt: '2026-03-28T10:00:00.000Z',
      rawNarration: 'Burger King',
      reviewStateOverride: null,
      direction: 'debit'
    }),
    updateTransaction: vi.fn(),
    listCategories: vi.fn().mockResolvedValue([]),
    createCategory: vi.fn().mockResolvedValue([]),
    updateCategory: vi.fn().mockResolvedValue([]),
    mergeCategory: vi.fn().mockResolvedValue([]),
    deleteCategory: vi.fn().mockResolvedValue([]),
    listRules: vi.fn().mockResolvedValue([]),
    createRule: vi.fn().mockResolvedValue([]),
    updateRule: vi.fn().mockResolvedValue([]),
    toggleRule: vi.fn().mockResolvedValue([]),
    deleteRule: vi.fn().mockResolvedValue([]),
    testRule: vi.fn().mockResolvedValue({ matchCount: 0, samples: [] }),
    previewRuleApplyToExisting: vi.fn().mockResolvedValue({ matchCount: 0, samples: [] }),
    applyRuleToExisting: vi.fn().mockResolvedValue([]),
    getDashboardPreferences: vi.fn().mockResolvedValue({ range: snapshot.query.range, compareEnabled: true }),
    setDashboardPreferences: vi.fn().mockImplementation(async (input) => input),
    getDashboardSnapshot: vi.fn().mockResolvedValue(snapshot),
    getRecurringDetail: vi.fn().mockResolvedValue({
      item: snapshot.recurringItems[0],
      transactions: [
        { transactionId: 'txn-sal-1', transactionDateRaw: '2024-02-02', description: 'Salary credit', signedAmountMinor: 1250000, normalizedType: 'income' as const }
      ]
    }),
    ping: vi.fn().mockResolvedValue('pong'),
    bulkUpdateTransactions: vi.fn().mockResolvedValue({ updatedCount: 0 }),
    replaceStagedFile: vi.fn().mockResolvedValue({ stagedFiles: [] }),
    listFilterPresets: vi.fn().mockResolvedValue([]),
    saveFilterPreset: vi.fn().mockResolvedValue([]),
    renameFilterPreset: vi.fn().mockResolvedValue([]),
    deleteFilterPreset: vi.fn().mockResolvedValue([])
  } satisfies Partial<WalnutApi>

  return api as WalnutApi & {
    listTransactions: ReturnType<typeof vi.fn>
    getDashboardSnapshot: ReturnType<typeof vi.fn>
  }
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  window.localStorage.clear()
  delete (window as typeof window & { walnut?: unknown }).walnut
})

describe('dashboard analytics screen', () => {
  it('renders a zero-state dashboard with real widgets and an import CTA when no analytics data exists yet', async () => {
    const walnut = createWalnutApi()
    walnut.getDashboardSnapshot.mockResolvedValue({
      ...snapshot,
      summaryCards: snapshot.summaryCards.map((card) => ({
        ...card,
        totalMinor: 0,
        previousTotalMinor: 0,
        deltaMinor: 0,
        trend: 'flat' as const
      })),
      operationalCards: snapshot.operationalCards.map((card) => ({
        ...card,
        totalMinor: 0,
        transactionCount: 0,
        trend: 'flat' as const
      })),
      spendTrend: [],
      categoryBreakdown: [],
      topMerchants: [],
      largestTransactions: [],
      recentTransactions: [],
      recurringItems: []
    })
    window.walnut = walnut

    render(<App />)

    await screen.findByRole('heading', { name: 'Import statements to light up your finance dashboard.' })
    expect(screen.getByRole('button', { name: 'Import statements from dashboard' })).toBeVisible()
    expect(screen.getByText('Total credited')).toBeVisible()
    expect(screen.getByText('Total debited')).toBeVisible()
    expect(screen.getByText('Difference')).toBeVisible()
    expect(screen.getByText('Import transactions to see weekly, monthly, or yearly income-versus-spend trends here.')).toBeVisible()
    expect(screen.getByText('Recent activity previews will appear here after your first imported batch.')).toBeVisible()
  })

  it('falls back to all-time analytics when the saved range is empty but records exist historically', async () => {
    const user = userEvent.setup()
    const walnut = createWalnutApi()
    walnut.getDashboardPreferences.mockResolvedValue({ range: { preset: 'month', from: '2026-03-01', to: '2026-03-31' }, compareEnabled: true })
    walnut.getDashboardSnapshot
      .mockResolvedValueOnce({
        ...snapshot,
        query: {
          range: { preset: 'month' as const, from: '2026-03-01', to: '2026-03-31' },
          compare: { enabled: true, from: '2026-02-01', to: '2026-02-28' }
        },
        summaryCards: snapshot.summaryCards.map((card) => ({
          ...card,
          totalMinor: 0,
          previousTotalMinor: 0,
          deltaMinor: 0,
          trend: 'flat' as const
        })),
        operationalCards: snapshot.operationalCards.map((card) => ({
          ...card,
          totalMinor: 0,
          transactionCount: 0,
          trend: 'flat' as const
        })),
        spendTrend: [],
        categoryBreakdown: [],
        topMerchants: [],
        largestTransactions: [],
        recentTransactions: [],
        recurringItems: []
      })
      .mockResolvedValueOnce({
        ...snapshot,
        query: {
          range: { preset: 'all-time' as const, from: '2024-02-01', to: '2024-02-29' },
          compare: { enabled: true, from: '2024-01-01', to: '2024-01-31' }
        }
      })
    window.walnut = walnut

    render(<App />)

    await screen.findByRole('heading', { name: 'See how this household earns, spends, and repeats over time.' })
    expect(walnut.getDashboardSnapshot).toHaveBeenCalledTimes(2)
    expect(walnut.getDashboardSnapshot).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ range: expect.objectContaining({ preset: 'all-time' }) })
    )
    expect(walnut.setDashboardPreferences).toHaveBeenCalledWith(
      expect.objectContaining({ range: expect.objectContaining({ preset: 'all-time' }) })
    )

    await user.click(screen.getAllByRole('button', { name: /Burger King/ })[0])
    await waitFor(() => expect(walnut.listTransactions).toHaveBeenCalledWith(expect.objectContaining({ search: 'Burger King' })))
  })

  it('renders dashboard analytics and drills into the ledger from dashboard widgets', async () => {
    const user = userEvent.setup()
    const walnut = createWalnutApi()
    window.walnut = walnut

    render(<App />)

    await screen.findByRole('heading', { name: 'See how this household earns, spends, and repeats over time.' })
    expect(screen.getByText('Total credited')).toBeVisible()
    expect(screen.getByText('Total debited')).toBeVisible()
    expect(screen.getByText('Difference')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Month' })).toBeVisible()
    expect(screen.getAllByText('Burger King').length).toBeGreaterThan(0)

    await user.click(screen.getAllByRole('button', { name: /Burger King/ })[0])

    await waitFor(() => expect(walnut.listTransactions).toHaveBeenCalledWith(expect.objectContaining({ search: 'Burger King' })))
    await screen.findByRole('heading', { name: 'Transactions' })
  })
})
