interface ReviewRestoreBannerProps {
  message: string
  onRestore: () => void
}

export const ReviewRestoreBanner = ({ message, onRestore }: ReviewRestoreBannerProps) => (
  <section style={styles.root}>
    <div>
      <div style={styles.kicker}>Restore</div>
      <h3 style={styles.heading}>Review action saved</h3>
      <p style={styles.helper}>{message}</p>
    </div>
    <button type="button" style={styles.button} onClick={onRestore}>
      Restore
    </button>
  </section>
)

const styles = {
  root: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 'var(--space-md)',
    alignItems: 'center',
    padding: 'var(--space-lg)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid rgba(15, 118, 110, 0.18)',
    background: 'rgba(15, 118, 110, 0.08)'
  },
  kicker: {
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--color-accent)'
  },
  heading: {
    margin: 'var(--space-xs) 0 0 0',
    fontSize: 'var(--font-heading-size)',
    lineHeight: 1.2
  },
  helper: {
    margin: 'var(--space-xs) 0 0 0',
    color: 'var(--color-muted)',
    maxWidth: 680
  },
  button: {
    minHeight: 44,
    border: 0,
    borderRadius: 999,
    background: 'var(--color-accent)',
    color: '#fff',
    padding: '0 18px',
    fontWeight: 700,
    cursor: 'pointer'
  }
} as const
