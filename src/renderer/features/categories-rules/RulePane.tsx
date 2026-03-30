import { useState } from 'react'
import type { CategorizationRuleSummary, RuleConflict, RuleExportEntry, RuleImportResult } from '../../../shared/contracts/categories'
import { RuleExportImportBar } from './RuleExportImportBar'
import { RuleImportDiffView } from './RuleImportDiffView'

interface RulePaneProps {
  rules: CategorizationRuleSummary[]
  onCreate: () => void
  onEdit: (rule: CategorizationRuleSummary) => void
  onToggle: (rule: CategorizationRuleSummary) => void
  onRulesChange: (rules: CategorizationRuleSummary[]) => void
}

interface DiffState {
  result: RuleImportResult
  entries: RuleExportEntry[]
}

const summarizeCondition = (rule: CategorizationRuleSummary) => {
  const parts = [
    rule.condition.descriptionTerms.length ? `matches ${rule.condition.descriptionTerms.map((t) => `${t.op}:${t.value}`).join(', ')}` : null,
    rule.condition.transactionTypes.length ? `types: ${rule.condition.transactionTypes.join(', ')}` : null,
    rule.condition.tags.length ? `tags: ${rule.condition.tags.join(', ')}` : null,
    rule.condition.directions.length ? `direction: ${rule.condition.directions.join(', ')}` : null
  ].filter(Boolean)
  return parts.join(' • ') || 'Matches all imported transactions'
}

const summarizeAction = (rule: CategorizationRuleSummary) => {
  const parts = [
    rule.action.categoryId ? 'assign category' : null,
    rule.action.type ? `set type to ${rule.action.type}` : null,
    rule.action.appendTags.length ? `append ${rule.action.appendTags.join(', ')}` : null
  ].filter(Boolean)
  return parts.join(' • ') || 'No action'
}

export const RulePane = ({ rules, onCreate, onEdit, onToggle, onRulesChange }: RulePaneProps) => {
  const [diffState, setDiffState] = useState<DiffState | null>(null)

  const userRuleCount = rules.filter((r) => r.kind === 'user').length

  const handleShowDiff = (result: RuleImportResult, entries: RuleExportEntry[]) => {
    setDiffState({ result, entries })
  }

  const handleConfirmImport = async (resolutions: Array<{ name: string; action: 'keep' | 'replace' | 'skip' }>) => {
    if (!diffState) return
    const nextRules = await window.walnut.importRulesCommit({ entries: diffState.entries, resolutions })
    onRulesChange(nextRules)
    setDiffState(null)
  }

  const handleCancelImport = () => {
    setDiffState(null)
  }

  const handleImportComplete = async () => {
    const nextRules = await window.walnut.listRules()
    onRulesChange(nextRules)
  }

  return (
    <section style={styles.card}>
      <div style={styles.header}>
        <div>
          <div style={styles.kicker}>Automation rules</div>
          <h3 style={styles.heading}>Reusable categorization logic</h3>
        </div>
        <button type="button" style={styles.primaryButton} onClick={onCreate}>
          Add rule
        </button>
      </div>

      <RuleExportImportBar
        userRuleCount={userRuleCount}
        onImportComplete={handleImportComplete}
        onShowDiff={handleShowDiff}
      />

      {diffState ? (
        <RuleImportDiffView
          conflicts={diffState.result.conflicts as RuleConflict[]}
          nonConflictCount={diffState.result.imported}
          warnings={diffState.result.warnings}
          entries={diffState.entries}
          onConfirm={handleConfirmImport}
          onCancel={handleCancelImport}
        />
      ) : (
        <div style={styles.list}>
          {rules.map((rule) => (
            <article key={rule.id} style={styles.row}>
              <div style={styles.rowHeader}>
                <strong>{rule.name}</strong>
                <div style={styles.badges}>
                  {rule.kind === 'system' ? <span style={styles.systemBadge}>Starter</span> : null}
                  <span style={rule.isEnabled ? styles.enabledBadge : styles.disabledBadge}>{rule.isEnabled ? 'Enabled' : 'Disabled'}</span>
                </div>
              </div>
              <div style={styles.summaryLine}>{summarizeCondition(rule)}</div>
              <div style={styles.summaryLine}>{summarizeAction(rule)}</div>
              <div style={styles.rowFooter}>
                <span>{rule.affectedTransactionCount} affected transactions</span>
                <div style={styles.footerActions}>
                  <button type="button" style={styles.ghostButton} onClick={() => onToggle(rule)}>
                    {rule.isEnabled ? 'Disable' : 'Enable'}
                  </button>
                  <button type="button" style={styles.ghostButton} onClick={() => onEdit(rule)}>
                    Manage
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

const styles = {
  card: {
    display: 'grid',
    gap: 'var(--space-md)',
    padding: 'var(--space-lg)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)',
    background: 'rgba(245, 241, 232, 0.72)',
    boxShadow: 'var(--shadow-panel)'
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
    margin: 'var(--space-xs) 0 0 0',
    fontSize: 22
  },
  list: {
    display: 'grid',
    gap: 'var(--space-sm)'
  },
  row: {
    display: 'grid',
    gap: 'var(--space-xs)',
    padding: 'var(--space-md)',
    borderRadius: 18,
    background: 'rgba(255, 255, 255, 0.56)',
    border: '1px solid rgba(30, 27, 22, 0.08)'
  },
  rowHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 'var(--space-sm)',
    alignItems: 'center'
  },
  rowFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 'var(--space-sm)',
    alignItems: 'center',
    color: 'var(--color-muted)',
    fontSize: 14
  },
  summaryLine: {
    color: 'var(--color-muted)',
    fontSize: 14
  },
  badges: {
    display: 'flex',
    gap: 'var(--space-xs)',
    flexWrap: 'wrap' as const
  },
  systemBadge: {
    padding: '4px 10px',
    borderRadius: 999,
    background: 'rgba(15, 118, 110, 0.1)',
    color: 'var(--color-accent)',
    fontSize: 12,
    fontWeight: 700
  },
  enabledBadge: {
    padding: '4px 10px',
    borderRadius: 999,
    background: 'rgba(15, 118, 110, 0.1)',
    color: 'var(--color-accent)',
    fontSize: 12,
    fontWeight: 700
  },
  disabledBadge: {
    padding: '4px 10px',
    borderRadius: 999,
    background: 'rgba(30, 27, 22, 0.06)',
    color: 'var(--color-muted)',
    fontSize: 12,
    fontWeight: 700
  },
  footerActions: {
    display: 'flex',
    gap: 'var(--space-xs)'
  },
  primaryButton: {
    minHeight: 40,
    border: 0,
    borderRadius: 999,
    background: 'var(--color-accent)',
    color: '#fff',
    padding: '0 16px',
    fontWeight: 700
  },
  ghostButton: {
    minHeight: 38,
    borderRadius: 999,
    border: '1px solid rgba(30, 27, 22, 0.18)',
    background: 'rgba(30, 27, 22, 0.04)',
    color: 'var(--color-ink)',
    padding: '0 14px',
    fontWeight: 600
  }
} as const
