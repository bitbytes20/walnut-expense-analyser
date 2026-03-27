export type ImportFileStatus =
  | 'ready'
  | 'needs-sheet-selection'
  | 'rejected'
  | 'duplicate-blocked'
  | 'processing'
  | 'imported'

export type ImportReasonCode =
  | 'unsupported-format'
  | 'missing-columns'
  | 'unsupported-sheet'
  | 'ambiguous-sheet'
  | 'duplicate-file'
  | 'duplicate-transactions'
  | 'parse-error'
  | 'unknown'

export interface WorksheetCandidate {
  name: string
  rowCount: number
  headerPreview: string[]
  recommended: boolean
}

export interface PriorImportBatchReference {
  priorBatchId: string
  batchLabel: string
  importedAt: string
  fileCount: number
  matchedFileName?: string
}

export interface ImportFileReason {
  reasonCode?: ImportReasonCode
  reasonTitle?: string
  reasonBody?: string
}

export interface NormalizedImportRow {
  transactionDateRaw: string
  valueDateRaw?: string
  rawNarration: string
  cleanedDescription: string
  debitAmountMinor?: number
  creditAmountMinor?: number
  runningBalanceMinor?: number
  direction: 'debit' | 'credit'
  reference?: string
  sourceFileId: string
  importBatchId: string
}

export interface StagedImportFile extends ImportFileReason {
  id: string
  fileName: string
  fileExtension: 'csv' | 'xls' | 'xlsx' | 'unknown'
  filePath?: string
  accountLabel?: string
  statementPeriodLabel?: string
  status: ImportFileStatus
  selectedWorksheetName?: string
  worksheetCandidates?: WorksheetCandidate[]
  warnings?: string[]
  rowsPreview?: NormalizedImportRow[]
  priorBatch?: PriorImportBatchReference
  importedTransactionCount?: number
}

export interface StageImportFilesInput {
  filePaths?: string[]
}

export interface StageImportFilesResult {
  stagedFiles: StagedImportFile[]
}

export interface ChooseImportSheetInput {
  stagedFileId: string
  worksheetName: string
}

export interface RemoveStagedFileInput {
  stagedFileId: string
}

export interface CommitImportBatchInput {
  stagedFileIds?: string[]
}

export interface CommitImportBatchResult {
  batchId: string
  importedAt: string
  importedFiles: StagedImportFile[]
  rejectedFiles: StagedImportFile[]
  duplicateBlockedFiles: StagedImportFile[]
  transactionsCreated: number
  lazyAccountCreated?: boolean
}

export interface PriorImportBatchInspection {
  priorBatchId: string
  batchLabel: string
  importedAt: string
  fileCount: number
  importedTransactionCount: number
  fileNames: string[]
  duplicateCauseFileName?: string
}
