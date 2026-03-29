import { BrowserWindow, dialog } from 'electron'
import type { StageImportFilesInput } from '../../shared/contracts/import'

export const pickImportFiles = async (window: BrowserWindow, input?: StageImportFilesInput) => {
  if (input?.filePaths?.length) {
    return input.filePaths
  }

  const result = await dialog.showOpenDialog(window, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      {
        name: 'Statement files',
        extensions: ['csv', 'xls', 'xlsx']
      }
    ]
  })

  return result.canceled ? [] : result.filePaths
}
