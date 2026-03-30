import { render, screen, waitFor, within } from '@testing-library/react'
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

const categories = [
  {
    id: 'cat:income',
    name: 'Income',
    kind: 'system' as const,
    path: ['Income'],
    isActive: true,
    isIncomeCategory: true,
    sortOrder: 10,
    counts: { directTransactionCount: 0, totalTransactionCount: 2 },
    children: [
      {
        id: 'cat:income-salary',
        name: 'Salary',
        kind: 'system' as const,
        parentId: 'cat:income',
        path: ['Income', 'Salary'],
        isActive: true,
        isIncomeCategory: true,
        sortOrder: 11,
        counts: { directTransactionCount: 2, totalTransactionCount: 2 },
        children: []
      }
    ]
  },
  {
    id: 'cat:dining-out',
    name: 'Dining Out',
    kind: 'user' as const,
    path: ['Dining Out'],
    isActive: true,
    isIncomeCategory: false,
    sortOrder: 20,
    counts: { directTransactionCount: 3, totalTransactionCount: 3 },
    children: []
  }
]

const rules = [
  {
    id: 'rule:dining',
    name: 'Dining rule',
    kind: 'user' as const,
    isEnabled: true,
    condition: {
      descriptionTerms: [{ op: 'contains' as const, value: 'burger' }],
      transactionTypes: ['expense' as const],
      tags: [],
      directions: ['debit' as const]
    },
    action: {
      categoryId: 'cat:dining-out',
      type: 'expense' as const,
      appendTags: ['restaurant']
    },
    specificityScore: 8,
    sortOrder: 10,
    affectedTransactionCount: 3,
    updatedAt: '2026-03-28T18:00:00.000Z'
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
    listTransactions: vi.fn().mockResolvedValue([]),
    getTransactionDetail: vi.fn(),
    updateTransaction: vi.fn(),
    listCategories: vi.fn().mockResolvedValue(categories),
    createCategory: vi.fn().mockResolvedValue(categories),
    updateCategory: vi.fn().mockResolvedValue(categories),
    mergeCategory: vi.fn().mockResolvedValue(categories),
    mergeCategoryPreview: vi.fn().mockResolvedValue({ sourceCategoryId: '', targetCategoryId: '', affectedTransactionCount: 0, affectedRuleCount: 0, samples: [] }),
    archiveCategory: vi.fn().mockResolvedValue(categories),
    deleteCategory: vi.fn().mockResolvedValue(categories),
    listRules: vi.fn().mockResolvedValue(rules),
    createRule: vi.fn().mockResolvedValue(rules),
    updateRule: vi.fn().mockResolvedValue(rules),
    toggleRule: vi.fn().mockResolvedValue(rules),
    deleteRule: vi.fn().mockResolvedValue(rules),
    testRule: vi.fn().mockResolvedValue({
      matchCount: 3,
      samples: [
        {
          transactionId: 'txn-1',
          transactionDateRaw: '2024-01-01',
          description: 'Burger King NSP',
          signedAmountMinor: -74000,
          currentType: 'expense' as const,
          nextType: 'expense' as const,
          currentCategoryPath: undefined,
          nextCategoryPath: ['Dining Out'],
          tags: ['restaurant']
        }
      ]
    }),
    previewRuleApplyToExisting: vi.fn().mockResolvedValue({
      matchCount: 3,
      samples: [
        {
          transactionId: 'txn-1',
          transactionDateRaw: '2024-01-01',
          description: 'Burger King NSP',
          signedAmountMinor: -74000,
          currentType: 'expense' as const,
          nextType: 'expense' as const,
          currentCategoryPath: undefined,
          nextCategoryPath: ['Dining Out'],
          tags: ['restaurant']
        }
      ]
    }),
    applyRuleToExisting: vi.fn().mockResolvedValue(rules),
    ping: vi.fn().mockResolvedValue('pong'),
    bulkUpdateTransactions: vi.fn().mockResolvedValue({ updatedCount: 0 }),
    replaceStagedFile: vi.fn().mockResolvedValue({ stagedFiles: [] }),
    listFilterPresets: vi.fn().mockResolvedValue([]),
    saveFilterPreset: vi.fn().mockResolvedValue([]),
    renameFilterPreset: vi.fn().mockResolvedValue([]),
    deleteFilterPreset: vi.fn().mockResolvedValue([])
  } satisfies Partial<WalnutApi>

  return api as WalnutApi & {
    createCategory: ReturnType<typeof vi.fn>
    testRule: ReturnType<typeof vi.fn>
  }
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  window.localStorage.clear()
  delete (window as typeof window & { walnut?: unknown }).walnut
})

describe('categories and rules screen', () => {
  it('renders the dedicated workspace, protected cues, and category management side panel', async () => {
    const user = userEvent.setup()
    const walnut = createWalnutApi()
    window.walnut = walnut

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Open categories and rules workspace' }))
    await screen.findByRole('heading', { name: 'Categories & Rules' })

    expect(screen.getAllByText('Protected').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Dining Out').length).toBeGreaterThan(0)
    expect(screen.getByText('3 mapped')).toBeVisible()
    expect(screen.getByText('Dining rule')).toBeVisible()
    expect(screen.getByText('3 affected transactions')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Add category' }))
    await screen.findByRole('heading', { name: 'Create a user category' })
    await user.type(screen.getByLabelText('Name'), 'Fuel')
    await user.click(screen.getByRole('button', { name: 'Create category' }))

    await waitFor(() => expect(walnut.createCategory).toHaveBeenCalled())
  })

  it('opens the rule editor and preview surface in context', async () => {
    const user = userEvent.setup()
    const walnut = createWalnutApi()
    window.walnut = walnut

    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Open categories and rules workspace' }))
    await screen.findByRole('heading', { name: 'Categories & Rules' })

    const ruleRow = screen.getByText('Dining rule').closest('article')
    expect(ruleRow).not.toBeNull()
    await user.click(within(ruleRow!).getByRole('button', { name: 'Manage' }))
    await screen.findByRole('heading', { name: 'Dining rule' })
    await user.click(screen.getByRole('button', { name: 'Test rule' }))

    await waitFor(() => expect(walnut.testRule).toHaveBeenCalled())
    expect(await screen.findByRole('heading', { name: 'Review affected transactions' })).toBeVisible()
    expect(screen.getByText(/matching transactions/)).toBeVisible()
  })
})
