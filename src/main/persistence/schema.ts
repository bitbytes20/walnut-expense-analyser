import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const appSettings = sqliteTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull()
})

export const onboardingProgress = sqliteTable('onboarding_progress', {
  id: integer('id').primaryKey(),
  currentStep: text('current_step').notNull(),
  completedStepsJson: text('completed_steps_json').notNull(),
  householdName: text('household_name'),
  ownerName: text('owner_name'),
  draftPin: text('draft_pin'),
  recoveryCode: text('recovery_code'),
  recoveryWordsJson: text('recovery_words_json'),
  recoveryConfirmed: integer('recovery_confirmed', { mode: 'boolean' }).notNull().default(false),
  recoverySavedToDevice: integer('recovery_saved_to_device', { mode: 'boolean' }).notNull().default(false),
  accountDraftJson: text('account_draft_json'),
  completedAt: text('completed_at'),
  updatedAt: text('updated_at').notNull()
})

export const securityState = sqliteTable('security_state', {
  id: integer('id').primaryKey(),
  pinHash: text('pin_hash'),
  failedAttempts: integer('failed_attempts').notNull().default(0),
  cooldownUntil: text('cooldown_until'),
  recoveryCodeCiphertext: text('recovery_code_ciphertext'),
  recoveryWordsCiphertext: text('recovery_words_ciphertext'),
  lastUnlockedAccountLabel: text('last_unlocked_account_label'),
  isLocked: integer('is_locked', { mode: 'boolean' }).notNull().default(false),
  lockReason: text('lock_reason'),
  lastLockedAt: text('last_locked_at'),
  lastUnlockedAt: text('last_unlocked_at'),
  recoverySetupConfirmedAt: text('recovery_setup_confirmed_at'),
  updatedAt: text('updated_at').notNull()
})

export const securityEvents = sqliteTable('security_events', {
  id: text('id').primaryKey(),
  eventType: text('event_type').notNull(),
  metadataJson: text('metadata_json'),
  createdAt: text('created_at').notNull()
})

export const accountProfiles = sqliteTable('account_profiles', {
  id: text('id').primaryKey(),
  bankName: text('bank_name').notNull().default('ICICI'),
  displayName: text('display_name').notNull(),
  accountHolderName: text('account_holder_name').notNull(),
  maskedAccountNumber: text('masked_account_number'),
  nickname: text('nickname'),
  baseCurrency: text('base_currency').notNull(),
  openingBalance: integer('opening_balance'),
  openingBalanceDate: text('opening_balance_date'),
  skippedDuringOnboarding: integer('skipped_during_onboarding', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
})
