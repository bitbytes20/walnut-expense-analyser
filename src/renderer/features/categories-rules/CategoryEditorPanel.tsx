import { useEffect, useState } from 'react'
import type { CategoryOption, CategoryTreeNode, CreateCategoryInput, UpdateCategoryInput } from '../../../shared/contracts/categories'

interface CategoryEditorPanelProps {
  mode: 'create' | 'edit'
  category?: CategoryTreeNode
  categoryOptions: CategoryOption[]
  onClose: () => void
  onSave: (input: CreateCategoryInput | UpdateCategoryInput) => void
  onMerge: (sourceCategoryId: string, targetCategoryId: string) => void
  onDelete: (categoryId: string) => void
}

export const CategoryEditorPanel = ({ mode, category, categoryOptions, onClose, onSave, onMerge, onDelete }: CategoryEditorPanelProps) => {
  const [name, setName] = useState('')
  const [parentId, setParentId] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [mergeTargetId, setMergeTargetId] = useState('')

  useEffect(() => {
    setName(category?.name ?? '')
    setParentId(category?.parentId ?? '')
    setIsActive(category?.isActive ?? true)
    setMergeTargetId('')
  }, [category])

  return (
    <aside style={styles.panel}>
      <div style={styles.header}>
        <div>
          <div style={styles.kicker}>{mode === 'create' ? 'New category' : 'Manage category'}</div>
          <h3 style={styles.heading}>{mode === 'create' ? 'Create a user category' : category?.name}</h3>
        </div>
        <button type="button" style={styles.secondaryButton} onClick={onClose}>
          Close
        </button>
      </div>

      <label style={styles.field}>
        <span style={styles.label}>Name</span>
        <input value={name} onChange={(event) => setName(event.target.value)} style={styles.input} />
      </label>

      <label style={styles.field}>
        <span style={styles.label}>Parent category</span>
        <select value={parentId} onChange={(event) => setParentId(event.target.value)} style={styles.input}>
          <option value="">Top level</option>
          {categoryOptions
            .filter((option) => option.id !== category?.id)
            .map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
        </select>
      </label>

      {mode === 'edit' ? (
        <label style={styles.toggleRow}>
          <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
          <span>Category is active</span>
        </label>
      ) : null}

      <div style={styles.actions}>
        <button
          type="button"
          style={styles.primaryButton}
          onClick={() =>
            onSave(
              mode === 'create'
                ? {
                    name,
                    parentId: parentId || undefined
                  }
                : {
                    categoryId: category!.id,
                    name,
                    parentId: parentId || null,
                    isActive
                  }
            )
          }
        >
          {mode === 'create' ? 'Create category' : 'Save category'}
        </button>
      </div>

      {mode === 'edit' && category ? (
        <div style={styles.destructiveBlock}>
          <div style={styles.label}>Merge into another category</div>
          <select value={mergeTargetId} onChange={(event) => setMergeTargetId(event.target.value)} style={styles.input}>
            <option value="">Select target</option>
            {categoryOptions
              .filter((option) => option.id !== category.id)
              .map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
          </select>
          <div style={styles.actions}>
            <button type="button" style={styles.secondaryButton} disabled={!mergeTargetId} onClick={() => onMerge(category.id, mergeTargetId)}>
              Merge category
            </button>
            <button type="button" style={styles.destructiveButton} onClick={() => onDelete(category.id)}>
              Delete category
            </button>
          </div>
        </div>
      ) : null}
    </aside>
  )
}

const styles = {
  panel: {
    position: 'fixed' as const,
    top: 110,
    right: 24,
    bottom: 24,
    width: 420,
    display: 'grid',
    gap: 'var(--space-md)',
    padding: 'var(--space-lg)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)',
    background: 'rgba(245, 241, 232, 0.96)',
    boxShadow: 'var(--shadow-panel)',
    zIndex: 30,
    overflowY: 'auto' as const
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 'var(--space-md)'
  },
  kicker: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--color-accent)'
  },
  heading: {
    margin: 'var(--space-xs) 0 0 0',
    fontSize: 24
  },
  field: {
    display: 'grid',
    gap: 'var(--space-xs)'
  },
  label: {
    fontSize: 14,
    fontWeight: 600
  },
  input: {
    minHeight: 44,
    borderRadius: 16,
    border: '1px solid rgba(15, 118, 110, 0.18)',
    background: 'rgba(255, 255, 255, 0.9)',
    padding: '0 14px'
  },
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)'
  },
  actions: {
    display: 'flex',
    gap: 'var(--space-sm)',
    flexWrap: 'wrap' as const
  },
  primaryButton: {
    minHeight: 42,
    border: 0,
    borderRadius: 999,
    background: 'var(--color-accent)',
    color: '#fff',
    padding: '0 16px',
    fontWeight: 700
  },
  secondaryButton: {
    minHeight: 42,
    borderRadius: 999,
    border: '1px solid rgba(30, 27, 22, 0.18)',
    background: 'rgba(30, 27, 22, 0.04)',
    color: 'var(--color-ink)',
    padding: '0 16px',
    fontWeight: 600
  },
  destructiveBlock: {
    display: 'grid',
    gap: 'var(--space-sm)',
    paddingTop: 'var(--space-sm)',
    borderTop: '1px solid rgba(30, 27, 22, 0.08)'
  },
  destructiveButton: {
    minHeight: 42,
    borderRadius: 999,
    border: '1px solid rgba(180, 35, 24, 0.24)',
    background: 'rgba(180, 35, 24, 0.08)',
    color: 'var(--color-destructive)',
    padding: '0 16px',
    fontWeight: 700
  }
} as const
