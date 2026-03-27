export type LockReason = 'launch' | 'manual' | 'idle' | 'system'

export interface RecoveryKeyMaterial {
  code: string
  words: string[]
}

export interface BackoffState {
  failedAttempts: number
  cooldownUntil?: string
}

export interface SecurityState extends BackoffState {
  pinHash?: string
  recoveryCodeCiphertext?: string
  recoveryWordsCiphertext?: string
  lastUnlockedAccountLabel?: string
  isLocked: boolean
  lockReason?: LockReason
  lastLockedAt?: string
  lastUnlockedAt?: string
  recoverySetupConfirmedAt?: string
}

export interface SecurityEvent {
  id: string
  eventType: string
  createdAt: string
  metadataJson?: string
}

export interface UnlockResult {
  ok: boolean
  state: SecurityState
  message?: string
}

export interface RecoveryResetPayload {
  recoveryInput: string
  newPin: string
}
