import { type ReactElement, useState } from 'react'
import type { CategoryTreeNode, MergeCategoryPreview } from '../../../shared/contracts/categories'

interface CategoryPaneProps {
  categories: CategoryTreeNode[]
  onCreate: () => void
  onEdit: (category: CategoryTreeNode) => void
  onCategoriesChange: (categories: CategoryTreeNode[]) => void
}

type RowAction =
  | { type: 'rename'; categoryId: string; currentName: string }
  | { type: 'merge-pick'; categoryId: string }
  | { type: 'merge-preview'; categoryId: string; targetId: string; preview: MergeCategoryPreview }
  | { type: 'archive-confirm'; categoryId: string; categoryName: string }

interface RowMessage {
  categoryId: string
  text: string
  kind: 'success' | 'error'
}

const renderRows = (
  categories: CategoryTreeNode[],
  onEdit: (category: CategoryTreeNode) => void,
  activeAction: RowAction | null,
  setActiveAction: (action: RowAction | null) => void,
  rowMessage: RowMessage | null,
  setRowMessage: (msg: RowMessage | null) => void,
  onCategoriesChange: (categories: CategoryTreeNode[]) => void,
  depth = 0
): ReactElement[] =>
  categories.flatMap((category) => [
    <CategoryRow
      key={category.id}
      category={category}
      allCategories={categories}
      depth={depth}
      onEdit={onEdit}
      activeAction={activeAction}
      setActiveAction={setActiveAction}
      rowMessage={rowMessage}
      setRowMessage={setRowMessage}
      onCategoriesChange={onCategoriesChange}
    />,
    ...renderRows(category.children as CategoryTreeNode[], onEdit, activeAction, setActiveAction, rowMessage, setRowMessage, onCategoriesChange, depth + 1)
  ])

interface CategoryRowProps {
  category: CategoryTreeNode
  allCategories: CategoryTreeNode[]
  depth: number
  onEdit: (category: CategoryTreeNode) => void
  activeAction: RowAction | null
  setActiveAction: (action: RowAction | null) => void
  rowMessage: RowMessage | null
  setRowMessage: (msg: RowMessage | null) => void
  onCategoriesChange: (categories: CategoryTreeNode[]) => void
}

const CategoryRow = ({
  category,
  allCategories,
  depth,
  onEdit,
  activeAction,
  setActiveAction,
  rowMessage,
  setRowMessage,
  onCategoriesChange
}: CategoryRowProps) => {
  const [renameValue, setRenameValue] = useState(category.name)
  const [mergeTargetId, setMergeTargetId] = useState('')

  const isRenaming = activeAction?.type === 'rename' && activeAction.categoryId === category.id
  const isMergePick = activeAction?.type === 'merge-pick' && activeAction.categoryId === category.id
  const isMergePreview = activeAction?.type === 'merge-preview' && activeAction.categoryId === category.id
  const isArchiveConfirm = activeAction?.type === 'archive-confirm' && activeAction.categoryId === category.id
  const message = rowMessage?.categoryId === category.id ? rowMessage : null

  const showMessage = (text: string, kind: 'success' | 'error', duration = 3000) => {
    setRowMessage({ categoryId: category.id, text, kind })
    if (duration > 0) {
      setTimeout(() => setRowMessage(null), duration)
    }
  }

  const handleRenameCommit = async () => {
    const trimmed = renameValue.trim()
    if (!trimmed || trimmed === category.name) {
      setActiveAction(null)
      return
    }
    try {
      const updated = await window.walnut.updateCategory({ categoryId: category.id, name: trimmed })
      onCategoriesChange(updated)
      setActiveAction(null)
      showMessage(`Renamed to ${trimmed}.`, 'success')
    } catch {
      setRenameValue(category.name)
      showMessage('This name could not be saved. Try a different name or try again.', 'error')
    }
  }

  const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      void handleRenameCommit()
    } else if (e.key === 'Escape') {
      setRenameValue(category.name)
      setActiveAction(null)
    }
  }

  const handleMergePickSelect = async (targetId: string) => {
    if (!targetId) return
    setMergeTargetId(targetId)
    try {
      const preview = await window.walnut.mergeCategoryPreview({
        sourceCategoryId: category.id,
        targetCategoryId: targetId
      })
      setActiveAction({ type: 'merge-preview', categoryId: category.id, targetId, preview })
    } catch {
      showMessage('Could not load merge preview. Please try again.', 'error')
      setActiveAction(null)
    }
  }

  const handleMergeConfirm = async () => {
    if (activeAction?.type !== 'merge-preview') return
    const { targetId, preview } = activeAction
    const sourceCount = preview.affectedTransactionCount
    const targetCat = allCategories.find((c) => c.id === targetId)
    const targetName = targetCat?.name ?? targetId
    try {
      const updated = await window.walnut.mergeCategory({ sourceCategoryId: category.id, targetCategoryId: targetId })
      onCategoriesChange(updated)
      setActiveAction(null)
      showMessage(`${category.name} merged into ${targetName}. ${sourceCount} transactions updated.`, 'success', 5000)
    } catch {
      showMessage('Merge failed. Please try again.', 'error')
      setActiveAction(null)
    }
  }

  const handleArchiveConfirm = async () => {
    try {
      const updated = await window.walnut.archiveCategory({ categoryId: category.id, isArchived: true })
      onCategoriesChange(updated)
      setActiveAction(null)
    } catch {
      showMessage('Archive failed. Please try again.', 'error')
      setActiveAction(null)
    }
  }

  const activeMergePreview = activeAction?.type === 'merge-preview' && activeAction.categoryId === category.id ? activeAction.preview : null
  const activeMergeTargetName = activeMergePreview
    ? (allCategories.find((c) => c.id === (activeAction as { targetId: string }).targetId)?.name ?? 'target')
    : ''

  // Build flattened active non-archived picker options, excluding this category
  const flatOptions = flattenForPicker(allCategories).filter((o) => o.id !== category.id && !o.isArchived)

  return (
    <div key={category.id} style={{ ...styles.row, paddingLeft: 20 + depth * 20 }}>
      <div style={styles.rowContent}>
        <div style={styles.rowTop}>
          {isRenaming ? (
            <input
              aria-label="Rename category"
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={() => void handleRenameCommit()}
              onKeyDown={handleRenameKeyDown}
              style={styles.renameInput}
            />
          ) : (
            <strong
              style={category.kind === 'user' ? styles.nameClickable : undefined}
              onClick={category.kind === 'user' ? () => { setRenameValue(category.name); setActiveAction({ type: 'rename', categoryId: category.id, currentName: category.name }) } : undefined}
              title={category.kind === 'user' ? 'Click to rename' : undefined}
            >
              {category.name}
            </strong>
          )}
          <div style={styles.badges}>
            {category.kind === 'system' ? <span style={styles.systemBadge}>Protected</span> : null}
            {!category.isActive ? <span style={styles.inactiveBadge}>Inactive</span> : null}
          </div>
        </div>

        <div style={styles.rowMeta}>
          <span>{category.path.join(' > ')}</span>
          <span>{category.counts.totalTransactionCount} mapped</span>
        </div>

        {message ? (
          <div style={{ fontSize: 14, color: message.kind === 'success' ? 'var(--color-muted)' : 'var(--color-destructive)' }}>
            {message.text}
          </div>
        ) : null}

        {isMergePick ? (
          <div style={styles.mergePickRow}>
            <select
              value={mergeTargetId}
              onChange={(e) => void handleMergePickSelect(e.target.value)}
              style={styles.inlineSelect}
              autoFocus
            >
              <option value="">Select target category…</option>
              {flatOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <button type="button" style={styles.ghostButtonSmall} onClick={() => setActiveAction(null)}>
              Cancel
            </button>
          </div>
        ) : null}

        {isMergePreview && activeMergePreview ? (
          <div style={styles.mergePreviewPanel}>
            <div style={styles.mergePreviewHeading}>
              Merge {category.name} into {activeMergeTargetName}
            </div>
            <div style={styles.mergePreviewCount}>
              <span style={{ fontWeight: 600 }}>{activeMergePreview.affectedTransactionCount}</span> transactions will be reassigned
            </div>
            {activeMergePreview.samples.length > 0 ? (
              <div style={styles.mergePreviewSamples}>
                {activeMergePreview.samples.map((s) => (
                  <div key={s.transactionId} style={styles.mergePreviewSample}>
                    <span style={{ fontSize: 12 }}>{s.transactionDateRaw}</span>
                    <span style={{ fontSize: 12 }}>{s.description}</span>
                  </div>
                ))}
              </div>
            ) : null}
            <div style={styles.mergePreviewWarning}>This cannot be undone.</div>
            <div style={styles.mergePreviewActions}>
              <button type="button" style={{ ...styles.primaryButton, minHeight: 44 }} onClick={() => void handleMergeConfirm()}>
                Merge {category.name} into {activeMergeTargetName}
              </button>
              <button type="button" style={styles.ghostButtonSmall} onClick={() => setActiveAction(null)}>
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {isArchiveConfirm ? (
          <div style={styles.archiveConfirmRow}>
            <span style={{ fontSize: 14 }}>
              Archive {category.name}? Its transactions stay intact, but the category won&apos;t appear in pickers.
            </span>
            <div style={styles.archiveConfirmButtons}>
              <button type="button" style={styles.archiveButton} onClick={() => void handleArchiveConfirm()}>
                Archive
              </button>
              <button type="button" style={styles.ghostButtonSmall} onClick={() => setActiveAction(null)}>
                Keep
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div style={styles.rowActions}>
        {category.kind === 'system' ? (
          <button type="button" style={styles.ghostButtonDisabled} disabled>
            Fixed
          </button>
        ) : (
          <>
            <button
              type="button"
              style={styles.ghostButton}
              onClick={() => onEdit(category)}
            >
              Manage
            </button>
            {!isRenaming && !isMergePick && !isMergePreview && !isArchiveConfirm ? (
              <>
                <button
                  type="button"
                  style={styles.actionButton}
                  onClick={() => {
                    setMergeTargetId('')
                    setActiveAction({ type: 'merge-pick', categoryId: category.id })
                  }}
                >
                  Merge into
                </button>
                <button
                  type="button"
                  style={styles.actionButton}
                  onClick={() => setActiveAction({ type: 'archive-confirm', categoryId: category.id, categoryName: category.name })}
                >
                  Archive
                </button>
              </>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}

const flattenForPicker = (nodes: CategoryTreeNode[]): Array<{ id: string; label: string; isArchived: boolean }> =>
  nodes.flatMap((node) => [
    { id: node.id, label: node.path.join(' > '), isArchived: node.isArchived },
    ...flattenForPicker(node.children as CategoryTreeNode[])
  ])

interface ArchivedCategoryRowProps {
  category: CategoryTreeNode
  onCategoriesChange: (categories: CategoryTreeNode[]) => void
}

const ArchivedCategoryRow = ({ category, onCategoriesChange }: ArchivedCategoryRowProps) => {
  const handleRestore = async () => {
    try {
      const updated = await window.walnut.archiveCategory({ categoryId: category.id, isArchived: false })
      onCategoriesChange(updated)
    } catch {
      // silent failure - user can retry
    }
  }

  return (
    <div style={styles.archivedRow}>
      <span style={{ fontSize: 14, color: 'var(--color-muted)' }}>{category.path.join(' > ')}</span>
      <button type="button" style={styles.restoreButton} onClick={() => void handleRestore()}>
        Restore
      </button>
    </div>
  )
}

const collectArchived = (nodes: CategoryTreeNode[]): CategoryTreeNode[] =>
  nodes.flatMap((node) => [
    ...(node.isArchived ? [node] : []),
    ...collectArchived(node.children as CategoryTreeNode[])
  ])

export const CategoryPane = ({ categories, onCreate, onEdit, onCategoriesChange }: CategoryPaneProps) => {
  const [activeAction, setActiveAction] = useState<RowAction | null>(null)
  const [rowMessage, setRowMessage] = useState<RowMessage | null>(null)

  const archivedCategories = collectArchived(categories)
  const activeCategories = categories.filter((c) => !c.isArchived)

  return (
    <section style={styles.card}>
      <div style={styles.header}>
        <div>
          <div style={styles.kicker}>Category hierarchy</div>
          <h3 style={styles.heading}>Protected defaults and local custom categories</h3>
        </div>
        <button type="button" style={styles.primaryButton} onClick={onCreate}>
          Add category
        </button>
      </div>

      {activeCategories.length === 0 ? (
        <p style={styles.empty}>No custom categories yet</p>
      ) : (
        <div style={styles.list}>
          {renderRows(activeCategories, onEdit, activeAction, setActiveAction, rowMessage, setRowMessage, onCategoriesChange)}
        </div>
      )}

      {archivedCategories.length > 0 ? (
        <details style={styles.archivedDetails}>
          <summary style={styles.archivedSummary}>Archived categories ({archivedCategories.length})</summary>
          <div style={styles.archivedList}>
            {archivedCategories.map((cat) => (
              <ArchivedCategoryRow key={cat.id} category={cat} onCategoriesChange={onCategoriesChange} />
            ))}
          </div>
        </details>
      ) : null}
    </section>
  )
}

const styles = {
  card: {
    display: 'grid',
    gap: 'var(--space-md)',
    padding: 'var(--space-lg)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)',
    background: 'rgba(245, 241, 232, 0.72)',
    boxShadow: 'var(--shadow-panel)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'start',
    gap: 'var(--space-md)'
  },
  kicker: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--color-accent)'
  },
  heading: {
    margin: 'var(--space-xs) 0 0 0',
    fontSize: 22
  },
  list: {
    display: 'grid',
    gap: 'var(--space-sm)'
  },
  row: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) auto',
    gap: 'var(--space-md)',
    alignItems: 'start',
    padding: 'var(--space-md)',
    borderRadius: 18,
    background: 'rgba(255, 255, 255, 0.56)',
    border: '1px solid rgba(30, 27, 22, 0.08)'
  },
  rowContent: {
    display: 'grid',
    gap: 'var(--space-xs)'
  },
  rowTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    flexWrap: 'wrap' as const
  },
  rowMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 'var(--space-sm)',
    flexWrap: 'wrap' as const,
    color: 'var(--color-muted)',
    fontSize: 14
  },
  rowActions: {
    display: 'flex',
    gap: 'var(--space-xs)',
    flexWrap: 'wrap' as const,
    alignItems: 'start'
  },
  badges: {
    display: 'flex',
    gap: 'var(--space-xs)'
  },
  systemBadge: {
    padding: '4px 10px',
    borderRadius: 999,
    background: 'rgba(15, 118, 110, 0.1)',
    color: 'var(--color-accent)',
    fontSize: 12,
    fontWeight: 700
  },
  inactiveBadge: {
    padding: '4px 10px',
    borderRadius: 999,
    background: 'rgba(30, 27, 22, 0.06)',
    color: 'var(--color-muted)',
    fontSize: 12,
    fontWeight: 700
  },
  primaryButton: {
    minHeight: 40,
    border: 0,
    borderRadius: 999,
    background: 'var(--color-accent)',
    color: '#fff',
    padding: '0 16px',
    fontWeight: 700,
    cursor: 'pointer'
  },
  ghostButton: {
    minHeight: 40,
    borderRadius: 999,
    border: '1px solid rgba(30, 27, 22, 0.18)',
    background: 'rgba(30, 27, 22, 0.04)',
    color: 'var(--color-ink)',
    padding: '0 16px',
    fontWeight: 600,
    cursor: 'pointer'
  },
  ghostButtonSmall: {
    minHeight: 36,
    borderRadius: 999,
    border: '1px solid rgba(30, 27, 22, 0.18)',
    background: 'rgba(30, 27, 22, 0.04)',
    color: 'var(--color-ink)',
    padding: '0 12px',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 14
  },
  ghostButtonDisabled: {
    minHeight: 40,
    borderRadius: 999,
    border: '1px solid rgba(30, 27, 22, 0.1)',
    background: 'rgba(30, 27, 22, 0.02)',
    color: 'var(--color-muted)',
    padding: '0 16px',
    fontWeight: 600
  },
  actionButton: {
    minHeight: 36,
    borderRadius: 999,
    border: '1px solid rgba(30, 27, 22, 0.14)',
    background: 'rgba(30, 27, 22, 0.03)',
    color: 'var(--color-ink)',
    padding: '0 12px',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer'
  },
  nameClickable: {
    cursor: 'pointer',
    textDecoration: 'underline dotted'
  },
  renameInput: {
    minHeight: 36,
    borderRadius: 12,
    border: '1px solid rgba(15, 118, 110, 0.32)',
    background: 'rgba(255, 255, 255, 0.95)',
    padding: '0 12px',
    fontSize: 14,
    fontWeight: 600
  },
  mergePickRow: {
    display: 'flex',
    gap: 'var(--space-sm)',
    alignItems: 'center',
    flexWrap: 'wrap' as const
  },
  inlineSelect: {
    minHeight: 36,
    borderRadius: 12,
    border: '1px solid rgba(15, 118, 110, 0.18)',
    background: 'rgba(255, 255, 255, 0.9)',
    padding: '0 10px',
    fontSize: 14
  },
  mergePreviewPanel: {
    display: 'grid',
    gap: 'var(--space-sm)',
    padding: 'var(--space-sm)',
    borderRadius: 12,
    background: 'var(--color-surface)',
    borderLeft: '3px solid var(--color-destructive)'
  },
  mergePreviewHeading: {
    fontSize: 20,
    fontWeight: 600
  },
  mergePreviewCount: {
    fontSize: 14
  },
  mergePreviewSamples: {
    display: 'grid',
    gap: 4
  },
  mergePreviewSample: {
    display: 'flex',
    gap: 8,
    fontSize: 12,
    color: 'var(--color-muted)'
  },
  mergePreviewWarning: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--color-destructive)'
  },
  mergePreviewActions: {
    display: 'flex',
    gap: 'var(--space-sm)',
    flexWrap: 'wrap' as const
  },
  archiveConfirmRow: {
    display: 'grid',
    gap: 'var(--space-xs)'
  },
  archiveConfirmButtons: {
    display: 'flex',
    gap: 'var(--space-sm)'
  },
  archiveButton: {
    minHeight: 36,
    borderRadius: 999,
    border: 'none',
    background: 'none',
    color: 'var(--color-destructive)',
    padding: '0 12px',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 14
  },
  empty: {
    margin: 0,
    color: 'var(--color-muted)'
  },
  archivedDetails: {
    marginTop: 'var(--space-sm)'
  },
  archivedSummary: {
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--color-muted)',
    padding: 'var(--space-sm) 0',
    userSelect: 'none' as const
  },
  archivedList: {
    display: 'grid',
    gap: 'var(--space-xs)',
    paddingTop: 'var(--space-xs)'
  },
  archivedRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 'var(--space-sm) var(--space-md)',
    borderRadius: 12,
    background: 'rgba(30, 27, 22, 0.03)',
    border: '1px solid rgba(30, 27, 22, 0.06)'
  },
  restoreButton: {
    minHeight: 32,
    borderRadius: 999,
    border: '1px solid rgba(30, 27, 22, 0.14)',
    background: 'rgba(30, 27, 22, 0.03)',
    color: 'var(--color-ink)',
    padding: '0 10px',
    fontWeight: 600,
    fontSize: 12,
    cursor: 'pointer'
  }
} as const
