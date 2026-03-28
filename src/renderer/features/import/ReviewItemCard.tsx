import type { ReviewItem } from '../../../shared/contracts/import'

interface ReviewItemCardProps {
  item: ReviewItem
  selected: boolean
  active: boolean
  onSelect: (reviewItemId: string, selected: boolean) => void
  onOpenDetails: (reviewItemId: string) => void
}

export const ReviewItemCard = ({ item, selected, active, onSelect, onOpenDetails }: ReviewItemCardProps) => (
  <article style={{ ...styles.card, ...(active ? styles.cardActive : undefined) }}>
    <label style={styles.selectionRow}>
      <input
        type="checkbox"
        checked={selected}
        onChange={(event) => onSelect(item.id, event.currentTarget.checked)}
        aria-label={`Select ${item.title}`}
      />
      <span style={styles.selectionLabel}>Select item</span>
    </label>

    <div style={styles.header}>
      <div>
        <div style={styles.reasonLabel}>{reasonLabels[item.reasonCode]}</div>
        <h4 style={styles.title}>{item.title}</h4>
      </div>
      <span style={{ ...styles.severityBadge, ...(item.severity === 'blocking' ? styles.blockingBadge : styles.warningBadge) }}>
        {item.severity === 'blocking' ? 'Blocking' : 'Warning'}
      </span>
    </div>

    <p style={styles.description}>{item.description}</p>
    <div style={styles.context}>
      <span>{item.snapshot.sourceFileName ?? 'Statement row'}</span>
      {typeof item.snapshot.rowIndex === 'number' ? <span>Row {item.snapshot.rowIndex}</span> : null}
    </div>

    <button
      type="button"
      style={styles.detailsButton}
      aria-label={`Open details for ${item.title}`}
      onClick={() => onOpenDetails(item.id)}
    >
      {active ? 'Details open' : 'Open details'}
    </button>
  </article>
)

const reasonLabels: Record<ReviewItem['reasonCode'], string> = {
  'duplicate-candidate': 'Duplicate candidate',
  'parser-uncertainty': 'Parser uncertainty',
  'deferred-worksheet': 'Deferred worksheet',
  'balance-continuity-warning': 'Balance continuity warning',
  'unsupported-row-skipped': 'Unsupported row skipped'
}

const styles = {
  card: {
    display: 'grid',
    gap: 'var(--space-sm)',
    padding: 'var(--space-md)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid rgba(30, 27, 22, 0.08)',
    background: 'rgba(245, 241, 232, 0.88)'
  },
  cardActive: {
    border: '1px solid var(--color-accent)',
    boxShadow: '0 0 0 1px rgba(15, 118, 110, 0.12)'
  },
  selectionRow: {
    display: 'flex',
    gap: 'var(--space-sm)',
    alignItems: 'center'
  },
  selectionLabel: {
    fontSize: 14,
    color: 'var(--color-muted)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 'var(--space-sm)',
    alignItems: 'start'
  },
  reasonLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--color-muted)'
  },
  title: {
    margin: 'var(--space-xs) 0 0 0',
    fontSize: 'var(--font-heading-size)',
    lineHeight: 1.2
  },
  severityBadge: {
    minHeight: 28,
    padding: '0 12px',
    borderRadius: 999,
    display: 'inline-flex',
    alignItems: 'center',
    fontWeight: 700,
    fontSize: 14
  },
  blockingBadge: {
    background: 'rgba(180, 35, 24, 0.12)',
    color: '#8f2218'
  },
  warningBadge: {
    background: 'rgba(30, 27, 22, 0.08)',
    color: 'var(--color-ink)'
  },
  description: {
    margin: 0,
    color: 'var(--color-ink)'
  },
  context: {
    display: 'flex',
    gap: 'var(--space-md)',
    flexWrap: 'wrap',
    color: 'var(--color-muted)',
    fontSize: 14
  },
  detailsButton: {
    minHeight: 44,
    width: 'fit-content',
    borderRadius: 999,
    border: '1px solid rgba(30, 27, 22, 0.18)',
    background: 'rgba(30, 27, 22, 0.04)',
    color: 'var(--color-ink)',
    padding: '0 18px',
    fontWeight: 600
  }
}
