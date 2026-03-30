import { describe, expect, it } from 'vitest'
import type {
  NormalizedImportRow,
  ReviewItem,
  ReviewItemResolutionAction,
  ReviewItemResolutionInput,
  ReviewItemRestoreInput,
  StagedImportFile
} from '../../../src/shared/contracts/import'
import { WalnutRepository } from '../../../src/main/persistence/db'

const createRepository = () => new WalnutRepository(':memory:')

const createRow = (
  sourceFileId: string,
  batchId: string,
  index: number,
  overrides: Partial<NormalizedImportRow> = {}
): NormalizedImportRow => ({
  transactionDateRaw: `2024-02-${String(index + 1).padStart(2, '0')}`,
  rawNarration: `Narration ${index}`,
  cleanedDescription: `Description ${index}`,
  debitAmountMinor: 1000 + index,
  direction: 'debit',
  sourceFileId,
  importBatchId: batchId,
  reference: `REF-${index}`,
  runningBalanceMinor: 100000 - index,
  ...overrides
})

const createStagedFile = (id: string, fileName: string): StagedImportFile => ({
  id,
  fileName,
  fileExtension: 'xlsx',
  accountLabel: 'ICICI - Household',
  statementPeriodLabel: 'Feb 2024',
  status: 'ready'
})

const createReviewItem = (
  id: string,
  batchId: string,
  attemptId: string,
  sourceFileId: string,
  row: NormalizedImportRow,
  reasonCode: ReviewItem['reasonCode'] = 'duplicate-candidate',
  severity: ReviewItem['severity'] = 'blocking'
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
    sourceFileName: `${sourceFileId}.xlsx`,
    message: `${reasonCode} message`,
    parsedRow: row
  },
  createdAt: '2026-03-27T09:00:00.000Z',
  updatedAt: '2026-03-27T09:00:00.000Z',
  resolution: {
    batchId,
    reviewItemId: id
  }
})

const seedBatch = (repository: WalnutRepository) => {
  const batchId = 'batch-review'
  const attemptId = 'attempt-review'
  const sourceFileId = 'file-review'
  const baseRow = createRow(sourceFileId, batchId, 1)
  const warningRow = createRow(sourceFileId, batchId, 2, { cleanedDescription: 'Needs acceptance' })

  repository.persistImportAttempt({
    attemptId,
    batchId,
    batchLabel: 'Review batch',
    status: 'needs-review',
    importedAt: '2026-03-27T09:00:00.000Z',
    accountLabel: 'ICICI - Household',
    importedFiles: [createStagedFile(sourceFileId, 'review.xlsx')],
    rejectedFiles: [],
    duplicateBlockedFiles: [],
    acceptedFiles: [
      {
        stagedFile: createStagedFile(sourceFileId, 'review.xlsx'),
        fileFingerprint: 'fingerprint-review',
        transactionSignatures: ['sig-review-1', 'sig-review-2'],
        rows: [baseRow, warningRow]
      }
    ],
    reviewItems: [
      createReviewItem('review-duplicate', batchId, attemptId, sourceFileId, baseRow, 'duplicate-candidate', 'blocking'),
      createReviewItem('review-warning', batchId, attemptId, sourceFileId, warningRow, 'parser-uncertainty', 'warning')
    ],
    lazyAccountCreated: false
  })

  return { batchId, attemptId, sourceFileId }
}

const getSqlite = (repository: WalnutRepository) =>
  (repository as unknown as { sqlite: import('better-sqlite3').Database }).sqlite

describe('review mutations', () => {
  it('supports single-item and bulk actions while keeping the queue unresolved-only', () => {
    const repository = createRepository()
    const { batchId } = seedBatch(repository)

    const resolveInput: ReviewItemResolutionInput = {
      batchId,
      action: 'mark-duplicate',
      reviewItemIds: ['review-duplicate']
    }

    repository.resolveReviewItems(resolveInput)

    repository.resolveReviewItems({
      batchId,
      action: 'apply-tag',
      reviewItemIds: ['review-warning'],
      tag: 'follow-up'
    })

    let queue = repository.getReviewQueue({ batchId })
    expect(queue).toHaveLength(0)
    expect(repository.listImportHistory()[0]).toMatchObject({
      batchId,
      unresolvedReviewCount: 0,
      status: 'imported'
    })

    repository.restoreReviewItems({
      batchId,
      reviewItemIds: ['review-duplicate']
    } satisfies ReviewItemRestoreInput)

    queue = repository.getReviewQueue({ batchId })
    expect(queue[0].reviewItems.map((item) => item.id)).toEqual(['review-duplicate'])

    repository.close()
  })

  it('allows edit-before-accept only for date, description, reference, and tags', () => {
    const repository = createRepository()
    const { batchId } = seedBatch(repository)
    const before = repository.getImportBatchDetail({ batchId }).transactionGroups[0].transactions[1]

    expect(() =>
      repository.resolveReviewItems({
        batchId,
        action: 'edit-before-accept',
        reviewItemIds: ['review-warning'],
        edits: {
          transactionDateRaw: '2024-02-29',
          cleanedDescription: 'Reviewed description',
          reference: 'REF-UPDATED',
          tags: ['utilities'],
          debitAmountMinor: 999999,
          runningBalanceMinor: 123456
        }
      })
    ).toThrow('Review resolution cannot change amount or running balance.')

    repository.resolveReviewItems({
      batchId,
      action: 'edit-before-accept',
      reviewItemIds: ['review-warning'],
      edits: {
        transactionDateRaw: '2024-02-29',
        cleanedDescription: 'Reviewed description',
        reference: 'REF-UPDATED',
        tags: ['utilities']
      }
    })

    const after = repository.getImportBatchDetail({ batchId }).transactionGroups[0].transactions[1] as typeof before & {
      tags?: string[]
    }

    expect(after).toMatchObject({
      transactionDateRaw: '2024-02-29',
      cleanedDescription: 'Reviewed description',
      reference: 'REF-UPDATED',
      tags: ['utilities']
    })
    expect(after.debitAmountMinor).toBe(before.debitAmountMinor)
    expect(after.runningBalanceMinor).toBe(before.runningBalanceMinor)

    repository.close()
  })

  it.each([
    'mark-duplicate',
    'mark-not-duplicate',
    'accept-as-is',
    'edit-before-accept',
    'discard',
    'apply-tag'
  ] satisfies ReviewItemResolutionAction[])(
    'writes an audit event for %s and supports restoring discard or duplicate decisions',
    (action) => {
      const repository = createRepository()
      const { batchId } = seedBatch(repository)

      const reviewItemId = action === 'apply-tag' ? 'review-warning' : 'review-duplicate'
      repository.resolveReviewItems({
        batchId,
        action,
        reviewItemIds: [reviewItemId],
        tag: action === 'apply-tag' ? 'follow-up' : undefined,
        edits:
          action === 'edit-before-accept'
            ? {
                cleanedDescription: 'Edited before accept'
              }
            : undefined
      })

      const sqlite = getSqlite(repository)
      const auditEvents = sqlite
        .prepare(`SELECT event_type, metadata_json FROM security_events WHERE event_type LIKE 'review:%' ORDER BY created_at ASC`)
        .all() as { event_type: string; metadata_json: string | null }[]

      expect(auditEvents).toHaveLength(1)
      expect(auditEvents[0]?.event_type).toBe('review:resolved')
      expect(JSON.parse(auditEvents[0]?.metadata_json ?? '{}')).toMatchObject({
        action,
        batchId,
        reviewItemIds: [reviewItemId]
      })

      if (action === 'mark-duplicate' || action === 'discard') {
        repository.restoreReviewItems({
          batchId,
          reviewItemIds: [reviewItemId]
        })

        const restoredQueue = repository.getReviewQueue({ batchId })
        expect(restoredQueue[0].reviewItems.map((item) => item.id)).toContain(reviewItemId)
      }

      repository.close()
    }
  )

  describe('resolveBulkReviewItems — mixed-state bulk approve', () => {
    it('bulk approve with all approvable items returns full approvedCount and zero skippedCount', () => {
      const repository = createRepository()
      const batchId = 'batch-bulk-all'
      const attemptId = 'attempt-bulk-all'
      const sourceFileId = 'file-bulk-all'
      const warningRow1 = createRow(sourceFileId, batchId, 1, { cleanedDescription: 'Warning row 1' })
      const warningRow2 = createRow(sourceFileId, batchId, 2, { cleanedDescription: 'Warning row 2' })

      repository.persistImportAttempt({
        attemptId,
        batchId,
        batchLabel: 'Bulk all batch',
        status: 'needs-review',
        importedAt: '2026-03-30T09:00:00.000Z',
        accountLabel: 'ICICI - Household',
        importedFiles: [createStagedFile(sourceFileId, 'bulk-all.xlsx')],
        rejectedFiles: [],
        duplicateBlockedFiles: [],
        acceptedFiles: [
          {
            stagedFile: createStagedFile(sourceFileId, 'bulk-all.xlsx'),
            fileFingerprint: 'fp-bulk-all',
            transactionSignatures: ['sig-bulk-all-1', 'sig-bulk-all-2'],
            rows: [warningRow1, warningRow2]
          }
        ],
        reviewItems: [
          createReviewItem('bulk-warning-1', batchId, attemptId, sourceFileId, warningRow1, 'parser-uncertainty', 'warning'),
          createReviewItem('bulk-warning-2', batchId, attemptId, sourceFileId, warningRow2, 'parser-uncertainty', 'warning')
        ],
        lazyAccountCreated: false
      })

      const result = repository.resolveBulkReviewItems({
        batchId,
        action: 'accept-as-is',
        reviewItemIds: ['bulk-warning-1', 'bulk-warning-2']
      })

      expect(result.bulkResult.approvedCount).toBe(2)
      expect(result.bulkResult.skippedCount).toBe(0)
      expect(result.bulkResult.skippedReason).toBeUndefined()

      repository.close()
    })

    it('bulk approve with some import-gated items skips gated items and returns correct counts', () => {
      const repository = createRepository()
      const { batchId } = seedBatch(repository)

      // Seed batch has 'review-duplicate' (duplicate-candidate, blocking) and 'review-warning' (parser-uncertainty, warning)
      // The duplicate-candidate is the import gate — warning items should be skipped while the gate is active
      const result = repository.resolveBulkReviewItems({
        batchId,
        action: 'accept-as-is',
        reviewItemIds: ['review-duplicate', 'review-warning']
      })

      // review-duplicate (duplicate-candidate) should be approved; review-warning is gated by the duplicate-candidate gate
      // After approving review-duplicate, there is no longer an active gate, but we check the gate BEFORE resolving
      // So both should be processed: review-duplicate passes (it IS a duplicate-candidate), review-warning is gated
      expect(result.bulkResult.approvedCount).toBe(1)
      expect(result.bulkResult.skippedCount).toBe(1)
      expect(result.bulkResult.skippedReason).toBe('import gate still active')

      repository.close()
    })

    it('bulk approve with all gated items returns zero approvedCount and full skippedCount', () => {
      const repository = createRepository()
      const batchId = 'batch-all-gated'
      const attemptId = 'attempt-all-gated'
      const sourceFileId = 'file-all-gated'
      const duplicateRow = createRow(sourceFileId, batchId, 1)
      const warningRow = createRow(sourceFileId, batchId, 2, { cleanedDescription: 'Warning row' })

      repository.persistImportAttempt({
        attemptId,
        batchId,
        batchLabel: 'All gated batch',
        status: 'needs-review',
        importedAt: '2026-03-30T09:00:00.000Z',
        accountLabel: 'ICICI - Household',
        importedFiles: [],
        rejectedFiles: [],
        duplicateBlockedFiles: [createStagedFile(sourceFileId, 'all-gated.xlsx')],
        acceptedFiles: [],
        reviewItems: [
          createReviewItem('gated-duplicate', batchId, attemptId, sourceFileId, duplicateRow, 'duplicate-candidate', 'blocking'),
          createReviewItem('gated-warning', batchId, attemptId, sourceFileId, warningRow, 'balance-continuity-warning', 'warning')
        ],
        lazyAccountCreated: false
      })

      // Attempt to bulk-approve only the non-duplicate-candidate warning items while gate is active
      const result = repository.resolveBulkReviewItems({
        batchId,
        action: 'accept-as-is',
        reviewItemIds: ['gated-warning']
      })

      expect(result.bulkResult.approvedCount).toBe(0)
      expect(result.bulkResult.skippedCount).toBe(1)
      expect(result.bulkResult.skippedReason).toBe('import gate still active')

      repository.close()
    })
  })
})
