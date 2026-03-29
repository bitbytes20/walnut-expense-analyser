import { dialog, ipcMain } from 'electron'
import { writeFileSync, readFileSync } from 'node:fs'
import { format } from 'date-fns'
import type { BackupResult, RestoreResult, BackupPayload } from '../../shared/contracts/app-state'
import { encryptBackup, decryptBackup } from '../security/backup-service'
import { getWalnutRepository } from '../persistence/db'

export const registerBackupIpc = () => {
  const repository = getWalnutRepository()

  ipcMain.handle('walnut:exportBackup', async (_event, pin: string): Promise<BackupResult> => {
    try {
      const payload = repository.exportBackupPayload()
      const defaultFilename = `walnut-backup-${format(new Date(), 'yyyy-MM-dd')}.wbk`

      const result = await dialog.showSaveDialog({
        title: 'Save Walnut Backup',
        defaultPath: defaultFilename,
        filters: [{ name: 'Walnut Backup', extensions: ['wbk'] }]
      })

      if (result.canceled || !result.filePath) {
        return { ok: false, error: 'Save cancelled.' }
      }

      const encrypted = encryptBackup(JSON.stringify(payload), pin)
      writeFileSync(result.filePath, encrypted)

      return { ok: true, filePath: result.filePath }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { ok: false, error: message }
    }
  })

  ipcMain.handle('walnut:importBackup', async (_event, pin: string): Promise<RestoreResult> => {
    try {
      const result = await dialog.showOpenDialog({
        title: 'Open Walnut Backup',
        properties: ['openFile'],
        filters: [{ name: 'Walnut Backup', extensions: ['wbk'] }]
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { ok: false, error: 'Open cancelled.' }
      }

      const blob = readFileSync(result.filePaths[0])
      let plaintext: string
      try {
        plaintext = decryptBackup(blob, pin)
      } catch {
        return { ok: false, error: 'Wrong PIN or corrupted backup file.' }
      }

      const payload = JSON.parse(plaintext) as BackupPayload
      repository.importBackupPayload(payload)

      return { ok: true, householdName: payload.householdName }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { ok: false, error: message }
    }
  })
}
