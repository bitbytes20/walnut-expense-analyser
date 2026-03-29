import type { CategoryTreeNode } from '../../../shared/contracts/categories'

interface CategoryPaneProps {
  categories: CategoryTreeNode[]
  onCreate: () => void
  onEdit: (category: CategoryTreeNode) => void
}

const renderRows = (categories: CategoryTreeNode[], onEdit: (category: CategoryTreeNode) => void, depth = 0): JSX.Element[] =>
  categories.flatMap((category) => [
    <div key={category.id} style={{ ...styles.row, paddingLeft: 20 + depth * 20 }}>
      <div style={styles.rowContent}>
        <div style={styles.rowTop}>
          <strong>{category.name}</strong>
          <div style={styles.badges}>
            {category.kind === 'system' ? <span style={styles.systemBadge}>Protected</span> : null}
            {!category.isActive ? <span style={styles.inactiveBadge}>Inactive</span> : null}
          </div>
        </div>
        <div style={styles.rowMeta}>
          <span>{category.path.join(' > ')}</span>
          <span>{category.counts.totalTransactionCount} mapped</span>
        </div>
      </div>
      <button
        type="button"
        style={category.kind === 'system' ? styles.ghostButtonDisabled : styles.ghostButton}
        onClick={() => onEdit(category)}
        disabled={category.kind === 'system'}
      >
        {category.kind === 'system' ? 'Fixed' : 'Manage'}
      </button>
    </div>,
    ...renderRows(category.children, onEdit, depth + 1)
  ])

export const CategoryPane = ({ categories, onCreate, onEdit }: CategoryPaneProps) => (
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

    {categories.length === 0 ? <p style={styles.empty}>No custom categories yet</p> : <div style={styles.list}>{renderRows(categories, onEdit)}</div>}
  </section>
)

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
    alignItems: 'center',
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
    fontWeight: 700
  },
  ghostButton: {
    minHeight: 40,
    borderRadius: 999,
    border: '1px solid rgba(30, 27, 22, 0.18)',
    background: 'rgba(30, 27, 22, 0.04)',
    color: 'var(--color-ink)',
    padding: '0 16px',
    fontWeight: 600
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
  empty: {
    margin: 0,
    color: 'var(--color-muted)'
  }
} as const
