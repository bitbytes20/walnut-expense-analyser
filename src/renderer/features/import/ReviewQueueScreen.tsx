import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ImportBatchDetail, ReviewItemEditInput, ReviewItemResolutionAction } from '../../../shared/contracts/import'
import { ReviewBatchGroup } from './ReviewBatchGroup'
import { ReviewBulkActionBar } from './ReviewBulkActionBar'
import { ReviewDetailPanel } from './ReviewDetailPanel'
import { ReviewRestoreBanner } from './ReviewRestoreBanner'

interface ReviewQueueScreenProps {
  initialBatchId?: string
  onBackToHistory: () => void
}

export interface ReviewKeyboardContext {
  activeItemId: string | null
  activeBatchId: string | null
  flatItems: Array<{ batchId: string; itemId: string }>
  onApprove: (batchId: string, itemId: string) => void
  onReject: (batchId: string, itemId: string) => void
  onNavigate: (batchId: string, itemId: string) => void
}

export function handleReviewKeydown(
  event: { key: string; target: { tagName: string; isContentEditable?: boolean }; preventDefault: () => void },
  ctx: ReviewKeyboardContext
): void {
  const { target } = event
  if (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable
  ) {
    return
  }

  if ((event.key === 'a' || event.key === 'A') && ctx.activeItemId && ctx.activeBatchId) {
    event.preventDefault()
    ctx.onApprove(ctx.activeBatchId, ctx.activeItemId)
    return
  }

  if ((event.key === 'r' || event.key === 'R') && ctx.activeItemId && ctx.activeBatchId) {
    event.preventDefault()
    ctx.onReject(ctx.activeBatchId, ctx.activeItemId)
    return
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    if (ctx.flatItems.length === 0) return
    const currentIndex = ctx.flatItems.findIndex(
      (item) => item.batchId === ctx.activeBatchId && item.itemId === ctx.activeItemId
    )
    const nextIndex = Math.min(currentIndex + 1, ctx.flatItems.length - 1)
    const next = ctx.flatItems[nextIndex < 0 ? 0 : nextIndex]
    if (next) ctx.onNavigate(next.batchId, next.itemId)
    return
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault()
    if (ctx.flatItems.length === 0) return
    const currentIndex = ctx.flatItems.findIndex(
      (item) => item.batchId === ctx.activeBatchId && item.itemId === ctx.activeItemId
    )
    const prevIndex = Math.max(currentIndex - 1, 0)
    const prev = ctx.flatItems[currentIndex < 0 ? 0 : prevIndex]
    if (prev) ctx.onNavigate(prev.batchId, prev.itemId)
  }
}

const getRestoreStorageKey = (batchId?: string) => `walnut.review-restore.${batchId ?? 'all'}`

export const ReviewQueueScreen = ({ initialBatchId, onBackToHistory }: ReviewQueueScreenProps) => {
  const [queue, setQueue] = useState<ImportBatchDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [mutating, setMutating] = useState(false)
  const [activeBatchId, setActiveBatchId] = useState<string | undefined>(initialBatchId)
  const [activeReviewItemId, setActiveReviewItemId] = useState<string>()
  const [selectedReviewItemIds, setSelectedReviewItemIds] = useState<string[]>([])
  const [knownTotals, setKnownTotals] = useState<Record<string, number>>({})
  const [restoreContext, setRestoreContext] = useState<{ batchId: string; reviewItemIds: string[]; message: string }>()

  const loadQueue = useCallback(
    async (preferredBatchId?: string) => {
      setLoading(true)
      try {
        const nextQueue = await window.walnut.getReviewQueue(initialBatchId ? { batchId: initialBatchId } : undefined)
        setQueue(nextQueue)
        setKnownTotals((current) => {
          const next = { ...current }
          for (const batch of nextQueue) {
            next[batch.summary.batchId] = Math.max(current[batch.summary.batchId] ?? 0, batch.reviewItems.length)
          }
          return next
        })

        const nextActiveBatchId = preferredBatchId ?? initialBatchId ?? nextQueue[0]?.summary.batchId
        setActiveBatchId(nextActiveBatchId)
        const nextActiveBatch = nextQueue.find((batch) => batch.summary.batchId === nextActiveBatchId) ?? nextQueue[0]
        setActiveReviewItemId(nextActiveBatch?.reviewItems[0]?.id)
        setSelectedReviewItemIds([])
      } finally {
        setLoading(false)
      }
    },
    [initialBatchId]
  )

  useEffect(() => {
    const storedRestore = window.localStorage.getItem(getRestoreStorageKey(initialBatchId))
    if (storedRestore) {
      setRestoreContext(JSON.parse(storedRestore) as { batchId: string; reviewItemIds: string[]; message: string })
    }

    void loadQueue()
  }, [loadQueue])

  const filteredQueue = useMemo(
    () => queue.filter((batch) => batch.reviewItems.length > 0 || batch.summary.batchId === activeBatchId),
    [activeBatchId, queue]
  )

  const activeBatch = filteredQueue.find((batch) => batch.summary.batchId === activeBatchId) ?? filteredQueue[0]
  const activeItem = activeBatch?.reviewItems.find((item) => item.id === activeReviewItemId) ?? activeBatch?.reviewItems[0]

  const flatItems = useMemo(
    () =>
      filteredQueue.flatMap((batch) =>
        batch.reviewItems.map((item) => ({ batchId: batch.summary.batchId, itemId: item.id }))
      ),
    [filteredQueue]
  )

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

  const refreshRelatedViews = async (batchId: string) => {
    await Promise.all([window.walnut.listImportHistory(), window.walnut.getImportBatchDetail({ batchId })])
  }

  const resolveItems = useCallback(
    async (
      batchId: string,
      reviewItemIds: string[],
      action: ReviewItemResolutionAction,
      options?: { edits?: ReviewItemEditInput; tag?: string }
    ) => {
      if (reviewItemIds.length === 0) {
        return
      }

      setMutating(true)
      try {
        await window.walnut.resolveReviewItems({
          batchId,
          reviewItemIds,
          action,
          edits: options?.edits,
          tag: options?.tag
        })
        setRestoreContext({
          batchId,
          reviewItemIds,
          message: action === 'mark-duplicate' ? 'Duplicate mark saved. Restore this review item if this was a mistake.' : 'Review action saved. Restore this review item if this was a mistake.'
        })
        window.localStorage.setItem(
          getRestoreStorageKey(initialBatchId),
          JSON.stringify({
            batchId,
            reviewItemIds,
            message: action === 'mark-duplicate' ? 'Duplicate mark saved. Restore this review item if this was a mistake.' : 'Review action saved. Restore this review item if this was a mistake.'
          })
        )
        await Promise.all([loadQueue(batchId), refreshRelatedViews(batchId)])
      } finally {
        setMutating(false)
      }
    },
    [initialBatchId, loadQueue]
  )

  const navigateToItem = useCallback((batchId: string, itemId: string) => {
    setActiveBatchId(batchId)
    setActiveReviewItemId(itemId)
  }, [])

  const handleApprove = useCallback(
    (batchId: string, itemId: string) => {
      const currentIndex = flatItems.findIndex((fi) => fi.batchId === batchId && fi.itemId === itemId)
      void resolveItems(batchId, [itemId], 'accept-as-is').then(() => {
        const remaining = flatItems.filter((fi) => !(fi.batchId === batchId && fi.itemId === itemId))
        if (remaining.length > 0) {
          const nextIndex = Math.min(currentIndex, remaining.length - 1)
          const next = remaining[nextIndex]
          if (next) navigateToItem(next.batchId, next.itemId)
        }
      })
    },
    [resolveItems, flatItems, navigateToItem]
  )

  const handleReject = useCallback(
    (batchId: string, itemId: string) => {
      const currentIndex = flatItems.findIndex((fi) => fi.batchId === batchId && fi.itemId === itemId)
      void resolveItems(batchId, [itemId], 'discard').then(() => {
        const remaining = flatItems.filter((fi) => !(fi.batchId === batchId && fi.itemId === itemId))
        if (remaining.length > 0) {
          const nextIndex = Math.min(currentIndex, remaining.length - 1)
          const next = remaining[nextIndex]
          if (next) navigateToItem(next.batchId, next.itemId)
        }
      })
    },
    [resolveItems, flatItems, navigateToItem]
  )

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      handleReviewKeydown(
        {
          key: event.key,
          target: {
            tagName: target?.tagName ?? '',
            isContentEditable: target?.isContentEditable ?? false
          },
          preventDefault: () => event.preventDefault()
        },
        {
          activeItemId: activeItem?.id ?? null,
          activeBatchId: activeBatch?.summary.batchId ?? null,
          flatItems,
          onApprove: handleApprove,
          onReject: handleReject,
          onNavigate: navigateToItem
        }
      )
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [activeBatch, activeItem, flatItems, handleApprove, handleReject, navigateToItem])

  const restoreItems = async () => {
    if (!restoreContext) {
      return
    }

    setMutating(true)
    try {
      await window.walnut.restoreReviewItems({
        batchId: restoreContext.batchId,
        reviewItemIds: restoreContext.reviewItemIds
      })
      await Promise.all([loadQueue(restoreContext.batchId), refreshRelatedViews(restoreContext.batchId)])
      setRestoreContext(undefined)
      window.localStorage.removeItem(getRestoreStorageKey(initialBatchId))
    } finally {
      setMutating(false)
    }
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
        {restoreContext ? <ReviewRestoreBanner message={restoreContext.message} onRestore={() => void restoreItems()} /> : null}
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
        <p style={styles.keyboardHint}>
          <span title="Approve (A)">Press A to approve</span>, <span title="Reject (R)">R to reject</span>, and arrow keys to navigate the focused item.
        </p>
      </section>

      {restoreContext ? <ReviewRestoreBanner message={restoreContext.message} onRestore={() => void restoreItems()} /> : null}

      <ReviewBulkActionBar
        selectedCount={selectedReviewItemIds.length}
        busy={mutating}
        onAction={(action, options) => {
          if (!activeBatch) {
            return
          }
          void resolveItems(activeBatch.summary.batchId, selectedReviewItemIds, action, options)
        }}
      />

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
          <ReviewDetailPanel
            item={activeItem}
            busy={mutating}
            onAction={(action, options) => {
              if (!activeBatch || !activeItem) {
                return
              }
              void resolveItems(activeBatch.summary.batchId, [activeItem.id], action, options)
            }}
          />
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
  keyboardHint: {
    margin: 0,
    fontSize: 12,
    color: 'var(--color-muted)'
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
} as const
