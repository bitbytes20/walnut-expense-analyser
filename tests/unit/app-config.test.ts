import { describe, expect, it } from 'vitest'
import { WalnutRepository } from '../../src/main/persistence/db'

const createRepository = () => new WalnutRepository(':memory:')

describe('AppConfig persistence', () => {
  it('getAppConfig() returns default config when no setting stored', () => {
    const repo = createRepository()
    const config = repo.getAppConfig()
    expect(config).toEqual({
      theme: 'system',
      idleLockTimeoutMs: 900000,
      featureFlags: { aiSummaries: false }
    })
  })

  it('setAppConfig({ theme: "dark" }) merges with defaults and persists', () => {
    const repo = createRepository()
    repo.setAppConfig({ theme: 'dark' })
    const config = repo.getAppConfig()
    expect(config.theme).toBe('dark')
    expect(config.idleLockTimeoutMs).toBe(900000)
    expect(config.featureFlags.aiSummaries).toBe(false)
  })

  it('setAppConfig({ featureFlags: { aiSummaries: true } }) deep-merges featureFlags', () => {
    const repo = createRepository()
    repo.setAppConfig({ featureFlags: { aiSummaries: true } })
    const config = repo.getAppConfig()
    expect(config.featureFlags.aiSummaries).toBe(true)
    expect(config.theme).toBe('system')
    expect(config.idleLockTimeoutMs).toBe(900000)
  })

  it('setAppConfig does not clobber other fields when updating one', () => {
    const repo = createRepository()
    repo.setAppConfig({ theme: 'light' })
    repo.setAppConfig({ idleLockTimeoutMs: 300000 })
    const config = repo.getAppConfig()
    expect(config.theme).toBe('light')
    expect(config.idleLockTimeoutMs).toBe(300000)
  })
})

describe('exportBackupPayload', () => {
  it('returns a BackupPayload with version 1 and all table data', () => {
    const repo = createRepository()
    const payload = repo.exportBackupPayload()
    expect(payload.version).toBe(1)
    expect(payload).toHaveProperty('createdAt')
    expect(payload).toHaveProperty('tables')
    expect(payload.tables).toHaveProperty('categories')
    expect(payload.tables).toHaveProperty('categorizationRules')
    expect(payload.tables).toHaveProperty('auditEvents')
    expect(payload.tables).toHaveProperty('appSettings')
  })

  it('excludes pin_hash, recovery_code_ciphertext, recovery_words_ciphertext from payload', () => {
    const repo = createRepository()
    const payload = repo.exportBackupPayload()
    const payloadStr = JSON.stringify(payload)
    expect(payloadStr).not.toContain('pin_hash')
    expect(payloadStr).not.toContain('recovery_code_ciphertext')
    expect(payloadStr).not.toContain('recovery_words_ciphertext')
  })

  it('excludes draft_pin, recovery_code, recovery_words_json from onboarding payload', () => {
    const repo = createRepository()
    const payload = repo.exportBackupPayload()
    const payloadStr = JSON.stringify(payload)
    expect(payloadStr).not.toContain('draft_pin')
    expect(payloadStr).not.toContain('recovery_code')
    expect(payloadStr).not.toContain('recovery_words_json')
  })
})
