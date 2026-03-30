import { useState } from 'react'
import type { CategoryTreeNode } from '../../../shared/contracts/categories'

interface TransactionBulkActionBarProps {
  selectedCount: number
  categories: CategoryTreeNode[]
  onAssignCategory: (categoryId: string, categoryLabel: string) => Promise<void>
  onApplyTag: (tag: string) => Promise<void>
  onClearSelection: () => void
}

/**
 * Flatten a category tree into a sorted list of options for a <select> element.
 * Includes both parent and leaf categories; indentation via path depth.
 */
function flattenCategoryTree(nodes: CategoryTreeNode[], depth = 0): Array<{ id: string; label: string; depth: number }> {
  const result: Array<{ id: string; label: string; depth: number }> = []
  for (const node of nodes) {
    if (node.isActive) {
      result.push({ id: node.id, label: node.name, depth })
      result.push(...flattenCategoryTree(node.children as CategoryTreeNode[], depth + 1))
    }
  }
  return result
}

export const TransactionBulkActionBar = ({
  selectedCount,
  categories,
  onAssignCategory,
  onApplyTag,
  onClearSelection
}: TransactionBulkActionBarProps) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const flatCategories = flattenCategoryTree(categories)

  const showConfirmation = (message: string) => {
    setConfirmMessage(message)
    setTimeout(() => setConfirmMessage(null), 3000)
  }

  const handleAssignCategory = async () => {
    if (!selectedCategoryId) return
    const option = flatCategories.find((c) => c.id === selectedCategoryId)
    if (!option) return
    setBusy(true)
    try {
      await onAssignCategory(selectedCategoryId, option.label)
      showConfirmation(`${selectedCount} transactions updated.`)
      setSelectedCategoryId('')
    } finally {
      setBusy(false)
    }
  }

  const handleApplyTag = async () => {
    const trimmed = tagInput.trim()
    if (!trimmed) return
    setBusy(true)
    try {
      await onApplyTag(trimmed)
      showConfirmation(`Tag applied to ${selectedCount} transactions.`)
      setTagInput('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      role="region"
      aria-label="Bulk actions"
      style={styles.root}
    >
      <div style={styles.kicker}>Bulk actions</div>
      <h3 style={styles.heading}>{selectedCount} selected</h3>

      <div style={styles.controls}>
        {/* Category assignment */}
        <div style={styles.controlGroup}>
          <label style={styles.controlLabel} htmlFor="bulk-category-select">
            Assign category
          </label>
          <select
            id="bulk-category-select"
            aria-label="Assign category"
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.currentTarget.value)}
            style={styles.select}
            disabled={busy}
          >
            <option value="">Select category...</option>
            {flatCategories.map((option) => (
              <option key={option.id} value={option.id}>
                {'\u00a0'.repeat(option.depth * 2)}{option.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            style={styles.actionButton}
            disabled={busy || !selectedCategoryId}
            onClick={() => void handleAssignCategory()}
          >
            Apply category
          </button>
        </div>

        {/* Tag input */}
        <div style={styles.controlGroup}>
          <label style={styles.controlLabel} htmlFor="bulk-tag-input">
            Add tag to selected
          </label>
          <input
            id="bulk-tag-input"
            type="text"
            placeholder="Add tag to selected"
            aria-label="Add tag to selected"
            value={tagInput}
            onChange={(e) => setTagInput(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void handleApplyTag()
              }
            }}
            style={styles.input}
            disabled={busy}
          />
          <button
            type="button"
            style={styles.actionButton}
            disabled={busy || tagInput.trim().length === 0}
            onClick={() => void handleApplyTag()}
          >
            Apply tag
          </button>
        </div>

        {/* Clear selection */}
        <button
          type="button"
          style={styles.clearButton}
          onClick={onClearSelection}
          disabled={busy}
        >
          Clear selection
        </button>
      </div>

      {/* Confirmation live region */}
      <div
        aria-live="polite"
        aria-atomic="true"
        style={styles.confirmRegion}
      >
        {confirmMessage ?? ''}
      </div>
    </section>
  )
}

const styles = {
  root: {
    position: 'sticky' as const,
    top: 0,
    zIndex: 10,
    display: 'grid',
    gap: 'var(--space-md)',
    padding: 'var(--space-md) var(--space-lg)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)',
    background: 'rgba(245, 241, 232, 0.96)',
    boxShadow: 'var(--shadow-panel)'
  },
  kicker: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--color-accent)'
  },
  heading: {
    margin: 0,
    fontSize: 20,
    fontWeight: 600,
    lineHeight: 1.2,
    color: 'var(--color-ink)'
  },
  controls: {
    display: 'flex',
    gap: 'var(--space-md)',
    flexWrap: 'wrap' as const,
    alignItems: 'flex-end'
  },
  controlGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 'var(--space-xs)'
  },
  controlLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--color-muted)'
  },
  select: {
    minHeight: 44,
    minWidth: 200,
    borderRadius: 999,
    border: '1px solid rgba(30, 27, 22, 0.18)',
    background: 'rgba(255, 255, 255, 0.88)',
    color: 'var(--color-ink)',
    padding: '0 18px',
    fontSize: 14
  },
  input: {
    minHeight: 44,
    minWidth: 200,
    borderRadius: 999,
    border: '1px solid rgba(30, 27, 22, 0.18)',
    background: 'rgba(255, 255, 255, 0.88)',
    color: 'var(--color-ink)',
    padding: '0 18px',
    fontSize: 14
  },
  actionButton: {
    minHeight: 44,
    borderRadius: 999,
    border: '1px solid rgba(15, 118, 110, 0.28)',
    background: 'rgba(15, 118, 110, 0.08)',
    color: 'var(--color-accent)',
    padding: '0 18px',
    fontWeight: 600,
    fontSize: 14
  },
  clearButton: {
    minHeight: 44,
    borderRadius: 999,
    border: '1px solid rgba(30, 27, 22, 0.18)',
    background: 'rgba(30, 27, 22, 0.04)',
    color: 'var(--color-ink)',
    padding: '0 18px',
    fontWeight: 600,
    fontSize: 14,
    alignSelf: 'flex-end' as const
  },
  confirmRegion: {
    minHeight: 20,
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--color-accent)'
  }
} as const
