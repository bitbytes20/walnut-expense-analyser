import { useState } from 'react'
import type { RuleConflict, RuleExportEntry } from '../../../shared/contracts/categories'

interface RuleImportDiffViewProps {
  conflicts: RuleConflict[]
  nonConflictCount: number
  warnings: string[]
  entries: RuleExportEntry[]
  onConfirm: (resolutions: Array<{ name: string; action: 'keep' | 'replace' | 'skip' }>) => void
  onCancel: () => void
}

const summarizeEntry = (entry: RuleExportEntry) => {
  const parts: string[] = []
  if (entry.descriptionTerms.length) {
    parts.push(`Matches: ${entry.descriptionTerms.map((t) => `${t.op}:"${t.value}"`).join(', ')}`)
  }
  if (entry.action.categoryName) parts.push(`Category: ${entry.action.categoryName}`)
  if (entry.action.type) parts.push(`Type: ${entry.action.type}`)
  if (entry.action.appendTags.length) parts.push(`Tags: ${entry.action.appendTags.join(', ')}`)
  return parts.length ? parts : ['No conditions or actions defined']
}

const nonConflictingNames = (entries: RuleExportEntry[], conflicts: RuleConflict[]) => {
  const conflictNames = new Set(conflicts.map((c) => c.name.toLowerCase()))
  return entries.filter((e) => !conflictNames.has(e.name.toLowerCase())).map((e) => e.name)
}

export const RuleImportDiffView = ({
  conflicts,
  nonConflictCount,
  warnings,
  entries,
  onConfirm,
  onCancel
}: RuleImportDiffViewProps) => {
  const [resolutions, setResolutions] = useState<Map<string, 'keep' | 'replace' | 'skip'>>(new Map())

  const setResolution = (name: string, action: 'keep' | 'replace' | 'skip') => {
    setResolutions((prev) => {
      const next = new Map(prev)
      next.set(name, action)
      return next
    })
  }

  const handleConfirm = () => {
    const resolved = conflicts.map((c) => ({
      name: c.name,
      action: resolutions.get(c.name) ?? 'skip'
    }))
    onConfirm(resolved)
  }

  const nonConflict = nonConflictingNames(entries, conflicts)

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Review imported rules</h2>

      {warnings.map((w, i) => (
        <div key={i} role="alert" style={styles.warningChip}>{w}</div>
      ))}

      <div style={styles.conflictList}>
        {conflicts.map((conflict) => {
          const resolution = resolutions.get(conflict.name)
          const existingLines = summarizeEntry(conflict.existing)
          const incomingLines = summarizeEntry(conflict.incoming)

          return (
            <div key={conflict.name} style={styles.conflictCard}>
              <div style={styles.conflictName}>{conflict.name}</div>

              <div style={styles.columns}>
                <div style={styles.column}>
                  <div style={styles.columnLabel}>Current</div>
                  {existingLines.map((line, i) => (
                    <div key={i} style={styles.detailLine}>{line}</div>
                  ))}
                </div>
                <div style={styles.column}>
                  <div style={styles.columnLabel}>Incoming</div>
                  {incomingLines.map((line, i) => (
                    <div key={i} style={styles.detailLine}>{line}</div>
                  ))}
                </div>
              </div>

              <div style={styles.resolutionButtons}>
                <button
                  type="button"
                  style={resolution === 'keep' ? styles.resolutionActive : styles.resolutionButton}
                  onClick={() => setResolution(conflict.name, 'keep')}
                >
                  Keep current
                </button>
                <button
                  type="button"
                  style={resolution === 'replace' ? styles.resolutionActive : styles.resolutionButton}
                  onClick={() => setResolution(conflict.name, 'replace')}
                >
                  Replace with incoming
                </button>
                <button
                  type="button"
                  style={resolution === 'skip' ? styles.resolutionActive : styles.resolutionButton}
                  onClick={() => setResolution(conflict.name, 'skip')}
                >
                  Skip both
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {nonConflictCount > 0 ? (
        <div style={styles.nonConflictSection}>
          <div style={styles.nonConflictHeading}>No conflicts — will be added</div>
          {nonConflict.map((name) => (
            <div key={name} style={styles.nonConflictRow}>{name}</div>
          ))}
        </div>
      ) : null}

      <div style={styles.actions}>
        <button type="button" style={styles.confirmButton} onClick={handleConfirm}>
          Confirm import
        </button>
        <button type="button" style={styles.cancelButton} onClick={onCancel}>
          Cancel import
        </button>
      </div>
    </div>
  )
}

const styles = {
  container: {
    display: 'grid',
    gap: 'var(--space-md)'
  },
  heading: {
    margin: 0,
    fontSize: 20,
    fontWeight: 600
  },
  warningChip: {
    border: '1px solid var(--color-destructive)',
    color: 'var(--color-destructive)',
    fontSize: 14,
    borderRadius: 'var(--radius-md)',
    padding: '4px 12px'
  },
  conflictList: {
    display: 'grid',
    gap: 'var(--space-sm)'
  },
  conflictCard: {
    padding: 'var(--space-md)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)',
    background: 'rgba(255, 255, 255, 0.56)',
    display: 'grid',
    gap: 'var(--space-sm)'
  },
  conflictName: {
    fontSize: 20,
    fontWeight: 600
  },
  columns: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 'var(--space-md)'
  },
  column: {
    display: 'grid',
    gap: 4
  },
  columnLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--color-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: 4
  },
  detailLine: {
    fontSize: 14,
    color: 'var(--color-ink)'
  },
  resolutionButtons: {
    display: 'flex',
    gap: 'var(--space-xs)'
  },
  resolutionButton: {
    fontSize: 13,
    padding: '4px 10px',
    borderRadius: 999,
    border: '1px solid var(--color-border)',
    background: 'transparent',
    color: 'var(--color-ink)',
    cursor: 'pointer'
  },
  resolutionActive: {
    fontSize: 13,
    padding: '4px 10px',
    borderRadius: 999,
    border: '1px solid var(--color-accent)',
    background: 'rgba(15, 118, 110, 0.1)',
    color: 'var(--color-accent)',
    cursor: 'pointer',
    fontWeight: 600
  },
  nonConflictSection: {
    padding: 'var(--space-sm) var(--space-md)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    background: 'rgba(245, 241, 232, 0.5)',
    display: 'grid',
    gap: 4
  },
  nonConflictHeading: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--color-muted)',
    marginBottom: 4
  },
  nonConflictRow: {
    fontSize: 14
  },
  actions: {
    display: 'flex',
    gap: 'var(--space-sm)'
  },
  confirmButton: {
    minHeight: 44,
    padding: '0 20px',
    borderRadius: 999,
    border: 0,
    background: 'var(--color-accent)',
    color: 'white',
    fontWeight: 700,
    fontSize: 15,
    cursor: 'pointer'
  },
  cancelButton: {
    minHeight: 44,
    padding: '0 20px',
    borderRadius: 999,
    border: '1px solid var(--color-border)',
    background: 'transparent',
    color: 'var(--color-ink)',
    fontWeight: 600,
    fontSize: 15,
    cursor: 'pointer'
  }
} as const
