import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { app } from 'electron'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type {
  AppShellState,
  CompleteOnboardingInput,
  OnboardingProgress,
  SaveOnboardingProgressInput
} from '../../shared/contracts/app-state'
import type { AccountProfile, AccountProfileDraft } from '../../shared/contracts/account'
import type {
  CommitImportBatchResult,
  GetImportBatchDetailInput,
  GetReviewQueueInput,
  ImportBatchDetail,
  ImportBatchFileOutcome,
  ImportBatchTransactionGroup,
  ImportAttemptStatus,
  ImportAttemptSummary,
  ListImportHistoryInput,
  NormalizedImportRow,
  PriorImportBatchInspection,
  PriorImportBatchReference,
  ReviewItem,
  ReviewItemEditInput,
  ReviewItemResolutionAction,
  ReviewItemResolutionInput,
  ReviewItemRestoreInput,
  StagedImportFile
} from '../../shared/contracts/import'
import type { LockReason, SecurityEvent, SecurityState } from '../../shared/contracts/security'

const DASHBOARD_STATE = {
  heading: 'Ready for your first import',
  body: 'Add your first ICICI statement to create the account timeline and unlock dashboard insights.',
  primaryActionLabel: 'Import your first statement'
} as const

const defaultOnboardingProgress: OnboardingProgress = {
  currentStep: 'welcome',
  completedSteps: [],
  recoveryConfirmed: false,
  recoverySavedToDevice: false
}

const defaultSecurityState: SecurityState = {
  failedAttempts: 0,
  isLocked: false
}

const nowIso = () => new Date().toISOString()
const singleRowId = 1

interface PersistImportFileInput {
  stagedFile: StagedImportFile
  fileFingerprint: string
  transactionSignatures: string[]
  rows: NormalizedImportRow[]
}

interface PersistImportAttemptInput {
  attemptId: string
  batchId: string
  batchLabel: string
  status: ImportAttemptStatus
  importedAt: string
  accountLabel?: string
  importedFiles: StagedImportFile[]
  rejectedFiles: StagedImportFile[]
  duplicateBlockedFiles: StagedImportFile[]
  acceptedFiles: PersistImportFileInput[]
  reviewItems: ReviewItem[]
  lazyAccountCreated: boolean
}

interface ReviewItemRow extends Record<string, unknown> {
  id: string
  import_attempt_id: string
  batch_id: string
  source_file_id: string | null
  reason_code: string
  severity: string
  state: string
  title: string
  description: string
  snapshot_json: string
  created_at: string
  updated_at: string
  resolution_action?: string | null
  resolution_payload_json?: string | null
  resolved_at?: string | null
  restored_at?: string | null
}

const buildDbPath = () => {
  const configuredPath = process.env.WALNUT_DB_PATH
  if (configuredPath) {
    if (configuredPath !== ':memory:') {
      mkdirSync(dirname(configuredPath), { recursive: true })
    }
    return configuredPath
  }

  const userData = app.getPath('userData')
  const filePath = join(userData, 'walnut.sqlite')
  const fileDir = dirname(filePath)
  if (!existsSync(fileDir)) {
    mkdirSync(fileDir, { recursive: true })
  }
  return filePath
}

export class WalnutRepository {
  private readonly sqlite: Database.Database
  private readonly database

  constructor(dbPath = buildDbPath()) {
    this.sqlite = new Database(dbPath)
    this.database = drizzle(this.sqlite)
    void this.database
    this.bootstrap()
  }

  private bootstrap() {
    this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS onboarding_progress (
        id INTEGER PRIMARY KEY,
        current_step TEXT NOT NULL,
        completed_steps_json TEXT NOT NULL,
        household_name TEXT,
        owner_name TEXT,
        draft_pin TEXT,
        recovery_code TEXT,
        recovery_words_json TEXT,
        recovery_confirmed INTEGER NOT NULL DEFAULT 0,
        recovery_saved_to_device INTEGER NOT NULL DEFAULT 0,
        account_draft_json TEXT,
        completed_at TEXT,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS security_state (
        id INTEGER PRIMARY KEY,
        pin_hash TEXT,
        failed_attempts INTEGER NOT NULL DEFAULT 0,
        cooldown_until TEXT,
        recovery_code_ciphertext TEXT,
        recovery_words_ciphertext TEXT,
        last_unlocked_account_label TEXT,
        is_locked INTEGER NOT NULL DEFAULT 0,
        lock_reason TEXT,
        last_locked_at TEXT,
        last_unlocked_at TEXT,
        recovery_setup_confirmed_at TEXT,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS security_events (
        id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        metadata_json TEXT,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS account_profiles (
        id TEXT PRIMARY KEY,
        bank_name TEXT NOT NULL DEFAULT 'ICICI',
        display_name TEXT NOT NULL,
        account_holder_name TEXT NOT NULL,
        masked_account_number TEXT,
        nickname TEXT,
        base_currency TEXT NOT NULL,
        opening_balance INTEGER,
        opening_balance_date TEXT,
        skipped_during_onboarding INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS import_batches (
        id TEXT PRIMARY KEY,
        batch_label TEXT NOT NULL,
        imported_at TEXT NOT NULL,
        file_count INTEGER NOT NULL,
        transaction_count INTEGER NOT NULL,
        created_account_profile INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS import_attempts (
        id TEXT PRIMARY KEY,
        batch_id TEXT NOT NULL,
        batch_label TEXT NOT NULL,
        status TEXT NOT NULL,
        imported_at TEXT NOT NULL,
        account_label TEXT,
        file_count INTEGER NOT NULL,
        accepted_transaction_count INTEGER NOT NULL,
        blocked_duplicate_count INTEGER NOT NULL,
        unresolved_review_count INTEGER NOT NULL,
        error_count INTEGER NOT NULL,
        last_updated_at TEXT NOT NULL,
        created_account_profile INTEGER NOT NULL DEFAULT 0,
        imported_files_json TEXT NOT NULL,
        rejected_files_json TEXT NOT NULL,
        duplicate_blocked_files_json TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS import_source_files (
        id TEXT PRIMARY KEY,
        import_batch_id TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_extension TEXT NOT NULL,
        file_fingerprint TEXT NOT NULL,
        account_label TEXT,
        statement_period_label TEXT,
        worksheet_name TEXT,
        row_count INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS imported_transactions (
        id TEXT PRIMARY KEY,
        import_batch_id TEXT NOT NULL,
        source_file_id TEXT NOT NULL,
        transaction_date_raw TEXT NOT NULL,
        value_date_raw TEXT,
        raw_narration TEXT NOT NULL,
        cleaned_description TEXT NOT NULL,
        debit_amount_minor INTEGER,
        credit_amount_minor INTEGER,
        running_balance_minor INTEGER,
        direction TEXT NOT NULL,
        reference TEXT,
        transaction_signature TEXT NOT NULL,
        tags_json TEXT
      );
      CREATE TABLE IF NOT EXISTS review_items (
        id TEXT PRIMARY KEY,
        import_attempt_id TEXT NOT NULL,
        batch_id TEXT NOT NULL,
        source_file_id TEXT,
        reason_code TEXT NOT NULL,
        severity TEXT NOT NULL,
        state TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        snapshot_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        resolution_action TEXT,
        resolution_payload_json TEXT,
        resolved_at TEXT,
        restored_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_import_attempts_status_imported_at
        ON import_attempts(status, imported_at DESC);
      CREATE INDEX IF NOT EXISTS idx_import_attempts_batch_id
        ON import_attempts(batch_id);
      CREATE INDEX IF NOT EXISTS idx_review_items_batch_state
        ON review_items(batch_id, state);
      CREATE INDEX IF NOT EXISTS idx_review_items_attempt_id
        ON review_items(import_attempt_id);
    `)

    this.ensureColumn('imported_transactions', 'tags_json', 'TEXT')
    this.ensureColumn('review_items', 'resolution_action', 'TEXT')
    this.ensureColumn('review_items', 'resolution_payload_json', 'TEXT')
    this.ensureColumn('review_items', 'resolved_at', 'TEXT')
    this.ensureColumn('review_items', 'restored_at', 'TEXT')

    const stamp = nowIso()
    this.sqlite
      .prepare(
        `INSERT OR IGNORE INTO onboarding_progress
        (id, current_step, completed_steps_json, recovery_confirmed, recovery_saved_to_device, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(singleRowId, 'welcome', '[]', 0, 0, stamp)
    this.sqlite
      .prepare(
        `INSERT OR IGNORE INTO security_state
        (id, failed_attempts, is_locked, updated_at)
        VALUES (?, ?, ?, ?)`
      )
      .run(singleRowId, 0, 0, stamp)
  }

  private ensureColumn(tableName: string, columnName: string, definition: string) {
    const columns = this.sqlite
      .prepare(`PRAGMA table_info(${tableName})`)
      .all() as Array<{ name: string }>

    if (columns.some((column) => column.name === columnName)) {
      return
    }

    this.sqlite.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition};`)
  }

  loadAppState(): AppShellState {
    const onboardingRow = this.sqlite.prepare('SELECT * FROM onboarding_progress WHERE id = ?').get(singleRowId) as Record<string, unknown>
    const securityRow = this.sqlite.prepare('SELECT * FROM security_state WHERE id = ?').get(singleRowId) as Record<string, unknown>
    const accountRow = this.sqlite.prepare('SELECT * FROM account_profiles ORDER BY updated_at DESC LIMIT 1').get() as Record<string, unknown> | undefined

    const onboarding = this.mapOnboardingRow(onboardingRow)
    const security = this.mapSecurityRow(securityRow)
    const accountProfile = accountRow ? this.mapAccountRow(accountRow) : undefined

    let currentView: AppShellState['currentView'] = 'onboarding'
    if (onboardingRow.completed_at) {
      currentView = security.isLocked || security.pinHash ? 'locked' : 'dashboard'
    }

    return {
      currentView,
      onboarding,
      security,
      accountProfile,
      dashboard: { ...DASHBOARD_STATE }
    }
  }

  saveOnboardingProgress(input: SaveOnboardingProgressInput): AppShellState {
    const current = this.loadAppState().onboarding
    const merged: OnboardingProgress = {
      ...current,
      ...input,
      completedSteps: input.completedSteps ?? current.completedSteps
    }

    this.sqlite
      .prepare(
        `UPDATE onboarding_progress
        SET current_step = ?, completed_steps_json = ?, household_name = ?, owner_name = ?, draft_pin = ?,
            recovery_code = ?, recovery_words_json = ?, recovery_confirmed = ?, recovery_saved_to_device = ?,
            account_draft_json = ?, updated_at = ?
        WHERE id = ?`
      )
      .run(
        merged.currentStep,
        JSON.stringify(merged.completedSteps),
        merged.profile?.householdName ?? null,
        merged.profile?.ownerName ?? null,
        merged.draftPin ?? null,
        merged.recoveryKey?.code ?? null,
        merged.recoveryKey ? JSON.stringify(merged.recoveryKey.words) : null,
        merged.recoveryConfirmed ? 1 : 0,
        merged.recoverySavedToDevice ? 1 : 0,
        merged.accountDraft ? JSON.stringify(merged.accountDraft) : null,
        nowIso(),
        singleRowId
      )

    return this.loadAppState()
  }

  completeOnboarding(input: CompleteOnboardingInput, pinHash: string, recoveryCiphertext: { code: string; words: string }) {
    const current = this.loadAppState()
    const completedSteps = Array.from(new Set([...current.onboarding.completedSteps, 'welcome', 'household-profile', 'pin-setup', 'recovery-key', 'account-profile', 'finish']))
    const stamp = nowIso()

    this.sqlite
      .prepare(
        `UPDATE onboarding_progress
        SET current_step = ?, completed_steps_json = ?, household_name = ?, owner_name = ?, draft_pin = NULL,
            recovery_confirmed = 1, recovery_saved_to_device = 1, account_draft_json = ?, completed_at = ?, updated_at = ?
        WHERE id = ?`
      )
      .run('finish', JSON.stringify(completedSteps), input.profile.householdName, input.profile.ownerName, input.accountDraft ? JSON.stringify(input.accountDraft) : null, stamp, stamp, singleRowId)

    this.sqlite
      .prepare(
        `UPDATE security_state
        SET pin_hash = ?, failed_attempts = 0, cooldown_until = NULL, recovery_code_ciphertext = ?,
            recovery_words_ciphertext = ?, is_locked = 0, lock_reason = NULL, recovery_setup_confirmed_at = ?,
            last_unlocked_at = ?, updated_at = ?
        WHERE id = ?`
      )
      .run(pinHash, recoveryCiphertext.code, recoveryCiphertext.words, stamp, stamp, stamp, singleRowId)

    if (input.accountDraft) {
      this.saveAccountProfile(input.accountDraft)
    }

    return {
      ...this.loadAppState(),
      currentView: 'dashboard'
    }
  }

  saveAccountProfile(draft: AccountProfileDraft) {
    const existing = this.sqlite.prepare('SELECT id, created_at FROM account_profiles ORDER BY updated_at DESC LIMIT 1').get() as { id: string; created_at: string } | undefined
    const stamp = nowIso()
    const id = existing?.id ?? 'account-primary'

    this.sqlite
      .prepare(
        `INSERT INTO account_profiles
        (id, bank_name, display_name, account_holder_name, masked_account_number, nickname, base_currency,
         opening_balance, opening_balance_date, skipped_during_onboarding, created_at, updated_at)
        VALUES (@id, @bank_name, @display_name, @account_holder_name, @masked_account_number, @nickname, @base_currency,
         @opening_balance, @opening_balance_date, @skipped_during_onboarding, @created_at, @updated_at)
        ON CONFLICT(id) DO UPDATE SET
          bank_name = excluded.bank_name,
          display_name = excluded.display_name,
          account_holder_name = excluded.account_holder_name,
          masked_account_number = excluded.masked_account_number,
          nickname = excluded.nickname,
          base_currency = excluded.base_currency,
          opening_balance = excluded.opening_balance,
          opening_balance_date = excluded.opening_balance_date,
          skipped_during_onboarding = excluded.skipped_during_onboarding,
          updated_at = excluded.updated_at`
      )
      .run({
        id,
        bank_name: 'ICICI',
        display_name: draft.displayName,
        account_holder_name: draft.accountHolderName,
        masked_account_number: draft.maskedAccountNumber ?? null,
        nickname: draft.nickname ?? null,
        base_currency: draft.baseCurrency,
        opening_balance: draft.openingBalance ?? null,
        opening_balance_date: draft.openingBalanceDate ?? null,
        skipped_during_onboarding: draft.skippedDuringOnboarding ? 1 : 0,
        created_at: existing?.created_at ?? stamp,
        updated_at: stamp
      })

    const current = this.loadAppState()
    return {
      ...current,
      accountProfile: this.loadAccountProfile()
    }
  }

  loadAccountProfile(): AccountProfile | undefined {
    const row = this.sqlite.prepare('SELECT * FROM account_profiles ORDER BY updated_at DESC LIMIT 1').get() as Record<string, unknown> | undefined
    return row ? this.mapAccountRow(row) : undefined
  }

  updateSecurityState(update: Partial<SecurityState>) {
    const current = this.loadAppState().security
    const merged = { ...current, ...update }
    this.sqlite
      .prepare(
        `UPDATE security_state
        SET pin_hash = ?, failed_attempts = ?, cooldown_until = ?, recovery_code_ciphertext = ?, recovery_words_ciphertext = ?,
            last_unlocked_account_label = ?, is_locked = ?, lock_reason = ?, last_locked_at = ?, last_unlocked_at = ?,
            recovery_setup_confirmed_at = ?, updated_at = ?
        WHERE id = ?`
      )
      .run(
        merged.pinHash ?? null,
        merged.failedAttempts,
        merged.cooldownUntil ?? null,
        merged.recoveryCodeCiphertext ?? null,
        merged.recoveryWordsCiphertext ?? null,
        merged.lastUnlockedAccountLabel ?? null,
        merged.isLocked ? 1 : 0,
        merged.lockReason ?? null,
        merged.lastLockedAt ?? null,
        merged.lastUnlockedAt ?? null,
        merged.recoverySetupConfirmedAt ?? null,
        nowIso(),
        singleRowId
      )
    return this.loadAppState()
  }

  markLocked(reason: LockReason) {
    return this.updateSecurityState({
      isLocked: true,
      lockReason: reason,
      lastLockedAt: nowIso()
    })
  }

  markUnlocked(lastUnlockedAccountLabel?: string) {
    return this.updateSecurityState({
      isLocked: false,
      lockReason: undefined,
      lastUnlockedAt: nowIso(),
      lastUnlockedAccountLabel
    })
  }

  acknowledgeRecoverySaved() {
    const current = this.loadAppState().onboarding
    return this.saveOnboardingProgress({
      currentStep: current.currentStep,
      completedSteps: current.completedSteps,
      profile: current.profile,
      draftPin: current.draftPin,
      recoveryKey: current.recoveryKey,
      recoveryConfirmed: true,
      recoverySavedToDevice: true,
      accountDraft: current.accountDraft
    })
  }

  logSecurityEvent(eventType: string, metadata?: Record<string, unknown>) {
    const event: SecurityEvent = {
      id: crypto.randomUUID(),
      eventType,
      createdAt: nowIso(),
      metadataJson: metadata ? JSON.stringify(metadata) : undefined
    }
    this.sqlite.prepare('INSERT INTO security_events (id, event_type, metadata_json, created_at) VALUES (?, ?, ?, ?)').run(event.id, event.eventType, event.metadataJson ?? null, event.createdAt)
    return event
  }

  getSecurityEvents(): SecurityEvent[] {
    return this.sqlite
      .prepare('SELECT * FROM security_events ORDER BY created_at DESC')
      .all()
      .map((row: unknown) => ({
        id: String((row as Record<string, unknown>).id),
        eventType: String((row as Record<string, unknown>).event_type),
        createdAt: String((row as Record<string, unknown>).created_at),
        metadataJson: (row as Record<string, unknown>).metadata_json ? String((row as Record<string, unknown>).metadata_json) : undefined
      }))
  }

  findDuplicateImportByFingerprint(fileFingerprint: string): PriorImportBatchReference | undefined {
    const row = this.sqlite
      .prepare(
        `SELECT b.id AS prior_batch_id, b.batch_label, b.imported_at, b.file_count, s.file_name
         FROM import_source_files s
         INNER JOIN import_batches b ON b.id = s.import_batch_id
         WHERE s.file_fingerprint = ?
         ORDER BY b.imported_at DESC
         LIMIT 1`
      )
      .get(fileFingerprint) as Record<string, unknown> | undefined

    if (!row) {
      return undefined
    }

    return {
      priorBatchId: String(row.prior_batch_id),
      batchLabel: String(row.batch_label),
      importedAt: String(row.imported_at),
      fileCount: Number(row.file_count),
      matchedFileName: row.file_name ? String(row.file_name) : undefined
    }
  }

  findDuplicateImportByTransactionSignatures(transactionSignatures: string[]): PriorImportBatchReference | undefined {
    if (transactionSignatures.length === 0) {
      return undefined
    }

    const uniqueSignatures = Array.from(new Set(transactionSignatures))
    const placeholders = uniqueSignatures.map(() => '?').join(', ')
    const rows = this.sqlite
      .prepare(
        `SELECT b.id AS prior_batch_id, b.batch_label, b.imported_at, b.file_count, s.file_name, COUNT(DISTINCT t.transaction_signature) AS matched_count
         FROM imported_transactions t
         INNER JOIN import_batches b ON b.id = t.import_batch_id
         INNER JOIN import_source_files s ON s.import_batch_id = b.id
         WHERE t.transaction_signature IN (${placeholders})
         GROUP BY b.id, b.batch_label, b.imported_at, b.file_count, s.file_name
         ORDER BY matched_count DESC, b.imported_at DESC`
      )
      .all(...uniqueSignatures) as Record<string, unknown>[]

    const match = rows.find((row) => Number(row.matched_count) >= uniqueSignatures.length)
    if (!match) {
      return undefined
    }

    return {
      priorBatchId: String(match.prior_batch_id),
      batchLabel: String(match.batch_label),
      importedAt: String(match.imported_at),
      fileCount: Number(match.file_count),
      matchedFileName: match.file_name ? String(match.file_name) : undefined
    }
  }

  inspectPriorImportBatch(priorBatchId: string): PriorImportBatchInspection {
    const batchRow = this.sqlite
      .prepare('SELECT * FROM import_batches WHERE id = ?')
      .get(priorBatchId) as Record<string, unknown> | undefined

    if (!batchRow) {
      throw new Error(`Import batch ${priorBatchId} was not found.`)
    }

    const fileRows = this.sqlite
      .prepare('SELECT file_name FROM import_source_files WHERE import_batch_id = ? ORDER BY created_at ASC')
      .all(priorBatchId) as Record<string, unknown>[]

    return {
      priorBatchId,
      batchLabel: String(batchRow.batch_label),
      importedAt: String(batchRow.imported_at),
      fileCount: Number(batchRow.file_count),
      importedTransactionCount: Number(batchRow.transaction_count),
      fileNames: fileRows.map((row) => String(row.file_name))
    }
  }

  listImportHistory(input?: ListImportHistoryInput): ImportAttemptSummary[] {
    const rows = this.sqlite
      .prepare(
        `SELECT *
         FROM import_attempts
         WHERE (? IS NULL OR status = ?)
         ORDER BY imported_at DESC`
      )
      .all(input?.status ?? null, input?.status ?? null) as Record<string, unknown>[]

    const query = input?.query?.trim().toLowerCase()
    const summaries = rows.map((row) => this.mapImportAttemptSummary(row))
    if (!query) {
      return summaries
    }

    return summaries.filter((summary) =>
      summary.batchLabel.toLowerCase().includes(query) ||
      summary.accountLabel?.toLowerCase().includes(query)
    )
  }

  getImportBatchDetail(input: GetImportBatchDetailInput): ImportBatchDetail {
    const row = this.sqlite
      .prepare(
        `SELECT *
         FROM import_attempts
         WHERE batch_id = ?
         ORDER BY imported_at DESC
         LIMIT 1`
      )
      .get(input.batchId) as Record<string, unknown> | undefined

    if (!row) {
      throw new Error(`Import batch ${input.batchId} was not found.`)
    }

    return this.mapImportBatchDetail(row)
  }

  getReviewQueue(input?: GetReviewQueueInput): ImportBatchDetail[] {
    const batchIds = this.sqlite
      .prepare(
        `SELECT DISTINCT batch_id
         FROM review_items
         WHERE state = ?
           AND (? IS NULL OR batch_id = ?)
         ORDER BY batch_id DESC`
      )
      .all(input?.state ?? 'pending', input?.batchId ?? null, input?.batchId ?? null) as Record<string, unknown>[]

    return batchIds.map((row) => this.getImportBatchDetail({ batchId: String(row.batch_id) }))
  }

  resolveReviewItems(input: ReviewItemResolutionInput): ImportBatchDetail {
    const stamp = nowIso()
    const sanitized = this.sanitizeResolutionInput(input)

    const transaction = this.sqlite.transaction(() => {
      const reviewRows = this.getPendingReviewItemRows(sanitized.batchId, sanitized.reviewItemIds)
      const updateReviewItem = this.sqlite.prepare(
        `UPDATE review_items
         SET state = ?, updated_at = ?, resolution_action = ?, resolution_payload_json = ?, resolved_at = ?, restored_at = NULL
         WHERE id = ?`
      )

      for (const reviewRow of reviewRows) {
        this.applyResolutionEffects(reviewRow, sanitized)
        updateReviewItem.run(
          'resolved',
          stamp,
          sanitized.action,
          JSON.stringify(this.buildResolutionPayload(sanitized)),
          stamp,
          reviewRow.id
        )
        this.insertReviewAuditEvent('review:resolved', {
          action: sanitized.action,
          batchId: sanitized.batchId,
          reviewItemIds: [reviewRow.id]
        }, stamp)
      }

      this.refreshImportAttemptReviewState(sanitized.batchId, stamp)
    })

    transaction()
    return this.getImportBatchDetail({ batchId: sanitized.batchId })
  }

  restoreReviewItems(input: ReviewItemRestoreInput): ImportBatchDetail {
    if (input.reviewItemIds.length === 0) {
      throw new Error('Select at least one review item to restore.')
    }

    const stamp = nowIso()
    const transaction = this.sqlite.transaction(() => {
      const reviewRows = this.sqlite
        .prepare(
          `SELECT *
           FROM review_items
           WHERE batch_id = ?
             AND id IN (${input.reviewItemIds.map(() => '?').join(', ')})
             AND state = ?`
        )
        .all(input.batchId, ...input.reviewItemIds, 'resolved') as ReviewItemRow[]

      if (reviewRows.length !== input.reviewItemIds.length) {
        throw new Error('Only resolved review items from the selected batch can be restored.')
      }

      const updateReviewItem = this.sqlite.prepare(
        `UPDATE review_items
         SET state = ?, updated_at = ?, restored_at = ?
         WHERE id = ?`
      )

      for (const reviewRow of reviewRows) {
        const resolutionAction = reviewRow.resolution_action ?? ''
        if (resolutionAction !== 'discard' && resolutionAction !== 'mark-duplicate') {
          throw new Error('Only discarded or duplicate-marked review items can be restored.')
        }

        updateReviewItem.run('pending', stamp, stamp, reviewRow.id)
        this.insertReviewAuditEvent('review:restored', {
          action: resolutionAction,
          batchId: input.batchId,
          reviewItemIds: [reviewRow.id]
        }, stamp)
      }

      this.refreshImportAttemptReviewState(input.batchId, stamp)
    })

    transaction()
    return this.getImportBatchDetail({ batchId: input.batchId })
  }

  persistImportAttempt(input: PersistImportAttemptInput): CommitImportBatchResult {
    const insertBatch = this.sqlite.prepare(
      `INSERT INTO import_batches (id, batch_label, imported_at, file_count, transaction_count, created_account_profile)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    const insertSourceFile = this.sqlite.prepare(
      `INSERT INTO import_source_files
       (id, import_batch_id, file_name, file_extension, file_fingerprint, account_label, statement_period_label, worksheet_name, row_count, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    const insertTransaction = this.sqlite.prepare(
      `INSERT INTO imported_transactions
       (id, import_batch_id, source_file_id, transaction_date_raw, value_date_raw, raw_narration, cleaned_description,
        debit_amount_minor, credit_amount_minor, running_balance_minor, direction, reference, transaction_signature, tags_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    const insertAttempt = this.sqlite.prepare(
      `INSERT INTO import_attempts
       (id, batch_id, batch_label, status, imported_at, account_label, file_count, accepted_transaction_count,
        blocked_duplicate_count, unresolved_review_count, error_count, last_updated_at, created_account_profile,
        imported_files_json, rejected_files_json, duplicate_blocked_files_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    const insertReviewItem = this.sqlite.prepare(
      `INSERT INTO review_items
       (id, import_attempt_id, batch_id, source_file_id, reason_code, severity, state, title, description, snapshot_json, created_at, updated_at,
        resolution_action, resolution_payload_json, resolved_at, restored_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )

    const importedFiles = input.importedFiles.map((file, index) => ({
      ...file,
      status: 'imported' as const,
      importedTransactionCount: input.acceptedFiles[index]?.rows.length ?? file.importedTransactionCount ?? 0
    }))

    const acceptedTransactionCount = input.acceptedFiles.reduce((sum, file) => sum + file.rows.length, 0)
    const blockedDuplicateCount = input.reviewItems.filter((item) => item.reasonCode === 'duplicate-candidate').length
    const unresolvedReviewCount = input.reviewItems.filter((item) => item.state === 'pending').length
    const errorCount = input.rejectedFiles.length

    const transaction = this.sqlite.transaction(() => {
      insertBatch.run(
        input.batchId,
        input.batchLabel,
        input.importedAt,
        importedFiles.length + input.rejectedFiles.length + input.duplicateBlockedFiles.length,
        acceptedTransactionCount,
        input.lazyAccountCreated ? 1 : 0
      )

      for (const file of input.acceptedFiles) {
        const sourceFileId = file.stagedFile.id
        insertSourceFile.run(
          sourceFileId,
          input.batchId,
          file.stagedFile.fileName,
          file.stagedFile.fileExtension,
          file.fileFingerprint,
          file.stagedFile.accountLabel ?? null,
          file.stagedFile.statementPeriodLabel ?? null,
          file.stagedFile.selectedWorksheetName ?? null,
          file.rows.length,
          input.importedAt
        )

        for (const [index, row] of file.rows.entries()) {
          insertTransaction.run(
            crypto.randomUUID(),
            input.batchId,
            sourceFileId,
            row.transactionDateRaw,
            row.valueDateRaw ?? null,
            row.rawNarration,
            row.cleanedDescription,
            row.debitAmountMinor ?? null,
            row.creditAmountMinor ?? null,
            row.runningBalanceMinor ?? null,
            row.direction,
            row.reference ?? null,
            file.transactionSignatures[index],
            null
          )
        }
      }

      insertAttempt.run(
        input.attemptId,
        input.batchId,
        input.batchLabel,
        input.status,
        input.importedAt,
        input.accountLabel ?? null,
        importedFiles.length + input.rejectedFiles.length + input.duplicateBlockedFiles.length,
        acceptedTransactionCount,
        blockedDuplicateCount,
        unresolvedReviewCount,
        errorCount,
        input.importedAt,
        input.lazyAccountCreated ? 1 : 0,
        JSON.stringify(importedFiles),
        JSON.stringify(input.rejectedFiles),
        JSON.stringify(input.duplicateBlockedFiles)
      )

      for (const reviewItem of input.reviewItems) {
        insertReviewItem.run(
          reviewItem.id,
          input.attemptId,
          input.batchId,
          reviewItem.sourceFileId ?? null,
          reviewItem.reasonCode,
          reviewItem.severity,
          reviewItem.state,
          reviewItem.title,
          reviewItem.description,
          JSON.stringify(reviewItem.snapshot),
          reviewItem.createdAt,
          reviewItem.updatedAt,
          null,
          null,
          null,
          null
        )
      }
    })

    transaction()

    const summary: ImportAttemptSummary = {
      attemptId: input.attemptId,
      batchId: input.batchId,
      status: input.status,
      importedAt: input.importedAt,
      accountLabel: input.accountLabel,
      batchLabel: input.batchLabel,
      fileCount: importedFiles.length + input.rejectedFiles.length + input.duplicateBlockedFiles.length,
      acceptedTransactionCount,
      blockedDuplicateCount,
      unresolvedReviewCount,
      errorCount,
      lastUpdatedAt: input.importedAt
    }

    return {
      attemptId: input.attemptId,
      batchId: input.batchId,
      status: input.status,
      importedAt: input.importedAt,
      importedFiles,
      rejectedFiles: input.rejectedFiles,
      duplicateBlockedFiles: input.duplicateBlockedFiles,
      transactionsCreated: acceptedTransactionCount,
      acceptedTransactionCount,
      blockedDuplicateCount,
      reviewItems: input.reviewItems,
      summary,
      lazyAccountCreated: input.lazyAccountCreated
    }
  }

  persistImportBatch(files: PersistImportFileInput[]): CommitImportBatchResult {
    const importedAt = nowIso()
    const batchId = crypto.randomUUID()
    const attemptId = crypto.randomUUID()
    const batchLabel = files[0]?.stagedFile.statementPeriodLabel
      ? `ICICI import ${files[0].stagedFile.statementPeriodLabel}`
      : `ICICI import ${importedAt.slice(0, 10)}`
    const lazyAccountCreated = files.length > 0 && this.ensureImportedAccountProfile(files[0]?.stagedFile.accountLabel)

    return this.persistImportAttempt({
      attemptId,
      batchId,
      batchLabel,
      status: files.length > 0 ? 'imported' : 'rejected',
      importedAt,
      accountLabel: files[0]?.stagedFile.accountLabel,
      importedFiles: files.map((file) => file.stagedFile),
      rejectedFiles: [],
      duplicateBlockedFiles: [],
      acceptedFiles: files,
      reviewItems: [],
      lazyAccountCreated
    })
  }

  close() {
    this.sqlite.close()
  }

  private sanitizeResolutionInput(input: ReviewItemResolutionInput) {
    if (input.reviewItemIds.length === 0) {
      throw new Error('Select at least one review item to resolve.')
    }

    if (input.reviewItemIds.length > 1 && input.action === 'edit-before-accept') {
      throw new Error('Edit before accept is only available for a single review item.')
    }

    if (input.action === 'apply-tag' && !input.tag?.trim()) {
      throw new Error('Apply tag requires a tag value.')
    }

    const edits = input.edits ? this.sanitizeReviewEdits(input.edits) : undefined
    return {
      ...input,
      tag: input.tag?.trim(),
      edits
    }
  }

  private sanitizeReviewEdits(edits: ReviewItemEditInput) {
    if (edits.debitAmountMinor !== undefined || edits.creditAmountMinor !== undefined || edits.runningBalanceMinor !== undefined) {
      throw new Error('Review resolution cannot change amount or running balance.')
    }

    return {
      transactionDateRaw: edits.transactionDateRaw,
      cleanedDescription: edits.cleanedDescription?.trim(),
      reference: edits.reference?.trim(),
      tags: edits.tags?.map((tag) => tag.trim()).filter(Boolean)
    }
  }

  private getPendingReviewItemRows(batchId: string, reviewItemIds: string[]) {
    const rows = this.sqlite
      .prepare(
        `SELECT *
         FROM review_items
         WHERE batch_id = ?
           AND id IN (${reviewItemIds.map(() => '?').join(', ')})
           AND state = ?
         ORDER BY created_at ASC`
      )
      .all(batchId, ...reviewItemIds, 'pending') as ReviewItemRow[]

    if (rows.length !== reviewItemIds.length) {
      throw new Error('Only pending review items from the selected batch can be resolved.')
    }

    return rows
  }

  private applyResolutionEffects(
    reviewRow: ReviewItemRow,
    input: ReturnType<WalnutRepository['sanitizeResolutionInput']>
  ) {
    if (!reviewRow.source_file_id) {
      return
    }

    if (input.action === 'edit-before-accept') {
      this.updateImportedTransactionFromReview(reviewRow, input.edits)
      return
    }

    if (input.action === 'apply-tag') {
      this.applyTagToImportedTransaction(reviewRow, input.tag!)
    }
  }

  private updateImportedTransactionFromReview(reviewRow: ReviewItemRow, edits?: ReturnType<WalnutRepository['sanitizeReviewEdits']>) {
    if (!edits) {
      throw new Error('Edit before accept requires editable fields.')
    }

    const snapshot = JSON.parse(String(reviewRow.snapshot_json)) as ReviewItem['snapshot']
    const parsedRow = snapshot.parsedRow
    if (!parsedRow) {
      throw new Error('Review item does not have a parsed row to edit.')
    }

    const transactionRow = this.findImportedTransactionForReview(reviewRow, parsedRow)
    if (!transactionRow) {
      throw new Error('Imported transaction for review item could not be found.')
    }

    const nextTags = edits.tags ?? this.parseTagsJson(transactionRow.tags_json)
    this.sqlite
      .prepare(
        `UPDATE imported_transactions
         SET transaction_date_raw = ?, cleaned_description = ?, reference = ?, tags_json = ?
         WHERE id = ?`
      )
      .run(
        edits.transactionDateRaw ?? String(transactionRow.transaction_date_raw),
        edits.cleanedDescription ?? String(transactionRow.cleaned_description),
        edits.reference ?? (transactionRow.reference ? String(transactionRow.reference) : null),
        JSON.stringify(nextTags),
        String(transactionRow.id)
      )
  }

  private applyTagToImportedTransaction(reviewRow: ReviewItemRow, tag: string) {
    const snapshot = JSON.parse(String(reviewRow.snapshot_json)) as ReviewItem['snapshot']
    const parsedRow = snapshot.parsedRow
    if (!parsedRow) {
      throw new Error('Review item does not have a parsed row to tag.')
    }

    const transactionRow = this.findImportedTransactionForReview(reviewRow, parsedRow)
    if (!transactionRow) {
      throw new Error('Imported transaction for review item could not be found.')
    }

    const nextTags = Array.from(new Set([...this.parseTagsJson(transactionRow.tags_json), tag]))
    this.sqlite
      .prepare('UPDATE imported_transactions SET tags_json = ? WHERE id = ?')
      .run(JSON.stringify(nextTags), String(transactionRow.id))
  }

  private findImportedTransactionForReview(reviewRow: ReviewItemRow, parsedRow: NormalizedImportRow) {
    return this.sqlite
      .prepare(
        `SELECT *
         FROM imported_transactions
         WHERE import_batch_id = ?
           AND source_file_id = ?
           AND transaction_date_raw = ?
           AND cleaned_description = ?
           AND IFNULL(reference, '') = IFNULL(?, '')
         ORDER BY id ASC
         LIMIT 1`
      )
      .get(
        reviewRow.batch_id,
        reviewRow.source_file_id,
        parsedRow.transactionDateRaw,
        parsedRow.cleanedDescription,
        parsedRow.reference ?? null
      ) as Record<string, unknown> | undefined
  }

  private refreshImportAttemptReviewState(batchId: string, updatedAt: string) {
    const unresolved = this.sqlite
      .prepare('SELECT COUNT(*) AS count FROM review_items WHERE batch_id = ? AND state = ?')
      .get(batchId, 'pending') as { count: number }
    const attemptRow = this.sqlite
      .prepare('SELECT status FROM import_attempts WHERE batch_id = ? ORDER BY imported_at DESC LIMIT 1')
      .get(batchId) as { status: ImportAttemptStatus } | undefined

    if (!attemptRow) {
      throw new Error(`Import attempt for batch ${batchId} was not found.`)
    }

    const nextStatus =
      attemptRow.status === 'failed' || attemptRow.status === 'rejected'
        ? attemptRow.status
        : unresolved.count === 0
          ? 'imported'
          : 'needs-review'

    this.sqlite
      .prepare(
        `UPDATE import_attempts
         SET status = ?, unresolved_review_count = ?, last_updated_at = ?
         WHERE batch_id = ?`
      )
      .run(nextStatus, unresolved.count, updatedAt, batchId)
  }

  private insertReviewAuditEvent(eventType: string, metadata: Record<string, unknown>, createdAt: string) {
    this.sqlite
      .prepare('INSERT INTO security_events (id, event_type, metadata_json, created_at) VALUES (?, ?, ?, ?)')
      .run(crypto.randomUUID(), eventType, JSON.stringify(metadata), createdAt)
  }

  private buildResolutionPayload(input: ReturnType<WalnutRepository['sanitizeResolutionInput']>) {
    return {
      action: input.action,
      tag: input.tag,
      edits: input.edits
    }
  }

  private parseTagsJson(value: unknown) {
    if (!value) {
      return [] as string[]
    }

    return JSON.parse(String(value)) as string[]
  }

  private mapImportAttemptSummary(row: Record<string, unknown>): ImportAttemptSummary {
    const batchId = String(row.batch_id)
    const acceptedTransactionCount = this.sqlite
      .prepare('SELECT COUNT(*) AS count FROM imported_transactions WHERE import_batch_id = ?')
      .get(batchId) as { count: number }
    const unresolvedReviewCount = this.sqlite
      .prepare('SELECT COUNT(*) AS count FROM review_items WHERE batch_id = ? AND state = ?')
      .get(batchId, 'pending') as { count: number }
    const importedFiles = JSON.parse(String(row.imported_files_json ?? '[]')) as ImportBatchFileOutcome[]
    const rejectedFiles = JSON.parse(String(row.rejected_files_json ?? '[]')) as ImportBatchFileOutcome[]
    const duplicateBlockedFiles = JSON.parse(String(row.duplicate_blocked_files_json ?? '[]')) as ImportBatchFileOutcome[]
    const persistedStatus = String(row.status) as ImportAttemptStatus
    const status =
      persistedStatus === 'needs-review' && unresolvedReviewCount.count === 0 ? 'imported' : persistedStatus

    return {
      attemptId: String(row.id),
      batchId,
      status,
      importedAt: String(row.imported_at),
      accountLabel: row.account_label ? String(row.account_label) : undefined,
      batchLabel: String(row.batch_label),
      fileCount: importedFiles.length + rejectedFiles.length + duplicateBlockedFiles.length,
      acceptedTransactionCount: acceptedTransactionCount.count,
      blockedDuplicateCount: duplicateBlockedFiles.length,
      unresolvedReviewCount: unresolvedReviewCount.count,
      errorCount: rejectedFiles.length,
      lastUpdatedAt:
        (this.sqlite
          .prepare('SELECT MAX(updated_at) AS last_updated_at FROM review_items WHERE batch_id = ?')
          .get(batchId) as { last_updated_at?: string | null }).last_updated_at ?? String(row.last_updated_at)
    }
  }

  private mapImportBatchDetail(row: Record<string, unknown>): ImportBatchDetail {
    const batchId = String(row.batch_id)
    const reviewRows = this.sqlite
      .prepare(
        `SELECT *
         FROM review_items
         WHERE batch_id = ?
           AND state = ?
         ORDER BY created_at ASC`
      )
      .all(batchId, 'pending') as Record<string, unknown>[]
    const importedFiles = JSON.parse(String(row.imported_files_json ?? '[]')) as StagedImportFile[]
    const rejectedFiles = JSON.parse(String(row.rejected_files_json ?? '[]')) as StagedImportFile[]
    const duplicateBlockedFiles = JSON.parse(String(row.duplicate_blocked_files_json ?? '[]')) as StagedImportFile[]

    return {
      summary: this.mapImportAttemptSummary(row),
      reviewItems: reviewRows.map((reviewRow) => this.mapReviewItem(reviewRow)),
      fileOutcomes: [
        ...importedFiles.map((file) => ({ ...file, outcome: 'imported' as const })),
        ...duplicateBlockedFiles.map((file) => ({ ...file, outcome: 'duplicate-blocked' as const })),
        ...rejectedFiles.map((file) => ({ ...file, outcome: 'rejected' as const }))
      ],
      transactionGroups: this.mapImportBatchTransactionGroups(batchId)
    }
  }

  private mapImportBatchTransactionGroups(batchId: string): ImportBatchTransactionGroup[] {
    const transactionRows = this.sqlite
      .prepare(
        `SELECT t.*, s.file_name
         FROM imported_transactions t
         INNER JOIN import_source_files s ON s.id = t.source_file_id
         WHERE t.import_batch_id = ?
         ORDER BY s.created_at ASC, t.transaction_date_raw ASC, t.id ASC`
      )
      .all(batchId) as Record<string, unknown>[]

    const groups = new Map<string, ImportBatchTransactionGroup>()
    for (const row of transactionRows) {
      const sourceFileId = String(row.source_file_id)
      const existing = groups.get(sourceFileId)
      if (existing) {
        existing.transactions.push(this.mapImportedTransaction(row))
        continue
      }

      groups.set(sourceFileId, {
        sourceFileId,
        sourceFileName: String(row.file_name),
        transactions: [this.mapImportedTransaction(row)]
      })
    }

    return Array.from(groups.values())
  }

  private mapImportedTransaction(row: Record<string, unknown>) {
    return {
      id: String(row.id),
      transactionDateRaw: String(row.transaction_date_raw),
      valueDateRaw: row.value_date_raw ? String(row.value_date_raw) : undefined,
      rawNarration: String(row.raw_narration),
      cleanedDescription: String(row.cleaned_description),
      debitAmountMinor: row.debit_amount_minor === null ? undefined : Number(row.debit_amount_minor),
      creditAmountMinor: row.credit_amount_minor === null ? undefined : Number(row.credit_amount_minor),
      runningBalanceMinor: row.running_balance_minor === null ? undefined : Number(row.running_balance_minor),
      direction: String(row.direction) as NormalizedImportRow['direction'],
      reference: row.reference ? String(row.reference) : undefined,
      tags: this.parseTagsJson(row.tags_json),
      sourceFileId: String(row.source_file_id),
      importBatchId: String(row.import_batch_id)
    }
  }

  private mapReviewItem(row: Record<string, unknown>): ReviewItem {
    return {
      id: String(row.id),
      batchId: String(row.batch_id),
      importAttemptId: String(row.import_attempt_id),
      sourceFileId: row.source_file_id ? String(row.source_file_id) : undefined,
      reasonCode: String(row.reason_code) as ReviewItem['reasonCode'],
      severity: String(row.severity) as ReviewItem['severity'],
      state: String(row.state) as ReviewItem['state'],
      title: String(row.title),
      description: String(row.description),
      snapshot: JSON.parse(String(row.snapshot_json)) as ReviewItem['snapshot'],
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      resolution: {
        batchId: String(row.batch_id),
        reviewItemId: String(row.id)
      }
    }
  }

  private mapOnboardingRow(row: Record<string, unknown>): OnboardingProgress {
    return {
      currentStep: String(row.current_step) as OnboardingProgress['currentStep'],
      completedSteps: JSON.parse(String(row.completed_steps_json ?? '[]')),
      profile: row.household_name || row.owner_name ? { householdName: String(row.household_name ?? ''), ownerName: String(row.owner_name ?? '') } : undefined,
      draftPin: row.draft_pin ? String(row.draft_pin) : undefined,
      recoveryKey: row.recovery_code && row.recovery_words_json ? { code: String(row.recovery_code), words: JSON.parse(String(row.recovery_words_json)) } : undefined,
      recoveryConfirmed: Boolean(row.recovery_confirmed),
      recoverySavedToDevice: Boolean(row.recovery_saved_to_device),
      accountDraft: row.account_draft_json ? JSON.parse(String(row.account_draft_json)) : undefined
    }
  }

  private mapSecurityRow(row: Record<string, unknown>): SecurityState {
    return {
      pinHash: row.pin_hash ? String(row.pin_hash) : undefined,
      failedAttempts: Number(row.failed_attempts ?? 0),
      cooldownUntil: row.cooldown_until ? String(row.cooldown_until) : undefined,
      recoveryCodeCiphertext: row.recovery_code_ciphertext ? String(row.recovery_code_ciphertext) : undefined,
      recoveryWordsCiphertext: row.recovery_words_ciphertext ? String(row.recovery_words_ciphertext) : undefined,
      lastUnlockedAccountLabel: row.last_unlocked_account_label ? String(row.last_unlocked_account_label) : undefined,
      isLocked: Boolean(row.is_locked),
      lockReason: row.lock_reason ? (String(row.lock_reason) as LockReason) : undefined,
      lastLockedAt: row.last_locked_at ? String(row.last_locked_at) : undefined,
      lastUnlockedAt: row.last_unlocked_at ? String(row.last_unlocked_at) : undefined,
      recoverySetupConfirmedAt: row.recovery_setup_confirmed_at ? String(row.recovery_setup_confirmed_at) : undefined
    }
  }

  private mapAccountRow(row: Record<string, unknown>): AccountProfile {
    return {
      id: String(row.id),
      bankName: 'ICICI',
      displayName: String(row.display_name),
      accountHolderName: String(row.account_holder_name),
      maskedAccountNumber: row.masked_account_number ? String(row.masked_account_number) : undefined,
      nickname: row.nickname ? String(row.nickname) : undefined,
      baseCurrency: String(row.base_currency),
      openingBalance: row.opening_balance === null || row.opening_balance === undefined ? undefined : Number(row.opening_balance),
      openingBalanceDate: row.opening_balance_date ? String(row.opening_balance_date) : undefined,
      skippedDuringOnboarding: Boolean(row.skipped_during_onboarding),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    }
  }

  private ensureImportedAccountProfile(accountLabel?: string) {
    const existing = this.loadAccountProfile()
    if (existing) {
      return false
    }

    const onboardingProfile = this.loadAppState().onboarding.profile
    const parsedHolderName = accountLabel?.includes(' - ') ? accountLabel.split(' - ').slice(1).join(' - ').trim() : undefined

    this.saveAccountProfile({
      bankName: 'ICICI',
      displayName: accountLabel?.split(' - ')[0]?.trim() || 'Primary ICICI',
      accountHolderName: parsedHolderName || onboardingProfile?.ownerName || 'Walnut Owner',
      baseCurrency: 'INR',
      skippedDuringOnboarding: true
    })

    return true
  }
}

let repositoryInstance: WalnutRepository | undefined

export const getWalnutRepository = () => {
  repositoryInstance ??= new WalnutRepository()
  return repositoryInstance
}
