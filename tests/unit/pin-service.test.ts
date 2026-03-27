import { describe, expect, it } from 'vitest'
import { setupSecuritySecrets, verifyRecoveryInput } from '../../src/main/security/pin-service'
import { generateRecoveryKey, isValidPin } from '../../src/shared/security-utils'

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
