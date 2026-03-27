import { useEffect, useMemo, useState } from 'react'
import type { ImportBatchDetail } from '../../../shared/contracts/import'
import { ReviewBatchGroup } from './ReviewBatchGroup'
import { ReviewBulkActionBar } from './ReviewBulkActionBar'
import { ReviewDetailPanel } from './ReviewDetailPanel'

interface ReviewQueueScreenProps {
  initialBatchId?: string
  onBackToHistory: () => void
}

export const ReviewQueueScreen = ({ initialBatchId, onBackToHistory }: ReviewQueueScreenProps) => {
  const [queue, setQueue] = useState<ImportBatchDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [activeBatchId, setActiveBatchId] = useState<string | undefined>(initialBatchId)
  const [activeReviewItemId, setActiveReviewItemId] = useState<string>()
  const [selectedReviewItemIds, setSelectedReviewItemIds] = useState<string[]>([])
  const [knownTotals, setKnownTotals] = useState<Record<string, number>>({})

  useEffect(() => {
    let cancelled = false

    const loadQueue = async () => {
      setLoading(true)
      try {
        const nextQueue = await window.walnut.getReviewQueue(initialBatchId ? { batchId: initialBatchId } : undefined)
        if (cancelled) {
          return
        }

        setQueue(nextQueue)
        setKnownTotals((current) => {
          const next = { ...current }
          for (const batch of nextQueue) {
            next[batch.summary.batchId] = Math.max(current[batch.summary.batchId] ?? 0, batch.reviewItems.length)
          }
          return next
        })

        const nextActiveBatchId = initialBatchId ?? nextQueue[0]?.summary.batchId
        setActiveBatchId(nextActiveBatchId)
        setActiveReviewItemId((current) => current ?? nextQueue[0]?.reviewItems[0]?.id)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadQueue()

    return () => {
      cancelled = true
    }
  }, [initialBatchId])

  const filteredQueue = useMemo(
    () => queue.filter((batch) => batch.reviewItems.length > 0 || batch.summary.batchId === activeBatchId),
    [activeBatchId, queue]
  )

  const activeBatch = filteredQueue.find((batch) => batch.summary.batchId === activeBatchId) ?? filteredQueue[0]
  const activeItem =
    activeBatch?.reviewItems.find((item) => item.id === activeReviewItemId) ??
    activeBatch?.reviewItems[0]

  useEffect(() => {
    if (activeBatch?.summary.batchId && activeBatch.summary.batchId !== activeBatchId) {
      setActiveBatchId(activeBatch.summary.batchId)
    }
    if (activeItem?.id && activeItem.id !== activeReviewItemId) {
      setActiveReviewItemId(activeItem.id)
    }
  }, [activeBatch, activeBatchId, activeItem, activeReviewItemId])

  const toggleSelection = (reviewItemId: string, selected: boolean) => {
    setSelectedReviewItemIds((current) =>
      selected ? [...new Set([...current, reviewItemId])] : current.filter((candidate) => candidate !== reviewItemId)
    )
  }

  if (loading) {
    return <section style={styles.card}>Loading review queue...</section>
  }

  if (filteredQueue.every((batch) => batch.reviewItems.length === 0)) {
    return (
      <section style={styles.root}>
        <section style={styles.card}>
          <div style={styles.header}>
            <div>
              <div style={styles.kicker}>Review inbox</div>
              <h2 style={styles.heading}>Review queue</h2>
            </div>
            <button type="button" style={styles.secondaryButton} onClick={onBackToHistory}>
              Back to import history
            </button>
          </div>
        </section>
        <section style={styles.emptyState}>
          <div style={styles.kicker}>Review queue</div>
          <h3 style={styles.emptyHeading}>No unresolved review items</h3>
          <p style={styles.helper}>
            All current import issues have been resolved. Return to import history or import another statement batch when you're ready.
          </p>
        </section>
      </section>
    )
  }

  return (
    <section style={styles.root}>
      <section style={styles.card}>
        <div style={styles.header}>
          <div>
            <div style={styles.kicker}>Financial operations inbox</div>
            <h2 style={styles.heading}>Review queue</h2>
            <p style={styles.helper}>Resolve unresolved items by batch so every action stays tied to its source import context.</p>
          </div>
          <button type="button" style={styles.secondaryButton} onClick={onBackToHistory}>
            Back to import history
          </button>
        </div>
      </section>

      <ReviewBulkActionBar selectedCount={selectedReviewItemIds.length} />

      <div style={styles.layout}>
        <div style={styles.queueColumn}>
          {filteredQueue.map((batch) => (
            <ReviewBatchGroup
              key={batch.summary.batchId}
              batch={batch}
              totalReviewCount={knownTotals[batch.summary.batchId] ?? batch.reviewItems.length}
              activeReviewItemId={activeItem?.id}
              selectedReviewItemIds={new Set(selectedReviewItemIds)}
              onSelect={toggleSelection}
              onOpenDetails={(reviewItemId) => {
                setActiveBatchId(batch.summary.batchId)
                setActiveReviewItemId(reviewItemId)
              }}
            />
          ))}
        </div>
        <div style={styles.detailColumn}>
          <ReviewDetailPanel item={activeItem} />
        </div>
      </div>
    </section>
  )
}

const styles = {
  root: {
    width: 'min(100%, 1180px)',
    display: 'grid',
    gap: 'var(--space-lg)'
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.1fr) minmax(320px, 0.9fr)',
    gap: 'var(--space-xl)',
    alignItems: 'start'
  },
  queueColumn: {
    display: 'grid',
    gap: 'var(--space-lg)'
  },
  detailColumn: {
    display: 'grid',
    gap: 'var(--space-lg)'
  },
  card: {
    display: 'grid',
    gap: 'var(--space-md)',
    padding: 'var(--space-lg)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)',
    background: 'rgba(245, 241, 232, 0.72)',
    boxShadow: 'var(--shadow-panel)'
  },
  emptyState: {
    display: 'grid',
    gap: 'var(--space-md)',
    padding: 'var(--space-2xl)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)',
    background: 'rgba(245, 241, 232, 0.72)',
    boxShadow: 'var(--shadow-panel)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 'var(--space-md)',
    alignItems: 'center'
  },
  kicker: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--color-accent)'
  },
  heading: {
    margin: 'var(--space-sm) 0 0 0',
    fontSize: 'var(--font-display-size)',
    lineHeight: 1.1
  },
  emptyHeading: {
    margin: 'var(--space-sm) 0 0 0',
    fontSize: 'var(--font-heading-size)',
    lineHeight: 1.2
  },
  helper: {
    margin: 0,
    color: 'var(--color-muted)',
    maxWidth: 720
  },
  secondaryButton: {
    minHeight: 44,
    borderRadius: 999,
    border: '1px solid rgba(30, 27, 22, 0.18)',
    background: 'rgba(30, 27, 22, 0.04)',
    color: 'var(--color-ink)',
    padding: '0 18px',
    fontWeight: 600
  }
}
