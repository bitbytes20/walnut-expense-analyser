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
  debitAmountMinor: 1000 + index,
  direction: 'debit',
  sourceFileId,
  importBatchId: 'batch-rules',
  ...overrides
})

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
  it.todo('migrates descriptionContains to descriptionTerms with op:contains at startup')
  it.todo('leaves already-migrated rules unchanged on second startup')
  it.todo('handles rules with empty descriptionContains array')
})

describe('Phase 10: starts-with operator', () => {
  it.todo('matches when description starts with the term value (case-insensitive)')
  it.todo('does not match when description contains but does not start with the term value')
})

describe('Phase 10: ends-with operator', () => {
  it.todo('matches when description ends with the term value (case-insensitive)')
  it.todo('does not match when description contains but does not end with the term value')
})

describe('Phase 10: regex operator', () => {
  it.todo('matches description against regex pattern')
  it.todo('returns false for invalid regex pattern without throwing')
  it.todo('regex match is case-insensitive')
})

describe('Phase 10: AND conditions', () => {
  it.todo('matches only when ALL descriptionTerms entries match (AND semantics)')
  it.todo('fails when any single descriptionTerm does not match')
  it.todo('combines descriptionTerms with amountMinMinor/amountMaxMinor (AND)')
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
