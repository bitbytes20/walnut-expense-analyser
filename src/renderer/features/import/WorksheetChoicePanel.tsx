import { CheckCircle2 } from 'lucide-react'
import type { WorksheetCandidate } from '../../../shared/contracts/import'

interface WorksheetChoicePanelProps {
  fileName: string
  selectedWorksheetName?: string
  worksheetCandidates: WorksheetCandidate[]
  onSelect: (worksheetName: string) => void
  onClose: () => void
}

export const WorksheetChoicePanel = ({
  fileName,
  selectedWorksheetName,
  worksheetCandidates,
  onSelect,
  onClose
}: WorksheetChoicePanelProps) => (
  <aside aria-label="worksheet choice panel" style={styles.panel}>
    <div style={styles.header}>
      <div>
        <div style={styles.kicker}>Worksheet selection</div>
        <h3 style={styles.heading}>Choose the worksheet for {fileName}</h3>
      </div>
      <button type="button" style={styles.closeButton} onClick={onClose}>
        Close
      </button>
    </div>
    <div style={styles.list}>
      {worksheetCandidates.map((candidate) => {
        const active = selectedWorksheetName ? selectedWorksheetName === candidate.name : candidate.recommended
        return (
          <button key={candidate.name} type="button" style={{ ...styles.option, borderColor: active ? 'var(--color-accent)' : 'var(--color-border)' }} onClick={() => onSelect(candidate.name)}>
            <div style={styles.optionHeader}>
              <span style={styles.optionName}>{candidate.name}</span>
              {candidate.recommended ? (
                <span style={styles.recommended}>
                  <CheckCircle2 size={14} strokeWidth={2} />
                  Recommended
                </span>
              ) : null}
            </div>
            <div style={styles.optionMeta}>{candidate.rowCount} rows</div>
            <div style={styles.optionMeta}>{candidate.headerPreview.join(' · ')}</div>
          </button>
        )
      })}
    </div>
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
  list: {
    display: 'grid',
    gap: 'var(--space-md)'
  },
  option: {
    textAlign: 'left' as const,
    display: 'grid',
    gap: 'var(--space-sm)',
    minHeight: 56,
    padding: 'var(--space-md)',
    borderRadius: 20,
    border: '1px solid var(--color-border)',
    background: 'rgba(245, 241, 232, 0.72)',
    color: 'var(--color-ink)'
  },
  optionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 'var(--space-md)',
    alignItems: 'center'
  },
  optionName: {
    fontWeight: 700
  },
  recommended: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-xs)',
    color: 'var(--color-accent)',
    fontSize: 14,
    fontWeight: 700
  },
  optionMeta: {
    fontSize: 14,
    color: 'var(--color-muted)'
  }
}
