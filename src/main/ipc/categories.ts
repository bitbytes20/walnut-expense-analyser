import { ipcMain } from 'electron'
import type {
  ApplyRuleToExistingInput,
  ArchiveCategoryInput,
  CreateCategoryInput,
  CreateCategorizationRuleInput,
  DeleteCategoryInput,
  DeleteCategorizationRuleInput,
  MergeCategoryInput,
  RulePreviewInput,
  ToggleCategorizationRuleInput,
  UpdateCategoryInput,
  UpdateCategorizationRuleInput
} from '../../shared/contracts/categories'
import { getWalnutRepository } from '../persistence/db'

export const registerCategoriesIpc = () => {
  const repository = getWalnutRepository()

  ipcMain.handle('categories:list', () => repository.listCategories())
  ipcMain.handle('categories:create', (_event, input: CreateCategoryInput) => repository.createCategory(input))
  ipcMain.handle('categories:update', (_event, input: UpdateCategoryInput) => repository.updateCategory(input))
  ipcMain.handle('categories:merge', (_event, input: MergeCategoryInput) => repository.mergeCategory(input))
  ipcMain.handle('categories:delete', (_event, input: DeleteCategoryInput) => repository.deleteCategory(input))
  ipcMain.handle('categories:merge-preview', (_event, input: { sourceCategoryId: string; targetCategoryId: string }) =>
    repository.mergeCategoryPreview(input.sourceCategoryId, input.targetCategoryId)
  )
  ipcMain.handle('categories:archive', (_event, input: ArchiveCategoryInput) =>
    repository.archiveCategory(input.categoryId, input.isArchived)
  )

  ipcMain.handle('rules:list', () => repository.listRules())
  ipcMain.handle('rules:create', (_event, input: CreateCategorizationRuleInput) => repository.createRule(input))
  ipcMain.handle('rules:update', (_event, input: UpdateCategorizationRuleInput) => repository.updateRule(input))
  ipcMain.handle('rules:toggle', (_event, input: ToggleCategorizationRuleInput) => repository.toggleRule(input))
  ipcMain.handle('rules:delete', (_event, input: DeleteCategorizationRuleInput) => repository.deleteRule(input))
  ipcMain.handle('rules:test', (_event, input: RulePreviewInput) => repository.testRule(input))
  ipcMain.handle('rules:preview-apply', (_event, input: RulePreviewInput | ApplyRuleToExistingInput) =>
    repository.previewRuleApplyToExisting(input)
  )
  ipcMain.handle('rules:apply', (_event, input: ApplyRuleToExistingInput) => repository.applyRuleToExisting(input))
}
