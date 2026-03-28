import { ShieldCheck, Upload } from 'lucide-react'

interface ImportWorkspaceHeaderProps {
  processedCount: number
  totalCount: number
  busyLabel?: string
  onImportClick: () => void
}

export const ImportWorkspaceHeader = ({ processedCount, totalCount, busyLabel, onImportClick }: ImportWorkspaceHeaderProps) => (
  <section style={styles.root}>
    <div style={styles.copyBlock}>
      <div style={styles.kicker}>Statement import pipeline</div>
      <h2 style={styles.heading}>Import statements</h2>
      <p style={styles.body}>
        Stage one or more ICICI statements, review any issues, and import the records without storing the source files.
      </p>
      <div style={styles.privacyLine}>
        <ShieldCheck size={16} strokeWidth={2} />
        Statement files are read for import and are not stored by Walnut.
      </div>
    </div>
    <div style={styles.actionBlock}>
      <div style={styles.progressLabel}>Workspace status</div>
      <div style={styles.progressValue}>{totalCount > 0 ? `${processedCount} of ${totalCount} files processed` : 'No files staged yet'}</div>
      <p style={styles.progressBody}>
        {totalCount > 0
          ? 'Keep staging more files, inspect any duplicates or worksheet choices, and import only when the batch feels ready.'
          : 'Stage one or more ICICI exports to start building a clean batch without keeping the original files.'}
      </p>
      <button type="button" aria-label="Import statements from workspace" style={styles.primaryButton} onClick={onImportClick}>
        <Upload size={18} strokeWidth={2.2} />
        {busyLabel ?? 'Import statements'}
      </button>
    </div>
  </section>
)

const styles = {
  root: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.45fr) minmax(300px, 0.9fr)',
    gap: 'var(--space-xl)',
    alignItems: 'stretch'
  },
  copyBlock: {
    display: 'grid',
    gap: 'var(--space-md)',
    padding: 'var(--space-xl)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)',
    background: 'rgba(245, 241, 232, 0.68)',
    boxShadow: 'var(--shadow-panel)',
    alignContent: 'start'
  },
  kicker: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--color-accent)'
  },
  heading: {
    margin: 0,
    fontSize: 'var(--font-display-size)',
    lineHeight: 1.1
  },
  body: {
    margin: 0,
    color: 'var(--color-muted)',
    maxWidth: 620
  },
  privacyLine: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    color: 'var(--color-muted)',
    fontSize: 14,
    fontWeight: 600
  },
  actionBlock: {
    display: 'grid',
    alignContent: 'start',
    gap: 'var(--space-md)',
    padding: 'var(--space-xl)',
    minWidth: 240,
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)',
    background: 'linear-gradient(180deg, rgba(15, 118, 110, 0.14), rgba(245, 241, 232, 0.82) 42%)',
    boxShadow: 'var(--shadow-panel)'
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--color-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em'
  },
  progressValue: {
    fontSize: 28,
    lineHeight: 1.15,
    fontWeight: 800,
    color: 'var(--color-ink)'
  },
  progressBody: {
    margin: 0,
    color: 'var(--color-muted)',
    maxWidth: '34ch'
  },
  primaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-sm)',
    minHeight: 56,
    border: 0,
    borderRadius: 999,
    background: 'var(--color-accent)',
    color: '#fff',
    padding: '0 24px',
    fontWeight: 700,
    justifySelf: 'start' as const,
    minWidth: 220
  }
}
