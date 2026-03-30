import { useState, useRef } from 'react'
import { GripVertical, ChevronDown, ChevronUp } from 'lucide-react'
import type { CategorizationRuleSummary } from '../../../shared/contracts/categories'

interface RulePaneProps {
  rules: CategorizationRuleSummary[]
  onCreate: () => void
  onEdit: (rule: CategorizationRuleSummary) => void
  onToggle: (rule: CategorizationRuleSummary) => void
  onReorder?: (updatedRules: CategorizationRuleSummary[]) => void
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

const specificityLabel = (score: number) => (score >= 10 ? 'high' : score >= 5 ? 'medium' : 'low')

export const RulePane = ({ rules, onCreate, onEdit, onToggle, onReorder }: RulePaneProps) => {
  const userRules = rules.filter((r) => r.kind === 'user')
  const systemRules = rules.filter((r) => r.kind === 'system')

  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  // Keyboard reorder state
  const [keyboardMoveIndex, setKeyboardMoveIndex] = useState<number | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const handleDragStart = (index: number) => {
    setDragIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDropIndex(index)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (dragIndex === null || dropIndex === null || dragIndex === dropIndex) {
      setDragIndex(null)
      setDropIndex(null)
      return
    }

    const reordered = [...userRules]
    const [moved] = reordered.splice(dragIndex, 1)
    reordered.splice(dropIndex, 0, moved)

    setDragIndex(null)
    setDropIndex(null)

    // Optimistic update + IPC
    if (onReorder) {
      onReorder([...reordered, ...systemRules])
    }
    window.walnut?.reorderRules({ ruleIds: reordered.map((r) => r.id) })
  }

  const handleDragEnd = () => {
    setDragIndex(null)
    setDropIndex(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      if (keyboardMoveIndex === null) {
        setKeyboardMoveIndex(index)
      } else {
        // Confirm move
        if (keyboardMoveIndex !== index) {
          const reordered = [...userRules]
          const [moved] = reordered.splice(keyboardMoveIndex, 1)
          reordered.splice(index, 0, moved)
          if (onReorder) {
            onReorder([...reordered, ...systemRules])
          }
          window.walnut?.reorderRules({ ruleIds: reordered.map((r) => r.id) })
        }
        setKeyboardMoveIndex(null)
      }
    } else if (e.key === 'ArrowUp' && keyboardMoveIndex !== null) {
      e.preventDefault()
      const newIndex = Math.max(0, keyboardMoveIndex - 1)
      const reordered = [...userRules]
      const [moved] = reordered.splice(keyboardMoveIndex, 1)
      reordered.splice(newIndex, 0, moved)
      setKeyboardMoveIndex(newIndex)
      if (onReorder) {
        onReorder([...reordered, ...systemRules])
      }
      window.walnut?.reorderRules({ ruleIds: reordered.map((r) => r.id) })
    } else if (e.key === 'ArrowDown' && keyboardMoveIndex !== null) {
      e.preventDefault()
      const newIndex = Math.min(userRules.length - 1, keyboardMoveIndex + 1)
      const reordered = [...userRules]
      const [moved] = reordered.splice(keyboardMoveIndex, 1)
      reordered.splice(newIndex, 0, moved)
      setKeyboardMoveIndex(newIndex)
      if (onReorder) {
        onReorder([...reordered, ...systemRules])
      }
      window.walnut?.reorderRules({ ruleIds: reordered.map((r) => r.id) })
    } else if (e.key === 'Escape') {
      setKeyboardMoveIndex(null)
    }
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

      <div style={styles.list} ref={listRef}>
        {userRules.map((rule, index) => {
          const isBeingDragged = dragIndex === index
          const isDropTarget = dropIndex === index && dragIndex !== null && dragIndex !== index
          const isKeyboardSelected = keyboardMoveIndex === index

          return (
            <div key={rule.id}>
              {isDropTarget && dropIndex! < (dragIndex ?? 0) && (
                <div style={styles.dropIndicator} aria-hidden="true" />
              )}
              <article
                style={{
                  ...styles.row,
                  opacity: isBeingDragged ? 0.5 : 1,
                  outline: isKeyboardSelected ? '2px solid var(--color-accent)' : undefined,
                  minHeight: 44
                }}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
              >
                <div style={styles.rowHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', flex: 1 }}>
                    <button
                      type="button"
                      style={styles.dragHandle}
                      aria-label={`Drag to reorder ${rule.name}`}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      title="Drag to reorder, or use Space/Enter + arrow keys"
                    >
                      <GripVertical size={16} color="var(--color-muted)" />
                    </button>
                    <strong>{rule.name}</strong>
                  </div>
                  <div style={styles.badges}>
                    <span
                      style={{
                        ...styles.specificityBadge,
                        opacity: specificityLabel(rule.specificityScore) === 'low' ? 0.7 : 1,
                        color: specificityLabel(rule.specificityScore) === 'high' ? 'var(--color-ink)' : 'var(--color-muted)'
                      }}
                      title={`Specificity score: ${rule.specificityScore}. This does not affect execution order — drag to reorder.`}
                      aria-hidden="true"
                    >
                      {specificityLabel(rule.specificityScore)}
                    </span>
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
              {isDropTarget && dropIndex! >= (dragIndex ?? 0) && (
                <div style={styles.dropIndicator} aria-hidden="true" />
              )}
            </div>
          )
        })}

        {systemRules.length > 0 && (
          <>
            <div role="separator" aria-label="System rules (applied last)" style={styles.systemDivider}>
              <hr style={styles.dividerLine} />
              <span>System rules (applied last)</span>
              <hr style={styles.dividerLine} />
            </div>

            {systemRules.map((rule) => (
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
          </>
        )}
      </div>
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
    flexWrap: 'wrap' as const,
    alignItems: 'center'
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
  specificityBadge: {
    fontSize: 12,
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '2px 8px'
  },
  dragHandle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'none',
    border: 'none',
    padding: '4px',
    cursor: 'grab',
    borderRadius: 4,
    flexShrink: 0
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
  },
  systemDivider: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    padding: 'var(--space-sm) 0',
    color: 'var(--color-muted)',
    fontSize: 12
  },
  dividerLine: {
    flex: 1,
    border: 'none',
    borderTop: '1px solid var(--color-border)'
  },
  dropIndicator: {
    height: 2,
    background: 'var(--color-accent)',
    borderRadius: 1,
    margin: '2px 0'
  }
} as const
