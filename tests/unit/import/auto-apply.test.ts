import { describe, expect, it } from 'vitest'
import type { CreateCategorizationRuleInput } from '../../../src/shared/contracts/categories'
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
  debitAmountMinor: 10000 + index * 1000,
  direction: 'debit',
  sourceFileId,
  importBatchId: 'batch-auto-apply',
  ...overrides
})

const seedBatch = (repository: WalnutRepository, batchId: string, rows: NormalizedImportRow[]) => {
  repository.persistImportAttempt({
    attemptId: `attempt-${batchId}`,
    batchId,
    batchLabel: `Batch ${batchId}`,
    status: 'imported',
    importedAt: '2024-01-01T12:00:00.000Z',
    accountLabel: 'ICICI - Household',
    importedFiles: [createStagedFile(`file-${batchId}`, `${batchId}.xlsx`)],
    rejectedFiles: [],
    duplicateBlockedFiles: [],
    acceptedFiles: [
      {
        stagedFile: createStagedFile(`file-${batchId}`, `${batchId}.xlsx`),
        fileFingerprint: `fp-${batchId}`,
        transactionSignatures: rows.map((_, i) => `sig-${batchId}-${i}`),
        rows
      }
    ],
    reviewItems: [],
    lazyAccountCreated: false
  })
}

describe('Phase 10: auto-apply rules at import commit', () => {
  it('applyAllRulesToTransactions categorizes uncategorized transactions using enabled user rules', () => {
    const repository = createRepository()
    const dining = repository.createCategory({ name: 'Dining Out' }).find((c) => c.name === 'Dining Out')!

    const rule: CreateCategorizationRuleInput = {
      name: 'Burger King',
      condition: {
        descriptionTerms: [{ op: 'contains', value: 'burger' }],
        transactionTypes: [],
        tags: [],
        directions: ['debit']
      },
      action: { categoryId: dining.id, appendTags: [] }
    }
    repository.createRule(rule)

    const batchId = 'batch-auto-apply'
    seedBatch(repository, batchId, [
      createRow(`file-${batchId}`, 0, { cleanedDescription: 'Burger King NSP', rawNarration: 'Burger King NSP' }),
      createRow(`file-${batchId}`, 1, { cleanedDescription: 'Swiggy order', rawNarration: 'Swiggy order' })
    ])

    const results = repository.applyAllRulesToTransactions(batchId)

    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({ ruleName: 'Burger King', count: 1 })

    const transactions = repository.listTransactions({ search: 'burger' })
    expect(transactions[0].categoryId).toBe(dining.id)

    repository.close()
  })

  it('skips transactions that already have a category_id (does not overwrite)', () => {
    const repository = createRepository()
    const dining = repository.createCategory({ name: 'Dining Out' }).find((c) => c.name === 'Dining Out')!
    const groceries = repository.listCategories().find((c) => c.name === 'Groceries')!

    const rule: CreateCategorizationRuleInput = {
      name: 'Burger auto',
      condition: {
        descriptionTerms: [{ op: 'contains', value: 'burger' }],
        transactionTypes: [],
        tags: [],
        directions: []
      },
      action: { categoryId: dining.id, appendTags: [] }
    }
    repository.createRule(rule)

    const batchId = 'batch-skip'
    seedBatch(repository, batchId, [
      createRow(`file-${batchId}`, 0, { cleanedDescription: 'Burger King NSP', rawNarration: 'Burger King NSP' })
    ])

    // Pre-assign a category to the transaction
    const txs = repository.listTransactions({ search: 'burger' })
    repository.updateTransaction({ transactionId: txs[0].id, categoryId: groceries.id })

    const results = repository.applyAllRulesToTransactions(batchId)

    // Should not overwrite — returns empty (burger already categorized)
    expect(results).toHaveLength(0)
    const after = repository.listTransactions({ search: 'burger' })
    expect(after[0].categoryId).toBe(groceries.id)

    repository.close()
  })

  it('applies rules in sort_order ASC (first match wins)', () => {
    const repository = createRepository()
    const dining = repository.createCategory({ name: 'Dining Out' }).find((c) => c.name === 'Dining Out')!
    const shopping = repository.createCategory({ name: 'Shopping' }).find((c) => c.name === 'Shopping')!

    // Create two rules that both match "Burger King NSP"
    repository.createRule({
      name: 'First rule — Dining',
      condition: {
        descriptionTerms: [{ op: 'contains', value: 'burger' }],
        transactionTypes: [],
        tags: [],
        directions: []
      },
      action: { categoryId: dining.id, appendTags: [] }
    })
    repository.createRule({
      name: 'Second rule — Shopping',
      condition: {
        descriptionTerms: [{ op: 'contains', value: 'burger' }],
        transactionTypes: [],
        tags: [],
        directions: []
      },
      action: { categoryId: shopping.id, appendTags: [] }
    })

    // Ensure first rule has lower sort_order
    const rules = repository.listRules().filter((r) => r.kind === 'user')
    const firstRule = rules.find((r) => r.name === 'First rule — Dining')!
    const secondRule = rules.find((r) => r.name === 'Second rule — Shopping')!
    expect(firstRule.sortOrder).toBeLessThan(secondRule.sortOrder)

    const batchId = 'batch-first-match'
    seedBatch(repository, batchId, [
      createRow(`file-${batchId}`, 0, { cleanedDescription: 'Burger King NSP', rawNarration: 'Burger King NSP' })
    ])

    const results = repository.applyAllRulesToTransactions(batchId)

    // First rule should win
    expect(results).toHaveLength(1)
    expect(results[0].ruleName).toBe('First rule — Dining')

    const transactions = repository.listTransactions({ search: 'burger' })
    expect(transactions[0].categoryId).toBe(dining.id)

    repository.close()
  })

  it('returns array of { ruleName, count } for rules with count > 0', () => {
    const repository = createRepository()
    const dining = repository.createCategory({ name: 'Dining Out' }).find((c) => c.name === 'Dining Out')!
    const groceries = repository.listCategories().find((c) => c.name === 'Groceries')!

    repository.createRule({
      name: 'Burger rule',
      condition: {
        descriptionTerms: [{ op: 'contains', value: 'burger' }],
        transactionTypes: [],
        tags: [],
        directions: []
      },
      action: { categoryId: dining.id, appendTags: [] }
    })
    repository.createRule({
      name: 'Grocery rule',
      condition: {
        descriptionTerms: [{ op: 'contains', value: 'dmart' }],
        transactionTypes: [],
        tags: [],
        directions: []
      },
      action: { categoryId: groceries.id, appendTags: [] }
    })

    const batchId = 'batch-counts'
    seedBatch(repository, batchId, [
      createRow(`file-${batchId}`, 0, { cleanedDescription: 'Burger King NSP', rawNarration: 'Burger King NSP' }),
      createRow(`file-${batchId}`, 1, { cleanedDescription: 'Burger Queen', rawNarration: 'Burger Queen' }),
      createRow(`file-${batchId}`, 2, { cleanedDescription: 'DMART Groceries', rawNarration: 'DMART Groceries' })
    ])

    const results = repository.applyAllRulesToTransactions(batchId)

    expect(results).toHaveLength(2)
    const burgerResult = results.find((r) => r.ruleName === 'Burger rule')!
    const dMartResult = results.find((r) => r.ruleName === 'Grocery rule')!
    expect(burgerResult.count).toBe(2)
    expect(dMartResult.count).toBe(1)

    repository.close()
  })

  it('returns empty array when no rules match any transaction', () => {
    const repository = createRepository()
    const dining = repository.createCategory({ name: 'Dining Out' }).find((c) => c.name === 'Dining Out')!

    repository.createRule({
      name: 'Unmatched rule',
      condition: {
        descriptionTerms: [{ op: 'contains', value: 'zzzunlikely' }],
        transactionTypes: [],
        tags: [],
        directions: []
      },
      action: { categoryId: dining.id, appendTags: [] }
    })

    const batchId = 'batch-no-match'
    seedBatch(repository, batchId, [
      createRow(`file-${batchId}`, 0, { cleanedDescription: 'Completely different narration', rawNarration: 'something else' })
    ])

    const results = repository.applyAllRulesToTransactions(batchId)

    expect(results).toHaveLength(0)

    repository.close()
  })

  it('emits audit event for each auto-categorized transaction', () => {
    const repository = createRepository()
    const dining = repository.createCategory({ name: 'Dining Out' }).find((c) => c.name === 'Dining Out')!

    repository.createRule({
      name: 'Audit rule',
      condition: {
        descriptionTerms: [{ op: 'contains', value: 'burger' }],
        transactionTypes: [],
        tags: [],
        directions: []
      },
      action: { categoryId: dining.id, appendTags: [] }
    })

    const batchId = 'batch-audit'
    seedBatch(repository, batchId, [
      createRow(`file-${batchId}`, 0, { cleanedDescription: 'Burger King NSP', rawNarration: 'Burger King NSP' }),
      createRow(`file-${batchId}`, 1, { cleanedDescription: 'Burger Queen', rawNarration: 'Burger Queen' })
    ])

    repository.applyAllRulesToTransactions(batchId)

    const auditEvents = repository.getAuditEvents({ category: 'transaction' })
    const autoEvents = auditEvents.filter((e) => e.eventType === 'transaction:auto-categorized')
    expect(autoEvents).toHaveLength(2)

    for (const evt of autoEvents) {
      const meta = JSON.parse(evt.metadata ?? '{}')
      expect(meta.ruleName).toBe('Audit rule')
      expect(meta.categoryId).toBe(dining.id)
      expect(meta.batchId).toBe(batchId)
    }

    repository.close()
  })

  it('only considers enabled non-system rules (is_enabled=1 AND is_system=0)', () => {
    const repository = createRepository()
    const dining = repository.createCategory({ name: 'Dining Out' }).find((c) => c.name === 'Dining Out')!

    const rules = repository.createRule({
      name: 'Disabled rule',
      condition: {
        descriptionTerms: [{ op: 'contains', value: 'burger' }],
        transactionTypes: [],
        tags: [],
        directions: []
      },
      action: { categoryId: dining.id, appendTags: [] }
    })
    const disabledRule = rules.find((r) => r.name === 'Disabled rule')!
    repository.toggleRule({ ruleId: disabledRule.id, isEnabled: false })

    const batchId = 'batch-disabled'
    seedBatch(repository, batchId, [
      createRow(`file-${batchId}`, 0, { cleanedDescription: 'Burger King NSP', rawNarration: 'Burger King NSP' })
    ])

    const results = repository.applyAllRulesToTransactions(batchId)

    // Disabled rule should not apply
    expect(results).toHaveLength(0)
    const transactions = repository.listTransactions({ search: 'burger' })
    expect(transactions[0].categoryId).toBeNull()

    repository.close()
  })
})
