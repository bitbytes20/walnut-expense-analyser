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

// Helper: seed one transaction assigned to a category
const seedTransactionWithCategory = (repository: WalnutRepository, categoryId: string, index = 0) => {
  repository.persistImportAttempt({
    attemptId: `attempt-phase10-${index}`,
    batchId: `batch-phase10-${index}`,
    batchLabel: `Phase 10 batch ${index}`,
    status: 'imported',
    importedAt: '2026-03-30T10:00:00.000Z',
    accountLabel: 'ICICI - Household',
    importedFiles: [createStagedFile(`file-phase10-${index}`, `phase10-${index}.xlsx`)],
    rejectedFiles: [],
    duplicateBlockedFiles: [],
    acceptedFiles: [
      {
        stagedFile: createStagedFile(`file-phase10-${index}`, `phase10-${index}.xlsx`),
        fileFingerprint: `fp-phase10-${index}`,
        transactionSignatures: [`sig-phase10-${index}`],
        rows: [
          createRow(`file-phase10-${index}`, index, {
            cleanedDescription: `Phase 10 transaction ${index}`,
            rawNarration: `Phase 10 transaction ${index}`,
            debitAmountMinor: 5000 + index * 100
          })
        ]
      }
    ],
    reviewItems: [],
    lazyAccountCreated: false
  })

  const tx = repository.listTransactions({ limit: 1, offset: 0 })[0]
  repository.updateTransaction({ transactionId: tx.id, categoryId })
  return tx.id
}

describe('Phase 10: rename propagation', () => {
  it('rename updates category_label on all transactions with that category_id', () => {
    const repository = createRepository()

    const cats = repository.createCategory({ name: 'Groceries Plus' })
    const cat = cats.find((c) => c.name === 'Groceries Plus')!

    seedTransactionWithCategory(repository, cat.id, 0)
    seedTransactionWithCategory(repository, cat.id, 1)

    // Rename the category
    repository.updateCategory({ categoryId: cat.id, name: 'Groceries & More' })

    // Check that transaction labels were updated
    const txs = repository.listTransactions().filter((t) => t.categoryId === cat.id)
    expect(txs.length).toBe(2)
    for (const tx of txs) {
      expect(tx.categoryPath).toEqual(['Groceries & More'])
    }

    repository.close()
  })

  it('rename and transaction label update happen in a single atomic operation', () => {
    const repository = createRepository()

    const cats = repository.createCategory({ name: 'Atomic Test' })
    const cat = cats.find((c) => c.name === 'Atomic Test')!

    seedTransactionWithCategory(repository, cat.id, 0)

    repository.updateCategory({ categoryId: cat.id, name: 'Atomic Renamed' })

    // Both the category and the transaction label should be updated
    const updatedCats = repository.listCategories()
    const renamedCat = updatedCats.find((c) => c.id === cat.id)
    expect(renamedCat?.name).toBe('Atomic Renamed')

    const txs = repository.listTransactions().filter((t) => t.categoryId === cat.id)
    expect(txs[0].categoryPath).toEqual(['Atomic Renamed'])

    repository.close()
  })

  it('rename returns updated category list with new name', () => {
    const repository = createRepository()

    const cats = repository.createCategory({ name: 'Old Name' })
    const cat = cats.find((c) => c.name === 'Old Name')!

    const updated = repository.updateCategory({ categoryId: cat.id, name: 'New Name' })
    const found = updated.find((c) => c.id === cat.id)
    expect(found?.name).toBe('New Name')

    repository.close()
  })
})

describe('Phase 10: merge preview', () => {
  it('mergeCategoryPreview returns affected transaction count and rule count', () => {
    const repository = createRepository()

    const cats = repository.createCategory({ name: 'Source Cat' })
    const source = cats.find((c) => c.name === 'Source Cat')!
    const cats2 = repository.createCategory({ name: 'Target Cat' })
    const target = cats2.find((c) => c.name === 'Target Cat')!

    // Add 2 transactions to source
    seedTransactionWithCategory(repository, source.id, 0)
    seedTransactionWithCategory(repository, source.id, 1)

    // Add a rule pointing to source
    repository.createRule({
      name: 'Rule pointing to source',
      condition: { descriptionTerms: [{ op: 'contains', value: 'test' }], transactionTypes: [], tags: [], directions: [] },
      action: { categoryId: source.id, appendTags: [] }
    })

    const preview = repository.mergeCategoryPreview(source.id, target.id)

    expect(preview.sourceCategoryId).toBe(source.id)
    expect(preview.targetCategoryId).toBe(target.id)
    expect(preview.affectedTransactionCount).toBe(2)
    expect(preview.affectedRuleCount).toBe(1)

    repository.close()
  })

  it('mergeCategoryPreview returns up to 5 sample transactions', () => {
    const repository = createRepository()

    const cats = repository.createCategory({ name: 'Source Many' })
    const source = cats.find((c) => c.name === 'Source Many')!
    const cats2 = repository.createCategory({ name: 'Target Many' })
    const target = cats2.find((c) => c.name === 'Target Many')!

    // Add 7 transactions to source
    for (let i = 0; i < 7; i++) {
      seedTransactionWithCategory(repository, source.id, i)
    }

    const preview = repository.mergeCategoryPreview(source.id, target.id)

    expect(preview.affectedTransactionCount).toBe(7)
    expect(preview.samples.length).toBeLessThanOrEqual(5)

    repository.close()
  })

  it('merge updates rule action.categoryId from source to target', () => {
    const repository = createRepository()

    const cats = repository.createCategory({ name: 'Merge Source' })
    const source = cats.find((c) => c.name === 'Merge Source')!
    const cats2 = repository.createCategory({ name: 'Merge Target' })
    const target = cats2.find((c) => c.name === 'Merge Target')!

    // Create a rule pointing at source
    repository.createRule({
      name: 'Rule for merge source',
      condition: { descriptionTerms: [{ op: 'contains', value: 'merge' }], transactionTypes: [], tags: [], directions: [] },
      action: { categoryId: source.id, appendTags: [] }
    })

    // Merge source into target
    repository.mergeCategory({ sourceCategoryId: source.id, targetCategoryId: target.id })

    // Rule should now point at target
    const rules = repository.listRules()
    const rule = rules.find((r) => r.name === 'Rule for merge source')
    expect(rule).toBeDefined()
    expect(rule?.action.categoryId).toBe(target.id)

    repository.close()
  })

  it('merge updates category_label on transactions from source to target name', () => {
    const repository = createRepository()

    const cats = repository.createCategory({ name: 'Label Source' })
    const source = cats.find((c) => c.name === 'Label Source')!
    const cats2 = repository.createCategory({ name: 'Label Target' })
    const target = cats2.find((c) => c.name === 'Label Target')!

    const txId = seedTransactionWithCategory(repository, source.id, 0)

    repository.mergeCategory({ sourceCategoryId: source.id, targetCategoryId: target.id })

    const detail = repository.getTransactionDetail({ transactionId: txId })
    expect(detail.categoryId).toBe(target.id)
    expect(detail.categoryPath).toEqual(['Label Target'])

    repository.close()
  })
})

describe('Phase 10: archive', () => {
  it('archiveCategory sets is_archived=1 on the category row', () => {
    const repository = createRepository()

    const cats = repository.createCategory({ name: 'Archive Me' })
    const cat = cats.find((c) => c.name === 'Archive Me')!

    const updated = repository.archiveCategory(cat.id, true)
    const archivedCat = updated.find((c) => c.id === cat.id)

    expect(archivedCat?.isArchived).toBe(true)

    repository.close()
  })

  it('listCategories includes isArchived field on each node', () => {
    const repository = createRepository()

    const cats = repository.createCategory({ name: 'Check IsArchived' })
    const cat = cats.find((c) => c.name === 'Check IsArchived')!

    // Before archiving
    const before = repository.listCategories().find((c) => c.id === cat.id)
    expect(before?.isArchived).toBe(false)

    // After archiving
    repository.archiveCategory(cat.id, true)
    const after = repository.listCategories().find((c) => c.id === cat.id)
    expect(after?.isArchived).toBe(true)

    repository.close()
  })

  it('archived category is excluded when filtering for active picker options', () => {
    const repository = createRepository()

    const cats = repository.createCategory({ name: 'Picker Test Cat' })
    const cat = cats.find((c) => c.name === 'Picker Test Cat')!

    repository.archiveCategory(cat.id, true)

    const allCats = repository.listCategories()
    const archivedCat = allCats.find((c) => c.id === cat.id)
    expect(archivedCat?.isArchived).toBe(true)

    // Filter for picker (non-archived)
    const pickerCats = allCats.filter((c) => !c.isArchived)
    expect(pickerCats.find((c) => c.id === cat.id)).toBeUndefined()

    repository.close()
  })

  it('restoring an archived category sets is_archived=0', () => {
    const repository = createRepository()

    const cats = repository.createCategory({ name: 'Restore Me' })
    const cat = cats.find((c) => c.name === 'Restore Me')!

    repository.archiveCategory(cat.id, true)
    const afterArchive = repository.listCategories().find((c) => c.id === cat.id)
    expect(afterArchive?.isArchived).toBe(true)

    repository.archiveCategory(cat.id, false)
    const afterRestore = repository.listCategories().find((c) => c.id === cat.id)
    expect(afterRestore?.isArchived).toBe(false)

    repository.close()
  })
})
