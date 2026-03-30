import { Download, Upload } from 'lucide-react'
import { useState } from 'react'
import type { RuleExportEntry, RuleImportResult } from '../../../shared/contracts/categories'

interface RuleExportImportBarProps {
  userRuleCount: number
  onImportComplete: () => void
  onShowDiff: (result: RuleImportResult, entries: RuleExportEntry[]) => void
}

export const RuleExportImportBar = ({ userRuleCount, onImportComplete, onShowDiff }: RuleExportImportBarProps) => {
  const [exportLabel, setExportLabel] = useState<string>('Export rules')
  const [importMessage, setImportMessage] = useState<string | null>(null)

  const handleExport = async () => {
    const result = await window.walnut.exportRules()
    if (result.success) {
      setExportLabel('Exported')
      setTimeout(() => setExportLabel('Export rules'), 2000)
    }
  }

  const handleImport = async () => {
    const data = await window.walnut.importRulesPrepare()
    if (!data) return

    const { result, entries } = data as { result: RuleImportResult; entries: RuleExportEntry[] }

    if (result.conflicts.length > 0) {
      onShowDiff(result, entries)
    } else {
      await window.walnut.importRulesCommit({ entries, resolutions: [] })
      setImportMessage(`${result.imported} rules imported.`)
      setTimeout(() => setImportMessage(null), 3000)
      onImportComplete()
    }
  }

  const noRules = userRuleCount === 0

  return (
    <div style={styles.bar}>
      <button
        type="button"
        style={{ ...styles.pillButton, ...(noRules ? styles.pillDisabled : {}) }}
        disabled={noRules}
        title={noRules ? 'No rules to export' : undefined}
        onClick={handleExport}
      >
        <Download size={14} />
        <span>{exportLabel}</span>
      </button>

      <button
        type="button"
        style={styles.pillButton}
        onClick={handleImport}
      >
        <Upload size={14} />
        <span>Import rules</span>
      </button>

      {importMessage ? (
        <span style={styles.message}>{importMessage}</span>
      ) : null}
    </div>
  )
}

const styles = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)'
  },
  pillButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    border: '1px solid var(--color-border)' as const,
    borderRadius: 'var(--radius-md)',
    padding: '4px 12px',
    fontSize: 14,
    background: 'transparent',
    color: 'var(--color-ink)',
    cursor: 'pointer',
    fontWeight: 500
  } as const,
  pillDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed'
  } as const,
  message: {
    fontSize: 13,
    color: 'var(--color-accent)',
    fontWeight: 500
  }
} as const
