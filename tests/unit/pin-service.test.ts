import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { setupSecuritySecrets, verifyRecoveryInput, changePin } from '../../src/main/security/pin-service'
import { generateRecoveryKey, isValidPin } from '../../src/shared/security-utils'
import { WalnutRepository, _setRepositoryForTesting } from '../../src/main/persistence/db'

describe('pin service', () => {
  it('validates numeric pins with at least six digits', () => {
    expect(isValidPin('123456')).toBe(true)
    expect(isValidPin('12345')).toBe(false)
    expect(isValidPin('abcdef')).toBe(false)
  })

  it('creates verifiable encrypted recovery material', async () => {
    const recoveryKey = generateRecoveryKey()
    const secrets = await setupSecuritySecrets('123456', recoveryKey)

    expect(verifyRecoveryInput(recoveryKey.code, secrets.recoveryCodeCiphertext, secrets.recoveryWordsCiphertext)).toBe(true)
    expect(verifyRecoveryInput(recoveryKey.words.join(' '), secrets.recoveryCodeCiphertext, secrets.recoveryWordsCiphertext)).toBe(true)
    expect(verifyRecoveryInput('WRONG', secrets.recoveryCodeCiphertext, secrets.recoveryWordsCiphertext)).toBe(false)
  })
})

describe('changePin', () => {
  let repo: WalnutRepository

  beforeEach(() => {
    repo = new WalnutRepository(':memory:')
    _setRepositoryForTesting(repo)
  })

  afterEach(() => {
    // Reset singleton to undefined so next test gets a fresh one
    _setRepositoryForTesting(undefined as unknown as WalnutRepository)
  })

  it('returns { ok: true } when correct current PIN and valid new PIN provided', async () => {
    const recoveryKey = generateRecoveryKey()
    const secrets = await setupSecuritySecrets('123456', recoveryKey)
    repo.updateSecurityState({
      pinHash: secrets.pinHash,
      recoveryCodeCiphertext: secrets.recoveryCodeCiphertext,
      recoveryWordsCiphertext: secrets.recoveryWordsCiphertext
    })
    const result = await changePin('123456', '654321')
    expect(result.ok).toBe(true)
  })

  it('returns { ok: false, error } when wrong current PIN provided', async () => {
    const recoveryKey = generateRecoveryKey()
    const secrets = await setupSecuritySecrets('123456', recoveryKey)
    repo.updateSecurityState({
      pinHash: secrets.pinHash,
      recoveryCodeCiphertext: secrets.recoveryCodeCiphertext,
      recoveryWordsCiphertext: secrets.recoveryWordsCiphertext
    })
    const result = await changePin('999999', '654321')
    expect(result.ok).toBe(false)
    expect(result.error).toBe('Current PIN is incorrect.')
  })

  it('returns { ok: false, error } when new PIN is too short (< 6 digits)', async () => {
    const recoveryKey = generateRecoveryKey()
    const secrets = await setupSecuritySecrets('123456', recoveryKey)
    repo.updateSecurityState({
      pinHash: secrets.pinHash,
      recoveryCodeCiphertext: secrets.recoveryCodeCiphertext,
      recoveryWordsCiphertext: secrets.recoveryWordsCiphertext
    })
    const result = await changePin('123456', '123')
    expect(result.ok).toBe(false)
    expect(result.error).toBeTruthy()
  })

  it('new PIN hash is updated in security state after successful change', async () => {
    const recoveryKey = generateRecoveryKey()
    const secrets = await setupSecuritySecrets('123456', recoveryKey)
    repo.updateSecurityState({
      pinHash: secrets.pinHash,
      recoveryCodeCiphertext: secrets.recoveryCodeCiphertext,
      recoveryWordsCiphertext: secrets.recoveryWordsCiphertext
    })
    await changePin('123456', '999999')
    const state = repo.loadAppState().security
    expect(state.pinHash).toBeDefined()
    const { verify } = await import('@node-rs/argon2')
    const matched = await verify(state.pinHash!, '999999')
    expect(matched).toBe(true)
  })
})
