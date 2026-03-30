import { dialog, ipcMain, type BrowserWindow } from 'electron'
import type {
  ChooseImportSheetInput,
  CommitImportBatchInput,
  GetImportBatchDetailInput,
  GetReviewQueueInput,
  ListImportHistoryInput,
  ReplaceStagedFileInput,
  ReviewItemResolutionInput,
  ReviewItemRestoreInput,
  StageImportFilesInput
} from '../../shared/contracts/import'
import { pickImportFiles } from '../import/file-picker'
import { ImportCoordinator } from '../import/import-coordinator'
import { getWalnutRepository } from '../persistence/db'

export const registerImportIpc = (window: BrowserWindow) => {
  const repository = getWalnutRepository()
  const coordinator = new ImportCoordinator(repository)

  ipcMain.handle('import:stage-files', async (_event, input?: StageImportFilesInput) => {
    const filePaths = await pickImportFiles(window, input)
    return coordinator.stageFilePaths(filePaths)
  })

  ipcMain.handle('import:replace-staged-file', async (_event, input: ReplaceStagedFileInput) => {
    let filePath = input.newFilePath
    if (!filePath) {
      const result = await dialog.showOpenDialog(window, {
        properties: ['openFile'],
        filters: [{ name: 'Statement files', extensions: ['csv', 'xls', 'xlsx'] }]
      })
      if (result.canceled || result.filePaths.length === 0) {
        return coordinator.stageFilePaths([])
      }
      filePath = result.filePaths[0]
    }
    return coordinator.replaceStagedFile(input.stagedFileId, filePath)
  })

  ipcMain.handle('import:choose-sheet', (_event, input: ChooseImportSheetInput) => coordinator.chooseSheet(input))
  ipcMain.handle('import:remove-staged-file', (_event, input: { stagedFileId: string }) => coordinator.removeStagedFile(input.stagedFileId))
  ipcMain.handle('import:commit-batch', (_event, input?: CommitImportBatchInput) => coordinator.commitBatch(input))
  ipcMain.handle('import:inspect-prior-batch', (_event, priorBatchId: string) => coordinator.inspectPriorImportBatch(priorBatchId))
  ipcMain.handle('import:list-history', (_event, input?: ListImportHistoryInput) => repository.listImportHistory(input))
  ipcMain.handle('import:get-batch-detail', (_event, input: GetImportBatchDetailInput) => repository.getImportBatchDetail(input))
  ipcMain.handle('import:get-review-queue', (_event, input?: GetReviewQueueInput) => repository.getReviewQueue(input))
  ipcMain.handle('import:resolve-review-items', (_event, input: ReviewItemResolutionInput) => repository.resolveReviewItems(input))
  ipcMain.handle('import:resolve-review-items-bulk', (_event, input: ReviewItemResolutionInput) => repository.resolveBulkReviewItems(input))
  ipcMain.handle('import:restore-review-items', (_event, input: ReviewItemRestoreInput) => repository.restoreReviewItems(input))
}
