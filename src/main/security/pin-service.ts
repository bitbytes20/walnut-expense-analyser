import { hash, verify } from '@node-rs/argon2'
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import type { RecoveryKeyMaterial, RecoveryResetPayload, UnlockResult } from '../../shared/contracts/security'
import { generateRecoveryKey, isValidPin } from '../../shared/security-utils'
import { getWalnutRepository } from '../persistence/db'

const buildProtectionKey = () =>
  createHash('sha256')
    .update(`${process.env.USERNAME ?? 'walnut'}:${process.cwd()}:walnut-security`)
    .digest()

const protectString = (value: string) => {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', buildProtectionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString('base64')
}

const revealString = (value: string) => {
  const buffer = Buffer.from(value, 'base64')
  const iv = buffer.subarray(0, 12)
  const tag = buffer.subarray(12, 28)
  const body = buffer.subarray(28)
  const decipher = createDecipheriv('aes-256-gcm', buildProtectionKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(body), decipher.final()]).toString('utf8')
}

const now = () => Date.now()
const nowIso = () => new Date().toISOString()

const cooldownForAttempt = (attempts: number) => {
  if (attempts < 3) return 0
  return Math.min(30_000 * 2 ** (attempts - 3), 10 * 60 * 1000)
}

export const setupSecuritySecrets = async (pin: string, recoveryKey: RecoveryKeyMaterial) => {
  if (!isValidPin(pin)) {
    throw new Error('PIN must be numeric and at least 6 digits long.')
  }

  return {
    pinHash: await hash(pin),
    recoveryCodeCiphertext: protectString(recoveryKey.code),
    recoveryWordsCiphertext: protectString(recoveryKey.words.join(' '))
  }
}

export const unlockWithPin = async (pin: string): Promise<UnlockResult> => {
  const repository = getWalnutRepository()
  const state = repository.loadAppState().security

  if (!state.pinHash) {
    return { ok: true, state }
  }

  if (state.cooldownUntil && new Date(state.cooldownUntil).getTime() > now()) {
    return {
      ok: false,
      state,
      message: `Try again in ${Math.ceil((new Date(state.cooldownUntil).getTime() - now()) / 1000)}s`
    }
  }

  const matched = await verify(state.pinHash, pin)
  if (matched) {
    const appState = repository.markUnlocked(state.lastUnlockedAccountLabel)
    repository.logSecurityEvent('security.unlock_succeeded', {
      unlockedAt: nowIso()
    })
    return {
      ok: true,
      state: appState.security
    }
  }

  const failedAttempts = state.failedAttempts + 1
  const cooldownMs = cooldownForAttempt(failedAttempts)
  const cooldownUntil = cooldownMs ? new Date(now() + cooldownMs).toISOString() : undefined
  const updated = repository.updateSecurityState({
    failedAttempts,
    cooldownUntil,
    isLocked: true,
    lockReason: state.lockReason ?? 'launch'
  })
  repository.logSecurityEvent('security.unlock_failed', {
    failedAttempts,
    cooldownUntil
  })

  return {
    ok: false,
    state: updated.security,
    message: cooldownUntil
      ? `Try again in ${Math.ceil((new Date(cooldownUntil).getTime() - now()) / 1000)}s`
      : "We couldn't verify that PIN. Check the digits and try again. If you're locked out, use your recovery key."
  }
}

export const verifyRecoveryInput = (input: string, encryptedCode?: string, encryptedWords?: string) => {
  const normalized = input.trim().toUpperCase()
  const plainCode = encryptedCode ? revealString(encryptedCode).toUpperCase() : ''
  const plainWords = encryptedWords ? revealString(encryptedWords).toUpperCase() : ''
  return normalized === plainCode || normalized === plainWords
}

export const changePin = async (currentPin: string, newPin: string): Promise<{ ok: boolean; error?: string }> => {
  const repository = getWalnutRepository()
  const state = repository.loadAppState().security

  if (!state.pinHash) {
    return { ok: false, error: 'No PIN is set.' }
  }

  const matched = await verify(state.pinHash, currentPin)
  if (!matched) {
    repository.logSecurityEvent('security.pin_change_failed', { reason: 'wrong_current_pin' })
    return { ok: false, error: 'Current PIN is incorrect.' }
  }

  if (!isValidPin(newPin)) {
    return { ok: false, error: 'New PIN must be numeric and at least 6 digits long.' }
  }

  const newHash = await hash(newPin)
  repository.updateSecurityState({ pinHash: newHash })
  repository.logSecurityEvent('security.pin_changed', { changedAt: nowIso() })
  return { ok: true }
}

export const beginRecoveryReset = async (payload: RecoveryResetPayload) => {
  if (!isValidPin(payload.newPin)) {
    throw new Error('PIN must be numeric and at least 6 digits long.')
  }

  const repository = getWalnutRepository()
  const current = repository.loadAppState()
  const security = current.security
  const ok = verifyRecoveryInput(payload.recoveryInput, security.recoveryCodeCiphertext, security.recoveryWordsCiphertext)

  if (!ok) {
    repository.logSecurityEvent('security.recovery_key_failed', { attemptedAt: nowIso() })
    throw new Error('Recovery key did not match this device.')
  }

  const rotatedRecoveryKey = generateRecoveryKey()
  const secrets = await setupSecuritySecrets(payload.newPin, rotatedRecoveryKey)
  const appState = repository.updateSecurityState({
    pinHash: secrets.pinHash,
    failedAttempts: 0,
    cooldownUntil: undefined,
    recoveryCodeCiphertext: secrets.recoveryCodeCiphertext,
    recoveryWordsCiphertext: secrets.recoveryWordsCiphertext,
    isLocked: true,
    lockReason: 'manual',
    lastLockedAt: nowIso()
  })

  repository.logSecurityEvent('security.recovery_key_rotated', {
    rotatedAt: nowIso()
  })

  return {
    ...appState,
    onboarding: {
      ...appState.onboarding,
      recoveryKey: rotatedRecoveryKey
    }
  }
}
