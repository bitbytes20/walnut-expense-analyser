import type {
  AppShellState,
  CompleteOnboardingInput,
  SaveOnboardingProgressInput,
  WalnutApi
} from '../shared/contracts/app-state'
import type { AccountProfileDraft } from '../shared/contracts/account'
import type {
  LockReason,
  RecoveryResetPayload,
  SecurityEvent,
  SecurityState,
  UnlockResult
} from '../shared/contracts/security'
import { generateRecoveryKey, isValidPin } from '../shared/security-utils'

const STORAGE_KEY = 'walnut.mock.app-state'
const EVENTS_KEY = 'walnut.mock.security-events'

type StoredState = AppShellState & {
  mockPin?: string
  mockRecoveryCode?: string
  mockRecoveryWords?: string
}

const defaultState = (): StoredState => ({
  currentView: 'onboarding',
  onboarding: {
    currentStep: 'welcome',
    completedSteps: [],
    recoveryConfirmed: false,
    recoverySavedToDevice: false
  },
  security: {
    failedAttempts: 0,
    isLocked: false
  },
  dashboard: {
    heading: 'Ready for your first import',
    body: 'Add your first ICICI statement to create the account timeline and unlock dashboard insights.',
    primaryActionLabel: 'Import your first statement'
  }
})

const readState = (): StoredState => {
  const raw = window.localStorage.getItem(STORAGE_KEY)
  return raw ? (JSON.parse(raw) as StoredState) : defaultState()
}

const writeState = (state: StoredState) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  return state
}

const readEvents = (): SecurityEvent[] => {
  const raw = window.localStorage.getItem(EVENTS_KEY)
  return raw ? (JSON.parse(raw) as SecurityEvent[]) : []
}

const writeEvents = (events: SecurityEvent[]) => {
  window.localStorage.setItem(EVENTS_KEY, JSON.stringify(events))
}

const logEvent = (eventType: string, metadataJson?: string) => {
  const next: SecurityEvent = {
    id: crypto.randomUUID(),
    eventType,
    createdAt: new Date().toISOString(),
    metadataJson
  }
  writeEvents([next, ...readEvents()])
}

const withoutMocks = (state: StoredState): AppShellState => {
  const { mockPin: _mockPin, mockRecoveryCode: _mockRecoveryCode, mockRecoveryWords: _mockRecoveryWords, ...rest } = state
  return rest
}

const updateSecurity = (update: Partial<SecurityState>) => {
  const current = readState()
  return writeState({
    ...current,
    security: {
      ...current.security,
      ...update
    }
  })
}

export const createMockWalnutApi = (): WalnutApi => ({
  async loadAppState() {
    return withoutMocks(readState())
  },
  async saveOnboardingProgress(input: SaveOnboardingProgressInput) {
    const current = readState()
    return withoutMocks(
      writeState({
        ...current,
        onboarding: {
          ...current.onboarding,
          ...input
        }
      })
    )
  },
  async completeOnboarding(input: CompleteOnboardingInput) {
    const current = readState()
    const recoveryKey = current.onboarding.recoveryKey ?? generateRecoveryKey()
    const next = writeState({
      ...current,
      currentView: 'dashboard',
      onboarding: {
        ...current.onboarding,
        profile: input.profile,
        accountDraft: input.accountDraft,
        completedSteps: ['welcome', 'household-profile', 'pin-setup', 'recovery-key', 'account-profile', 'finish'],
        currentStep: 'finish',
        recoveryConfirmed: true,
        recoverySavedToDevice: true,
        recoveryKey
      },
      security: {
        ...current.security,
        failedAttempts: 0,
        isLocked: false,
        recoverySetupConfirmedAt: new Date().toISOString()
      },
      accountProfile: input.accountDraft
        ? {
            id: 'account-primary',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ...input.accountDraft
          }
        : undefined,
      mockPin: input.pin,
      mockRecoveryCode: recoveryKey.code,
      mockRecoveryWords: recoveryKey.words.join(' ')
    })
    return withoutMocks(next)
  },
  async lockNow(reason?: LockReason) {
    return withoutMocks(
      updateSecurity({
        isLocked: true,
        lockReason: reason ?? 'manual',
        lastLockedAt: new Date().toISOString()
      })
    )
  },
  async unlockWithPin(pin: string): Promise<UnlockResult> {
    const current = readState()
    const failedAttempts = current.security.failedAttempts ?? 0
    const cooldownUntil = current.security.cooldownUntil ? new Date(current.security.cooldownUntil).getTime() : 0

    if (cooldownUntil > Date.now()) {
      return {
        ok: false,
        state: current.security,
        message: `Try again in ${Math.ceil((cooldownUntil - Date.now()) / 1000)}s`
      }
    }

    if (pin === current.mockPin) {
      const next = updateSecurity({
        isLocked: false,
        failedAttempts: 0,
        cooldownUntil: undefined,
        lastUnlockedAt: new Date().toISOString()
      })
      logEvent('security.unlock_succeeded')
      return { ok: true, state: next.security }
    }

    const nextFailedAttempts = failedAttempts + 1
    const backoffMs = nextFailedAttempts >= 3 ? Math.min(30000 * 2 ** (nextFailedAttempts - 3), 600000) : 0
    const next = updateSecurity({
      isLocked: true,
      failedAttempts: nextFailedAttempts,
      cooldownUntil: backoffMs ? new Date(Date.now() + backoffMs).toISOString() : undefined
    })
    logEvent('security.unlock_failed')
    return {
      ok: false,
      state: next.security,
      message: backoffMs
        ? `Try again in ${Math.ceil(backoffMs / 1000)}s`
        : "We couldn't verify that PIN. Check the digits and try again. If you're locked out, use your recovery key."
    }
  },
  async beginRecoveryReset(payload: RecoveryResetPayload) {
    if (!isValidPin(payload.newPin)) {
      throw new Error('PIN must be numeric and at least 6 digits long.')
    }
    const current = readState()
    const normalized = payload.recoveryInput.trim().toUpperCase()
    const code = (current.mockRecoveryCode ?? '').toUpperCase()
    const words = (current.mockRecoveryWords ?? '').toUpperCase()
    if (normalized !== code && normalized !== words) {
      logEvent('security.recovery_key_failed')
      throw new Error('Recovery key did not match this device.')
    }
    const rotated = generateRecoveryKey()
    const next = writeState({
      ...current,
      currentView: 'locked',
      onboarding: {
        ...current.onboarding,
        recoveryKey: rotated
      },
      security: {
        ...current.security,
        isLocked: true,
        failedAttempts: 0,
        cooldownUntil: undefined,
        lockReason: 'manual',
        lastLockedAt: new Date().toISOString()
      },
      mockPin: payload.newPin,
      mockRecoveryCode: rotated.code,
      mockRecoveryWords: rotated.words.join(' ')
    })
    logEvent('security.recovery_key_rotated')
    return withoutMocks(next)
  },
  async saveAccountProfile(draft: AccountProfileDraft) {
    const current = readState()
    const next = writeState({
      ...current,
      accountProfile: {
        id: 'account-primary',
        createdAt: current.accountProfile?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...draft
      }
    })
    return withoutMocks(next)
  },
  async copyRecoveryKeyAcknowledged() {
    const current = readState()
    return withoutMocks(
      writeState({
        ...current,
        onboarding: {
          ...current.onboarding,
          recoveryConfirmed: true,
          recoverySavedToDevice: true
        }
      })
    )
  },
  async downloadRecoveryKeyAcknowledged() {
    const current = readState()
    return withoutMocks(
      writeState({
        ...current,
        onboarding: {
          ...current.onboarding,
          recoveryConfirmed: true,
          recoverySavedToDevice: true
        }
      })
    )
  },
  async getSecurityEvents() {
    return readEvents()
  },
  async ping() {
    return 'pong'
  }
})
