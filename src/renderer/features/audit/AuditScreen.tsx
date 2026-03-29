import { useEffect, useState } from 'react'
import type { AuditEvent } from '../../../shared/contracts/audit'

type AuditCategory = AuditEvent['category']

const ALL_CATEGORIES: AuditCategory[] = ['security', 'review', 'transaction', 'import', 'settings']

const CATEGORY_LABELS: Record<AuditCategory, string> = {
  security: 'Security',
  review: 'Review',
  transaction: 'Edits',
  import: 'Import',
  settings: 'Settings'
}

function formatTimestamp(iso: string): string {
  try {
    const date = new Date(iso)
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  } catch {
    return iso
  }
}

function describeEvent(event: AuditEvent): string {
  try {
    const meta = JSON.parse(event.metadata) as Record<string, unknown>
    if (typeof meta.description === 'string') return meta.description
    if (typeof meta.action === 'string') return `Action: ${meta.action}`
    if (event.eventType) return event.eventType.replace(/[_:]/g, ' ')
    return 'Event recorded'
  } catch {
    return event.eventType.replace(/[_:]/g, ' ')
  }
}

export const AuditScreen = () => {
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [activeCategories, setActiveCategories] = useState<Set<AuditCategory>>(new Set(ALL_CATEGORIES))

  useEffect(() => {
    setLoading(true)
    void window.walnut
      .getAuditEvents()
      .then((fetched) => {
        setEvents(fetched)
        setLoading(false)
      })
      .catch(() => {
        setError('Could not load audit log: Try restarting the application.')
        setLoading(false)
      })
  }, [])

  const toggleCategory = (category: AuditCategory) => {
    setActiveCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  const filteredEvents = events
    .filter((event) => activeCategories.has(event.category))
    .sort((a, b) => b.timestampISO.localeCompare(a.timestampISO))

  return (
    <div style={styles.root}>
      <div style={styles.header}>
        <h1 style={styles.pageTitle}>Audit Log</h1>
        <p style={styles.pageSubtitle}>A complete chronological record of meaningful events in your workspace.</p>
      </div>

      <div style={styles.filterBar} role="group" aria-label="Filter audit categories">
        {ALL_CATEGORIES.map((category) => {
          const isActive = activeCategories.has(category)
          return (
            <button
              key={category}
              type="button"
              style={{
                ...styles.filterButton,
                ...(isActive ? styles.filterButtonActive : styles.filterButtonInactive)
              }}
              aria-pressed={isActive}
              onClick={() => toggleCategory(category)}
            >
              {isActive ? '\u2713 ' : ''}{CATEGORY_LABELS[category]}
            </button>
          )
        })}
      </div>

      <div style={styles.listContainer}>
        {loading ? (
          <div style={styles.stateContainer} aria-label="loading audit events">
            <p style={styles.stateBody}>Loading audit events\u2026</p>
          </div>
        ) : error ? (
          <div style={styles.stateContainer} role="alert">
            <p style={styles.errorText}>{error}</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div style={styles.stateContainer}>
            <p style={styles.emptyHeading}>No events found</p>
            <p style={styles.emptyBody}>Adjust your filters or interact with the app to see the event ledger.</p>
          </div>
        ) : (
          <ul style={styles.eventList} aria-label="Audit events">
            {filteredEvents.map((event) => (
              <li key={event.id} style={styles.eventRow}>
                <div style={styles.eventRowLeft}>
                  <span style={styles.categoryBadge}>{CATEGORY_LABELS[event.category]}</span>
                  <span style={styles.eventDescription}>{describeEvent(event)}</span>
                </div>
                <time style={styles.eventTimestamp} dateTime={event.timestampISO}>
                  {formatTimestamp(event.timestampISO)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

const styles = {
  root: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 'var(--space-xl)',
    padding: '0 var(--space-xl)',
    maxWidth: 960,
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
    color: 'var(--color-ink)'
  },
  pageSubtitle: {
    fontSize: 14,
    fontWeight: 400,
    lineHeight: 1.5,
    margin: 0,
    color: 'var(--color-muted)'
  },
  filterBar: {
    display: 'flex',
    gap: 'var(--space-sm)',
    flexWrap: 'wrap' as const
  },
  filterButton: {
    padding: '4px 12px',
    borderRadius: 6,
    border: '1px solid',
    fontSize: 12,
    fontWeight: 500,
    lineHeight: 1.4,
    cursor: 'pointer',
    transition: 'background 0.15s, color 0.15s, border-color 0.15s'
  },
  filterButtonActive: {
    background: 'var(--color-accent)',
    color: '#fff',
    borderColor: 'var(--color-accent-strong)'
  },
  filterButtonInactive: {
    background: 'var(--color-surface)',
    color: 'var(--color-ink)',
    borderColor: 'var(--color-border)'
  },
  listContainer: {
    flex: 1
  },
  stateContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'var(--space-2xl) 0',
    gap: 'var(--space-sm)'
  },
  emptyHeading: {
    fontSize: 16,
    fontWeight: 600,
    lineHeight: 1.3,
    margin: 0,
    color: 'var(--color-ink)'
  },
  emptyBody: {
    fontSize: 14,
    fontWeight: 400,
    lineHeight: 1.5,
    margin: 0,
    color: 'var(--color-muted)',
    textAlign: 'center' as const
  },
  stateBody: {
    fontSize: 14,
    fontWeight: 400,
    lineHeight: 1.5,
    margin: 0,
    color: 'var(--color-muted)'
  },
  errorText: {
    fontSize: 14,
    fontWeight: 400,
    lineHeight: 1.5,
    margin: 0,
    color: 'var(--accent-red)'
  },
  eventList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 0
  },
  eventRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 'var(--space-md)',
    borderBottom: '1px solid rgba(30, 27, 22, 0.08)',
    gap: 'var(--space-md)',
    background: 'var(--color-bg)'
  },
  eventRowLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    minWidth: 0,
    flex: 1
  },
  categoryBadge: {
    fontSize: 12,
    fontWeight: 500,
    lineHeight: 1.4,
    padding: '2px 8px',
    borderRadius: 4,
    background: 'var(--color-surface)',
    color: 'var(--color-muted)',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0
  },
  eventDescription: {
    fontSize: 14,
    fontWeight: 400,
    lineHeight: 1.5,
    color: 'var(--color-ink)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const
  },
  eventTimestamp: {
    fontSize: 12,
    fontWeight: 500,
    lineHeight: 1.4,
    color: 'var(--color-muted)',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0
  }
} as const
