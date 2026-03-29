import type { ImportBatchDetail } from '../../../shared/contracts/import'
import { ReviewItemCard } from './ReviewItemCard'

interface ReviewBatchGroupProps {
  batch: ImportBatchDetail
  totalReviewCount: number
  activeReviewItemId?: string
  selectedReviewItemIds: Set<string>
  onSelect: (reviewItemId: string, selected: boolean) => void
  onOpenDetails: (reviewItemId: string) => void
}

export const ReviewBatchGroup = ({
  batch,
  totalReviewCount,
  activeReviewItemId,
  selectedReviewItemIds,
  onSelect,
  onOpenDetails
}: ReviewBatchGroupProps) => {
  const orderedItems = [...batch.reviewItems].sort((left, right) => {
    if (left.severity !== right.severity) {
      return left.severity === 'blocking' ? -1 : 1
    }

    if (left.snapshot.sourceFileName && right.snapshot.sourceFileName) {
      const sourceComparison = left.snapshot.sourceFileName.localeCompare(right.snapshot.sourceFileName)
      if (sourceComparison !== 0) {
        return sourceComparison
      }
    }

    return (left.snapshot.rowIndex ?? 0) - (right.snapshot.rowIndex ?? 0)
  })

  const resolvedCount = Math.max(totalReviewCount - batch.reviewItems.length, 0)

  return (
    <section aria-label={`Review batch group ${batch.summary.batchLabel}`} style={styles.root}>
      <div style={styles.header}>
        <div>
          <div style={styles.kicker}>Batch-first review</div>
          <h3 style={styles.heading}>{batch.summary.batchLabel}</h3>
          <div style={styles.meta}>
            <span>{batch.reviewItems.length} unresolved items</span>
            <span>{resolvedCount} of {totalReviewCount} resolved</span>
            <span>{batch.summary.accountLabel ?? 'ICICI account'}</span>
          </div>
        </div>
        <div style={styles.statusRail}>
          <span style={styles.statusBadge}>{batch.summary.status === 'needs-review' ? 'Needs review' : 'Imported'}</span>
          <span style={styles.sourceMeta}>{batch.summary.fileCount} files</span>
        </div>
      </div>

      <div style={styles.list}>
        {orderedItems.map((item) => (
          <ReviewItemCard
            key={item.id}
            item={item}
            active={item.id === activeReviewItemId}
            selected={selectedReviewItemIds.has(item.id)}
            onSelect={onSelect}
            onOpenDetails={onOpenDetails}
          />
        ))}
      </div>
    </section>
  )
}

const styles = {
  root: {
    display: 'grid',
    gap: 'var(--space-md)',
    padding: 'var(--space-lg)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)',
    background: 'rgba(226, 215, 197, 0.72)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 'var(--space-md)',
    alignItems: 'start'
  },
  kicker: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--color-accent)'
  },
  heading: {
    margin: 'var(--space-sm) 0 0 0',
    fontSize: 'var(--font-heading-size)',
    lineHeight: 1.2
  },
  meta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 'var(--space-md)',
    marginTop: 'var(--space-sm)',
    color: 'var(--color-muted)',
    fontSize: 14
  },
  statusRail: {
    display: 'grid',
    gap: 'var(--space-sm)',
    justifyItems: 'end'
  },
  statusBadge: {
    minHeight: 32,
    padding: '0 14px',
    borderRadius: 999,
    display: 'inline-flex',
    alignItems: 'center',
    background: 'rgba(15, 118, 110, 0.12)',
    color: 'var(--color-accent)',
    fontWeight: 700
  },
  sourceMeta: {
    fontSize: 14,
    color: 'var(--color-muted)'
  },
  list: {
    display: 'grid',
    gap: 'var(--space-md)'
  }
}
