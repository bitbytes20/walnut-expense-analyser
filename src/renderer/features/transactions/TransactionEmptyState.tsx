interface TransactionEmptyStateProps {
  hasFilters: boolean
}

export const TransactionEmptyState = ({ hasFilters }: TransactionEmptyStateProps) => (
  <section style={styles.card}>
    <div style={styles.kicker}>Transactions</div>
    <h2 style={styles.heading}>{hasFilters ? 'No transactions match this view' : 'No transactions yet'}</h2>
    <p style={styles.body}>
      {hasFilters
        ? 'Clear one or more filters or broaden your search to see more records.'
        : 'Import an ICICI statement to start browsing, correcting, and searching your local transaction history.'}
    </p>
  </section>
)

const styles = {
  card: {
    display: 'grid',
    gap: 'var(--space-md)',
    padding: 'var(--space-2xl)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)',
    background: 'rgba(245, 241, 232, 0.72)',
    boxShadow: 'var(--shadow-panel)'
  },
  kicker: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--color-accent)'
  },
  heading: {
    margin: 0,
    fontSize: 'var(--font-heading-size)',
    lineHeight: 1.2
  },
  body: {
    margin: 0,
    color: 'var(--color-muted)',
    maxWidth: 640
  }
} as const
