import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../../src/renderer/App'
import type { WalnutApi } from '../../../src/shared/contracts/app-state'
import type { TransactionDetail, TransactionLedgerRow } from '../../../src/shared/contracts/transactions'

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
    id: 'txn-1',
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
    categoryId: 'cat:food-dining',
    categoryPath: ['Food & Dining'],
    category: 'Food & Dining',
    reviewState: 'clean',
    reference: 'COF-18'
  }
]

const transactionDetail: TransactionDetail = {
  id: 'txn-1',
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
  categoryId: 'cat:food-dining',
  categoryPath: ['Food & Dining'],
  category: 'Food & Dining',
  tags: ['coffee'],
  reference: 'COF-18',
  reviewState: 'clean',
  reviewStateOverride: null,
  runningBalanceMinor: 175000,
  direction: 'debit'
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
    listImportHistory: vi.fn().mockResolvedValue([]),
    getImportBatchDetail: vi.fn(),
    getReviewQueue: vi.fn().mockResolvedValue([]),
    resolveReviewItems: vi.fn(),
    restoreReviewItems: vi.fn(),
    listTransactions: vi.fn().mockResolvedValue(ledgerRows),
    getTransactionDetail: vi.fn().mockResolvedValue(transactionDetail),
    updateTransaction: vi.fn().mockResolvedValue({
      detail: { ...transactionDetail, normalizedType: 'transfer' as const },
      ruleSuggestion: {
        field: 'type' as const,
        fromType: 'expense' as const,
        toType: 'transfer' as const,
        title: 'Create a rule from this type change later',
        description: 'Walnut can use this correction as a reusable rule suggestion.',
        draft: {
          name: 'Coffee shop rule',
          condition: {
            descriptionContains: ['coffee', 'shop'],
            transactionTypes: ['expense' as const],
            tags: ['coffee'],
            directions: ['debit' as const]
          },
          action: {
            categoryId: 'cat:food-dining',
            type: 'transfer' as const,
            appendTags: ['coffee']
          }
        }
      }
    }),
    listCategories: vi.fn().mockResolvedValue([
      {
        id: 'cat:food-dining',
        name: 'Food & Dining',
        kind: 'system' as const,
        path: ['Food & Dining'],
        isActive: true,
        isIncomeCategory: false,
        sortOrder: 10,
        counts: { directTransactionCount: 1, totalTransactionCount: 1 },
        children: []
      }
    ]),
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
    ping: vi.fn().mockResolvedValue('pong')
  } satisfies Partial<WalnutApi>

  return api as WalnutApi
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  window.localStorage.clear()
  delete (window as typeof window & { walnut?: unknown }).walnut
})

describe('transaction rule suggestion handoff', () => {
  it('opens the categories and rules workspace with a prefilled rule draft after a transaction type correction', async () => {
    const user = userEvent.setup()
    window.walnut = createWalnutApi()

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Open transactions workspace' }))
    await screen.findByRole('heading', { name: 'Transactions' })
    await screen.findByText('Coffee shop')

    await user.click(await screen.findByRole('button', { name: 'Edit transaction Coffee shop' }))
    await screen.findByRole('heading', { name: 'Coffee shop' })
    await user.selectOptions(screen.getByLabelText('Type'), 'transfer')
    await user.click(screen.getByRole('button', { name: 'Save transaction' }))

    expect(await screen.findByText('Create a rule from this type change later')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Create reusable rule' }))

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Categories & Rules' })).toBeVisible())
    expect(await screen.findByRole('heading', { name: 'Create reusable rule' })).toBeVisible()
    expect(screen.getByDisplayValue('Coffee shop rule')).toBeVisible()
    expect(screen.getByDisplayValue('coffee, shop')).toBeVisible()
  })
})
