import { BrowserWindow, powerMonitor } from 'electron'
import type { LockReason } from '../../shared/contracts/security'
import { getWalnutRepository } from '../persistence/db'

export const DEFAULT_IDLE_LOCK_TIMEOUT_MS = 15 * 60 * 1000

/** @deprecated Use DEFAULT_IDLE_LOCK_TIMEOUT_MS or read from AppConfig. Kept for backward compatibility. */
export const IDLE_LOCK_TIMEOUT_MS = DEFAULT_IDLE_LOCK_TIMEOUT_MS

export class SessionLockManager {
  private idleTimer?: NodeJS.Timeout

  registerWindow(window: BrowserWindow) {
    this.resetIdleTimer(window)
    window.webContents.on('before-input-event', () => {
      this.resetIdleTimer(window)
    })

    powerMonitor.on('lock-screen', () => {
      void this.lock(window, 'system')
    })
    powerMonitor.on('suspend', () => {
      void this.lock(window, 'system')
    })
  }

  resetIdleTimer(window: BrowserWindow) {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer)
    }
    const repository = getWalnutRepository()
    const config = repository.getAppConfig()
    const timeoutMs = config.idleLockTimeoutMs
    if (timeoutMs === 0) return // 'Never' — no idle timer set
    this.idleTimer = setTimeout(() => {
      void this.lock(window, 'idle')
    }, timeoutMs)
  }

  async lock(window: BrowserWindow, reason: LockReason) {
    const repository = getWalnutRepository()
    const accountLabel = repository.loadAccountProfile()?.displayName
    const nextState = repository.markLocked(reason)
    repository.updateSecurityState({
      lastUnlockedAccountLabel: accountLabel ?? nextState.security.lastUnlockedAccountLabel
    })
    window.webContents.send('session:locked', reason)
    return nextState
  }
}
