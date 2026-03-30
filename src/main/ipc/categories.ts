import { ipcMain } from 'electron'
import type {
  ApplyRuleToExistingInput,
  ArchiveCategoryInput,
  CreateCategoryInput,
  CreateCategorizationRuleInput,
  DeleteCategoryInput,
  DeleteCategorizationRuleInput,
  MergeCategoryInput,
  RuleExportEntry,
  ReorderRulesInput,
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
  ipcMain.handle('rules:reorder', (_event, input: ReorderRulesInput) => repository.reorderRules(input.ruleIds))
  ipcMain.handle('rules:test', (_event, input: RulePreviewInput) => repository.testRule(input))
  ipcMain.handle('rules:preview-apply', (_event, input: RulePreviewInput | ApplyRuleToExistingInput) =>
    repository.previewRuleApplyToExisting(input)
  )
  ipcMain.handle('rules:apply', (_event, input: ApplyRuleToExistingInput) => repository.applyRuleToExisting(input))

  ipcMain.handle('rules:export', async () => {
    const rules = repository.exportRules()
    if (rules.length === 0) return { success: false, reason: 'no-rules' }

    const { dialog } = await import('electron')
    const result = await dialog.showSaveDialog({
      defaultPath: `walnut-rules-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'Walnut Rules', extensions: ['json'] }]
    })
    if (result.canceled || !result.filePath) return { success: false, reason: 'canceled' }

    const { writeFileSync } = await import('node:fs')
    writeFileSync(result.filePath, JSON.stringify(rules, null, 2), 'utf-8')
    return { success: true, count: rules.length }
  })

  ipcMain.handle('rules:import-prepare', async () => {
    const { dialog } = await import('electron')
    const result = await dialog.showOpenDialog({
      filters: [{ name: 'Walnut Rules', extensions: ['json'] }],
      properties: ['openFile']
    })
    if (result.canceled || !result.filePaths.length) return null

    const { readFileSync } = await import('node:fs')
    const content = readFileSync(result.filePaths[0], 'utf-8')
    const entries = JSON.parse(content) as RuleExportEntry[]

    if (!Array.isArray(entries) || entries.some((e) => !e.name)) {
      throw new Error('Invalid rule file format')
    }

    const importResult = repository.prepareRuleImport(entries)
    return { result: importResult, entries }
  })

  ipcMain.handle(
    'rules:import-commit',
    (_event, input: { entries: RuleExportEntry[]; resolutions: Array<{ name: string; action: 'keep' | 'replace' | 'skip' }> }) =>
      repository.commitRuleImport(input.entries, input.resolutions)
  )
}
