import { ipcMain } from 'electron'
import type { DashboardPreferences, DashboardRecurringDetailInput, DashboardSnapshotQuery } from '../../shared/contracts/dashboard'
import { getWalnutRepository } from '../persistence/db'

export const registerDashboardIpc = () => {
  const repository = getWalnutRepository()

  ipcMain.handle('dashboard:get-preferences', () => repository.getDashboardPreferences())
  ipcMain.handle('dashboard:set-preferences', (_event, input: DashboardPreferences) => repository.setDashboardPreferences(input))
  ipcMain.handle('dashboard:get-snapshot', (_event, input: DashboardSnapshotQuery) => repository.getDashboardSnapshot(input))
  ipcMain.handle('dashboard:get-recurring-detail', (_event, input: DashboardRecurringDetailInput) => repository.getRecurringDetail(input))
}
