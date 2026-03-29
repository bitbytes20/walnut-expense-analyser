import { ipcMain } from 'electron'
import { generateDiagnosticsBundle } from '../diagnostics/diagnostics'
import type { GenerateDiagnosticsBundleInput } from '../../shared/contracts/diagnostics'

export const registerDiagnosticsIpc = () => {
  ipcMain.handle('diagnostics:generate-bundle', (_event, input: GenerateDiagnosticsBundleInput) =>
    generateDiagnosticsBundle(input.type)
  )
}
