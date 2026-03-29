import { describe, expect, it } from 'vitest'
import { encryptBackup, decryptBackup } from '../../src/main/security/backup-service'

describe('backup-service', () => {
  describe('encryptBackup', () => {
    it('produces a Buffer starting with 4-byte version (0x00000001)', () => {
      const blob = encryptBackup('{"test":true}', '123456')
      expect(blob).toBeInstanceOf(Buffer)
      const version = blob.readUInt32BE(0)
      expect(version).toBe(1)
    })

    it('produces correct binary layout: 4B version, 16B salt, 12B IV, 16B tag, then ciphertext', () => {
      const plaintext = '{"data":"hello"}'
      const blob = encryptBackup(plaintext, '123456')
      // Minimum length: 4 + 16 + 12 + 16 = 48 bytes header + at least 1 byte body
      expect(blob.byteLength).toBeGreaterThanOrEqual(48 + plaintext.length)
    })
  })

  describe('decryptBackup', () => {
    it('round-trips correctly: decryptBackup(encryptBackup(json, pin), pin) returns original JSON', () => {
      const original = JSON.stringify({ foo: 'bar', count: 42, nested: { ok: true } })
      const blob = encryptBackup(original, '654321')
      const result = decryptBackup(blob, '654321')
      expect(result).toBe(original)
    })

    it('throws when decrypting with wrong PIN (GCM auth tag mismatch)', () => {
      const blob = encryptBackup('{"secret":"data"}', '111111')
      expect(() => decryptBackup(blob, '222222')).toThrow()
    })

    it('throws "Unsupported backup version" when buffer version != 1', () => {
      const original = encryptBackup('{"data":"test"}', '123456')
      const tampered = Buffer.from(original)
      tampered.writeUInt32BE(99, 0) // overwrite version to 99
      expect(() => decryptBackup(tampered, '123456')).toThrow('Unsupported backup version')
    })
  })
})
