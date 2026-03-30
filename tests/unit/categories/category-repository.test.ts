import { describe, expect, it } from 'vitest'
import type { NormalizedImportRow, StagedImportFile } from '../../../src/shared/contracts/import'
import { WalnutRepository } from '../../../src/main/persistence/db'

const createRepository = () => new WalnutRepository(':memory:')

const createStagedFile = (id: string, fileName: string): StagedImportFile => ({
  id,
  fileName,
  fileExtension: 'xlsx',
  accountLabel: 'ICICI - Household',
  statementPeriodLabel: 'Jan 2024',
  status: 'ready'
})

const createRow = (sourceFileId: string, index: number, overrides: Partial<NormalizedImportRow> = {}): NormalizedImportRow => ({
  transactionDateRaw: `2024-01-${String(index + 1).padStart(2, '0')}`,
  rawNarration: `Narration ${index}`,
  cleanedDescription: `Description ${index}`,
  debitAmountMinor: 1000 + index,
  direction: 'debit',
  sourceFileId,
  importBatchId: 'batch-categories',
  ...overrides
})

describe('category repository', () => {
  it('seeds the protected system taxonomy with income subcategories', () => {
    const repository = createRepository()

    const categories = repository.listCategories()
    const topLevelNames = categories.map((category) => category.name)

    expect(topLevelNames).toEqual([
      'Food & Dining',
      'Groceries',
      'Shopping',
      'Bills & Utilities',
      'Rent / Housing',
      'Transport',
      'Travel',
      'Healthcare',
      'Entertainment',
      'Education',
      'Insurance',
      'Taxes & Fees',
      'Cash / ATM',
      'Transfers',
      'Credit Card Payment',
      'Income',
      'Refunds / Reimbursements',
      'Investments / Savings',
      'Uncategorized'
    ])

    const income = categories.find((category) => category.name === 'Income')
    expect(income).toBeDefined()
    expect(income?.kind).toBe('system')
    expect(income?.children.map((child) => child.name)).toEqual([
      'Salary',
      'Business Income',
      'Interest',
      'Refund / Reimbursement Income',
      'Investment Income',
      'Other Income'
    ])

    repository.close()
  })

  it('protects system categories and safely manages user categories including merge migration', () => {
    const repository = createRepository()
    const income = repository.listCategories().find((category) => category.name === 'Income')
    const transfers = repository.listCategories().find((category) => category.name === 'Transfers')

    expect(() =>
      repository.deleteCategory({
        categoryId: income!.id
      })
    ).toThrow(/system category/i)

    const created = repository.createCategory({
      name: 'Eating Out',
      parentId: undefined
    })
    const eatingOut = created.find((category) => category.name === 'Eating Out')
    expect(eatingOut).toBeDefined()
    expect(eatingOut?.kind).toBe('user')

    const moved = repository.updateCategory({
      categoryId: eatingOut!.id,
      parentId: transfers!.id
    })
    const movedCategory = moved
      .flatMap((category) => [category, ...category.children])
      .find((category) => category.id === eatingOut!.id)
    expect(movedCategory?.path).toEqual(['Transfers', 'Eating Out'])

    repository.persistImportAttempt({
      attemptId: 'attempt-categories',
      batchId: 'batch-categories',
      batchLabel: 'Categories batch',
      status: 'imported',
      importedAt: '2026-03-28T12:00:00.000Z',
      accountLabel: 'ICICI - Household',
      importedFiles: [createStagedFile('file-categories', 'categories.xlsx')],
      rejectedFiles: [],
      duplicateBlockedFiles: [],
      acceptedFiles: [
        {
          stagedFile: createStagedFile('file-categories', 'categories.xlsx'),
          fileFingerprint: 'fingerprint-categories',
          transactionSignatures: ['sig-category'],
          rows: [
            createRow('file-categories', 0, {
              cleanedDescription: 'Manual category seed',
              rawNarration: 'Manual category seed',
              debitAmountMinor: 24000
            })
          ]
        }
      ],
      reviewItems: [],
      lazyAccountCreated: false
    })

    const transaction = repository.listTransactions()[0]
    repository.updateTransaction({
      transactionId: transaction.id,
      categoryId: eatingOut!.id
    })

    const merged = repository.createCategory({
      name: 'Dining Out'
    })
    const diningOut = merged.find((category) => category.name === 'Dining Out')
    expect(diningOut).toBeDefined()

    repository.mergeCategory({
      sourceCategoryId: eatingOut!.id,
      targetCategoryId: diningOut!.id
    })

    const detail = repository.getTransactionDetail({ transactionId: transaction.id })
    expect(detail.categoryId).toBe(diningOut!.id)
    expect(detail.categoryPath).toEqual(['Dining Out'])

    repository.close()
  })
})

describe('Phase 10: rename propagation', () => {
  it.todo('rename updates category_label on all transactions with that category_id')
  it.todo('rename and transaction label update happen in a single atomic operation')
  it.todo('rename returns updated category list with new name')
})

describe('Phase 10: merge preview', () => {
  it.todo('mergeCategoryPreview returns affected transaction count and rule count')
  it.todo('mergeCategoryPreview returns up to 5 sample transactions')
  it.todo('merge updates rule action.categoryId from source to target')
  it.todo('merge updates category_label on transactions from source to target name')
})

describe('Phase 10: archive', () => {
  it.todo('archiveCategory sets is_archived=1 on the category row')
  it.todo('listCategories includes isArchived field on each node')
  it.todo('archived category is excluded when filtering for active picker options')
  it.todo('restoring an archived category sets is_archived=0')
})
