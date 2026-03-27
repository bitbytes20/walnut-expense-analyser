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

export type ReviewItemReasonCode =
  | 'duplicate-candidate'
  | 'parser-uncertainty'
  | 'deferred-worksheet'
  | 'balance-continuity-warning'
  | 'unsupported-row-skipped'

export type ReviewItemSeverity = 'blocking' | 'warning'

export type ReviewItemState = 'pending' | 'resolved' | 'restored'

export interface ReviewItemSnapshot {
  sourceFileId?: string
  sourceFileName?: string
  rowIndex?: number
  message: string
  rawContent?: string
  parsedRow?: NormalizedImportRow
  priorBatch?: PriorImportBatchReference
  metadata?: Record<string, string | number | boolean | null>
}

export interface ReviewItemResolutionRef {
  batchId: string
  reviewItemId: string
}

export interface ReviewItem {
  id: string
  batchId: string
  importAttemptId: string
  sourceFileId?: string
  reasonCode: ReviewItemReasonCode
  severity: ReviewItemSeverity
  state: ReviewItemState
  title: string
  description: string
  snapshot: ReviewItemSnapshot
  createdAt: string
  updatedAt: string
  resolution?: ReviewItemResolutionRef
}

export type ImportAttemptStatus = 'imported' | 'needs-review' | 'rejected' | 'failed'

export interface ImportAttemptSummary {
  attemptId: string
  batchId: string
  status: ImportAttemptStatus
  importedAt: string
  accountLabel?: string
  batchLabel: string
  fileCount: number
  acceptedTransactionCount: number
  blockedDuplicateCount: number
  unresolvedReviewCount: number
  errorCount: number
  lastUpdatedAt: string
}

export interface ImportBatchDetailSummary extends ImportAttemptSummary {}

export type ImportBatchFileOutcomeStatus = 'imported' | 'duplicate-blocked' | 'rejected'

export interface ImportBatchFileOutcome extends StagedImportFile {
  outcome: ImportBatchFileOutcomeStatus
}

export interface ImportBatchTransaction extends NormalizedImportRow {
  id: string
}

export interface ImportBatchTransactionGroup {
  sourceFileId: string
  sourceFileName: string
  transactions: ImportBatchTransaction[]
}

export interface ImportBatchDetail {
  summary: ImportBatchDetailSummary
  reviewItems: ReviewItem[]
  fileOutcomes: ImportBatchFileOutcome[]
  transactionGroups: ImportBatchTransactionGroup[]
}

export interface ListImportHistoryInput {
  status?: ImportAttemptStatus
  query?: string
}

export interface GetImportBatchDetailInput {
  batchId: string
}

export interface GetReviewQueueInput {
  batchId?: string
  state?: ReviewItemState
}

export interface CommitImportBatchResult {
  attemptId: string
  batchId: string
  status: ImportAttemptStatus
  importedAt: string
  importedFiles: StagedImportFile[]
  rejectedFiles: StagedImportFile[]
  duplicateBlockedFiles: StagedImportFile[]
  transactionsCreated: number
  acceptedTransactionCount: number
  blockedDuplicateCount: number
  reviewItems: ReviewItem[]
  summary: ImportAttemptSummary
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
