interface ReviewBulkActionBarProps {
  selectedCount: number
}

export const ReviewBulkActionBar = ({ selectedCount }: ReviewBulkActionBarProps) => {
  const disabled = selectedCount === 0

  return (
    <section style={styles.root}>
      <div>
        <div style={styles.kicker}>Bulk actions</div>
        <h3 style={styles.heading}>{selectedCount} selected</h3>
      </div>
      <div style={styles.actions}>
        <button type="button" style={styles.button} disabled={disabled}>
          Accept selected as-is
        </button>
        <button type="button" style={styles.button} disabled={disabled}>
          Discard selected
        </button>
        <button type="button" style={styles.button} disabled={disabled}>
          Mark selected as duplicate
        </button>
        <button type="button" style={styles.button} disabled={disabled}>
          Mark selected as not duplicate
        </button>
        <button type="button" style={styles.button} disabled={disabled}>
          Apply tag to selected
        </button>
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
    background: 'rgba(245, 241, 232, 0.72)'
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
  actions: {
    display: 'flex',
    gap: 'var(--space-sm)',
    flexWrap: 'wrap'
  },
  button: {
    minHeight: 44,
    borderRadius: 999,
    border: '1px solid rgba(30, 27, 22, 0.18)',
    background: 'rgba(30, 27, 22, 0.04)',
    color: 'var(--color-ink)',
    padding: '0 18px',
    fontWeight: 600
  }
}
