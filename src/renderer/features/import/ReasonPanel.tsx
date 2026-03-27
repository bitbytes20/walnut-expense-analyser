interface ReasonPanelProps {
  heading: string
  body: string
  metadata?: string[]
  onClose: () => void
}

export const ReasonPanel = ({ heading, body, metadata = [], onClose }: ReasonPanelProps) => (
  <aside aria-label="reason panel" style={styles.panel}>
    <div style={styles.header}>
      <div>
        <div style={styles.kicker}>Review details</div>
        <h3 style={styles.heading}>{heading}</h3>
      </div>
      <button type="button" style={styles.closeButton} onClick={onClose}>
        Close
      </button>
    </div>
    <p style={styles.body}>{body}</p>
    {metadata.length ? (
      <ul style={styles.list}>
        {metadata.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    ) : null}
    <div style={styles.privacyLine}>Statement files are read for import and are not stored by Walnut.</div>
  </aside>
)

const styles = {
  panel: {
    display: 'grid',
    gap: 'var(--space-lg)',
    padding: 'var(--space-lg)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    background: 'rgba(226, 215, 197, 0.72)'
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
    margin: 'var(--space-sm) 0 0 0',
    fontSize: 'var(--font-heading-size)'
  },
  closeButton: {
    minHeight: 44,
    borderRadius: 999,
    border: '1px solid rgba(30, 27, 22, 0.18)',
    background: 'rgba(30, 27, 22, 0.04)',
    color: 'var(--color-ink)',
    padding: '0 18px',
    fontWeight: 600
  },
  body: {
    margin: 0,
    color: 'var(--color-muted)'
  },
  list: {
    margin: 0,
    paddingLeft: 'var(--space-lg)',
    color: 'var(--color-ink)'
  },
  privacyLine: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--color-muted)'
  }
}
