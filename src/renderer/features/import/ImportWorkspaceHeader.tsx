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
      <div style={styles.progress}>{totalCount > 0 ? `${processedCount} of ${totalCount} files processed` : 'No files staged yet'}</div>
      <button type="button" aria-label="Import statements from workspace" style={styles.primaryButton} onClick={onImportClick}>
        <Upload size={18} strokeWidth={2.2} />
        {busyLabel ?? 'Import statements'}
      </button>
    </div>
  </section>
)

const styles = {
  root: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    justifyContent: 'space-between',
    gap: 'var(--space-lg)'
  },
  copyBlock: {
    display: 'grid',
    gap: 'var(--space-md)',
    maxWidth: 620
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
    minWidth: 240
  },
  progress: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--color-muted)',
    textAlign: 'right' as const
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
    fontWeight: 700
  }
}
