export const EmptyDashboard = () => (
  <section aria-label="dashboard empty state" style={styles.panel}>
    <div style={styles.kicker}>Your dashboard is ready</div>
    <h2 style={styles.heading}>Ready for your first import</h2>
    <p style={styles.body}>
      Add your first ICICI statement to create the account timeline and unlock dashboard insights.
    </p>
    <button type="button" style={styles.primaryButton}>
      Import your first statement
    </button>
  </section>
)

const styles = {
  panel: {
    width: '100%',
    maxWidth: 960,
    padding: 'var(--space-3xl)',
    borderRadius: 'var(--radius-lg)',
    background: 'rgba(226, 215, 197, 0.72)',
    border: '1px solid var(--color-border)',
    boxShadow: 'var(--shadow-panel)'
  },
  kicker: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--color-accent)'
  },
  heading: {
    marginTop: 'var(--space-md)',
    marginBottom: 'var(--space-md)',
    fontSize: 'var(--font-display-size)',
    lineHeight: 1.1
  },
  body: {
    maxWidth: 580,
    marginTop: 0,
    marginBottom: 'var(--space-xl)',
    color: 'var(--color-muted)'
  },
  primaryButton: {
    minHeight: 56,
    border: 0,
    borderRadius: 999,
    background: 'var(--color-accent)',
    color: 'white',
    padding: '0 24px',
    fontWeight: 600
  }
}
