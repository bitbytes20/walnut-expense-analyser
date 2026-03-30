import { ipcMain } from 'electron'
import {
  DeleteFilterPresetInputSchema,
  RenameFilterPresetInputSchema,
  SaveFilterPresetInputSchema
} from '../../shared/contracts/transactions'
import { getWalnutRepository } from '../persistence/db'

export const registerFilterPresetsIpc = () => {
  const repository = getWalnutRepository()
  ipcMain.handle('filter-presets:list', () => repository.listFilterPresets())
  ipcMain.handle('filter-presets:save', (_event, input) => {
    const validated = SaveFilterPresetInputSchema.parse(input)
    return repository.saveFilterPreset(validated)
  })
  ipcMain.handle('filter-presets:rename', (_event, input) => {
    const validated = RenameFilterPresetInputSchema.parse(input)
    return repository.renameFilterPreset(validated)
  })
  ipcMain.handle('filter-presets:delete', (_event, input) => {
    const validated = DeleteFilterPresetInputSchema.parse(input)
    return repository.deleteFilterPreset(validated)
  })
}
