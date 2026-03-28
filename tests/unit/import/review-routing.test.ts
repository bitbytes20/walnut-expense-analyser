import { describe, expect, it } from 'vitest'
import { buildReviewItemsForSignals } from '../../../src/main/import/import-coordinator'

describe('review routing', () => {
  it('maps unresolved duplicate, parser, worksheet, balance, and unsupported-row signals into typed review items', () => {
    const reviewItems = buildReviewItemsForSignals({
      batchId: 'batch-01',
      importAttemptId: 'attempt-01',
      signals: [
        { signalType: 'duplicate-candidate', sourceFileId: 'file-1', sourceFileName: 'duplicates.xlsx', message: 'Possible duplicate found.' },
        { signalType: 'parser-uncertainty', sourceFileId: 'file-1', sourceFileName: 'duplicates.xlsx', message: 'Parser could not confidently normalize this row.' },
        { signalType: 'deferred-worksheet', sourceFileId: 'file-2', sourceFileName: 'worksheets.xlsx', message: 'Worksheet selection needs review.' },
        { signalType: 'balance-continuity-warning', sourceFileId: 'file-3', sourceFileName: 'warning.xlsx', message: 'Balance continuity warning near row 18.' },
        { signalType: 'unsupported-row-skipped', sourceFileId: 'file-4', sourceFileName: 'unsupported.xlsx', message: 'One unsupported row was skipped.' }
      ]
    })

    expect(reviewItems).toHaveLength(5)
    expect(reviewItems.map((item) => item.reasonCode)).toEqual([
      'duplicate-candidate',
      'parser-uncertainty',
      'deferred-worksheet',
      'balance-continuity-warning',
      'unsupported-row-skipped'
    ])
    expect(reviewItems.map((item) => item.severity)).toEqual([
      'blocking',
      'blocking',
      'blocking',
      'warning',
      'warning'
    ])
    expect(reviewItems.every((item) => item.state === 'pending')).toBe(true)
  })
})
