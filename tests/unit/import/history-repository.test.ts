import { describe, expect, it } from 'vitest'
import type { NormalizedImportRow, ReviewItem, StagedImportFile } from '../../../src/shared/contracts/import'
import { WalnutRepository } from '../../../src/main/persistence/db'

const createRepository = () => new WalnutRepository(':memory:')

const createRow = (sourceFileId: string, index: number, overrides: Partial<NormalizedImportRow> = {}): NormalizedImportRow => ({
  transactionDateRaw: `2024-01-${String(index + 1).padStart(2, '0')}`,
  rawNarration: `Narration ${index}`,
  cleanedDescription: `Description ${index}`,
  debitAmountMinor: 1000 + index,
  direction: 'debit',
  sourceFileId,
  importBatchId: 'batch-imported',
  ...overrides
})

const createStagedFile = (id: string, fileName: string, accountLabel = 'ICICI - Household'): StagedImportFile => ({
  id,
  fileName,
  fileExtension: 'xlsx',
  accountLabel,
  statementPeriodLabel: 'Jan 2024',
  status: 'ready'
})

const createReviewItem = (
  id: string,
  batchId: string,
  attemptId: string,
  reasonCode: ReviewItem['reasonCode'],
  severity: ReviewItem['severity'],
  sourceFileId?: string
): ReviewItem => ({
  id,
  batchId,
  importAttemptId: attemptId,
  sourceFileId,
  reasonCode,
  severity,
  state: 'pending',
  title: `${reasonCode} title`,
  description: `${reasonCode} description`,
  snapshot: {
    sourceFileId,
    sourceFileName: sourceFileId ? `${sourceFileId}.xlsx` : undefined,
    message: `${reasonCode} message`,
    parsedRow: sourceFileId ? createRow(sourceFileId, 0) : undefined
  },
  createdAt: `${attemptId}-created`,
  updatedAt: `${attemptId}-updated`,
  resolution: {
    batchId,
    reviewItemId: id
  }
})

describe('history repository', () => {
  it('returns imported, needs-review, rejected, and failed attempts newest first with authoritative ledger counts', () => {
    const repository = createRepository()

    repository.persistImportAttempt({
      attemptId: 'attempt-imported',
      batchId: 'batch-imported',
      batchLabel: 'Imported batch',
      status: 'imported',
      importedAt: '2026-03-24T09:00:00.000Z',
      accountLabel: 'ICICI - Household',
      importedFiles: [createStagedFile('file-imported', 'imported.xlsx')],
      rejectedFiles: [],
      duplicateBlockedFiles: [],
      acceptedFiles: [
        {
          stagedFile: createStagedFile('file-imported', 'imported.xlsx'),
          fileFingerprint: 'fingerprint-imported',
          transactionSignatures: ['sig-1', 'sig-2'],
          rows: [createRow('file-imported', 1), createRow('file-imported', 2)]
        }
      ],
      reviewItems: [],
      lazyAccountCreated: false
    })

    repository.persistImportAttempt({
      attemptId: 'attempt-needs-review',
      batchId: 'batch-needs-review',
      batchLabel: 'Needs review batch',
      status: 'needs-review',
      importedAt: '2026-03-25T09:00:00.000Z',
      accountLabel: 'ICICI - Household',
      importedFiles: [createStagedFile('file-review', 'review.xlsx')],
      rejectedFiles: [],
      duplicateBlockedFiles: [
        {
          ...createStagedFile('file-duplicate', 'duplicate.xlsx'),
          status: 'duplicate-blocked',
          reasonCode: 'duplicate-file',
          reasonTitle: 'Duplicate file',
          reasonBody: 'This statement was already imported.'
        }
      ],
      acceptedFiles: [
        {
          stagedFile: createStagedFile('file-review', 'review.xlsx'),
          fileFingerprint: 'fingerprint-review',
          transactionSignatures: ['sig-3', 'sig-4', 'sig-5'],
          rows: [createRow('file-review', 3), createRow('file-review', 4), createRow('file-review', 5)]
        }
      ],
      reviewItems: [
        createReviewItem('review-1', 'batch-needs-review', 'attempt-needs-review', 'duplicate-candidate', 'blocking', 'file-duplicate'),
        createReviewItem('review-2', 'batch-needs-review', 'attempt-needs-review', 'balance-continuity-warning', 'warning', 'file-review')
      ],
      lazyAccountCreated: false
    })

    repository.persistImportAttempt({
      attemptId: 'attempt-rejected',
      batchId: 'batch-rejected',
      batchLabel: 'Rejected batch',
      status: 'rejected',
      importedAt: '2026-03-26T09:00:00.000Z',
      accountLabel: 'ICICI - Household',
      importedFiles: [],
      rejectedFiles: [
        {
          ...createStagedFile('file-rejected', 'rejected.xlsx'),
          status: 'rejected',
          reasonCode: 'unsupported-format',
          reasonTitle: 'Unsupported format',
          reasonBody: 'This worksheet is not supported.'
        }
      ],
      duplicateBlockedFiles: [],
      acceptedFiles: [],
      reviewItems: [],
      lazyAccountCreated: false
    })

    repository.persistImportAttempt({
      attemptId: 'attempt-failed',
      batchId: 'batch-failed',
      batchLabel: 'Failed batch',
      status: 'failed',
      importedAt: '2026-03-27T09:00:00.000Z',
      accountLabel: 'ICICI - Household',
      importedFiles: [],
      rejectedFiles: [
        {
          ...createStagedFile('file-failed', 'failed.xlsx'),
          status: 'rejected',
          reasonCode: 'parse-error',
          reasonTitle: 'Parse failed',
          reasonBody: 'The statement could not be parsed.'
        }
      ],
      duplicateBlockedFiles: [],
      acceptedFiles: [],
      reviewItems: [],
      lazyAccountCreated: false
    })

    const history = repository.listImportHistory()

    expect(history.map((attempt) => attempt.status)).toEqual(['failed', 'rejected', 'needs-review', 'imported'])
    expect(history[2]).toMatchObject({
      batchId: 'batch-needs-review',
      fileCount: 2,
      acceptedTransactionCount: 3,
      blockedDuplicateCount: 1,
      unresolvedReviewCount: 2,
      errorCount: 0
    })

    repository.close()
  })

  it('returns batch detail as a receipt view with summary, per-file outcomes, and transaction drill-down', () => {
    const repository = createRepository()

    repository.persistImportAttempt({
      attemptId: 'attempt-detail',
      batchId: 'batch-detail',
      batchLabel: 'Detail batch',
      status: 'needs-review',
      importedAt: '2026-03-27T09:00:00.000Z',
      accountLabel: 'ICICI - Household',
      importedFiles: [createStagedFile('file-detail', 'detail.xlsx')],
      rejectedFiles: [
        {
          ...createStagedFile('file-rejected', 'rejected.xlsx'),
          status: 'rejected',
          reasonCode: 'unsupported-format',
          reasonTitle: 'Unsupported format',
          reasonBody: 'This worksheet is not supported.'
        }
      ],
      duplicateBlockedFiles: [
        {
          ...createStagedFile('file-duplicate', 'duplicate.xlsx'),
          status: 'duplicate-blocked',
          reasonCode: 'duplicate-transactions',
          reasonTitle: 'Duplicate transactions',
          reasonBody: 'These rows already exist.'
        }
      ],
      acceptedFiles: [
        {
          stagedFile: createStagedFile('file-detail', 'detail.xlsx'),
          fileFingerprint: 'fingerprint-detail',
          transactionSignatures: ['detail-sig-1', 'detail-sig-2'],
          rows: [
            createRow('file-detail', 1, { cleanedDescription: 'Coffee shop' }),
            createRow('file-detail', 2, { cleanedDescription: 'Salary credit', direction: 'credit', creditAmountMinor: 500000, debitAmountMinor: undefined })
          ]
        }
      ],
      reviewItems: [createReviewItem('review-detail', 'batch-detail', 'attempt-detail', 'balance-continuity-warning', 'warning', 'file-detail')],
      lazyAccountCreated: false
    })

    const detail = repository.getImportBatchDetail({ batchId: 'batch-detail' }) as any

    expect(detail.summary).toMatchObject({
      batchId: 'batch-detail',
      status: 'needs-review',
      acceptedTransactionCount: 2,
      blockedDuplicateCount: 1,
      unresolvedReviewCount: 1
    })
    expect(detail.fileOutcomes).toHaveLength(3)
    expect(detail.fileOutcomes.map((outcome: { outcome: string }) => outcome.outcome)).toEqual(['imported', 'duplicate-blocked', 'rejected'])
    expect(detail.transactionGroups).toHaveLength(1)
    expect(detail.transactionGroups[0]).toMatchObject({
      sourceFileId: 'file-detail',
      sourceFileName: 'detail.xlsx'
    })
    expect(detail.transactionGroups[0].transactions).toHaveLength(2)
    expect(detail.transactionGroups[0].transactions[0]).toMatchObject({
      cleanedDescription: 'Coffee shop'
    })

    repository.close()
  })

  it('keeps history counters authoritative after review state changes by reading repository aggregates', () => {
    const repository = createRepository()

    repository.persistImportAttempt({
      attemptId: 'attempt-live-counts',
      batchId: 'batch-live-counts',
      batchLabel: 'Live counts batch',
      status: 'needs-review',
      importedAt: '2026-03-27T09:00:00.000Z',
      accountLabel: 'ICICI - Household',
      importedFiles: [createStagedFile('file-live', 'live.xlsx')],
      rejectedFiles: [],
      duplicateBlockedFiles: [],
      acceptedFiles: [
        {
          stagedFile: createStagedFile('file-live', 'live.xlsx'),
          fileFingerprint: 'fingerprint-live',
          transactionSignatures: ['live-sig-1'],
          rows: [createRow('file-live', 1)]
        }
      ],
      reviewItems: [
        createReviewItem('review-live-1', 'batch-live-counts', 'attempt-live-counts', 'duplicate-candidate', 'blocking', 'file-live'),
        createReviewItem('review-live-2', 'batch-live-counts', 'attempt-live-counts', 'unsupported-row-skipped', 'warning', 'file-live')
      ],
      lazyAccountCreated: false
    })

    const sqlite = (repository as unknown as { sqlite: import('better-sqlite3').Database }).sqlite
    sqlite.prepare('UPDATE review_items SET state = ?, updated_at = ? WHERE id = ?').run('resolved', '2026-03-27T10:00:00.000Z', 'review-live-1')

    const history = repository.listImportHistory()
    const detail = repository.getImportBatchDetail({ batchId: 'batch-live-counts' }) as any

    expect(history[0]).toMatchObject({
      unresolvedReviewCount: 1,
      status: 'needs-review'
    })
    expect(detail.summary.unresolvedReviewCount).toBe(1)
    expect(detail.reviewItems).toHaveLength(1)

    sqlite.prepare('UPDATE review_items SET state = ?, updated_at = ? WHERE id = ?').run('resolved', '2026-03-27T11:00:00.000Z', 'review-live-2')

    const refreshedHistory = repository.listImportHistory()
    const refreshedDetail = repository.getImportBatchDetail({ batchId: 'batch-live-counts' }) as any

    expect(refreshedHistory[0]).toMatchObject({
      unresolvedReviewCount: 0,
      status: 'imported'
    })
    expect(refreshedDetail.summary.unresolvedReviewCount).toBe(0)
    expect(refreshedDetail.summary.status).toBe('imported')

    repository.close()
  })
})
