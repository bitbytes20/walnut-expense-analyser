import { ipcMain } from 'electron'
import type { AppConfig } from '../../shared/contracts/app-state'
import { getWalnutRepository } from '../persistence/db'

export const registerSettingsIpc = () => {
  const repository = getWalnutRepository()

  ipcMain.handle('walnut:getAppConfig', () => repository.getAppConfig())
  ipcMain.handle('walnut:setAppConfig', (_event, input: Partial<AppConfig>) => repository.setAppConfig(input))
}
