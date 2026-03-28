import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/renderer/App'
import type { WalnutApi } from '../../src/shared/contracts/app-state'
import type { TransactionDetail, TransactionLedgerRow } from '../../src/shared/contracts/transactions'

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

const ledgerRows: TransactionLedgerRow[] = [
  {
    id: 'txn-salary',
    importBatchId: 'batch-1',
    sourceFileId: 'file-1',
    transactionDateRaw: '2024-01-20',
    transactionDateSortable: '2024-01-20',
    description: 'Salary credit',
    signedAmountMinor: 950000,
    debitAmountMinor: null,
    creditAmountMinor: 950000,
    runningBalanceMinor: 4500000,
    normalizedType: 'income',
    tags: ['salary'],
    reviewState: 'clean',
    reference: 'SAL-20'
  },
  {
    id: 'txn-coffee',
    importBatchId: 'batch-1',
    sourceFileId: 'file-1',
    transactionDateRaw: '2024-01-18',
    transactionDateSortable: '2024-01-18',
    description: 'Coffee shop',
    signedAmountMinor: -24000,
    debitAmountMinor: 24000,
    creditAmountMinor: null,
    runningBalanceMinor: 175000,
    normalizedType: 'expense',
    tags: ['coffee'],
    reviewState: 'pending-review',
    reference: 'COF-18'
  }
]

const transactionDetail: TransactionDetail = {
  id: 'txn-coffee',
  importBatchId: 'batch-1',
  sourceFileId: 'file-1',
  batchLabel: 'January batch',
  sourceFileName: 'january.xlsx',
  importedAt: '2026-03-28T09:00:00.000Z',
  transactionDateRaw: '2024-01-18',
  transactionDateSortable: '2024-01-18',
  rawNarration: 'Coffee shop',
  description: 'Coffee shop',
  signedAmountMinor: -24000,
  normalizedType: 'expense',
  tags: ['coffee'],
  reference: 'COF-18',
  reviewState: 'pending-review',
  reviewStateOverride: null,
  runningBalanceMinor: 175000,
  direction: 'debit'
}

const createWalnutApi = () => {
  const listTransactions = vi.fn().mockImplementation(async (query?: { search?: string }) => {
    if (query?.search?.toLowerCase() === 'salary') {
      return [ledgerRows[0]]
    }

    return ledgerRows
  })

  const getTransactionDetail = vi.fn().mockResolvedValue(transactionDetail)
  const updateTransaction = vi.fn().mockImplementation(async (input) => ({
    detail: {
      ...transactionDetail,
      description: input.description ?? transactionDetail.description,
      normalizedType: input.normalizedType ?? transactionDetail.normalizedType
    },
    ruleSuggestion:
      input.normalizedType && input.normalizedType !== transactionDetail.normalizedType
        ? {
            field: 'type',
            fromType: transactionDetail.normalizedType,
            toType: input.normalizedType,
            title: 'Create a rule from this type change later',
            description: 'Walnut can use this correction as a suggestion when reusable rules are introduced.'
          }
        : undefined
  }))

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
    listTransactions,
    getTransactionDetail,
    updateTransaction,
    ping: vi.fn().mockResolvedValue('pong')
  } satisfies Partial<WalnutApi>

  return api as WalnutApi & {
    listTransactions: ReturnType<typeof vi.fn>
    getTransactionDetail: ReturnType<typeof vi.fn>
    updateTransaction: ReturnType<typeof vi.fn>
  }
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  window.localStorage.clear()
  delete (window as typeof window & { walnut?: unknown }).walnut
})

describe('transaction ledger', () => {
  it('opens the transactions workspace, searches, opens the drawer only from edit, and saves edits', async () => {
    const user = userEvent.setup()
    const walnut = createWalnutApi()
    window.walnut = walnut

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Open transactions workspace' }))
    await screen.findByRole('heading', { name: 'Transactions' })

    expect(await screen.findByText('Salary credit')).toBeVisible()
    expect(screen.getByText('Coffee shop')).toBeVisible()
    expect(screen.getByText('2 total transactions')).toBeVisible()
    expect(screen.getByText('Total Debited')).toBeVisible()
    expect(screen.getByText('Total Credited')).toBeVisible()
    expect(screen.getByText('Difference')).toBeVisible()
    expect(screen.getAllByText(/240\.00/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/9,500\.00/).length).toBeGreaterThan(0)
    expect(screen.getByText(/9,260\.00/)).toBeVisible()
    expect(screen.getByText('Showing 1-2 of 2')).toBeVisible()
    expect(screen.getByText('Page 1 of 1')).toBeVisible()
    expect(screen.getByRole('combobox', { name: 'Rows per page' })).toHaveValue('50')

    await user.type(screen.getByRole('searchbox', { name: 'Search descriptions' }), 'salary')
    await user.click(screen.getByRole('button', { name: 'Search' }))
    await waitFor(() => expect(walnut.listTransactions).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'salary' })))
    await waitFor(() => expect(screen.getByText('1 total transactions')).toBeVisible())
    expect(screen.getAllByText(/0\.00/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/9,500\.00/).length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: 'Hide filters' }))
    expect(screen.queryByRole('heading', { name: 'Quick type filters' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Show filters' }))
    expect(screen.getByRole('heading', { name: 'Quick type filters' })).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Advanced filters' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Expense' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Income' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Show advanced filters' }))
    expect(screen.getByRole('heading', { name: 'Advanced filters' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Debited' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Credited' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Balance' })).toBeVisible()

    await user.clear(screen.getByRole('searchbox', { name: 'Search descriptions' }))
    await user.click(screen.getByRole('button', { name: 'Search' }))
    await screen.findByText('Coffee shop')
    await user.click(screen.getByText('Coffee shop'))
    expect(screen.queryByRole('heading', { name: 'Coffee shop' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Edit transaction Coffee shop' }))
    await screen.findByRole('heading', { name: 'Coffee shop' })

    const descriptionInput = screen.getByDisplayValue('Coffee shop')
    await user.clear(descriptionInput)
    await user.type(descriptionInput, 'Coffee with team')
    await user.selectOptions(screen.getByDisplayValue('Expense'), 'transfer')
    await user.click(screen.getByRole('button', { name: 'Save transaction' }))

    await waitFor(() =>
      expect(walnut.updateTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionId: 'txn-coffee',
          description: 'Coffee with team',
          normalizedType: 'transfer'
        })
      )
    )

    expect(await screen.findByText('Create a rule from this type change later')).toBeVisible()
  })
})
