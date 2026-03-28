import { describe, expect, it } from 'vitest'
import type { NormalizedImportRow, StagedImportFile } from '../../src/shared/contracts/import'
import { WalnutRepository } from '../../src/main/persistence/db'

const createRepository = () => new WalnutRepository(':memory:')

const createStagedFile = (id: string, fileName: string): StagedImportFile => ({
  id,
  fileName,
  fileExtension: 'xlsx',
  accountLabel: 'ICICI - Household',
  statementPeriodLabel: 'Jan 2024',
  status: 'ready'
})

const createRow = (sourceFileId: string, date: string, overrides: Partial<NormalizedImportRow> = {}): NormalizedImportRow => ({
  transactionDateRaw: date,
  rawNarration: 'Generic narration',
  cleanedDescription: 'Generic description',
  debitAmountMinor: 1000,
  direction: 'debit',
  sourceFileId,
  importBatchId: 'batch-dashboard',
  ...overrides
})

describe('dashboard repository', () => {
  it('builds a dashboard snapshot with spend, income, operational cards, and recurring detail', () => {
    const repository = createRepository()

    repository.persistImportAttempt({
      attemptId: 'attempt-dashboard',
      batchId: 'batch-dashboard',
      batchLabel: 'Dashboard batch',
      status: 'imported',
      importedAt: '2026-03-28T09:00:00.000Z',
      accountLabel: 'ICICI - Household',
      importedFiles: [createStagedFile('file-dashboard', 'dashboard.xlsx')],
      rejectedFiles: [],
      duplicateBlockedFiles: [],
      acceptedFiles: [
        {
          stagedFile: createStagedFile('file-dashboard', 'dashboard.xlsx'),
          fileFingerprint: 'fingerprint-dashboard',
          transactionSignatures: ['sig-1', 'sig-2', 'sig-3', 'sig-4', 'sig-5', 'sig-6'],
          rows: [
            createRow('file-dashboard', '2024-01-02', {
              cleanedDescription: 'Salary credit',
              rawNarration: 'SALARY',
              creditAmountMinor: 1250000,
              debitAmountMinor: undefined,
              direction: 'credit'
            }),
            createRow('file-dashboard', '2024-01-04', {
              cleanedDescription: 'Restaurant payment',
              rawNarration: 'CARD SWIPE',
              debitAmountMinor: 250000
            }),
            createRow('file-dashboard', '2024-01-08', {
              cleanedDescription: 'ATM cash withdrawal',
              rawNarration: 'ATM WDL',
              debitAmountMinor: 400000
            }),
            createRow('file-dashboard', '2024-01-10', {
              cleanedDescription: 'Refund from merchant',
              rawNarration: 'REFUND',
              creditAmountMinor: 50000,
              debitAmountMinor: undefined,
              direction: 'credit'
            }),
            createRow('file-dashboard', '2024-02-02', {
              cleanedDescription: 'Salary credit',
              rawNarration: 'SALARY',
              creditAmountMinor: 1250000,
              debitAmountMinor: undefined,
              direction: 'credit'
            }),
            createRow('file-dashboard', '2024-02-09', {
              cleanedDescription: 'Credit card payment',
              rawNarration: 'CC PAYMENT',
              debitAmountMinor: 325000
            })
          ]
        }
      ],
      reviewItems: [],
      lazyAccountCreated: false
    })

    const snapshot = repository.getDashboardSnapshot({
      range: { preset: 'all-time' },
      compare: { enabled: false }
    })

    expect(snapshot.summaryCards.find((card) => card.id === 'credited')?.totalMinor).toBe(2550000)
    expect(snapshot.summaryCards.find((card) => card.id === 'debited')?.totalMinor).toBe(975000)
    expect(snapshot.summaryCards.find((card) => card.id === 'difference')?.totalMinor).toBe(1575000)
    expect(snapshot.summaryCards.find((card) => card.id === 'income')?.totalMinor).toBe(2550000)
    expect(snapshot.summaryCards.find((card) => card.id === 'expense')?.totalMinor).toBe(975000)
    expect(snapshot.operationalCards.find((card) => card.id === 'refund')?.totalMinor).toBe(50000)
    expect(snapshot.operationalCards.find((card) => card.id === 'atm-withdrawal')?.totalMinor).toBe(400000)
    expect(snapshot.recurringItems).toHaveLength(1)
    expect(snapshot.recurringItems[0]).toMatchObject({
      description: 'Salary credit',
      occurrenceCount: 2,
      direction: 'credit'
    })

    const recurringDetail = repository.getRecurringDetail({
      recurringId: snapshot.recurringItems[0].id,
      query: {
        range: { preset: 'all-time' },
        compare: { enabled: false }
      }
    })

    expect(recurringDetail.transactions).toHaveLength(2)
    expect(recurringDetail.transactions.every((transaction) => transaction.description === 'Salary credit')).toBe(true)

    repository.close()
  })
})
