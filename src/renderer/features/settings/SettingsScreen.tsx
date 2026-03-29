import { useState } from 'react'

type ExportState = 'idle' | 'exporting' | 'done' | 'error'

export const SettingsScreen = () => {
  const [redactedExportState, setRedactedExportState] = useState<ExportState>('idle')
  const [fullExportState, setFullExportState] = useState<ExportState>('idle')

  const handleExport = async (type: 'redacted' | 'full', setState: (s: ExportState) => void) => {
    setState('exporting')
    try {
      const bundle = await window.walnut.generateDiagnosticsBundle({ type })
      const blob = new Blob([bundle], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const filename = `walnut-diagnostics-${type}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      anchor.click()
      URL.revokeObjectURL(url)
      setState('done')
      setTimeout(() => setState('idle'), 3000)
    } catch {
      setState('error')
      setTimeout(() => setState('idle'), 4000)
    }
  }

  return (
    <div style={styles.root}>
      <div style={styles.header}>
        <h1 style={styles.pageTitle}>Settings</h1>
        <p style={styles.pageSubtitle}>Configure your workspace preferences and access support tools.</p>
      </div>

      <section style={styles.section} aria-labelledby="support-heading">
        <h2 id="support-heading" style={styles.sectionHeading}>Support</h2>
        <p style={styles.sectionDescription}>
          Generate a diagnostics bundle to share with support when reporting an issue. The redacted bundle removes all
          transaction descriptions, references, and tags — safe to share externally.
        </p>

        <div style={styles.actionGroup}>
          <div style={styles.actionCard}>
            <div style={styles.actionCardContent}>
              <h3 style={styles.actionLabel}>Export Redacted Diagnostics</h3>
              <p style={styles.actionDescription}>
                Strips all sensitive text (descriptions, references, tags). Safe to share with support or attach to a
                bug report.
              </p>
            </div>
            <button
              type="button"
              style={{
                ...styles.exportButton,
                ...(redactedExportState === 'exporting' ? styles.exportButtonDisabled : styles.exportButtonPrimary)
              }}
              disabled={redactedExportState === 'exporting'}
              onClick={() => void handleExport('redacted', setRedactedExportState)}
              aria-label="Export redacted diagnostics bundle"
            >
              {redactedExportState === 'exporting'
                ? 'Exporting\u2026'
                : redactedExportState === 'done'
                  ? 'Exported'
                  : redactedExportState === 'error'
                    ? 'Export failed — try again'
                    : 'Export Redacted Diagnostics'}
            </button>
          </div>

          <div style={styles.actionCard}>
            <div style={styles.actionCardContent}>
              <h3 style={styles.actionLabel}>Export Full Diagnostics</h3>
              <p style={styles.actionDescription}>
                Includes all transaction data, category assignments, and the full audit ledger. Use only when directed
                by support and sharing in a trusted context.
              </p>
            </div>
            <button
              type="button"
              style={{
                ...styles.exportButton,
                ...(fullExportState === 'exporting' ? styles.exportButtonDisabled : styles.exportButtonSecondary)
              }}
              disabled={fullExportState === 'exporting'}
              onClick={() => void handleExport('full', setFullExportState)}
              aria-label="Export full diagnostics bundle"
            >
              {fullExportState === 'exporting'
                ? 'Exporting\u2026'
                : fullExportState === 'done'
                  ? 'Exported'
                  : fullExportState === 'error'
                    ? 'Export failed — try again'
                    : 'Export Full Diagnostics'}
            </button>
          </div>
        </div>

        <div style={styles.crashLogNote} role="note">
          <p style={styles.crashLogNoteHeading}>Crash logs</p>
          <p style={styles.crashLogNoteBody}>
            Application crash logs are silently retained in your local user data folder at{' '}
            <code style={styles.crashLogPath}>{'{userData}/logs/walnut.log'}</code>. These logs never leave your device
            unless you choose to share them.
          </p>
        </div>
      </section>
    </div>
  )
}

const styles = {
  root: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 'var(--space-xl)',
    padding: '0 var(--space-xl)',
    maxWidth: 720,
    margin: '0 auto',
    width: '100%'
  },
  header: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 'var(--space-xs)'
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 600,
    lineHeight: 1.2,
    margin: 0,
    color: 'var(--color-heading)'
  },
  pageSubtitle: {
    fontSize: 14,
    fontWeight: 400,
    lineHeight: 1.5,
    margin: 0,
    color: 'var(--color-muted)'
  },
  section: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 'var(--space-lg)'
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: 600,
    lineHeight: 1.3,
    margin: 0,
    color: 'var(--color-heading)'
  },
  sectionDescription: {
    fontSize: 14,
    fontWeight: 400,
    lineHeight: 1.5,
    margin: 0,
    color: 'var(--color-muted)'
  },
  actionGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 'var(--space-md)'
  },
  actionCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 'var(--space-lg)',
    padding: 'var(--space-md)',
    borderRadius: 8,
    border: '1px solid rgba(30, 27, 22, 0.10)',
    background: 'var(--bg-secondary)'
  },
  actionCardContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 'var(--space-xs)',
    flex: 1,
    minWidth: 0
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: 500,
    lineHeight: 1.4,
    margin: 0,
    color: 'var(--color-heading)'
  },
  actionDescription: {
    fontSize: 12,
    fontWeight: 400,
    lineHeight: 1.4,
    margin: 0,
    color: 'var(--color-muted)'
  },
  exportButton: {
    padding: '8px 16px',
    borderRadius: 6,
    border: '1px solid',
    fontSize: 14,
    fontWeight: 500,
    lineHeight: 1.4,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
    transition: 'background 0.15s, color 0.15s, border-color 0.15s'
  },
  exportButtonPrimary: {
    background: 'var(--accent-blue)',
    color: '#fff',
    borderColor: 'var(--accent-blue)'
  },
  exportButtonSecondary: {
    background: 'var(--bg-primary)',
    color: 'var(--color-body)',
    borderColor: 'rgba(30, 27, 22, 0.18)'
  },
  exportButtonDisabled: {
    background: 'var(--bg-secondary)',
    color: 'var(--color-muted)',
    borderColor: 'rgba(30, 27, 22, 0.10)',
    cursor: 'not-allowed'
  },
  crashLogNote: {
    padding: 'var(--space-md)',
    borderRadius: 8,
    border: '1px solid rgba(30, 27, 22, 0.08)',
    background: 'var(--bg-secondary)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 'var(--space-xs)'
  },
  crashLogNoteHeading: {
    fontSize: 12,
    fontWeight: 500,
    lineHeight: 1.4,
    margin: 0,
    color: 'var(--color-heading)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em'
  },
  crashLogNoteBody: {
    fontSize: 14,
    fontWeight: 400,
    lineHeight: 1.5,
    margin: 0,
    color: 'var(--color-muted)'
  },
  crashLogPath: {
    fontFamily: 'monospace',
    fontSize: 12,
    padding: '1px 4px',
    borderRadius: 3,
    background: 'rgba(30, 27, 22, 0.06)'
  }
} as const
