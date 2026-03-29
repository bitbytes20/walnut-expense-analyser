import { describe, expect, it } from 'vitest'
import { WalnutRepository } from '../../src/main/persistence/db'

const createRepository = () => new WalnutRepository(':memory:')

const insertTransaction = (db: import('better-sqlite3').Database, id: string) => {
  db.prepare(
    `INSERT INTO imported_transactions (id, import_batch_id, source_file_id, transaction_date_raw,
     transaction_date_sortable, raw_narration, cleaned_description, direction, transaction_signature)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, 'batch-001', 'file-001', '01/01/2024', '2024-01-01', 'Test narration', 'Test description',
    'debit', `sig-${id}`)
}

describe('clearTransactionsAndAudit', () => {
  it('returns { deletedCount } equal to the number of deleted transactions', () => {
    const repo = createRepository()
    const result = repo.clearTransactionsAndAudit()
    expect(result).toHaveProperty('deletedCount')
    expect(typeof result.deletedCount).toBe('number')
    expect(result.deletedCount).toBe(0)
  })

  it('deletes all rows from imported_transactions and returns correct count', () => {
    const repo = createRepository()
    const db = (repo as any).sqlite as import('better-sqlite3').Database
    insertTransaction(db, 'txn-001')

    const result = repo.clearTransactionsAndAudit()
    expect(result.deletedCount).toBe(1)

    const remaining = db.prepare('SELECT COUNT(*) as count FROM imported_transactions').get() as { count: number }
    expect(remaining.count).toBe(0)
  })

  it('deletes audit_events where entity_id matches a transaction id', () => {
    const repo = createRepository()
    const db = (repo as any).sqlite as import('better-sqlite3').Database
    insertTransaction(db, 'txn-002')

    db.prepare(
      `INSERT INTO audit_events (id, timestamp_iso, category, event_type, entity_id, metadata)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run('audit-001', new Date().toISOString(), 'transaction', 'transaction.updated', 'txn-002', '{}')

    repo.clearTransactionsAndAudit()

    const remaining = db.prepare('SELECT COUNT(*) as count FROM audit_events WHERE entity_id = ?').get('txn-002') as { count: number }
    expect(remaining.count).toBe(0)
  })

  it('preserves categories and non-transaction audit events', () => {
    const repo = createRepository()
    const db = (repo as any).sqlite as import('better-sqlite3').Database

    // Insert a non-transaction audit event
    db.prepare(
      `INSERT INTO audit_events (id, timestamp_iso, category, event_type, entity_id, metadata)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run('audit-system', new Date().toISOString(), 'security', 'security.unlock_succeeded', null, '{}')

    repo.clearTransactionsAndAudit()

    const categories = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number }
    expect(categories.count).toBeGreaterThan(0) // starter categories preserved

    const rules = db.prepare('SELECT COUNT(*) as count FROM categorization_rules').get() as { count: number }
    expect(rules.count).toBeGreaterThan(0) // starter rules preserved

    const systemAudit = db.prepare('SELECT COUNT(*) as count FROM audit_events WHERE category = ?').get('security') as { count: number }
    expect(systemAudit.count).toBe(1) // non-transaction audit event preserved
  })
})

describe('fullAppReset', () => {
  it('returns AppShellState with currentView "onboarding" and currentStep "welcome"', () => {
    const repo = createRepository()
    const state = repo.fullAppReset()
    expect(state.currentView).toBe('onboarding')
    expect(state.onboarding.currentStep).toBe('welcome')
  })

  it('wipes and re-seeds categories', () => {
    const repo = createRepository()
    const db = (repo as any).sqlite as import('better-sqlite3').Database

    const before = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number }
    expect(before.count).toBeGreaterThan(0)

    repo.fullAppReset()

    const after = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number }
    expect(after.count).toBeGreaterThan(0)
  })

  it('wipes all audit_events including non-transaction ones', () => {
    const repo = createRepository()
    const db = (repo as any).sqlite as import('better-sqlite3').Database

    db.prepare(
      `INSERT INTO audit_events (id, timestamp_iso, category, event_type, entity_id, metadata)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run('audit-pre', new Date().toISOString(), 'security', 'security.unlock_succeeded', null, '{}')

    repo.fullAppReset()

    const remaining = db.prepare('SELECT COUNT(*) as count FROM audit_events').get() as { count: number }
    expect(remaining.count).toBe(0)
  })

  it('wipes custom app_settings', () => {
    const repo = createRepository()
    const db = (repo as any).sqlite as import('better-sqlite3').Database

    db.prepare(`INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)`).run('custom_key', 'custom_value', new Date().toISOString())

    repo.fullAppReset()

    const remaining = db.prepare('SELECT COUNT(*) as count FROM app_settings WHERE key = ?').get('custom_key') as { count: number }
    expect(remaining.count).toBe(0)
  })
})
