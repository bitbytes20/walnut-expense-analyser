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

const createRow = (sourceFileId: string, index: number, overrides: Partial<NormalizedImportRow> = {}): NormalizedImportRow => ({
  transactionDateRaw: `2024-01-${String(index + 1).padStart(2, '0')}`,
  rawNarration: `Narration ${index}`,
  cleanedDescription: `Description ${index}`,
  debitAmountMinor: 1000 + index,
  direction: 'debit',
  sourceFileId,
  importBatchId: 'batch-transactions',
  ...overrides
})

describe('transaction repository', () => {
  it('lists normalized transaction rows and supports search, type, tag, category, and review-state filters', () => {
    const repository = createRepository()

    repository.persistImportAttempt({
      attemptId: 'attempt-transactions',
      batchId: 'batch-transactions',
      batchLabel: 'Transactions batch',
      status: 'needs-review',
      importedAt: '2026-03-28T09:00:00.000Z',
      accountLabel: 'ICICI - Household',
      importedFiles: [createStagedFile('file-transactions', 'transactions.xlsx')],
      rejectedFiles: [],
      duplicateBlockedFiles: [],
      acceptedFiles: [
        {
          stagedFile: createStagedFile('file-transactions', 'transactions.xlsx'),
          fileFingerprint: 'fingerprint-transactions',
          transactionSignatures: ['sig-1', 'sig-2', 'sig-3', 'sig-4', 'sig-5'],
          rows: [
            createRow('file-transactions', 0, {
              cleanedDescription: 'ATM cash withdrawal',
              rawNarration: 'ATM WDL',
              debitAmountMinor: 120000
            }),
            createRow('file-transactions', 1, {
              cleanedDescription: 'Refund from merchant',
              rawNarration: 'REFUND',
              creditAmountMinor: 45000,
              debitAmountMinor: undefined,
              direction: 'credit'
            }),
            createRow('file-transactions', 2, {
              cleanedDescription: 'Credit card payment',
              rawNarration: 'CC PAYMENT',
              debitAmountMinor: 650000
            }),
            createRow('file-transactions', 3, {
              cleanedDescription: 'Transfer to savings',
              rawNarration: 'NEFT TRANSFER',
              debitAmountMinor: 250000,
              tags: ['internal', 'savings']
            }),
            createRow('file-transactions', 4, {
              cleanedDescription: 'Salary credit',
              rawNarration: 'SALARY',
              creditAmountMinor: 950000,
              debitAmountMinor: undefined,
              direction: 'credit'
            })
          ]
        }
      ],
      reviewItems: [
        {
          id: 'review-1',
          batchId: 'batch-transactions',
          importAttemptId: 'attempt-transactions',
          sourceFileId: 'file-transactions',
          reasonCode: 'parser-uncertainty',
          severity: 'warning',
          state: 'pending',
          title: 'Parser uncertainty',
          description: 'Needs review.',
          snapshot: {
            sourceFileId: 'file-transactions',
            sourceFileName: 'transactions.xlsx',
            message: 'Needs review.'
          },
          createdAt: '2026-03-28T09:00:00.000Z',
          updatedAt: '2026-03-28T09:00:00.000Z',
          resolution: {
            batchId: 'batch-transactions',
            reviewItemId: 'review-1'
          }
        }
      ],
      lazyAccountCreated: false
    })

    const rows = repository.listTransactions()
    expect(rows.map((row) => row.normalizedType)).toEqual([
      'income',
      'transfer',
      'credit-card-payment',
      'refund',
      'atm-withdrawal'
    ])

    const transferRow = rows.find((row) => row.normalizedType === 'transfer')
    expect(transferRow).toBeDefined()
    expect(repository.listTransactions({ search: 'salary' })).toHaveLength(1)
    expect(repository.listTransactions({ types: ['refund'] })).toHaveLength(1)
    expect(repository.listTransactions({ reviewStates: ['pending-review'] })).toHaveLength(5)

    repository.updateTransaction({
      transactionId: transferRow!.id,
      tags: ['internal', 'savings'],
      category: 'Transfers',
      reviewStateOverride: 'clean'
    })

    expect(repository.listTransactions({ tags: ['internal'] })).toHaveLength(1)
    expect(repository.listTransactions({ categories: ['Transfers'] })).toHaveLength(1)
    expect(repository.listTransactions({ reviewStates: ['clean'] })).toHaveLength(1)

    repository.close()
  })

  it('updates editable fields and returns a type-change rule suggestion', () => {
    const repository = createRepository()

    repository.persistImportAttempt({
      attemptId: 'attempt-update',
      batchId: 'batch-update',
      batchLabel: 'Update batch',
      status: 'imported',
      importedAt: '2026-03-28T10:00:00.000Z',
      accountLabel: 'ICICI - Household',
      importedFiles: [createStagedFile('file-update', 'update.xlsx')],
      rejectedFiles: [],
      duplicateBlockedFiles: [],
      acceptedFiles: [
        {
          stagedFile: createStagedFile('file-update', 'update.xlsx'),
          fileFingerprint: 'fingerprint-update',
          transactionSignatures: ['sig-update'],
          rows: [
            createRow('file-update', 0, {
              cleanedDescription: 'Salary credit',
              rawNarration: 'SALARY',
              creditAmountMinor: 950000,
              debitAmountMinor: undefined,
              direction: 'credit'
            })
          ]
        }
      ],
      reviewItems: [],
      lazyAccountCreated: false
    })

    const transaction = repository.listTransactions()[0]
    const result = repository.updateTransaction({
      transactionId: transaction.id,
      transactionDateRaw: '2024-01-18',
      description: 'Salary moved to wallet',
      signedAmountMinor: -950000,
      normalizedType: 'transfer',
      category: 'Savings',
      reference: 'SAL-NEW',
      tags: ['salary', 'wallet'],
      reviewStateOverride: 'clean'
    })

    expect(result.ruleSuggestion).toMatchObject({
      field: 'type',
      fromType: 'income',
      toType: 'transfer'
    })
    expect(result.detail).toMatchObject({
      transactionDateRaw: '2024-01-18',
      description: 'Salary moved to wallet',
      signedAmountMinor: -950000,
      normalizedType: 'transfer',
      category: 'Savings',
      reference: 'SAL-NEW',
      tags: ['salary', 'wallet'],
      reviewStateOverride: 'clean',
      direction: 'debit'
    })

    repository.close()
  })
})
