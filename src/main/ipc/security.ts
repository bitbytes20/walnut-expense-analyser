import { BrowserWindow, ipcMain } from 'electron'
import type { LockReason, RecoveryResetPayload } from '../../shared/contracts/security'
import { getWalnutRepository } from '../persistence/db'
import { beginRecoveryReset, unlockWithPin } from '../security/pin-service'
import { SessionLockManager } from '../security/session-lock'

export const registerSecurityIpc = (window: BrowserWindow, sessionLock: SessionLockManager) => {
  const repository = getWalnutRepository()

  ipcMain.handle('security:lock-now', (_event, reason: LockReason = 'manual') => sessionLock.lock(window, reason))
  ipcMain.handle('security:unlock-with-pin', (_event, pin: string) => unlockWithPin(pin))
  ipcMain.handle('security:begin-recovery-reset', (_event, payload: RecoveryResetPayload) => beginRecoveryReset(payload))
  ipcMain.handle('security:simulate-idle-lock', () => sessionLock.lock(window, 'idle'))
  ipcMain.handle('security:simulate-system-lock', () => sessionLock.lock(window, 'system'))

  window.webContents.on('did-finish-load', () => {
    const current = repository.loadAppState()
    if (current.currentView === 'locked') {
      void sessionLock.lock(window, 'launch')
    }
  })
}
