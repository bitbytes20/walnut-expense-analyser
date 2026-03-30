import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { rmSync, existsSync } from 'node:fs'
import Database from 'better-sqlite3'
import { describe, expect, it, afterEach } from 'vitest'
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
  debitAmountMinor: 1000 + index,
  direction: 'debit',
  sourceFileId,
  importBatchId: 'batch-rules',
  ...overrides
})

const seedTransactions = (repository: WalnutRepository, rows: Array<Partial<NormalizedImportRow> & { cleanedDescription: string }>) => {
  const fileId = 'file-seed'
  const batchId = 'batch-seed'
  repository.persistImportAttempt({
    attemptId: `attempt-${Date.now()}`,
    batchId,
    batchLabel: 'Seed batch',
    status: 'imported',
    importedAt: '2026-01-01T00:00:00.000Z',
    accountLabel: 'ICICI - Household',
    importedFiles: [createStagedFile(fileId, 'seed.xlsx')],
    rejectedFiles: [],
    duplicateBlockedFiles: [],
    acceptedFiles: [
      {
        stagedFile: createStagedFile(fileId, 'seed.xlsx'),
        fileFingerprint: `fp-${Date.now()}`,
        transactionSignatures: rows.map((_, i) => `sig-${Date.now()}-${i}`),
        rows: rows.map((r, i) => createRow(fileId, i, {
          ...r,
          rawNarration: r.cleanedDescription,
          importBatchId: batchId
        }))
      }
    ],
    reviewItems: [],
    lazyAccountCreated: false
  })
}

describe('rule engine', () => {
  it('seeds starter system rules with the supported condition and action surface', () => {
    const repository = createRepository()

    const rules = repository.listRules()
    expect(rules.length).toBeGreaterThan(0)
    expect(rules.some((rule) => rule.kind === 'system')).toBe(true)

    for (const rule of rules) {
      expect(Array.isArray(rule.condition.descriptionTerms)).toBe(true)
      expect(Array.isArray(rule.condition.transactionTypes)).toBe(true)
      expect(Array.isArray(rule.condition.tags)).toBe(true)
      expect(Array.isArray(rule.condition.directions)).toBe(true)
      expect(Array.isArray(rule.action.appendTags)).toBe(true)
    }

    repository.close()
  })

  it('prefers the most specific enabled user rule and supports preview-first application', () => {
    const repository = createRepository()
    const dining = repository.createCategory({ name: 'Dining Out' }).find((category) => category.name === 'Dining Out')
    const groceries = repository.listCategories().find((category) => category.name === 'Groceries')

    repository.persistImportAttempt({
      attemptId: 'attempt-rules',
      batchId: 'batch-rules',
      batchLabel: 'Rules batch',
      status: 'imported',
      importedAt: '2026-03-28T12:00:00.000Z',
      accountLabel: 'ICICI - Household',
      importedFiles: [createStagedFile('file-rules', 'rules.xlsx')],
      rejectedFiles: [],
      duplicateBlockedFiles: [],
      acceptedFiles: [
        {
          stagedFile: createStagedFile('file-rules', 'rules.xlsx'),
          fileFingerprint: 'fingerprint-rules',
          transactionSignatures: ['sig-rules-1', 'sig-rules-2'],
          rows: [
            createRow('file-rules', 0, {
              cleanedDescription: 'Burger King NSP',
              rawNarration: 'Burger King NSP',
              debitAmountMinor: 74000,
              tags: ['food']
            }),
            createRow('file-rules', 1, {
              cleanedDescription: 'DMART groceries',
              rawNarration: 'DMART groceries',
              debitAmountMinor: 120000,
              tags: ['home']
            })
          ]
        }
      ],
      reviewItems: [],
      lazyAccountCreated: false
    })

    const genericFoodRule: CreateCategorizationRuleInput = {
      name: 'Generic food',
      condition: {
        descriptionTerms: [{ op: 'contains', value: 'king' }],
        transactionTypes: ['expense'],
        tags: [],
        directions: ['debit']
      },
      action: {
        categoryId: groceries!.id,
        appendTags: ['meal']
      }
    }

    const specificFoodRule: CreateCategorizationRuleInput = {
      name: 'Burger King dining',
      condition: {
        descriptionTerms: [{ op: 'contains', value: 'burger' }, { op: 'contains', value: 'king' }],
        amountMinMinor: 50000,
        amountMaxMinor: 100000,
        transactionTypes: ['expense'],
        tags: [],
        directions: ['debit']
      },
      action: {
        categoryId: dining!.id,
        type: 'expense',
        appendTags: ['restaurant']
      }
    }

    repository.createRule(genericFoodRule)
    const createdRules = repository.createRule(specificFoodRule)
    const targetRule = createdRules.find((rule) => rule.name === 'Burger King dining')
    expect(targetRule).toBeDefined()

    const preview = repository.previewRuleApplyToExisting({ ruleId: targetRule!.id })
    expect(preview.matchCount).toBe(1)
    expect(preview.samples[0]).toMatchObject({
      description: 'Burger King NSP',
      nextCategoryPath: ['Dining Out'],
      nextType: 'expense'
    })

    repository.applyRuleToExisting({ ruleId: targetRule!.id })

    const burger = repository.listTransactions({ search: 'burger' })[0]
    expect(burger.categoryId).toBe(dining!.id)
    expect(burger.categoryPath).toEqual(['Dining Out'])
    expect(burger.tags).toContain('restaurant')

    repository.close()
  })
})

describe('Phase 10: descriptionTerms migration', () => {
  const tmpPaths: string[] = []

  afterEach(() => {
    for (const p of tmpPaths) {
      if (existsSync(p)) rmSync(p)
    }
    tmpPaths.length = 0
  })

  it('migrates descriptionContains to descriptionTerms with op:contains at startup', () => {
    // Use a file-based DB to allow a second open
    const dbPath = join(tmpdir(), `walnut-test-migrate-${Date.now()}.db`)
    tmpPaths.push(dbPath)

    // First: bootstrap DB via WalnutRepository (creates tables and seeds)
    const repo1 = new WalnutRepository(dbPath)
    repo1.close()

    // Second: inject an old-format rule directly into the DB
    const raw = new Database(dbPath)
    raw.prepare(`
      INSERT INTO categorization_rules (id, name, kind, is_system, is_enabled, condition_json, action_json, specificity_score, sort_order, created_at, updated_at)
      VALUES (?, ?, 'user', 0, 1, ?, '{"appendTags":[]}', 5, 100, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z')
    `).run('old-rule-1', 'Legacy Uber Rule', JSON.stringify({ descriptionContains: ['uber', 'ride'], transactionTypes: [], tags: [], directions: [] }))
    raw.close()

    // Third: open a new WalnutRepository — migration should run
    const repo2 = new WalnutRepository(dbPath)
    const rules = repo2.listRules()
    const migratedRule = rules.find((r) => r.id === 'old-rule-1')

    expect(migratedRule).toBeDefined()
    expect(migratedRule!.condition.descriptionTerms).toEqual([
      { op: 'contains', value: 'uber' },
      { op: 'contains', value: 'ride' }
    ])

    repo2.close()
  })

  it('leaves already-migrated rules unchanged on second startup', () => {
    const dbPath = join(tmpdir(), `walnut-test-nomigrate-${Date.now()}.db`)
    tmpPaths.push(dbPath)

    // Bootstrap and insert a rule with descriptionTerms already
    const repo1 = new WalnutRepository(dbPath)
    repo1.close()

    const raw = new Database(dbPath)
    raw.prepare(`
      INSERT INTO categorization_rules (id, name, kind, is_system, is_enabled, condition_json, action_json, specificity_score, sort_order, created_at, updated_at)
      VALUES (?, ?, 'user', 0, 1, ?, '{"appendTags":[]}', 5, 100, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z')
    `).run('new-rule-1', 'New Format Rule', JSON.stringify({
      descriptionTerms: [{ op: 'starts-with', value: 'uber' }],
      transactionTypes: [],
      tags: [],
      directions: []
    }))
    raw.close()

    // Open again — migration should leave this rule untouched
    const repo2 = new WalnutRepository(dbPath)
    const rules = repo2.listRules()
    const rule = rules.find((r) => r.id === 'new-rule-1')

    expect(rule).toBeDefined()
    expect(rule!.condition.descriptionTerms).toEqual([{ op: 'starts-with', value: 'uber' }])

    repo2.close()
  })

  it('handles rules with empty descriptionContains array', () => {
    const dbPath = join(tmpdir(), `walnut-test-empty-${Date.now()}.db`)
    tmpPaths.push(dbPath)

    const repo1 = new WalnutRepository(dbPath)
    repo1.close()

    const raw = new Database(dbPath)
    raw.prepare(`
      INSERT INTO categorization_rules (id, name, kind, is_system, is_enabled, condition_json, action_json, specificity_score, sort_order, created_at, updated_at)
      VALUES (?, ?, 'user', 0, 1, ?, '{"appendTags":[]}', 0, 100, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z')
    `).run('empty-rule-1', 'Empty Contains Rule', JSON.stringify({
      descriptionContains: [],
      transactionTypes: [],
      tags: [],
      directions: []
    }))
    raw.close()

    const repo2 = new WalnutRepository(dbPath)
    const rules = repo2.listRules()
    const rule = rules.find((r) => r.id === 'empty-rule-1')

    expect(rule).toBeDefined()
    // Empty descriptionContains with descriptionTerms present (empty array) = migrated
    expect(Array.isArray(rule!.condition.descriptionTerms)).toBe(true)
    expect(rule!.condition.descriptionTerms).toEqual([])

    repo2.close()
  })
})

describe('Phase 10: starts-with operator', () => {
  it('matches when description starts with the term value (case-insensitive)', () => {
    const repository = createRepository()
    const category = repository.createCategory({ name: 'Transport' }).find((c) => c.name === 'Transport')!

    seedTransactions(repository, [
      { cleanedDescription: 'Uber Ride to Airport', debitAmountMinor: 50000 }
    ])

    const rules = repository.createRule({
      name: 'Starts-with uber',
      condition: {
        descriptionTerms: [{ op: 'starts-with', value: 'uber' }]
      },
      action: { categoryId: category.id, appendTags: [] }
    })
    const rule = rules.find((r) => r.name === 'Starts-with uber')!

    const preview = repository.previewRuleApplyToExisting({ ruleId: rule.id })
    expect(preview.matchCount).toBe(1)
    expect(preview.samples[0].description).toBe('Uber Ride to Airport')

    repository.close()
  })

  it('does not match when description contains but does not start with the term value', () => {
    const repository = createRepository()
    const category = repository.createCategory({ name: 'Transport' }).find((c) => c.name === 'Transport')!

    seedTransactions(repository, [
      { cleanedDescription: 'My Uber Ride NSP', debitAmountMinor: 50000 }
    ])

    const rules = repository.createRule({
      name: 'Starts-with uber no match',
      condition: {
        descriptionTerms: [{ op: 'starts-with', value: 'uber' }]
      },
      action: { categoryId: category.id, appendTags: [] }
    })
    const rule = rules.find((r) => r.name === 'Starts-with uber no match')!

    const preview = repository.previewRuleApplyToExisting({ ruleId: rule.id })
    expect(preview.matchCount).toBe(0)

    repository.close()
  })
})

describe('Phase 10: ends-with operator', () => {
  it('matches when description ends with the term value (case-insensitive)', () => {
    const repository = createRepository()
    const category = repository.createCategory({ name: 'Food' }).find((c) => c.name === 'Food')!

    seedTransactions(repository, [
      { cleanedDescription: 'Payment to Zomato', debitAmountMinor: 25000 }
    ])

    const rules = repository.createRule({
      name: 'Ends-with zomato',
      condition: {
        descriptionTerms: [{ op: 'ends-with', value: 'zomato' }]
      },
      action: { categoryId: category.id, appendTags: [] }
    })
    const rule = rules.find((r) => r.name === 'Ends-with zomato')!

    const preview = repository.previewRuleApplyToExisting({ ruleId: rule.id })
    expect(preview.matchCount).toBe(1)
    expect(preview.samples[0].description).toBe('Payment to Zomato')

    repository.close()
  })

  it('does not match when description contains but does not end with the term value', () => {
    const repository = createRepository()
    const category = repository.createCategory({ name: 'Food' }).find((c) => c.name === 'Food')!

    seedTransactions(repository, [
      { cleanedDescription: 'Zomato Payment NSP', debitAmountMinor: 25000 }
    ])

    const rules = repository.createRule({
      name: 'Ends-with zomato no match',
      condition: {
        descriptionTerms: [{ op: 'ends-with', value: 'zomato' }]
      },
      action: { categoryId: category.id, appendTags: [] }
    })
    const rule = rules.find((r) => r.name === 'Ends-with zomato no match')!

    const preview = repository.previewRuleApplyToExisting({ ruleId: rule.id })
    expect(preview.matchCount).toBe(0)

    repository.close()
  })
})

describe('Phase 10: regex operator', () => {
  it('matches description against regex pattern', () => {
    const repository = createRepository()
    const category = repository.createCategory({ name: 'Food Delivery' }).find((c) => c.name === 'Food Delivery')!

    seedTransactions(repository, [
      { cleanedDescription: 'UPI/123456/Swiggy', debitAmountMinor: 30000 }
    ])

    const rules = repository.createRule({
      name: 'Regex UPI Swiggy',
      condition: {
        descriptionTerms: [{ op: 'regex', value: 'UPI/\\d+/Swiggy' }]
      },
      action: { categoryId: category.id, appendTags: [] }
    })
    const rule = rules.find((r) => r.name === 'Regex UPI Swiggy')!

    const preview = repository.previewRuleApplyToExisting({ ruleId: rule.id })
    expect(preview.matchCount).toBe(1)
    expect(preview.samples[0].description).toBe('UPI/123456/Swiggy')

    repository.close()
  })

  it('returns false for invalid regex pattern without throwing', () => {
    const repository = createRepository()
    const category = repository.createCategory({ name: 'Misc' }).find((c) => c.name === 'Misc')!

    seedTransactions(repository, [
      { cleanedDescription: 'Some transaction', debitAmountMinor: 10000 }
    ])

    // Invalid regex — should not throw, just return no matches
    const rules = repository.createRule({
      name: 'Invalid regex rule',
      condition: {
        descriptionTerms: [{ op: 'regex', value: '[invalid(regex' }]
      },
      action: { categoryId: category.id, appendTags: [] }
    })
    const rule = rules.find((r) => r.name === 'Invalid regex rule')!

    // Should not throw; matchCount should be 0
    expect(() => {
      const preview = repository.previewRuleApplyToExisting({ ruleId: rule.id })
      expect(preview.matchCount).toBe(0)
    }).not.toThrow()

    repository.close()
  })

  it('regex match is case-insensitive', () => {
    const repository = createRepository()
    const category = repository.createCategory({ name: 'Dining' }).find((c) => c.name === 'Dining')!

    seedTransactions(repository, [
      { cleanedDescription: 'BURGER KING NSP NOIDA', debitAmountMinor: 50000 }
    ])

    const rules = repository.createRule({
      name: 'Regex case insensitive',
      condition: {
        descriptionTerms: [{ op: 'regex', value: 'burger king' }]
      },
      action: { categoryId: category.id, appendTags: [] }
    })
    const rule = rules.find((r) => r.name === 'Regex case insensitive')!

    const preview = repository.previewRuleApplyToExisting({ ruleId: rule.id })
    expect(preview.matchCount).toBe(1)

    repository.close()
  })
})

describe('Phase 10: AND conditions', () => {
  it('matches only when ALL descriptionTerms entries match (AND semantics)', () => {
    const repository = createRepository()
    const category = repository.createCategory({ name: 'Fast Food' }).find((c) => c.name === 'Fast Food')!

    seedTransactions(repository, [
      { cleanedDescription: 'Burger King Delivery NSP', debitAmountMinor: 60000 },
      { cleanedDescription: 'Burger Time Delivery', debitAmountMinor: 40000 },
      { cleanedDescription: 'King Delivery', debitAmountMinor: 20000 }
    ])

    const rules = repository.createRule({
      name: 'Burger AND King',
      condition: {
        descriptionTerms: [
          { op: 'contains', value: 'burger' },
          { op: 'contains', value: 'king' }
        ]
      },
      action: { categoryId: category.id, appendTags: [] }
    })
    const rule = rules.find((r) => r.name === 'Burger AND King')!

    const preview = repository.previewRuleApplyToExisting({ ruleId: rule.id })
    expect(preview.matchCount).toBe(1)
    expect(preview.samples[0].description).toBe('Burger King Delivery NSP')

    repository.close()
  })

  it('fails when any single descriptionTerm does not match', () => {
    const repository = createRepository()
    const category = repository.createCategory({ name: 'Online Shopping' }).find((c) => c.name === 'Online Shopping')!

    seedTransactions(repository, [
      { cleanedDescription: 'Amazon Order Confirmation', debitAmountMinor: 100000 }
    ])

    const rules = repository.createRule({
      name: 'Amazon AND Flipkart',
      condition: {
        descriptionTerms: [
          { op: 'contains', value: 'amazon' },
          { op: 'contains', value: 'flipkart' }
        ]
      },
      action: { categoryId: category.id, appendTags: [] }
    })
    const rule = rules.find((r) => r.name === 'Amazon AND Flipkart')!

    const preview = repository.previewRuleApplyToExisting({ ruleId: rule.id })
    expect(preview.matchCount).toBe(0)

    repository.close()
  })

  it('combines descriptionTerms with amountMinMinor/amountMaxMinor (AND)', () => {
    const repository = createRepository()
    const category = repository.createCategory({ name: 'Groceries' }).find((c) => c.name === 'Groceries')

    seedTransactions(repository, [
      { cleanedDescription: 'DMART Groceries NSP', debitAmountMinor: 150000 },
      { cleanedDescription: 'DMART Groceries NSP', debitAmountMinor: 30000 }  // below min
    ])

    const rules = repository.createRule({
      name: 'DMART above 1000',
      condition: {
        descriptionTerms: [{ op: 'contains', value: 'dmart' }],
        amountMinMinor: 100000
      },
      action: { categoryId: category!.id, appendTags: [] }
    })
    const rule = rules.find((r) => r.name === 'DMART above 1000')!

    const preview = repository.previewRuleApplyToExisting({ ruleId: rule.id })
    // Only the 150000 transaction should match (30000 is below 100000)
    expect(preview.matchCount).toBe(1)
    expect(Math.abs(preview.samples[0].signedAmountMinor)).toBe(150000)

    repository.close()
  })
})

describe('Phase 10: drag reorder', () => {
  it.todo('reorderRules persists sort_order values in given order')
  it.todo('listRules returns user rules sorted by sort_order ASC, system rules last')
  it.todo('reorderRules ignores system rule IDs silently')
})

describe('Phase 10: rule export', () => {
  it.todo('exportRules returns JSON array of user rules only, no system rules')
  it.todo('exported entries contain name, sortOrder, descriptionTerms, action with categoryName')
  it.todo('exported entries do NOT contain internal IDs or transaction counts')
})

describe('Phase 10: rule import', () => {
  it.todo('imports non-conflicting rules directly')
  it.todo('detects conflict when incoming rule name matches existing rule name')
  it.todo('resolves category references by name, returns warning for unresolvable categories')
  it.todo('ignores incoming entries that match system rule names')
})
