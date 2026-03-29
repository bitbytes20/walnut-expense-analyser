import { scryptSync, createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const BACKUP_VERSION = 1
const SALT_LEN = 16
const IV_LEN = 12
const TAG_LEN = 16
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 }

export function encryptBackup(plaintext: string, pin: string): Buffer {
  const salt = randomBytes(SALT_LEN)
  const key = scryptSync(pin, salt, 32, SCRYPT_PARAMS)
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const body = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  const versionBuf = Buffer.alloc(4)
  versionBuf.writeUInt32BE(BACKUP_VERSION)
  return Buffer.concat([versionBuf, salt, iv, tag, body])
}

export function decryptBackup(blob: Buffer, pin: string): string {
  let offset = 0
  const version = blob.readUInt32BE(offset)
  offset += 4
  if (version !== BACKUP_VERSION) throw new Error('Unsupported backup version')
  const salt = blob.subarray(offset, offset + SALT_LEN)
  offset += SALT_LEN
  const iv = blob.subarray(offset, offset + IV_LEN)
  offset += IV_LEN
  const tag = blob.subarray(offset, offset + TAG_LEN)
  offset += TAG_LEN
  const body = blob.subarray(offset)
  const key = scryptSync(pin, salt, 32, SCRYPT_PARAMS)
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(body), decipher.final()]).toString('utf8')
}
