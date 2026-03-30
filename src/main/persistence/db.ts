import Database from 'better-sqlite3'
import {
  addDays,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays
} from 'date-fns'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { app } from 'electron'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type {
  AppConfig,
  AppShellState,
  BackupPayload,
  ClearTransactionsResult,
  CompleteOnboardingInput,
  DeviceProfileSummary,
  OnboardingProgress,
  SaveOnboardingProgressInput
} from '../../shared/contracts/app-state'
import type { AccountProfile, AccountProfileDraft } from '../../shared/contracts/account'
import type {
  DashboardPreferences,
  DashboardRangePreset,
  DashboardRecurringDetail,
  DashboardRecurringDetailInput,
  DashboardRecurringItem,
  DashboardSnapshot,
  DashboardSnapshotQuery,
  DashboardTrendPoint
} from '../../shared/contracts/dashboard'
import type {
  ApplyRuleToExistingInput,
  CategoryDirection,
  CategoryTreeNode,
  CategorizationRuleAction,
  CategorizationRuleCondition,
  CategorizationRuleSummary,
  CreateCategoryInput,
  CreateCategorizationRuleInput,
  DeleteCategoryInput,
  DeleteCategorizationRuleInput,
  MergeCategoryInput,
  RuleApplyPreview,
  RulePreviewInput,
  RulePreviewSample,
  RuleTestPreview,
  ToggleCategorizationRuleInput,
  UpdateCategoryInput,
  UpdateCategorizationRuleInput
} from '../../shared/contracts/categories'
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
import type { AuditEvent } from '../../shared/contracts/audit'
import type {
  BulkUpdateTransactionsInput,
  BulkUpdateTransactionsResult,
  DeleteFilterPresetInput,
  FilterPreset,
  GetTransactionDetailInput,
  RenameFilterPresetInput,
  SaveFilterPresetInput,
  TransactionDetail,
  TransactionLedgerQuery,
  TransactionLedgerRow,
  TransactionNormalizedType,
  TransactionReviewState,
  TransactionRuleSuggestion,
  UpdateTransactionInput,
  UpdateTransactionResult
} from '../../shared/contracts/transactions'

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

interface SeedCategoryDefinition {
  id: string
  name: string
  parentId?: string
  isIncomeCategory?: boolean
  sortOrder: number
}

const categoryId = (slug: string) => `cat:${slug}`
const ruleId = (slug: string) => `rule:${slug}`

const systemCategorySeeds: SeedCategoryDefinition[] = [
  { id: categoryId('food-dining'), name: 'Food & Dining', sortOrder: 10 },
  { id: categoryId('groceries'), name: 'Groceries', sortOrder: 20 },
  { id: categoryId('shopping'), name: 'Shopping', sortOrder: 30 },
  { id: categoryId('bills-utilities'), name: 'Bills & Utilities', sortOrder: 40 },
  { id: categoryId('rent-housing'), name: 'Rent / Housing', sortOrder: 50 },
  { id: categoryId('transport'), name: 'Transport', sortOrder: 60 },
  { id: categoryId('travel'), name: 'Travel', sortOrder: 70 },
  { id: categoryId('healthcare'), name: 'Healthcare', sortOrder: 80 },
  { id: categoryId('entertainment'), name: 'Entertainment', sortOrder: 90 },
  { id: categoryId('education'), name: 'Education', sortOrder: 100 },
  { id: categoryId('insurance'), name: 'Insurance', sortOrder: 110 },
  { id: categoryId('taxes-fees'), name: 'Taxes & Fees', sortOrder: 120 },
  { id: categoryId('cash-atm'), name: 'Cash / ATM', sortOrder: 130 },
  { id: categoryId('transfers'), name: 'Transfers', sortOrder: 140 },
  { id: categoryId('credit-card-payment'), name: 'Credit Card Payment', sortOrder: 150 },
  { id: categoryId('income'), name: 'Income', sortOrder: 160, isIncomeCategory: true },
  { id: categoryId('refunds-reimbursements'), name: 'Refunds / Reimbursements', sortOrder: 170, isIncomeCategory: true },
  { id: categoryId('investments-savings'), name: 'Investments / Savings', sortOrder: 180 },
  { id: categoryId('uncategorized'), name: 'Uncategorized', sortOrder: 190 },
  { id: categoryId('income-salary'), name: 'Salary', parentId: categoryId('income'), sortOrder: 161, isIncomeCategory: true },
  { id: categoryId('income-business'), name: 'Business Income', parentId: categoryId('income'), sortOrder: 162, isIncomeCategory: true },
  { id: categoryId('income-interest'), name: 'Interest', parentId: categoryId('income'), sortOrder: 163, isIncomeCategory: true },
  {
    id: categoryId('income-refund-reimbursement'),
    name: 'Refund / Reimbursement Income',
    parentId: categoryId('income'),
    sortOrder: 164,
    isIncomeCategory: true
  },
  {
    id: categoryId('income-investment'),
    name: 'Investment Income',
    parentId: categoryId('income'),
    sortOrder: 165,
    isIncomeCategory: true
  },
  { id: categoryId('income-other'), name: 'Other Income', parentId: categoryId('income'), sortOrder: 166, isIncomeCategory: true }
]

const starterRuleSeeds: Array<{
  id: string
  name: string
  condition: CategorizationRuleCondition
  action: CategorizationRuleAction
  sortOrder: number
}> = [
  {
    id: ruleId('salary-credit'),
    name: 'Salary credit',
    condition: {
      descriptionContains: ['salary'],
      transactionTypes: ['income'],
      tags: [],
      directions: ['credit']
    },
    action: {
      categoryId: categoryId('income-salary'),
      type: 'income',
      appendTags: ['salary']
    },
    sortOrder: 10
  },
  {
    id: ruleId('atm-withdrawal'),
    name: 'ATM withdrawal',
    condition: {
      descriptionContains: ['atm'],
      transactionTypes: ['atm-withdrawal'],
      tags: [],
      directions: ['debit']
    },
    action: {
      categoryId: categoryId('cash-atm'),
      type: 'atm-withdrawal',
      appendTags: ['cash']
    },
    sortOrder: 20
  },
  {
    id: ruleId('credit-card-payment'),
    name: 'Credit card payment',
    condition: {
      descriptionContains: ['card payment'],
      transactionTypes: ['credit-card-payment'],
      tags: [],
      directions: ['debit']
    },
    action: {
      categoryId: categoryId('credit-card-payment'),
      type: 'credit-card-payment',
      appendTags: []
    },
    sortOrder: 30
  }
]

const toSortableDateKey = (raw: string) => {
  const trimmed = raw.trim()
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed)
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`
  }

  const slashMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed)
  if (slashMatch) {
    const [, day, month, year] = slashMatch
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  return trimmed
}

const getSignedAmountMinor = (row: {
  debit_amount_minor?: unknown
  credit_amount_minor?: unknown
  debitAmountMinor?: unknown
  creditAmountMinor?: unknown
}) => {
  const debit = row.debit_amount_minor ?? row.debitAmountMinor
  const credit = row.credit_amount_minor ?? row.creditAmountMinor
  if (credit !== null && credit !== undefined) {
    return Number(credit)
  }

  return -Math.abs(Number(debit ?? 0))
}

const extractRuleKeywords = (description: string) =>
  description
    .split(/[\s/:-]+/)
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token.length >= 3)
    .slice(0, 3)

const detailDescriptionToRuleName = (description: string) =>
  description
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 40)

const deriveNormalizedType = (row: {
  cleanedDescription: string
  rawNarration: string
  reference?: string
  direction: 'debit' | 'credit'
}): TransactionNormalizedType => {
  const text = `${row.cleanedDescription} ${row.rawNarration} ${row.reference ?? ''}`.toLowerCase()

  if (text.includes('atm')) {
    return 'atm-withdrawal'
  }

  if (text.includes('refund') && row.direction === 'credit') {
    return 'refund'
  }

  if (
    text.includes('credit card payment') ||
    text.includes('card payment') ||
    text.includes('cc payment')
  ) {
    return 'credit-card-payment'
  }

  if (
    text.includes('transfer') ||
    text.includes('imps') ||
    text.includes('neft') ||
    text.includes('rtgs') ||
    text.includes('upi')
  ) {
    return 'transfer'
  }

  return row.direction === 'credit' ? 'income' : 'expense'
}

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

interface DeviceProfileSnapshot {
  onboardingProgress: Record<string, unknown>
  securityState: Record<string, unknown>
  accountProfiles: Record<string, unknown>[]
  importBatches: Record<string, unknown>[]
  importAttempts: Record<string, unknown>[]
  importSourceFiles: Record<string, unknown>[]
  importedTransactions: Record<string, unknown>[]
  reviewItems: Record<string, unknown>[]
  securityEvents: Record<string, unknown>[]
}

const activeProfileKey = 'active_profile_id'
const dashboardPreferencesKey = 'dashboard_preferences'
const appConfigKey = 'app_config'

const defaultAppConfig: AppConfig = {
  theme: 'system',
  idleLockTimeoutMs: 900000,
  featureFlags: { aiSummaries: false }
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
      CREATE TABLE IF NOT EXISTS device_profiles (
        id TEXT PRIMARY KEY,
        household_name TEXT NOT NULL,
        owner_name TEXT NOT NULL,
        account_label TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_unlocked_at TEXT
      );
      CREATE TABLE IF NOT EXISTS device_profile_snapshots (
        profile_id TEXT PRIMARY KEY,
        snapshot_json TEXT NOT NULL,
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
      CREATE TABLE IF NOT EXISTS audit_events (
        id TEXT PRIMARY KEY,
        timestamp_iso TEXT NOT NULL,
        category TEXT NOT NULL,
        event_type TEXT NOT NULL,
        entity_id TEXT,
        metadata TEXT NOT NULL
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
        transaction_date_sortable TEXT,
        value_date_raw TEXT,
        raw_narration TEXT NOT NULL,
        cleaned_description TEXT NOT NULL,
        debit_amount_minor INTEGER,
        credit_amount_minor INTEGER,
        running_balance_minor INTEGER,
        direction TEXT NOT NULL,
        normalized_type TEXT,
        category_id TEXT,
        category_label TEXT,
        review_state_override TEXT,
        reference TEXT,
        transaction_signature TEXT NOT NULL,
        tags_json TEXT
      );
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        parent_id TEXT,
        kind TEXT NOT NULL,
        is_system INTEGER NOT NULL DEFAULT 0,
        is_income_category INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS categorization_rules (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        kind TEXT NOT NULL,
        is_system INTEGER NOT NULL DEFAULT 0,
        is_enabled INTEGER NOT NULL DEFAULT 1,
        condition_json TEXT NOT NULL,
        action_json TEXT NOT NULL,
        specificity_score INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
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
      CREATE INDEX IF NOT EXISTS idx_categories_parent_sort
        ON categories(parent_id, sort_order);
      CREATE INDEX IF NOT EXISTS idx_categorization_rules_enabled
        ON categorization_rules(is_enabled, kind, specificity_score DESC, sort_order ASC);
      CREATE INDEX IF NOT EXISTS idx_review_items_batch_state
        ON review_items(batch_id, state);
      CREATE INDEX IF NOT EXISTS idx_review_items_attempt_id
        ON review_items(import_attempt_id);
      CREATE INDEX IF NOT EXISTS idx_audit_events_timestamp
        ON audit_events(timestamp_iso DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_events_entity
        ON audit_events(entity_id);
      CREATE TABLE IF NOT EXISTS filter_presets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        filters_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `)

    this.ensureColumn('imported_transactions', 'tags_json', 'TEXT')
    this.ensureColumn('imported_transactions', 'transaction_date_sortable', 'TEXT')
    this.ensureColumn('imported_transactions', 'normalized_type', 'TEXT')
    this.ensureColumn('imported_transactions', 'category_id', 'TEXT')
    this.ensureColumn('imported_transactions', 'category_label', 'TEXT')
    this.ensureColumn('imported_transactions', 'review_state_override', 'TEXT')
    this.ensureColumn('categorization_rules', 'sort_order', 'INTEGER NOT NULL DEFAULT 0')
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

    this.seedSystemCategories(stamp)
    this.seedStarterRules(stamp)
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

  private seedSystemCategories(stamp: string) {
    const insertCategory = this.sqlite.prepare(
      `INSERT OR IGNORE INTO categories
       (id, name, parent_id, kind, is_system, is_income_category, is_active, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )

    for (const seed of systemCategorySeeds) {
      insertCategory.run(
        seed.id,
        seed.name,
        seed.parentId ?? null,
        'system',
        1,
        seed.isIncomeCategory ? 1 : 0,
        1,
        seed.sortOrder,
        stamp,
        stamp
      )
    }
  }

  private seedStarterRules(stamp: string) {
    const insertRule = this.sqlite.prepare(
      `INSERT OR IGNORE INTO categorization_rules
       (id, name, kind, is_system, is_enabled, condition_json, action_json, specificity_score, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )

    for (const seed of starterRuleSeeds) {
      insertRule.run(
        seed.id,
        seed.name,
        'system',
        1,
        1,
        JSON.stringify(seed.condition),
        JSON.stringify(seed.action),
        this.computeRuleSpecificity(seed.condition),
        seed.sortOrder,
        stamp,
        stamp
      )
    }
  }

  private getAppSetting(key: string) {
    const row = this.sqlite.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as { value?: string } | undefined
    return row?.value
  }

  private setAppSetting(key: string, value: string | null) {
    if (value === null) {
      this.sqlite.prepare('DELETE FROM app_settings WHERE key = ?').run(key)
      return
    }

    this.sqlite
      .prepare(
        `INSERT INTO app_settings (key, value, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
      )
      .run(key, value, nowIso())
  }

  private getActiveProfileId() {
    return this.getAppSetting(activeProfileKey)
  }

  private setActiveProfileId(profileId?: string) {
    this.setAppSetting(activeProfileKey, profileId ?? null)
  }

  private clearWorkspaceTables() {
    this.sqlite.exec(`
      DELETE FROM account_profiles;
      DELETE FROM import_batches;
      DELETE FROM import_attempts;
      DELETE FROM import_source_files;
      DELETE FROM imported_transactions;
      DELETE FROM review_items;
      DELETE FROM security_events;
    `)
  }

  private resetWorkspaceRows(stamp = nowIso()) {
    this.sqlite
      .prepare(
        `UPDATE onboarding_progress
         SET current_step = ?, completed_steps_json = ?, household_name = NULL, owner_name = NULL, draft_pin = NULL,
             recovery_code = NULL, recovery_words_json = NULL, recovery_confirmed = 0, recovery_saved_to_device = 0,
             account_draft_json = NULL, completed_at = NULL, updated_at = ?
         WHERE id = ?`
      )
      .run(defaultOnboardingProgress.currentStep, JSON.stringify(defaultOnboardingProgress.completedSteps), stamp, singleRowId)

    this.sqlite
      .prepare(
        `UPDATE security_state
         SET pin_hash = NULL, failed_attempts = 0, cooldown_until = NULL, recovery_code_ciphertext = NULL,
             recovery_words_ciphertext = NULL, last_unlocked_account_label = NULL, is_locked = 0, lock_reason = NULL,
             last_locked_at = NULL, last_unlocked_at = NULL, recovery_setup_confirmed_at = NULL, updated_at = ?
         WHERE id = ?`
      )
      .run(stamp, singleRowId)
  }

  private captureWorkspaceSnapshot(): DeviceProfileSnapshot {
    return {
      onboardingProgress: (this.sqlite.prepare('SELECT * FROM onboarding_progress WHERE id = ?').get(singleRowId) as Record<string, unknown>) ?? {},
      securityState: (this.sqlite.prepare('SELECT * FROM security_state WHERE id = ?').get(singleRowId) as Record<string, unknown>) ?? {},
      accountProfiles: this.sqlite.prepare('SELECT * FROM account_profiles ORDER BY updated_at ASC').all() as Record<string, unknown>[],
      importBatches: this.sqlite.prepare('SELECT * FROM import_batches ORDER BY imported_at ASC').all() as Record<string, unknown>[],
      importAttempts: this.sqlite.prepare('SELECT * FROM import_attempts ORDER BY imported_at ASC').all() as Record<string, unknown>[],
      importSourceFiles: this.sqlite.prepare('SELECT * FROM import_source_files ORDER BY created_at ASC').all() as Record<string, unknown>[],
      importedTransactions: this.sqlite.prepare('SELECT * FROM imported_transactions ORDER BY id ASC').all() as Record<string, unknown>[],
      reviewItems: this.sqlite.prepare('SELECT * FROM review_items ORDER BY created_at ASC').all() as Record<string, unknown>[],
      securityEvents: this.sqlite.prepare('SELECT * FROM security_events ORDER BY created_at ASC').all() as Record<string, unknown>[]
    }
  }

  private persistSnapshot(profileId: string, snapshot: DeviceProfileSnapshot, updatedAt = nowIso()) {
    this.sqlite
      .prepare(
        `INSERT INTO device_profile_snapshots (profile_id, snapshot_json, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(profile_id) DO UPDATE SET snapshot_json = excluded.snapshot_json, updated_at = excluded.updated_at`
      )
      .run(profileId, JSON.stringify(snapshot), updatedAt)
  }

  private upsertDeviceProfileSummary(profileId: string, createdAt?: string) {
    const onboardingRow = this.sqlite.prepare('SELECT * FROM onboarding_progress WHERE id = ?').get(singleRowId) as Record<string, unknown>
    const securityRow = this.sqlite.prepare('SELECT * FROM security_state WHERE id = ?').get(singleRowId) as Record<string, unknown>
    const accountRow = this.sqlite.prepare('SELECT * FROM account_profiles ORDER BY updated_at DESC LIMIT 1').get() as Record<string, unknown> | undefined
    const existing = this.sqlite.prepare('SELECT created_at FROM device_profiles WHERE id = ?').get(profileId) as { created_at?: string } | undefined
    const stamp = nowIso()

    const householdName = String(onboardingRow.household_name ?? '').trim()
    const ownerName = String(onboardingRow.owner_name ?? '').trim()
    if (!householdName || !ownerName) {
      return
    }

    this.sqlite
      .prepare(
        `INSERT INTO device_profiles (id, household_name, owner_name, account_label, created_at, updated_at, last_unlocked_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           household_name = excluded.household_name,
           owner_name = excluded.owner_name,
           account_label = excluded.account_label,
           updated_at = excluded.updated_at,
           last_unlocked_at = excluded.last_unlocked_at`
      )
      .run(
        profileId,
        householdName,
        ownerName,
        accountRow?.display_name ? String(accountRow.display_name) : securityRow.last_unlocked_account_label ? String(securityRow.last_unlocked_account_label) : null,
        existing?.created_at ?? createdAt ?? stamp,
        stamp,
        securityRow.last_unlocked_at ? String(securityRow.last_unlocked_at) : null
      )
  }

  private syncActiveProfileSnapshot() {
    const activeProfileId = this.getActiveProfileId()
    if (!activeProfileId) {
      return
    }

    const onboardingRow = this.sqlite.prepare('SELECT completed_at, household_name, owner_name FROM onboarding_progress WHERE id = ?').get(singleRowId) as Record<string, unknown>
    if (!onboardingRow.completed_at || !onboardingRow.household_name || !onboardingRow.owner_name) {
      return
    }

    this.upsertDeviceProfileSummary(activeProfileId)
    this.persistSnapshot(activeProfileId, this.captureWorkspaceSnapshot())
  }

  private ensureLegacyDeviceProfile() {
    const onboardingRow = this.sqlite.prepare('SELECT completed_at, household_name, owner_name FROM onboarding_progress WHERE id = ?').get(singleRowId) as Record<string, unknown>
    if (!onboardingRow.completed_at || !onboardingRow.household_name || !onboardingRow.owner_name) {
      return
    }

    const activeProfileId = this.getActiveProfileId()
    if (activeProfileId) {
      const existingSnapshot = this.sqlite.prepare('SELECT profile_id FROM device_profile_snapshots WHERE profile_id = ?').get(activeProfileId) as { profile_id?: string } | undefined
      if (!existingSnapshot) {
        this.syncActiveProfileSnapshot()
      }
      return
    }

    const profileId = crypto.randomUUID()
    const completedAt = String(onboardingRow.completed_at)
    this.setActiveProfileId(profileId)
    this.upsertDeviceProfileSummary(profileId, completedAt)
    this.persistSnapshot(profileId, this.captureWorkspaceSnapshot(), completedAt)
  }

  private listDeviceProfiles(activeProfileId?: string): DeviceProfileSummary[] {
    const rows = this.sqlite
      .prepare('SELECT * FROM device_profiles ORDER BY updated_at DESC, created_at DESC')
      .all() as Array<Record<string, unknown>>

    return rows.map((row) => ({
      id: String(row.id),
      householdName: String(row.household_name),
      ownerName: String(row.owner_name),
      accountLabel: row.account_label ? String(row.account_label) : undefined,
      lastUnlockedAt: row.last_unlocked_at ? String(row.last_unlocked_at) : undefined,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      isActive: String(row.id) === activeProfileId
    }))
  }

  private restoreWorkspaceSnapshot(snapshot: DeviceProfileSnapshot) {
    this.clearWorkspaceTables()
    this.resetWorkspaceRows()

    const onboarding = snapshot.onboardingProgress
    const security = snapshot.securityState

    this.sqlite
      .prepare(
        `UPDATE onboarding_progress
         SET current_step = ?, completed_steps_json = ?, household_name = ?, owner_name = ?, draft_pin = ?,
             recovery_code = ?, recovery_words_json = ?, recovery_confirmed = ?, recovery_saved_to_device = ?,
             account_draft_json = ?, completed_at = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(
        onboarding.current_step ?? 'welcome',
        JSON.stringify(onboarding.completed_steps_json ? JSON.parse(String(onboarding.completed_steps_json)) : []),
        onboarding.household_name ?? null,
        onboarding.owner_name ?? null,
        onboarding.draft_pin ?? null,
        onboarding.recovery_code ?? null,
        onboarding.recovery_words_json ?? null,
        onboarding.recovery_confirmed ? 1 : 0,
        onboarding.recovery_saved_to_device ? 1 : 0,
        onboarding.account_draft_json ?? null,
        onboarding.completed_at ?? null,
        onboarding.updated_at ?? nowIso(),
        singleRowId
      )

    this.sqlite
      .prepare(
        `UPDATE security_state
         SET pin_hash = ?, failed_attempts = ?, cooldown_until = ?, recovery_code_ciphertext = ?,
             recovery_words_ciphertext = ?, last_unlocked_account_label = ?, is_locked = ?, lock_reason = ?,
             last_locked_at = ?, last_unlocked_at = ?, recovery_setup_confirmed_at = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(
        security.pin_hash ?? null,
        security.failed_attempts ?? 0,
        security.cooldown_until ?? null,
        security.recovery_code_ciphertext ?? null,
        security.recovery_words_ciphertext ?? null,
        security.last_unlocked_account_label ?? null,
        security.is_locked ? 1 : 0,
        security.lock_reason ?? null,
        security.last_locked_at ?? null,
        security.last_unlocked_at ?? null,
        security.recovery_setup_confirmed_at ?? null,
        security.updated_at ?? nowIso(),
        singleRowId
      )

    const insertAccount = this.sqlite.prepare(
      `INSERT INTO account_profiles
       (id, bank_name, display_name, account_holder_name, masked_account_number, nickname, base_currency,
        opening_balance, opening_balance_date, skipped_during_onboarding, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    for (const row of snapshot.accountProfiles) {
      insertAccount.run(
        row.id,
        row.bank_name ?? 'ICICI',
        row.display_name,
        row.account_holder_name,
        row.masked_account_number ?? null,
        row.nickname ?? null,
        row.base_currency,
        row.opening_balance ?? null,
        row.opening_balance_date ?? null,
        row.skipped_during_onboarding ?? 0,
        row.created_at,
        row.updated_at
      )
    }

    const insertImportBatch = this.sqlite.prepare(
      'INSERT INTO import_batches (id, batch_label, imported_at, file_count, transaction_count, created_account_profile) VALUES (?, ?, ?, ?, ?, ?)'
    )
    for (const row of snapshot.importBatches) {
      insertImportBatch.run(row.id, row.batch_label, row.imported_at, row.file_count, row.transaction_count, row.created_account_profile ?? 0)
    }

    const insertImportAttempt = this.sqlite.prepare(
      `INSERT INTO import_attempts
       (id, batch_id, batch_label, status, imported_at, account_label, file_count, accepted_transaction_count, blocked_duplicate_count,
        unresolved_review_count, error_count, last_updated_at, created_account_profile, imported_files_json, rejected_files_json, duplicate_blocked_files_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    for (const row of snapshot.importAttempts) {
      insertImportAttempt.run(
        row.id,
        row.batch_id,
        row.batch_label,
        row.status,
        row.imported_at,
        row.account_label ?? null,
        row.file_count,
        row.accepted_transaction_count,
        row.blocked_duplicate_count,
        row.unresolved_review_count,
        row.error_count,
        row.last_updated_at,
        row.created_account_profile ?? 0,
        row.imported_files_json,
        row.rejected_files_json,
        row.duplicate_blocked_files_json
      )
    }

    const insertSourceFile = this.sqlite.prepare(
      `INSERT INTO import_source_files
       (id, import_batch_id, file_name, file_extension, file_fingerprint, account_label, statement_period_label, worksheet_name, row_count, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    for (const row of snapshot.importSourceFiles) {
      insertSourceFile.run(
        row.id,
        row.import_batch_id,
        row.file_name,
        row.file_extension,
        row.file_fingerprint,
        row.account_label ?? null,
        row.statement_period_label ?? null,
        row.worksheet_name ?? null,
        row.row_count,
        row.created_at
      )
    }

    const insertImportedTransaction = this.sqlite.prepare(
      `INSERT INTO imported_transactions
       (id, import_batch_id, source_file_id, transaction_date_raw, transaction_date_sortable, value_date_raw, raw_narration, cleaned_description,
        debit_amount_minor, credit_amount_minor, running_balance_minor, direction, normalized_type, category_id, category_label, review_state_override, reference, transaction_signature, tags_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    for (const row of snapshot.importedTransactions) {
      insertImportedTransaction.run(
        row.id,
        row.import_batch_id,
        row.source_file_id,
        row.transaction_date_raw,
        row.transaction_date_sortable ?? toSortableDateKey(String(row.transaction_date_raw)),
        row.value_date_raw ?? null,
        row.raw_narration,
        row.cleaned_description,
        row.debit_amount_minor ?? null,
        row.credit_amount_minor ?? null,
        row.running_balance_minor ?? null,
        row.direction,
        row.normalized_type ?? deriveNormalizedType({
          cleanedDescription: String(row.cleaned_description),
          rawNarration: String(row.raw_narration),
          reference: row.reference ? String(row.reference) : undefined,
          direction: String(row.direction) as 'debit' | 'credit'
        }),
        row.category_id ?? null,
        row.category_label ?? null,
        row.review_state_override ?? null,
        row.reference ?? null,
        row.transaction_signature,
        row.tags_json ?? null
      )
    }

    const insertReviewItem = this.sqlite.prepare(
      `INSERT INTO review_items
       (id, import_attempt_id, batch_id, source_file_id, reason_code, severity, state, title, description, snapshot_json,
        created_at, updated_at, resolution_action, resolution_payload_json, resolved_at, restored_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    for (const row of snapshot.reviewItems) {
      insertReviewItem.run(
        row.id,
        row.import_attempt_id,
        row.batch_id,
        row.source_file_id ?? null,
        row.reason_code,
        row.severity,
        row.state,
        row.title,
        row.description,
        row.snapshot_json,
        row.created_at,
        row.updated_at,
        row.resolution_action ?? null,
        row.resolution_payload_json ?? null,
        row.resolved_at ?? null,
        row.restored_at ?? null
      )
    }

    const insertSecurityEvent = this.sqlite.prepare(
      'INSERT INTO security_events (id, event_type, metadata_json, created_at) VALUES (?, ?, ?, ?)'
    )
    for (const row of snapshot.securityEvents) {
      insertSecurityEvent.run(row.id, row.event_type, row.metadata_json ?? null, row.created_at)
    }
  }

  loadAppState(): AppShellState {
    this.ensureLegacyDeviceProfile()
    const onboardingRow = this.sqlite.prepare('SELECT * FROM onboarding_progress WHERE id = ?').get(singleRowId) as Record<string, unknown>
    const securityRow = this.sqlite.prepare('SELECT * FROM security_state WHERE id = ?').get(singleRowId) as Record<string, unknown>
    const accountRow = this.sqlite.prepare('SELECT * FROM account_profiles ORDER BY updated_at DESC LIMIT 1').get() as Record<string, unknown> | undefined
    const activeProfileId = this.getActiveProfileId()

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
      dashboard: { ...DASHBOARD_STATE },
      activeProfileId: activeProfileId ?? undefined,
      deviceProfiles: this.listDeviceProfiles(activeProfileId ?? undefined)
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

    const profileId = this.getActiveProfileId() ?? crypto.randomUUID()
    this.setActiveProfileId(profileId)
    this.syncActiveProfileSnapshot()

    return {
      ...this.loadAppState(),
      currentView: 'dashboard'
    }
  }

  startNewProfileSetup() {
    this.ensureLegacyDeviceProfile()
    this.syncActiveProfileSnapshot()
    this.clearWorkspaceTables()
    this.resetWorkspaceRows()
    this.setActiveProfileId(undefined)

    return {
      ...this.loadAppState(),
      currentView: 'onboarding'
    }
  }

  switchDeviceProfile(profileId: string) {
    this.ensureLegacyDeviceProfile()
    this.syncActiveProfileSnapshot()

    const snapshotRow = this.sqlite
      .prepare('SELECT snapshot_json FROM device_profile_snapshots WHERE profile_id = ?')
      .get(profileId) as { snapshot_json?: string } | undefined

    if (!snapshotRow?.snapshot_json) {
      throw new Error('This local profile is no longer available on the device.')
    }

    const snapshot = JSON.parse(snapshotRow.snapshot_json) as DeviceProfileSnapshot
    this.restoreWorkspaceSnapshot(snapshot)
    this.setActiveProfileId(profileId)

    const stamp = nowIso()
    this.sqlite
      .prepare(
        `UPDATE security_state
         SET is_locked = 1, lock_reason = ?, last_locked_at = ?, updated_at = ?
         WHERE id = ?`
      )
      .run('manual', stamp, stamp, singleRowId)

    this.syncActiveProfileSnapshot()
    return {
      ...this.loadAppState(),
      currentView: 'locked'
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
    const nextState = {
      ...current,
      accountProfile: this.loadAccountProfile()
    }
    this.syncActiveProfileSnapshot()
    return nextState
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
    this.syncActiveProfileSnapshot()
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
    const event: AuditEvent = {
      id: crypto.randomUUID(),
      timestampISO: nowIso(),
      category: 'security',
      eventType,
      metadata: metadata ? JSON.stringify(metadata) : '{}'
    }
    this.sqlite.prepare(
      'INSERT INTO audit_events (id, timestamp_iso, category, event_type, entity_id, metadata) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(event.id, event.timestampISO, event.category, event.eventType, null, event.metadata)
    
    return {
      id: event.id,
      eventType: event.eventType,
      createdAt: event.timestampISO,
      metadataJson: event.metadata === '{}' ? undefined : event.metadata
    } as SecurityEvent
  }

  getAuditEvents(filters?: { category?: string; entityId?: string }): AuditEvent[] {
    let query = 'SELECT * FROM audit_events WHERE 1=1'
    const params: unknown[] = []

    if (filters?.category) {
      query += ' AND category = ?'
      params.push(filters.category)
    }
    if (filters?.entityId) {
      query += ' AND entity_id = ?'
      params.push(filters.entityId)
    }

    query += ' ORDER BY timestamp_iso DESC'

    return this.sqlite
      .prepare(query)
      .all(...params)
      .map((row: unknown) => ({
        id: String((row as Record<string, unknown>).id),
        timestampISO: String((row as Record<string, unknown>).timestamp_iso),
        category: (row as Record<string, unknown>).category as AuditEvent['category'],
        eventType: String((row as Record<string, unknown>).event_type),
        entityId: (row as Record<string, unknown>).entity_id ? String((row as Record<string, unknown>).entity_id) : undefined,
        metadata: String((row as Record<string, unknown>).metadata)
      }))
  }

  getSecurityEvents(): SecurityEvent[] {
    return this.getAuditEvents({ category: 'security' }).map(e => ({
      id: e.id,
      eventType: e.eventType,
      createdAt: e.timestampISO,
      metadataJson: e.metadata === '{}' ? undefined : e.metadata
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

  listTransactions(input?: TransactionLedgerQuery): TransactionLedgerRow[] {
    const rows = this.sqlite
      .prepare(
        `SELECT t.*, s.file_name, a.batch_label, a.imported_at,
            CASE
              WHEN EXISTS (
                SELECT 1
                FROM review_items r
                WHERE r.batch_id = t.import_batch_id
                  AND r.state = 'pending'
              ) THEN 1
              ELSE 0
            END AS has_pending_review
         FROM imported_transactions t
         INNER JOIN import_source_files s ON s.id = t.source_file_id
         INNER JOIN import_attempts a ON a.batch_id = t.import_batch_id
         ORDER BY COALESCE(t.transaction_date_sortable, t.transaction_date_raw) DESC, a.imported_at DESC, t.id DESC`
      )
      .all() as Record<string, unknown>[]

    const query = input ?? {}
    return rows
      .map((row) => this.mapTransactionLedgerRow(row))
      .filter((row) => {
        if (query.search?.trim()) {
          const search = query.search.trim().toLowerCase()
          const haystack = `${row.description} ${row.reference ?? ''} ${row.tags.join(' ')}`.toLowerCase()
          if (!haystack.includes(search)) {
            return false
          }
        }

        if (query.dateFrom && row.transactionDateSortable < toSortableDateKey(query.dateFrom)) {
          return false
        }

        if (query.dateTo && row.transactionDateSortable > toSortableDateKey(query.dateTo)) {
          return false
        }

        if (query.types?.length && !query.types.includes(row.normalizedType)) {
          return false
        }

        if (query.reviewStates?.length && !query.reviewStates.includes(row.reviewState)) {
          return false
        }

        if (query.categories?.length) {
          const normalizedCategories = query.categories.map((category) => category.toLowerCase())
          const categoryValues = [
            row.categoryId?.toLowerCase(),
            row.category?.toLowerCase(),
            ...(row.categoryPath ?? []).map((segment) => segment.toLowerCase())
          ].filter(Boolean)

          if (!normalizedCategories.some((category) => categoryValues.includes(category))) {
            return false
          }
        }

        if (query.tags?.length) {
          const rowTags = row.tags.map((tag) => tag.toLowerCase())
          const requestedTags = query.tags.map((tag) => tag.toLowerCase())
          if (!requestedTags.every((tag) => rowTags.includes(tag))) {
            return false
          }
        }

        const absoluteAmount = Math.abs(row.signedAmountMinor)
        if (query.amountMinMinor !== undefined && absoluteAmount < query.amountMinMinor) {
          return false
        }

        if (query.amountMaxMinor !== undefined && absoluteAmount > query.amountMaxMinor) {
          return false
        }

        return true
      })
  }

  getTransactionDetail(input: GetTransactionDetailInput): TransactionDetail {
    const row = this.sqlite
      .prepare(
        `SELECT t.*, s.file_name, a.batch_label, a.imported_at,
            CASE
              WHEN EXISTS (
                SELECT 1
                FROM review_items r
                WHERE r.batch_id = t.import_batch_id
                  AND r.state = 'pending'
              ) THEN 1
              ELSE 0
            END AS has_pending_review
         FROM imported_transactions t
         INNER JOIN import_source_files s ON s.id = t.source_file_id
         INNER JOIN import_attempts a ON a.batch_id = t.import_batch_id
         WHERE t.id = ?
         LIMIT 1`
      )
      .get(input.transactionId) as Record<string, unknown> | undefined

    if (!row) {
      throw new Error(`Transaction ${input.transactionId} was not found.`)
    }

    return this.mapTransactionDetail(row)
  }

  updateTransaction(input: UpdateTransactionInput): UpdateTransactionResult {
    const current = this.getTransactionDetail({ transactionId: input.transactionId })
    const nextDateRaw = input.transactionDateRaw ?? current.transactionDateRaw
    const nextDescription = input.description?.trim() ?? current.description
    const nextSignedAmountMinor = input.signedAmountMinor ?? current.signedAmountMinor
    const nextDirection = nextSignedAmountMinor >= 0 ? 'credit' : 'debit'
    const nextDebitAmountMinor = nextDirection === 'debit' ? Math.abs(nextSignedAmountMinor) : null
    const nextCreditAmountMinor = nextDirection === 'credit' ? Math.abs(nextSignedAmountMinor) : null
    const nextNormalizedType = input.normalizedType ?? current.normalizedType
    const nextCategoryId =
      input.categoryId === undefined
        ? current.categoryId ?? null
        : input.categoryId
    const nextCategoryPath = this.getCategoryPathById(nextCategoryId)
    const nextCategory = input.category === undefined ? (nextCategoryPath.length ? nextCategoryPath.join(' > ') : current.category ?? null) : input.category
    const nextReference = input.reference === undefined ? current.reference ?? null : input.reference
    const nextTags = input.tags ?? current.tags
    const nextReviewStateOverride =
      input.reviewStateOverride === undefined ? current.reviewStateOverride ?? null : input.reviewStateOverride

    const updateTx = this.sqlite.transaction(() => {
      this.sqlite
        .prepare(
          `UPDATE imported_transactions
           SET transaction_date_raw = ?,
               transaction_date_sortable = ?,
               cleaned_description = ?,
               debit_amount_minor = ?,
               credit_amount_minor = ?,
               direction = ?,
               normalized_type = ?,
               category_id = ?,
               category_label = ?,
               reference = ?,
               tags_json = ?,
               review_state_override = ?
           WHERE id = ?`
        )
        .run(
          nextDateRaw,
          toSortableDateKey(nextDateRaw),
          nextDescription,
          nextDebitAmountMinor,
          nextCreditAmountMinor,
          nextDirection,
          nextNormalizedType,
          nextCategoryId,
          nextCategory,
          nextReference,
          JSON.stringify(nextTags),
          nextReviewStateOverride,
          input.transactionId
        )

      this.sqlite
        .prepare(
          'INSERT INTO audit_events (id, timestamp_iso, category, event_type, entity_id, metadata) VALUES (?, ?, ?, ?, ?, ?)'
        )
        .run(
          crypto.randomUUID(),
          nowIso(),
          'transaction',
          'transaction:edited',
          input.transactionId,
          JSON.stringify({
            before: current,
            after: {
              ...current,
              transactionDateRaw: nextDateRaw,
              transactionDateSortable: toSortableDateKey(nextDateRaw),
              description: nextDescription,
              signedAmountMinor: nextSignedAmountMinor,
              direction: nextDirection,
              normalizedType: nextNormalizedType,
              categoryId: nextCategoryId,
              category: nextCategory,
              reference: nextReference,
              tags: nextTags,
              reviewStateOverride: nextReviewStateOverride
            }
          })
        )
    })
    
    updateTx()

    const detail = this.getTransactionDetail({ transactionId: input.transactionId })
    const ruleSuggestion: TransactionRuleSuggestion | undefined =
      input.normalizedType && input.normalizedType !== current.normalizedType
        ? {
            field: 'type',
            fromType: current.normalizedType,
            toType: input.normalizedType,
            title: 'Create a rule from this type change later',
            description: 'Walnut can use this correction as a reusable rule suggestion.',
            draft: {
              name: `${detailDescriptionToRuleName(nextDescription)} rule`,
              condition: {
                descriptionContains: extractRuleKeywords(nextDescription),
                amountMinMinor: undefined,
                amountMaxMinor: undefined,
                transactionTypes: [current.normalizedType],
                tags: current.tags,
                directions: [current.direction]
              },
              action: {
                categoryId: nextCategoryId ?? undefined,
                type: input.normalizedType,
                appendTags: nextTags
              }
            }
          }
        : undefined

    return {
      detail,
      ruleSuggestion
    }
  }

  bulkUpdateTransactions(input: BulkUpdateTransactionsInput): BulkUpdateTransactionsResult {
    let updatedCount = 0
    const transaction = this.sqlite.transaction(() => {
      for (const transactionId of input.transactionIds) {
        const setParts: string[] = []
        const params: unknown[] = []
        if (input.categoryId !== undefined) {
          setParts.push('category_id = ?')
          params.push(input.categoryId)
        }
        if (input.category !== undefined) {
          setParts.push('category_label = ?')
          params.push(input.category)
        }
        if (input.tags !== undefined) {
          setParts.push('tags_json = ?')
          params.push(JSON.stringify(input.tags))
        }
        if (setParts.length === 0) continue
        params.push(transactionId)
        const result = this.sqlite
          .prepare(`UPDATE imported_transactions SET ${setParts.join(', ')} WHERE id = ?`)
          .run(...(params as Parameters<typeof this.sqlite.prepare>))
        updatedCount += result.changes
      }
    })
    transaction()
    return { updatedCount }
  }

  listFilterPresets(): FilterPreset[] {
    const rows = this.sqlite
      .prepare('SELECT * FROM filter_presets ORDER BY updated_at DESC')
      .all() as Record<string, unknown>[]
    return rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      filters: JSON.parse(String(row.filters_json)) as FilterPreset['filters'],
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    }))
  }

  saveFilterPreset(input: SaveFilterPresetInput): FilterPreset[] {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    this.sqlite
      .prepare('INSERT INTO filter_presets (id, name, filters_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
      .run(id, input.name, JSON.stringify(input.filters), now, now)
    return this.listFilterPresets()
  }

  renameFilterPreset(input: RenameFilterPresetInput): FilterPreset[] {
    const now = new Date().toISOString()
    this.sqlite
      .prepare('UPDATE filter_presets SET name = ?, updated_at = ? WHERE id = ?')
      .run(input.name, now, input.id)
    return this.listFilterPresets()
  }

  deleteFilterPreset(input: DeleteFilterPresetInput): FilterPreset[] {
    this.sqlite.prepare('DELETE FROM filter_presets WHERE id = ?').run(input.id)
    return this.listFilterPresets()
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

  listCategories(): CategoryTreeNode[] {
    return this.buildCategoryTree()
  }

  createCategory(input: CreateCategoryInput): CategoryTreeNode[] {
    const stamp = nowIso()
    const parent = input.parentId ? this.getCategoryRow(input.parentId) : undefined
    if (parent && !parent.is_active) {
      throw new Error('Cannot create a category under an inactive parent.')
    }

    this.sqlite
      .prepare(
        `INSERT INTO categories
         (id, name, parent_id, kind, is_system, is_income_category, is_active, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        crypto.randomUUID(),
        input.name.trim(),
        input.parentId ?? null,
        'user',
        0,
        input.isIncomeCategory ? 1 : 0,
        1,
        this.nextCategorySortOrder(input.parentId),
        stamp,
        stamp
      )

    return this.listCategories()
  }

  updateCategory(input: UpdateCategoryInput): CategoryTreeNode[] {
    const current = this.getCategoryRow(input.categoryId)
    const nextParentId = input.parentId === undefined ? current.parent_id ?? null : input.parentId
    if (current.is_system && (input.parentId !== undefined || input.name !== undefined || input.isActive !== undefined)) {
      throw new Error('System category properties are protected.')
    }

    if (nextParentId) {
      this.assertValidCategoryParent(current.id, nextParentId)
    }

    this.sqlite
      .prepare(
        `UPDATE categories
         SET name = ?, parent_id = ?, is_active = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(
        input.name?.trim() ?? current.name,
        nextParentId,
        input.isActive === undefined ? current.is_active : input.isActive ? 1 : 0,
        nowIso(),
        input.categoryId
      )

    return this.listCategories()
  }

  mergeCategory(input: MergeCategoryInput): CategoryTreeNode[] {
    const source = this.getCategoryRow(input.sourceCategoryId)
    const target = this.getCategoryRow(input.targetCategoryId)
    if (source.is_system) {
      throw new Error('A system category cannot be used as the merge source.')
    }

    this.assertValidCategoryParent(target.id, source.id)

    const transaction = this.sqlite.transaction(() => {
      this.sqlite
        .prepare('UPDATE imported_transactions SET category_id = ?, category_label = ? WHERE category_id = ?')
        .run(
          target.id,
          this.getCategoryPathById(target.id).join(' > '),
          source.id
        )
      this.sqlite.prepare('DELETE FROM categories WHERE id = ?').run(source.id)
    })

    transaction()
    return this.listCategories()
  }

  deleteCategory(input: DeleteCategoryInput): CategoryTreeNode[] {
    const category = this.getCategoryRow(input.categoryId)
    if (category.is_system) {
      throw new Error('Cannot delete a system category.')
    }

    const childCount = Number(
      (
        this.sqlite.prepare('SELECT COUNT(*) as count FROM categories WHERE parent_id = ?').get(input.categoryId) as {
          count?: number
        }
      )?.count ?? 0
    )

    if (childCount > 0) {
      throw new Error('Cannot delete a category that still has subcategories.')
    }

    const mappedCount = Number(
      (
        this.sqlite.prepare('SELECT COUNT(*) as count FROM imported_transactions WHERE category_id = ?').get(input.categoryId) as {
          count?: number
        }
      )?.count ?? 0
    )

    if (mappedCount > 0) {
      throw new Error('Cannot delete a category that is still assigned to transactions.')
    }

    this.sqlite.prepare('DELETE FROM categories WHERE id = ?').run(input.categoryId)
    return this.listCategories()
  }

  listRules(): CategorizationRuleSummary[] {
    const rows = this.sqlite
      .prepare('SELECT * FROM categorization_rules ORDER BY is_system DESC, specificity_score DESC, sort_order ASC, name ASC')
      .all() as Array<Record<string, unknown>>

    return rows.map((row) => this.mapRuleSummary(row))
  }

  createRule(input: CreateCategorizationRuleInput): CategorizationRuleSummary[] {
    const stamp = nowIso()
    this.sqlite
      .prepare(
        `INSERT INTO categorization_rules
         (id, name, kind, is_system, is_enabled, condition_json, action_json, specificity_score, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        crypto.randomUUID(),
        input.name.trim(),
        'user',
        0,
        1,
        JSON.stringify(this.normalizeRuleCondition(input.condition)),
        JSON.stringify(this.normalizeRuleAction(input.action)),
        this.computeRuleSpecificity(input.condition),
        this.nextRuleSortOrder(),
        stamp,
        stamp
      )

    return this.listRules()
  }

  updateRule(input: UpdateCategorizationRuleInput): CategorizationRuleSummary[] {
    const current = this.getRuleRow(input.ruleId)
    const nextCondition = input.condition ? this.normalizeRuleCondition(input.condition) : this.parseRuleCondition(current.condition_json)
    const nextAction = input.action ? this.normalizeRuleAction(input.action) : this.parseRuleAction(current.action_json)

    this.sqlite
      .prepare(
        `UPDATE categorization_rules
         SET name = ?, condition_json = ?, action_json = ?, is_enabled = ?, specificity_score = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(
        input.name?.trim() ?? String(current.name),
        JSON.stringify(nextCondition),
        JSON.stringify(nextAction),
        input.isEnabled === undefined ? current.is_enabled : input.isEnabled ? 1 : 0,
        this.computeRuleSpecificity(nextCondition),
        nowIso(),
        input.ruleId
      )

    return this.listRules()
  }

  toggleRule(input: ToggleCategorizationRuleInput): CategorizationRuleSummary[] {
    this.sqlite
      .prepare('UPDATE categorization_rules SET is_enabled = ?, updated_at = ? WHERE id = ?')
      .run(input.isEnabled ? 1 : 0, nowIso(), input.ruleId)

    return this.listRules()
  }

  deleteRule(input: DeleteCategorizationRuleInput): CategorizationRuleSummary[] {
    const row = this.getRuleRow(input.ruleId)
    if (row.is_system) {
      throw new Error('Cannot delete a system rule.')
    }

    this.sqlite.prepare('DELETE FROM categorization_rules WHERE id = ?').run(input.ruleId)
    return this.listRules()
  }

  testRule(input: RulePreviewInput): RuleTestPreview {
    return this.buildRulePreview(this.normalizeRuleCondition(input.condition), this.normalizeRuleAction(input.action), input.excludeRuleId)
  }

  previewRuleApplyToExisting(input: RulePreviewInput | ApplyRuleToExistingInput): RuleApplyPreview {
    if ('ruleId' in input) {
      const row = this.getRuleRow(input.ruleId)
      return this.buildRulePreview(this.parseRuleCondition(row.condition_json), this.parseRuleAction(row.action_json), input.ruleId)
    }

    return this.buildRulePreview(this.normalizeRuleCondition(input.condition), this.normalizeRuleAction(input.action), input.excludeRuleId)
  }

  applyRuleToExisting(input: ApplyRuleToExistingInput): CategorizationRuleSummary[] {
    const row = this.getRuleRow(input.ruleId)
    const condition = this.parseRuleCondition(row.condition_json)
    const action = this.parseRuleAction(row.action_json)
    const preview = this.buildRulePreview(condition, action, input.ruleId)

    const transaction = this.sqlite.transaction(() => {
      for (const sample of preview.samples) {
        this.applyRuleActionToTransaction(sample.transactionId, action)
      }
      if (preview.matchCount > preview.samples.length) {
        const matches = this.findMatchingTransactions(condition, input.ruleId)
        for (const match of matches) {
          this.applyRuleActionToTransaction(String(match.id), action)
        }
      }
    })

    transaction()
    return this.listRules()
  }

  getDashboardPreferences(): DashboardPreferences {
    const stored = this.getAppSetting(dashboardPreferencesKey)
    if (!stored) {
      return this.getDefaultDashboardPreferences()
    }

    const parsed = JSON.parse(stored) as DashboardPreferences
    return {
      range: {
        preset: parsed.range.preset,
        from: parsed.range.from,
        to: parsed.range.to
      },
      compareEnabled: Boolean(parsed.compareEnabled)
    }
  }

  setDashboardPreferences(input: DashboardPreferences): DashboardPreferences {
    const normalized: DashboardPreferences = {
      range: {
        preset: input.range.preset,
        from: input.range.from,
        to: input.range.to
      },
      compareEnabled: Boolean(input.compareEnabled)
    }
    this.setAppSetting(dashboardPreferencesKey, JSON.stringify(normalized))
    return normalized
  }

  getAppConfig(): AppConfig {
    const stored = this.getAppSetting(appConfigKey)
    if (!stored) return { ...defaultAppConfig, featureFlags: { ...defaultAppConfig.featureFlags } }
    const parsed = JSON.parse(stored) as Partial<AppConfig>
    return {
      ...defaultAppConfig,
      ...parsed,
      featureFlags: {
        ...defaultAppConfig.featureFlags,
        ...(parsed.featureFlags ?? {})
      }
    }
  }

  setAppConfig(input: Partial<AppConfig>): AppConfig {
    const current = this.getAppConfig()
    const updated: AppConfig = {
      ...current,
      ...input,
      featureFlags: {
        ...current.featureFlags,
        ...(input.featureFlags ?? {})
      }
    }
    this.setAppSetting(appConfigKey, JSON.stringify(updated))
    return updated
  }

  exportBackupPayload(): BackupPayload {
    const onboardingRow = this.sqlite
      .prepare('SELECT * FROM onboarding_progress LIMIT 1')
      .get() as Record<string, unknown> | undefined

    // Strip sensitive fields from onboarding
    const onboardingProgress: Record<string, unknown> = {}
    if (onboardingRow) {
      const { pin_hash, recovery_code_ciphertext, recovery_words_ciphertext, draft_pin, recovery_code, recovery_words_json, ...safe } = onboardingRow as Record<string, unknown>
      void pin_hash; void recovery_code_ciphertext; void recovery_words_ciphertext; void draft_pin; void recovery_code; void recovery_words_json
      Object.assign(onboardingProgress, safe)
    }

    const accountProfiles = this.sqlite
      .prepare('SELECT * FROM account_profiles')
      .all() as Record<string, unknown>[]

    const importBatches = this.sqlite
      .prepare('SELECT * FROM import_batches')
      .all() as Record<string, unknown>[]

    const importAttempts = this.sqlite
      .prepare('SELECT * FROM import_attempts')
      .all() as Record<string, unknown>[]

    const importSourceFiles = this.sqlite
      .prepare('SELECT * FROM import_source_files')
      .all() as Record<string, unknown>[]

    const importedTransactions = this.sqlite
      .prepare('SELECT * FROM imported_transactions')
      .all() as Record<string, unknown>[]

    const reviewItems = this.sqlite
      .prepare('SELECT * FROM review_items')
      .all() as Record<string, unknown>[]

    const categories = this.sqlite
      .prepare('SELECT * FROM categories')
      .all() as Record<string, unknown>[]

    const categorizationRules = this.sqlite
      .prepare('SELECT * FROM categorization_rules')
      .all() as Record<string, unknown>[]

    const auditEvents = this.sqlite
      .prepare('SELECT * FROM audit_events')
      .all() as Record<string, unknown>[]

    const appSettingsRaw = this.sqlite
      .prepare('SELECT key, value FROM app_settings')
      .all() as Array<{ key: string; value: string }>

    // Get household name from onboarding progress
    const profileRow = this.sqlite
      .prepare('SELECT * FROM onboarding_progress LIMIT 1')
      .get() as Record<string, unknown> | undefined
    const householdName = profileRow?.household_name ? String(profileRow.household_name) : ''

    const filterPresetsRows = this.sqlite
      .prepare('SELECT * FROM filter_presets')
      .all() as Record<string, unknown>[]

    return {
      version: 1,
      createdAt: new Date().toISOString(),
      householdName,
      tables: {
        onboardingProgress,
        accountProfiles,
        importBatches,
        importAttempts,
        importSourceFiles,
        importedTransactions,
        reviewItems,
        categories,
        categorizationRules,
        auditEvents,
        appSettings: appSettingsRaw,
        filterPresets: filterPresetsRows
      }
    }
  }

  importBackupPayload(payload: BackupPayload): void {
    const transaction = this.sqlite.transaction(() => {
      // Clear all data tables (preserving security_state)
      this.sqlite.exec(`
        DELETE FROM imported_transactions;
        DELETE FROM review_items;
        DELETE FROM import_source_files;
        DELETE FROM import_attempts;
        DELETE FROM import_batches;
        DELETE FROM account_profiles;
        DELETE FROM categories;
        DELETE FROM categorization_rules;
        DELETE FROM audit_events;
        DELETE FROM app_settings;
        DELETE FROM filter_presets;
      `)

      // Insert account profiles
      for (const row of payload.tables.accountProfiles) {
        const keys = Object.keys(row).join(', ')
        const placeholders = Object.keys(row).map(() => '?').join(', ')
        this.sqlite.prepare(`INSERT OR IGNORE INTO account_profiles (${keys}) VALUES (${placeholders})`).run(...Object.values(row))
      }

      // Insert import batches
      for (const row of payload.tables.importBatches) {
        const keys = Object.keys(row).join(', ')
        const placeholders = Object.keys(row).map(() => '?').join(', ')
        this.sqlite.prepare(`INSERT OR IGNORE INTO import_batches (${keys}) VALUES (${placeholders})`).run(...Object.values(row))
      }

      // Insert import attempts
      for (const row of payload.tables.importAttempts) {
        const keys = Object.keys(row).join(', ')
        const placeholders = Object.keys(row).map(() => '?').join(', ')
        this.sqlite.prepare(`INSERT OR IGNORE INTO import_attempts (${keys}) VALUES (${placeholders})`).run(...Object.values(row))
      }

      // Insert import source files
      for (const row of payload.tables.importSourceFiles) {
        const keys = Object.keys(row).join(', ')
        const placeholders = Object.keys(row).map(() => '?').join(', ')
        this.sqlite.prepare(`INSERT OR IGNORE INTO import_source_files (${keys}) VALUES (${placeholders})`).run(...Object.values(row))
      }

      // Insert imported transactions
      for (const row of payload.tables.importedTransactions) {
        const keys = Object.keys(row).join(', ')
        const placeholders = Object.keys(row).map(() => '?').join(', ')
        this.sqlite.prepare(`INSERT OR IGNORE INTO imported_transactions (${keys}) VALUES (${placeholders})`).run(...Object.values(row))
      }

      // Insert review items
      for (const row of payload.tables.reviewItems) {
        const keys = Object.keys(row).join(', ')
        const placeholders = Object.keys(row).map(() => '?').join(', ')
        this.sqlite.prepare(`INSERT OR IGNORE INTO review_items (${keys}) VALUES (${placeholders})`).run(...Object.values(row))
      }

      // Insert categories
      for (const row of payload.tables.categories) {
        const keys = Object.keys(row).join(', ')
        const placeholders = Object.keys(row).map(() => '?').join(', ')
        this.sqlite.prepare(`INSERT OR IGNORE INTO categories (${keys}) VALUES (${placeholders})`).run(...Object.values(row))
      }

      // Insert categorization rules
      for (const row of payload.tables.categorizationRules) {
        const keys = Object.keys(row).join(', ')
        const placeholders = Object.keys(row).map(() => '?').join(', ')
        this.sqlite.prepare(`INSERT OR IGNORE INTO categorization_rules (${keys}) VALUES (${placeholders})`).run(...Object.values(row))
      }

      // Insert audit events
      for (const row of payload.tables.auditEvents) {
        const keys = Object.keys(row).join(', ')
        const placeholders = Object.keys(row).map(() => '?').join(', ')
        this.sqlite.prepare(`INSERT OR IGNORE INTO audit_events (${keys}) VALUES (${placeholders})`).run(...Object.values(row))
      }

      // Insert app settings
      for (const { key, value } of payload.tables.appSettings) {
        this.sqlite
          .prepare(`INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`)
          .run(key, value, new Date().toISOString())
      }

      // Insert filter presets
      if (payload.tables.filterPresets) {
        for (const row of payload.tables.filterPresets) {
          const keys = Object.keys(row).join(', ')
          const placeholders = Object.keys(row).map(() => '?').join(', ')
          this.sqlite.prepare(`INSERT OR IGNORE INTO filter_presets (${keys}) VALUES (${placeholders})`).run(...Object.values(row))
        }
      }
    })

    transaction()
  }

  getDashboardSnapshot(input: DashboardSnapshotQuery): DashboardSnapshot {
    const resolvedQuery = this.resolveDashboardQuery(input)
    const rows = this.listTransactions({
      dateFrom: resolvedQuery.range.from,
      dateTo: resolvedQuery.range.to
    })

    const compareRows =
      resolvedQuery.compare?.enabled && resolvedQuery.compare.from && resolvedQuery.compare.to
        ? this.listTransactions({
            dateFrom: resolvedQuery.compare.from,
            dateTo: resolvedQuery.compare.to
          })
        : []

    const creditedTotalMinor = rows.reduce((total, row) => total + (row.creditAmountMinor ?? 0), 0)
    const debitedTotalMinor = rows.reduce((total, row) => total + (row.debitAmountMinor ?? 0), 0)
    const incomeTotalMinor = rows.reduce(
      (total, row) => total + (row.normalizedType === 'income' || row.normalizedType === 'refund' ? row.creditAmountMinor ?? 0 : 0),
      0
    )
    const expenseTotalMinor = rows.reduce(
      (total, row) =>
        total +
        (row.normalizedType === 'expense' || row.normalizedType === 'atm-withdrawal' || row.normalizedType === 'credit-card-payment'
          ? row.debitAmountMinor ?? 0
          : 0),
      0
    )

    const compareCreditedMinor = compareRows.reduce((total, row) => total + (row.creditAmountMinor ?? 0), 0)
    const compareDebitedMinor = compareRows.reduce((total, row) => total + (row.debitAmountMinor ?? 0), 0)
    const compareIncomeMinor = compareRows.reduce(
      (total, row) => total + (row.normalizedType === 'income' || row.normalizedType === 'refund' ? row.creditAmountMinor ?? 0 : 0),
      0
    )
    const compareExpenseMinor = compareRows.reduce(
      (total, row) =>
        total +
        (row.normalizedType === 'expense' || row.normalizedType === 'atm-withdrawal' || row.normalizedType === 'credit-card-payment'
          ? row.debitAmountMinor ?? 0
          : 0),
      0
    )

    const summaryCards: DashboardSnapshot['summaryCards'] = [
      {
        id: 'credited',
        label: 'Total credited',
        totalMinor: creditedTotalMinor,
        previousTotalMinor: compareRows.length ? compareCreditedMinor : undefined,
        deltaMinor: compareRows.length ? creditedTotalMinor - compareCreditedMinor : undefined,
        trend: this.toTrend(creditedTotalMinor, compareCreditedMinor, compareRows.length > 0),
        helper: 'All credit activity in the selected period.'
      },
      {
        id: 'debited',
        label: 'Total debited',
        totalMinor: debitedTotalMinor,
        previousTotalMinor: compareRows.length ? compareDebitedMinor : undefined,
        deltaMinor: compareRows.length ? debitedTotalMinor - compareDebitedMinor : undefined,
        trend: this.toTrend(debitedTotalMinor, compareDebitedMinor, compareRows.length > 0),
        helper: 'All debit activity in the selected period.'
      },
      {
        id: 'difference',
        label: 'Difference',
        totalMinor: creditedTotalMinor - debitedTotalMinor,
        previousTotalMinor: compareRows.length ? compareCreditedMinor - compareDebitedMinor : undefined,
        deltaMinor:
          compareRows.length ? (creditedTotalMinor - debitedTotalMinor) - (compareCreditedMinor - compareDebitedMinor) : undefined,
        trend: this.toTrend(
          creditedTotalMinor - debitedTotalMinor,
          compareCreditedMinor - compareDebitedMinor,
          compareRows.length > 0
        ),
        helper: 'Credited minus debited for the selected period.'
      },
      {
        id: 'income',
        label: 'Income vs refunds',
        totalMinor: incomeTotalMinor,
        previousTotalMinor: compareRows.length ? compareIncomeMinor : undefined,
        deltaMinor: compareRows.length ? incomeTotalMinor - compareIncomeMinor : undefined,
        trend: this.toTrend(incomeTotalMinor, compareIncomeMinor, compareRows.length > 0),
        helper: 'Income includes refunds and reimbursements.'
      },
      {
        id: 'expense',
        label: 'Spend footprint',
        totalMinor: expenseTotalMinor,
        previousTotalMinor: compareRows.length ? compareExpenseMinor : undefined,
        deltaMinor: compareRows.length ? expenseTotalMinor - compareExpenseMinor : undefined,
        trend: this.toTrend(expenseTotalMinor, compareExpenseMinor, compareRows.length > 0),
        helper: 'Spend includes expenses, ATM withdrawals, and credit-card payments.'
      }
    ]

    const buildOperationalCard = (
      id: 'transfer' | 'refund' | 'atm-withdrawal' | 'credit-card-payment',
      label: string,
      type: TransactionNormalizedType
    ) => {
      const currentTotal = rows.reduce((total, row) => total + (row.normalizedType === type ? Math.abs(row.signedAmountMinor) : 0), 0)
      const previousTotal = compareRows.reduce((total, row) => total + (row.normalizedType === type ? Math.abs(row.signedAmountMinor) : 0), 0)
      const currentCount = rows.filter((row) => row.normalizedType === type).length
      return {
        id,
        label,
        totalMinor: currentTotal,
        transactionCount: currentCount,
        previousTotalMinor: compareRows.length ? previousTotal : undefined,
        deltaMinor: compareRows.length ? currentTotal - previousTotal : undefined,
        trend: this.toTrend(currentTotal, previousTotal, compareRows.length > 0),
        helper: `${currentCount} matching transactions in the selected period.`
      }
    }

    return {
      query: resolvedQuery,
      summaryCards,
      operationalCards: [
        buildOperationalCard('transfer', 'Transfers', 'transfer'),
        buildOperationalCard('refund', 'Refunds', 'refund'),
        buildOperationalCard('atm-withdrawal', 'ATM withdrawals', 'atm-withdrawal'),
        buildOperationalCard('credit-card-payment', 'Credit card payments', 'credit-card-payment')
      ],
      spendTrend: this.buildSpendTrend(rows, compareRows, resolvedQuery.range.preset),
      categoryBreakdown: this.buildCategoryBreakdown(rows, resolvedQuery.range),
      topMerchants: this.buildTopMerchants(rows, resolvedQuery.range),
      largestTransactions: this.buildLargestTransactions(rows, resolvedQuery.range),
      recentTransactions: this.buildRecentTransactions(rows, resolvedQuery.range),
      recurringItems: this.buildRecurringItems(rows, resolvedQuery.range)
    }
  }

  getRecurringDetail(input: DashboardRecurringDetailInput): DashboardRecurringDetail {
    const resolvedQuery = this.resolveDashboardQuery(input.query)
    const rows = this.listTransactions({
      dateFrom: resolvedQuery.range.from,
      dateTo: resolvedQuery.range.to
    })
    const items = this.buildRecurringItems(rows, resolvedQuery.range)
    const item = items.find((candidate) => candidate.id === input.recurringId)
    if (!item) {
      throw new Error(`Recurring pattern ${input.recurringId} was not found.`)
    }

    const transactions = rows
      .filter((row) => this.toRecurringId(row.description, row.normalizedType, row.signedAmountMinor >= 0 ? 'credit' : 'debit') === input.recurringId)
      .sort((left, right) => right.transactionDateSortable.localeCompare(left.transactionDateSortable))
      .slice(0, 12)
      .map((row) => ({
        transactionId: row.id,
        transactionDateRaw: row.transactionDateRaw,
        description: row.description,
        signedAmountMinor: row.signedAmountMinor,
        normalizedType: row.normalizedType
      }))

    return { item, transactions }
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
       (id, import_batch_id, source_file_id, transaction_date_raw, transaction_date_sortable, value_date_raw, raw_narration, cleaned_description,
        debit_amount_minor, credit_amount_minor, running_balance_minor, direction, normalized_type, category_id, category_label, review_state_override, reference, transaction_signature, tags_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
          const normalizedType = deriveNormalizedType({
            cleanedDescription: row.cleanedDescription,
            rawNarration: row.rawNarration,
            reference: row.reference,
            direction: row.direction
          })
          const starterCategorization = this.deriveStarterCategorization({
            description: row.cleanedDescription,
            rawNarration: row.rawNarration,
            direction: row.direction,
            normalizedType,
            signedAmountMinor:
              row.direction === 'credit'
                ? Math.abs(row.creditAmountMinor ?? 0)
                : -Math.abs(row.debitAmountMinor ?? 0),
            tags: []
          })

          insertTransaction.run(
            crypto.randomUUID(),
            input.batchId,
            sourceFileId,
            row.transactionDateRaw,
            toSortableDateKey(row.transactionDateRaw),
            row.valueDateRaw ?? null,
            row.rawNarration,
            row.cleanedDescription,
            row.debitAmountMinor ?? null,
            row.creditAmountMinor ?? null,
            row.runningBalanceMinor ?? null,
            row.direction,
            normalizedType,
            starterCategorization.categoryId ?? null,
            starterCategorization.categoryPath?.join(' > ') ?? null,
            null,
            row.reference ?? null,
            file.transactionSignatures[index],
            JSON.stringify(starterCategorization.tags)
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

      this.sqlite.prepare(
        'INSERT INTO audit_events (id, timestamp_iso, category, event_type, entity_id, metadata) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(
        crypto.randomUUID(),
        input.importedAt,
        'import',
        'import.batch.committed',
        input.batchId,
        JSON.stringify({
          batchId: input.batchId,
          batchLabel: input.batchLabel,
          status: input.status,
          acceptedTransactionCount,
          fileCount: importedFiles.length + input.rejectedFiles.length + input.duplicateBlockedFiles.length,
          rejectedFileCount: input.rejectedFiles.length,
          blockedDuplicateCount,
          unresolvedReviewCount
        })
      )
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
      .prepare(
        'INSERT INTO audit_events (id, timestamp_iso, category, event_type, entity_id, metadata) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run(crypto.randomUUID(), createdAt, 'review', eventType, null, JSON.stringify(metadata))
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

  private normalizeRuleCondition(condition: CategorizationRuleCondition): CategorizationRuleCondition {
    return {
      descriptionContains: (condition.descriptionContains ?? []).map((value) => value.trim()).filter(Boolean),
      amountMinMinor: condition.amountMinMinor,
      amountMaxMinor: condition.amountMaxMinor,
      transactionTypes: condition.transactionTypes ?? [],
      tags: (condition.tags ?? []).map((value) => value.trim()).filter(Boolean),
      directions: condition.directions ?? []
    }
  }

  private normalizeRuleAction(action: CategorizationRuleAction): CategorizationRuleAction {
    return {
      categoryId: action.categoryId,
      type: action.type,
      appendTags: (action.appendTags ?? []).map((value) => value.trim()).filter(Boolean)
    }
  }

  private parseRuleCondition(value: unknown): CategorizationRuleCondition {
    if (!value) {
      return this.normalizeRuleCondition({
        descriptionContains: [],
        transactionTypes: [],
        tags: [],
        directions: []
      })
    }

    return this.normalizeRuleCondition(JSON.parse(String(value)) as CategorizationRuleCondition)
  }

  private parseRuleAction(value: unknown): CategorizationRuleAction {
    if (!value) {
      return this.normalizeRuleAction({ appendTags: [] })
    }

    return this.normalizeRuleAction(JSON.parse(String(value)) as CategorizationRuleAction)
  }

  private computeRuleSpecificity(condition: CategorizationRuleCondition) {
    const normalized = this.normalizeRuleCondition(condition)
    return (
      normalized.descriptionContains.length * 5 +
      normalized.tags.length * 4 +
      normalized.transactionTypes.length * 3 +
      normalized.directions.length * 2 +
      (normalized.amountMinMinor !== undefined ? 1 : 0) +
      (normalized.amountMaxMinor !== undefined ? 1 : 0)
    )
  }

  private getCategoryRow(categoryId: string) {
    const row = this.sqlite.prepare('SELECT * FROM categories WHERE id = ?').get(categoryId) as Record<string, unknown> | undefined
    if (!row) {
      throw new Error(`Category ${categoryId} was not found.`)
    }

    return row
  }

  private getRuleRow(ruleId: string) {
    const row = this.sqlite.prepare('SELECT * FROM categorization_rules WHERE id = ?').get(ruleId) as Record<string, unknown> | undefined
    if (!row) {
      throw new Error(`Rule ${ruleId} was not found.`)
    }

    return row
  }

  private assertValidCategoryParent(categoryId: string, nextParentId: string) {
    if (categoryId === nextParentId) {
      throw new Error('A category cannot be its own parent.')
    }

    let currentParentId: string | undefined = nextParentId
    while (currentParentId) {
      if (currentParentId === categoryId) {
        throw new Error('A category cannot be moved under its own descendant.')
      }

      const row = this.sqlite.prepare('SELECT parent_id FROM categories WHERE id = ?').get(currentParentId) as { parent_id?: string | null } | undefined
      currentParentId = row?.parent_id ?? undefined
    }
  }

  private nextCategorySortOrder(parentId?: string | null) {
    const row = this.sqlite
      .prepare('SELECT COALESCE(MAX(sort_order), 0) as max_sort FROM categories WHERE (? IS NULL AND parent_id IS NULL) OR parent_id = ?')
      .get(parentId ?? null, parentId ?? null) as { max_sort?: number } | undefined
    return Number(row?.max_sort ?? 0) + 1
  }

  private nextRuleSortOrder() {
    const row = this.sqlite.prepare('SELECT COALESCE(MAX(sort_order), 0) as max_sort FROM categorization_rules').get() as { max_sort?: number } | undefined
    return Number(row?.max_sort ?? 0) + 1
  }

  private buildCategoryTree(): CategoryTreeNode[] {
    const rows = this.sqlite.prepare('SELECT * FROM categories ORDER BY sort_order ASC, name ASC').all() as Array<Record<string, unknown>>
    const directCounts = new Map<string, number>()
    const transactionRows = this.sqlite
      .prepare('SELECT category_id, COUNT(*) as count FROM imported_transactions WHERE category_id IS NOT NULL GROUP BY category_id')
      .all() as Array<Record<string, unknown>>

    for (const row of transactionRows) {
      directCounts.set(String(row.category_id), Number(row.count ?? 0))
    }

    const nodes = new Map<string, CategoryTreeNode>()
    for (const row of rows) {
      nodes.set(String(row.id), {
        id: String(row.id),
        name: String(row.name),
        kind: String(row.kind) === 'system' ? 'system' : 'user',
        parentId: row.parent_id ? String(row.parent_id) : undefined,
        path: [],
        isActive: Boolean(row.is_active),
        isIncomeCategory: Boolean(row.is_income_category),
        sortOrder: Number(row.sort_order ?? 0),
        counts: {
          directTransactionCount: directCounts.get(String(row.id)) ?? 0,
          totalTransactionCount: 0
        },
        children: []
      })
    }

    const roots: CategoryTreeNode[] = []
    for (const node of nodes.values()) {
      node.path = this.getCategoryPathFromMap(node.id, nodes)
      if (node.parentId && nodes.has(node.parentId)) {
        nodes.get(node.parentId)!.children.push(node)
      } else {
        roots.push(node)
      }
    }

    const computeTotals = (node: CategoryTreeNode): number => {
      const childTotal = node.children.reduce((total, child) => total + computeTotals(child), 0)
      node.counts.totalTransactionCount = node.counts.directTransactionCount + childTotal
      return node.counts.totalTransactionCount
    }

    roots.forEach(computeTotals)
    return roots.sort((left, right) => left.sortOrder - right.sortOrder)
  }

  private getCategoryPathFromMap(categoryId: string, nodes: Map<string, CategoryTreeNode>) {
    const path: string[] = []
    let current = nodes.get(categoryId)
    while (current) {
      path.unshift(current.name)
      current = current.parentId ? nodes.get(current.parentId) : undefined
    }
    return path
  }

  private getCategoryPathById(categoryId?: string | null) {
    if (!categoryId) {
      return [] as string[]
    }

    const rows = this.sqlite.prepare('SELECT id, name, parent_id, kind, is_active, is_income_category, sort_order FROM categories ORDER BY sort_order ASC, name ASC').all() as Array<Record<string, unknown>>
    const nodes = new Map<string, CategoryTreeNode>()
    for (const row of rows) {
      nodes.set(String(row.id), {
        id: String(row.id),
        name: String(row.name),
        kind: String(row.kind) === 'system' ? 'system' : 'user',
        parentId: row.parent_id ? String(row.parent_id) : undefined,
        path: [],
        isActive: Boolean(row.is_active),
        isIncomeCategory: Boolean(row.is_income_category),
        sortOrder: Number(row.sort_order ?? 0),
        counts: { directTransactionCount: 0, totalTransactionCount: 0 },
        children: []
      })
    }

    return this.getCategoryPathFromMap(categoryId, nodes)
  }

  private findMatchingTransactions(condition: CategorizationRuleCondition, excludeRuleId?: string) {
    const rows = this.sqlite
      .prepare(
        `SELECT t.*, s.file_name, a.batch_label, a.imported_at,
            CASE
              WHEN EXISTS (
                SELECT 1
                FROM review_items r
                WHERE r.batch_id = t.import_batch_id
                  AND r.state = 'pending'
              ) THEN 1
              ELSE 0
            END AS has_pending_review
         FROM imported_transactions t
         INNER JOIN import_source_files s ON s.id = t.source_file_id
         INNER JOIN import_attempts a ON a.batch_id = t.import_batch_id`
      )
      .all() as Array<Record<string, unknown>>

    const normalized = this.normalizeRuleCondition(condition)
    return rows.filter((row) => this.matchesRuleCondition(this.mapTransactionLedgerRow(row), normalized, excludeRuleId))
  }

  private matchesRuleCondition(row: TransactionLedgerRow, condition: CategorizationRuleCondition, excludeRuleId?: string) {
    void excludeRuleId
    const text = row.description.toLowerCase()
    if (condition.descriptionContains.length && !condition.descriptionContains.every((keyword) => text.includes(keyword.toLowerCase()))) {
      return false
    }
    if (condition.amountMinMinor !== undefined && Math.abs(row.signedAmountMinor) < condition.amountMinMinor) {
      return false
    }
    if (condition.amountMaxMinor !== undefined && Math.abs(row.signedAmountMinor) > condition.amountMaxMinor) {
      return false
    }
    if (condition.transactionTypes.length && !condition.transactionTypes.includes(row.normalizedType)) {
      return false
    }
    if (condition.tags.length && !condition.tags.every((tag) => row.tags.includes(tag))) {
      return false
    }
    const direction: CategoryDirection = row.signedAmountMinor >= 0 ? 'credit' : 'debit'
    if (condition.directions.length && !condition.directions.includes(direction)) {
      return false
    }
    return true
  }

  private buildRulePreview(condition: CategorizationRuleCondition, action: CategorizationRuleAction, excludeRuleId?: string): RuleApplyPreview {
    const matches = this.findMatchingTransactions(condition, excludeRuleId)
    const samples = matches.slice(0, 10).map((row) => this.mapRulePreviewSample(row, action))
    return {
      matchCount: matches.length,
      samples
    }
  }

  private mapRulePreviewSample(row: Record<string, unknown> | TransactionLedgerRow, action: CategorizationRuleAction): RulePreviewSample {
    const ledgerRow = 'description' in row && 'normalizedType' in row ? (row as TransactionLedgerRow) : this.mapTransactionLedgerRow(row as Record<string, unknown>)
    const nextCategoryPath = action.categoryId ? this.getCategoryPathById(action.categoryId) : ledgerRow.categoryPath
    return {
      transactionId: ledgerRow.id,
      transactionDateRaw: ledgerRow.transactionDateRaw,
      description: ledgerRow.description,
      signedAmountMinor: ledgerRow.signedAmountMinor,
      currentCategoryPath: ledgerRow.categoryPath,
      nextCategoryPath,
      currentType: ledgerRow.normalizedType,
      nextType: action.type ?? ledgerRow.normalizedType,
      tags: Array.from(new Set([...ledgerRow.tags, ...(action.appendTags ?? [])]))
    }
  }

  private getDefaultDashboardPreferences(): DashboardPreferences {
    const now = new Date()
    return {
      range: {
        preset: 'month',
        from: format(startOfMonth(now), 'yyyy-MM-dd'),
        to: format(endOfMonth(now), 'yyyy-MM-dd')
      },
      compareEnabled: true
    }
  }

  private resolveDashboardQuery(input: DashboardSnapshotQuery): DashboardSnapshotQuery {
    const range = this.resolveDashboardRange(input.range)
    const compare =
      input.compare?.enabled
        ? {
            enabled: true,
            ...this.resolveDashboardCompare(range, input.compare.from, input.compare.to)
          }
        : undefined

    return { range, compare }
  }

  private resolveDashboardRange(range: DashboardSnapshotQuery['range']): DashboardSnapshotQuery['range'] {
    const now = new Date()
    if (range.preset === 'custom') {
      const from = range.from ?? format(startOfMonth(now), 'yyyy-MM-dd')
      const to = range.to ?? format(endOfMonth(now), 'yyyy-MM-dd')
      return { preset: 'custom', from, to }
    }

    if (range.preset === 'all-time') {
      const bounds = this.getTransactionDateBounds()
      return {
        preset: 'all-time',
        from: bounds?.from ?? format(startOfMonth(now), 'yyyy-MM-dd'),
        to: bounds?.to ?? format(endOfMonth(now), 'yyyy-MM-dd')
      }
    }

    if (range.preset === 'week') {
      return {
        preset: 'week',
        from: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        to: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
      }
    }

    if (range.preset === 'year') {
      return {
        preset: 'year',
        from: format(startOfYear(now), 'yyyy-MM-dd'),
        to: format(endOfYear(now), 'yyyy-MM-dd')
      }
    }

    return {
      preset: 'month',
      from: format(startOfMonth(now), 'yyyy-MM-dd'),
      to: format(endOfMonth(now), 'yyyy-MM-dd')
    }
  }

  private resolveDashboardCompare(range: DashboardSnapshotQuery['range'], compareFrom?: string, compareTo?: string) {
    if (compareFrom && compareTo) {
      return {
        from: compareFrom,
        to: compareTo
      }
    }

    const from = parseISO(range.from ?? format(startOfMonth(new Date()), 'yyyy-MM-dd'))
    const to = parseISO(range.to ?? format(endOfMonth(new Date()), 'yyyy-MM-dd'))
    const spanDays = Math.max(0, differenceInCalendarDays(to, from))
    const previousTo = subDays(from, 1)
    const previousFrom = subDays(previousTo, spanDays)
    return {
      from: format(previousFrom, 'yyyy-MM-dd'),
      to: format(previousTo, 'yyyy-MM-dd')
    }
  }

  private getTransactionDateBounds() {
    const rows = this.sqlite
      .prepare(
        `SELECT transaction_date_sortable, transaction_date_raw
         FROM imported_transactions`
      )
      .all() as { transaction_date_sortable?: string | null; transaction_date_raw?: string | null }[]

    const normalized = rows
      .map((row) => row.transaction_date_sortable ?? row.transaction_date_raw)
      .filter((value): value is string => Boolean(value))
      .map((value) => toSortableDateKey(String(value)))
      .sort((left, right) => left.localeCompare(right))

    if (normalized.length === 0) {
      return undefined
    }

    return {
      from: normalized[0],
      to: normalized[normalized.length - 1]
    }
  }

  private toTrend(current: number, previous: number, hasCompare: boolean): 'up' | 'down' | 'flat' {
    if (!hasCompare || current === previous) {
      return 'flat'
    }

    return current > previous ? 'up' : 'down'
  }

  private buildSpendTrend(
    rows: TransactionLedgerRow[],
    compareRows: TransactionLedgerRow[],
    preset: DashboardRangePreset
  ): DashboardTrendPoint[] {
    const bucketForRow = (row: TransactionLedgerRow) => {
      const date = parseISO(row.transactionDateSortable)
      if (preset === 'year' || preset === 'all-time') {
        return {
          key: format(date, 'yyyy-MM'),
          label: format(date, 'MMM'),
          from: format(startOfMonth(date), 'yyyy-MM-dd'),
          to: format(endOfMonth(date), 'yyyy-MM-dd')
        }
      }

      if (preset === 'month') {
        const start = startOfWeek(date, { weekStartsOn: 1 })
        const end = endOfWeek(date, { weekStartsOn: 1 })
        return {
          key: format(start, 'yyyy-MM-dd'),
          label: `${format(start, 'dd MMM')} - ${format(end, 'dd MMM')}`,
          from: format(start, 'yyyy-MM-dd'),
          to: format(end, 'yyyy-MM-dd')
        }
      }

      return {
        key: row.transactionDateSortable,
        label: format(date, 'dd MMM'),
        from: row.transactionDateSortable,
        to: row.transactionDateSortable
      }
    }

    const aggregateRows = (inputRows: TransactionLedgerRow[]) => {
      const bucketMap = new Map<string, DashboardTrendPoint>()
      for (const row of inputRows) {
        const bucket = bucketForRow(row)
        const existing = bucketMap.get(bucket.key) ?? {
          bucketKey: bucket.key,
          bucketLabel: bucket.label,
          from: bucket.from,
          to: bucket.to,
          spendMinor: 0,
          incomeMinor: 0,
          ledgerQuery: {
            dateFrom: bucket.from,
            dateTo: bucket.to
          }
        }
        if (row.normalizedType === 'expense' || row.normalizedType === 'atm-withdrawal' || row.normalizedType === 'credit-card-payment') {
          existing.spendMinor += row.debitAmountMinor ?? Math.abs(Math.min(row.signedAmountMinor, 0))
        }
        if (row.normalizedType === 'income' || row.normalizedType === 'refund') {
          existing.incomeMinor += row.creditAmountMinor ?? Math.abs(Math.max(row.signedAmountMinor, 0))
        }
        bucketMap.set(bucket.key, existing)
      }

      return Array.from(bucketMap.values()).sort((left, right) => left.from.localeCompare(right.from))
    }

    const currentBuckets = aggregateRows(rows)
    const previousBuckets = aggregateRows(compareRows)

    return currentBuckets.map((bucket, index) => ({
      ...bucket,
      previousSpendMinor: previousBuckets[index]?.spendMinor,
      previousIncomeMinor: previousBuckets[index]?.incomeMinor
    }))
  }

  private buildCategoryBreakdown(rows: TransactionLedgerRow[], range: DashboardSnapshotQuery['range']) {
    const categoryMap = new Map<string, { categoryId?: string; label: string; totalMinor: number; transactionCount: number }>()
    for (const row of rows) {
      if (!(row.normalizedType === 'expense' || row.normalizedType === 'atm-withdrawal' || row.normalizedType === 'credit-card-payment')) {
        continue
      }
      const label = row.categoryPath?.join(' > ') || row.category || 'Uncategorized'
      const key = row.categoryId ?? label
      const existing = categoryMap.get(key) ?? {
        categoryId: row.categoryId,
        label,
        totalMinor: 0,
        transactionCount: 0
      }
      existing.totalMinor += row.debitAmountMinor ?? Math.abs(Math.min(row.signedAmountMinor, 0))
      existing.transactionCount += 1
      categoryMap.set(key, existing)
    }
    const totalSpend = Array.from(categoryMap.values()).reduce((sum, item) => sum + item.totalMinor, 0)
    return Array.from(categoryMap.values())
      .sort((left, right) => right.totalMinor - left.totalMinor)
      .slice(0, 8)
      .map((item) => ({
        ...item,
        percentageOfSpend: totalSpend > 0 ? item.totalMinor / totalSpend : 0,
        ledgerQuery: {
          dateFrom: range.from,
          dateTo: range.to,
          categories: item.categoryId ? [item.categoryId] : [item.label]
        }
      }))
  }

  private buildTopMerchants(rows: TransactionLedgerRow[], range: DashboardSnapshotQuery['range']) {
    const merchantMap = new Map<string, { merchant: string; totalMinor: number; transactionCount: number }>()
    for (const row of rows) {
      if (!(row.normalizedType === 'expense' || row.normalizedType === 'atm-withdrawal' || row.normalizedType === 'credit-card-payment')) {
        continue
      }
      const merchant = row.description
      const existing = merchantMap.get(merchant) ?? { merchant, totalMinor: 0, transactionCount: 0 }
      existing.totalMinor += row.debitAmountMinor ?? Math.abs(Math.min(row.signedAmountMinor, 0))
      existing.transactionCount += 1
      merchantMap.set(merchant, existing)
    }
    return Array.from(merchantMap.values())
      .sort((left, right) => right.totalMinor - left.totalMinor)
      .slice(0, 8)
      .map((item) => ({
        ...item,
        ledgerQuery: {
          dateFrom: range.from,
          dateTo: range.to,
          search: item.merchant
        }
      }))
  }

  private buildLargestTransactions(rows: TransactionLedgerRow[], range: DashboardSnapshotQuery['range']) {
    return [...rows]
      .sort((left, right) => Math.abs(right.signedAmountMinor) - Math.abs(left.signedAmountMinor))
      .slice(0, 8)
      .map((row) => ({
        transactionId: row.id,
        description: row.description,
        transactionDateRaw: row.transactionDateRaw,
        amountMinor: Math.abs(row.signedAmountMinor),
        normalizedType: row.normalizedType,
        ledgerQuery: {
          dateFrom: range.from,
          dateTo: range.to,
          search: row.description
        }
      }))
  }

  private buildRecentTransactions(rows: TransactionLedgerRow[], range: DashboardSnapshotQuery['range']) {
    return [...rows]
      .sort((left, right) => right.transactionDateSortable.localeCompare(left.transactionDateSortable))
      .slice(0, 6)
      .map((row) => ({
        transactionId: row.id,
        description: row.description,
        transactionDateRaw: row.transactionDateRaw,
        signedAmountMinor: row.signedAmountMinor,
        normalizedType: row.normalizedType,
        ledgerQuery: {
          dateFrom: range.from,
          dateTo: range.to,
          search: row.description
        }
      }))
  }

  private buildRecurringItems(rows: TransactionLedgerRow[], range: DashboardSnapshotQuery['range']): DashboardRecurringItem[] {
    const recurringMap = new Map<
      string,
      {
        id: string
        description: string
        direction: 'debit' | 'credit'
        normalizedType: TransactionNormalizedType
        occurrenceCount: number
        totalAmountMinor: number
        lastTransactionDateRaw: string
      }
    >()

    for (const row of rows) {
      const direction = row.signedAmountMinor >= 0 ? 'credit' : 'debit'
      const key = this.toRecurringId(row.description, row.normalizedType, direction)
      const existing = recurringMap.get(key) ?? {
        id: key,
        description: row.description,
        direction,
        normalizedType: row.normalizedType,
        occurrenceCount: 0,
        totalAmountMinor: 0,
        lastTransactionDateRaw: row.transactionDateRaw
      }
      existing.occurrenceCount += 1
      existing.totalAmountMinor += Math.abs(row.signedAmountMinor)
      if (row.transactionDateSortable > toSortableDateKey(existing.lastTransactionDateRaw)) {
        existing.lastTransactionDateRaw = row.transactionDateRaw
      }
      recurringMap.set(key, existing)
    }

    return Array.from(recurringMap.values())
      .filter((item) => item.occurrenceCount >= 2)
      .sort((left, right) => right.occurrenceCount - left.occurrenceCount || right.totalAmountMinor - left.totalAmountMinor)
      .slice(0, 8)
      .map((item) => ({
        id: item.id,
        description: item.description,
        direction: item.direction,
        normalizedType: item.normalizedType,
        occurrenceCount: item.occurrenceCount,
        averageAmountMinor: Math.round(item.totalAmountMinor / item.occurrenceCount),
        lastTransactionDateRaw: item.lastTransactionDateRaw,
        cadenceLabel: `Repeats ${item.occurrenceCount} times`,
        ledgerQuery: {
          dateFrom: range.from,
          dateTo: range.to,
          search: item.description,
          types: [item.normalizedType]
        }
      }))
  }

  private toRecurringId(description: string, normalizedType: TransactionNormalizedType, direction: 'debit' | 'credit') {
    return `${normalizedType}|${direction}|${description.trim().toLowerCase()}`
  }

  private applyRuleActionToTransaction(transactionId: string, action: CategorizationRuleAction) {
    const row = this.getTransactionDetail({ transactionId })
    const nextTags = Array.from(new Set([...row.tags, ...(action.appendTags ?? [])]))
    const nextCategoryPath = action.categoryId ? this.getCategoryPathById(action.categoryId) : row.categoryPath ?? []
    this.sqlite
      .prepare(
        `UPDATE imported_transactions
         SET normalized_type = ?, category_id = ?, category_label = ?, tags_json = ?
         WHERE id = ?`
      )
      .run(
        action.type ?? row.normalizedType,
        action.categoryId ?? row.categoryId ?? null,
        nextCategoryPath.length ? nextCategoryPath.join(' > ') : null,
        JSON.stringify(nextTags),
        transactionId
      )
  }

  private mapRuleSummary(row: Record<string, unknown>): CategorizationRuleSummary {
    const condition = this.parseRuleCondition(row.condition_json)
    const action = this.parseRuleAction(row.action_json)
    return {
      id: String(row.id),
      name: String(row.name),
      kind: String(row.kind) === 'system' ? 'system' : 'user',
      isEnabled: Boolean(row.is_enabled),
      condition,
      action,
      specificityScore: Number(row.specificity_score ?? this.computeRuleSpecificity(condition)),
      affectedTransactionCount: this.buildRulePreview(condition, action, String(row.id)).matchCount,
      updatedAt: String(row.updated_at)
    }
  }

  private deriveStarterCategorization(input: {
    description: string
    rawNarration: string
    direction: 'debit' | 'credit'
    normalizedType: TransactionNormalizedType
    signedAmountMinor: number
    tags: string[]
  }) {
    const text = `${input.description} ${input.rawNarration}`.toLowerCase()
    if (input.normalizedType === 'income' && text.includes('salary')) {
      return {
        categoryId: categoryId('income-salary'),
        categoryPath: this.getCategoryPathById(categoryId('income-salary')),
        tags: ['salary']
      }
    }

    if (input.normalizedType === 'atm-withdrawal') {
      return {
        categoryId: categoryId('cash-atm'),
        categoryPath: this.getCategoryPathById(categoryId('cash-atm')),
        tags: ['cash']
      }
    }

    if (input.normalizedType === 'credit-card-payment') {
      return {
        categoryId: categoryId('credit-card-payment'),
        categoryPath: this.getCategoryPathById(categoryId('credit-card-payment')),
        tags: []
      }
    }

    return {
      categoryId: undefined,
      categoryPath: undefined,
      tags: input.tags
    }
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
    const categoryIdValue = row.category_id ? String(row.category_id) : undefined
    const categoryPath = categoryIdValue ? this.getCategoryPathById(categoryIdValue) : undefined
    return {
      id: String(row.id),
      transactionDateRaw: String(row.transaction_date_raw),
      transactionDateSortable: row.transaction_date_sortable ? String(row.transaction_date_sortable) : toSortableDateKey(String(row.transaction_date_raw)),
      valueDateRaw: row.value_date_raw ? String(row.value_date_raw) : undefined,
      rawNarration: String(row.raw_narration),
      cleanedDescription: String(row.cleaned_description),
      debitAmountMinor: row.debit_amount_minor === null ? undefined : Number(row.debit_amount_minor),
      creditAmountMinor: row.credit_amount_minor === null ? undefined : Number(row.credit_amount_minor),
      runningBalanceMinor: row.running_balance_minor === null ? undefined : Number(row.running_balance_minor),
      direction: String(row.direction) as NormalizedImportRow['direction'],
      normalizedType: (row.normalized_type
        ? String(row.normalized_type)
        : deriveNormalizedType({
            cleanedDescription: String(row.cleaned_description),
            rawNarration: String(row.raw_narration),
            reference: row.reference ? String(row.reference) : undefined,
            direction: String(row.direction) as 'debit' | 'credit'
          })) as TransactionNormalizedType,
      categoryId: categoryIdValue,
      categoryPath,
      category: row.category_label
        ? String(row.category_label)
        : categoryPath?.length
          ? categoryPath.join(' > ')
          : undefined,
      reviewStateOverride: row.review_state_override ? (String(row.review_state_override) as TransactionReviewState) : undefined,
      reference: row.reference ? String(row.reference) : undefined,
      tags: this.parseTagsJson(row.tags_json),
      sourceFileId: String(row.source_file_id),
      importBatchId: String(row.import_batch_id)
    }
  }

  private mapTransactionLedgerRow(row: Record<string, unknown>): TransactionLedgerRow {
    const importedTransaction = this.mapImportedTransaction(row)
    const reviewState =
      importedTransaction.reviewStateOverride ??
      (Boolean(row.has_pending_review) ? 'pending-review' : 'clean')

    return {
      id: importedTransaction.id,
      importBatchId: importedTransaction.importBatchId,
      sourceFileId: importedTransaction.sourceFileId,
      transactionDateRaw: importedTransaction.transactionDateRaw,
      transactionDateSortable: importedTransaction.transactionDateSortable,
      description: importedTransaction.cleanedDescription,
      signedAmountMinor: getSignedAmountMinor(row),
      debitAmountMinor: importedTransaction.debitAmountMinor ?? null,
      creditAmountMinor: importedTransaction.creditAmountMinor ?? null,
      runningBalanceMinor: importedTransaction.runningBalanceMinor,
      normalizedType: importedTransaction.normalizedType,
      tags: importedTransaction.tags ?? [],
      categoryId: importedTransaction.categoryId,
      categoryPath: importedTransaction.categoryPath,
      category: importedTransaction.category,
      reference: importedTransaction.reference,
      reviewState
    }
  }

  private mapTransactionDetail(row: Record<string, unknown>): TransactionDetail {
    const ledgerRow = this.mapTransactionLedgerRow(row)
    const importedTransaction = this.mapImportedTransaction(row)

    return {
      ...ledgerRow,
      batchLabel: String(row.batch_label),
      sourceFileName: String(row.file_name),
      importedAt: String(row.imported_at),
      valueDateRaw: importedTransaction.valueDateRaw,
      rawNarration: importedTransaction.rawNarration,
      runningBalanceMinor: importedTransaction.runningBalanceMinor,
      direction: importedTransaction.direction,
      reviewStateOverride: importedTransaction.reviewStateOverride ?? null
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

  clearTransactionsAndAudit(): ClearTransactionsResult {
    const txnIds = (this.sqlite.prepare('SELECT id FROM imported_transactions').all() as Array<{ id: string }>).map((r) => r.id)
    const deletedCount = txnIds.length

    this.sqlite.exec('BEGIN')
    try {
      if (txnIds.length > 0) {
        for (let i = 0; i < txnIds.length; i += 500) {
          const chunk = txnIds.slice(i, i + 500)
          const placeholders = chunk.map(() => '?').join(',')
          this.sqlite.prepare(`DELETE FROM audit_events WHERE entity_id IN (${placeholders})`).run(...chunk)
        }
      }
      this.sqlite.prepare("DELETE FROM audit_events WHERE category = 'transaction'").run()
      this.sqlite.exec(`
        DELETE FROM imported_transactions;
        DELETE FROM review_items;
        DELETE FROM import_source_files;
        DELETE FROM import_attempts;
        DELETE FROM import_batches;
      `)
      this.sqlite.exec('COMMIT')
    } catch (e) {
      this.sqlite.exec('ROLLBACK')
      throw e
    }

    return { deletedCount }
  }

  fullAppReset(): AppShellState {
    this.clearWorkspaceTables()
    this.sqlite.exec(`
      DELETE FROM categories;
      DELETE FROM categorization_rules;
      DELETE FROM audit_events;
      DELETE FROM app_settings;
      DELETE FROM device_profiles;
      DELETE FROM device_profile_snapshots;
    `)
    this.resetWorkspaceRows()
    const stamp = nowIso()
    this.seedSystemCategories(stamp)
    this.seedStarterRules(stamp)
    return this.loadAppState()
  }
}

let repositoryInstance: WalnutRepository | undefined

export const getWalnutRepository = () => {
  repositoryInstance ??= new WalnutRepository()
  return repositoryInstance
}

/** For unit tests only — overrides the singleton with a pre-constructed instance (pass undefined to reset) */
export const _setRepositoryForTesting = (repo: WalnutRepository | undefined) => {
  repositoryInstance = repo
}
