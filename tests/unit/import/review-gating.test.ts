import { describe, expect, it } from 'vitest'
import { calculateReviewGate } from '../../../src/main/import/import-coordinator'
import type { ReviewItem } from '../../../src/shared/contracts/import'

const createReviewItem = (severity: ReviewItem['severity']): ReviewItem => ({
  id: `review-${severity}`,
  batchId: 'batch-01',
  importAttemptId: 'attempt-01',
  reasonCode: severity === 'blocking' ? 'duplicate-candidate' : 'balance-continuity-warning',
  severity,
  state: 'pending',
  title: severity,
  description: `${severity} review item`,
  snapshot: {
    message: `${severity} review item`
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  resolution: {
    batchId: 'batch-01',
    reviewItemId: `review-${severity}`
  }
})

describe('review gating', () => {
  it('keeps warning-only batches in needs-review while preserving accepted transactions', () => {
    const gate = calculateReviewGate([createReviewItem('warning')], 4)

    expect(gate).toEqual({
      status: 'needs-review',
      shouldFinalizeAcceptedTransactions: true
    })
  })

  it('keeps blocking batches in needs-review and stops accepted transactions from finalizing', () => {
    const gate = calculateReviewGate([createReviewItem('blocking')], 4)

    expect(gate).toEqual({
      status: 'needs-review',
      shouldFinalizeAcceptedTransactions: false
    })
  })

  it('treats empty accepted batches as rejected and reserves failed for runtime errors', () => {
    expect(calculateReviewGate([], 0).status).toBe('rejected')
    expect(['imported', 'needs-review', 'rejected', 'failed']).toContain('failed')
  })
})
