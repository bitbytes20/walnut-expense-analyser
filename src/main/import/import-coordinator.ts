import type {
  ChooseImportSheetInput,
  CommitImportBatchInput,
  CommitImportBatchResult,
  NormalizedImportRow,
  ImportAttemptStatus,
  PriorImportBatchInspection,
  PriorImportBatchReference,
  ReviewItem,
  ReviewItemSeverity,
  ReviewItemSnapshot,
  StagedImportFile,
  StageImportFilesResult
} from '../../shared/contracts/import'
import type { WalnutRepository } from '../persistence/db'
import { checkForDuplicates } from './duplicate-service'
import { parseImportFile, type ParsedImportFile } from './parser'

interface StagedRecord {
  parsedFile: ParsedImportFile
  fileFingerprint: string
  transactionSignatures: string[]
}

export interface ReviewSignalInput {
  signalType: ReviewItem['reasonCode']
  sourceFileId?: string
  sourceFileName?: string
  message: string
  parsedRow?: NormalizedImportRow
  priorBatch?: PriorImportBatchReference
  metadata?: ReviewItemSnapshot['metadata']
}

export interface ReviewGateResult {
  status: ImportAttemptStatus
  shouldFinalizeAcceptedTransactions: boolean
}

const REVIEW_SEVERITY_BY_REASON: Record<ReviewItem['reasonCode'], ReviewItemSeverity> = {
  'duplicate-candidate': 'blocking',
  'parser-uncertainty': 'blocking',
  'deferred-worksheet': 'blocking',
  'balance-continuity-warning': 'warning',
  'unsupported-row-skipped': 'warning'
}

const REVIEW_TITLE_BY_REASON: Record<ReviewItem['reasonCode'], string> = {
  'duplicate-candidate': 'Possible duplicate candidate',
  'parser-uncertainty': 'Parser uncertainty needs review',
  'deferred-worksheet': 'Worksheet choice still needs review',
  'balance-continuity-warning': 'Balance continuity warning',
  'unsupported-row-skipped': 'Unsupported row was skipped'
}

export const buildReviewItemsForSignals = (input: {
  batchId: string
  importAttemptId: string
  signals: ReviewSignalInput[]
}): ReviewItem[] =>
  input.signals.map((signal) => ({
    id: crypto.randomUUID(),
    batchId: input.batchId,
    importAttemptId: input.importAttemptId,
    sourceFileId: signal.sourceFileId,
    reasonCode: signal.signalType,
    severity: REVIEW_SEVERITY_BY_REASON[signal.signalType],
    state: 'pending',
    title: REVIEW_TITLE_BY_REASON[signal.signalType],
    description: signal.message,
    snapshot: {
      sourceFileId: signal.sourceFileId,
      sourceFileName: signal.sourceFileName,
      message: signal.message,
      parsedRow: signal.parsedRow,
      priorBatch: signal.priorBatch,
      metadata: signal.metadata
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    resolution: {
      batchId: input.batchId,
      reviewItemId: crypto.randomUUID()
    }
  }))

export const calculateReviewGate = (reviewItems: ReviewItem[], acceptedTransactionCount: number): ReviewGateResult => {
  const hasBlockingItems = reviewItems.some((item) => item.severity === 'blocking')
  if (hasBlockingItems) {
    return {
      status: 'needs-review',
      shouldFinalizeAcceptedTransactions: false
    }
  }

  if (reviewItems.length > 0) {
    return {
      status: 'needs-review',
      shouldFinalizeAcceptedTransactions: true
    }
  }

  if (acceptedTransactionCount <= 0) {
    return {
      status: 'rejected',
      shouldFinalizeAcceptedTransactions: false
    }
  }

  return {
    status: 'imported',
    shouldFinalizeAcceptedTransactions: true
  }
}

export class ImportCoordinator {
  private readonly stagedImportFiles = new Map<string, StagedRecord>()

  constructor(private readonly repository: WalnutRepository) {}

  stageFilePaths(filePaths: string[]): StageImportFilesResult {
    for (const filePath of filePaths) {
      const parsedFile = parseImportFile(filePath)
      this.stagedImportFiles.set(parsedFile.stagedFile.id, this.withDuplicateState(parsedFile))
    }

    return this.getStageResult()
  }

  chooseSheet(input: ChooseImportSheetInput): StageImportFilesResult {
    const existing = this.stagedImportFiles.get(input.stagedFileId)
    const filePath = existing?.parsedFile.stagedFile.filePath
    if (!filePath) {
      throw new Error(`Staged file ${input.stagedFileId} no longer exists.`)
    }

    const parsedFile = parseImportFile(filePath, input.worksheetName)
    this.stagedImportFiles.set(parsedFile.stagedFile.id, this.withDuplicateState(parsedFile))
    return this.getStageResult()
  }

  removeStagedFile(stagedFileId: string): StageImportFilesResult {
    this.stagedImportFiles.delete(stagedFileId)
    return this.getStageResult()
  }

  commitBatch(input?: CommitImportBatchInput): CommitImportBatchResult {
    const targetIds = input?.stagedFileIds?.length ? new Set(input.stagedFileIds) : undefined
    const selectedRecords = Array.from(this.stagedImportFiles.entries()).filter(([id]) => !targetIds || targetIds.has(id))
    const importedAt = new Date().toISOString()
    const batchId = crypto.randomUUID()
    const attemptId = crypto.randomUUID()

    const importedFiles: StagedImportFile[] = []
    const rejectedFiles: StagedImportFile[] = []
    const duplicateBlockedFiles: StagedImportFile[] = []
    const acceptedRecords: Array<{
      stagedFile: StagedImportFile
      fileFingerprint: string
      transactionSignatures: string[]
      rows: NormalizedImportRow[]
    }> = []
    const reviewSignals: ReviewSignalInput[] = []

    for (const [, record] of selectedRecords.map(([id, value]) => [id, value] as const)) {
      const stagedFile = record.parsedFile.stagedFile
      if (stagedFile.status === 'rejected') {
        rejectedFiles.push(stagedFile)
        continue
      }

      if (stagedFile.status === 'needs-sheet-selection') {
        reviewSignals.push({
          signalType: 'deferred-worksheet',
          sourceFileId: stagedFile.id,
          sourceFileName: stagedFile.fileName,
          message: stagedFile.reasonBody ?? 'Worksheet selection still needs review.',
          metadata: {
            worksheetCandidateCount: stagedFile.worksheetCandidates?.length ?? 0
          }
        })
        continue
      }

      const duplicateResult = checkForDuplicates(this.repository, record.parsedFile)
      if (duplicateResult.duplicateType && duplicateResult.priorBatch) {
        const duplicateFile = this.asDuplicateBlockedFile(record, duplicateResult.priorBatch, duplicateResult.duplicateType)
        duplicateBlockedFiles.push(duplicateFile)
        reviewSignals.push({
          signalType: 'duplicate-candidate',
          sourceFileId: duplicateFile.id,
          sourceFileName: duplicateFile.fileName,
          message:
            duplicateResult.duplicateType === 'file'
              ? 'A prior import matches this statement fingerprint.'
              : 'A prior import already contains these normalized transactions.',
          priorBatch: duplicateResult.priorBatch
        })
        this.stagedImportFiles.set(duplicateFile.id, {
          parsedFile: {
            ...record.parsedFile,
            stagedFile: duplicateFile
          },
          fileFingerprint: duplicateResult.fileFingerprint,
          transactionSignatures: duplicateResult.transactionSignatures
        })
        continue
      }

      if (stagedFile.warnings?.length) {
        for (const warning of stagedFile.warnings) {
          reviewSignals.push({
            signalType: 'balance-continuity-warning',
            sourceFileId: stagedFile.id,
            sourceFileName: stagedFile.fileName,
            message: warning
          })
        }
      }

      importedFiles.push(stagedFile)
      acceptedRecords.push({
        stagedFile,
        fileFingerprint: record.fileFingerprint,
        transactionSignatures: record.transactionSignatures,
        rows: record.parsedFile.rows
      })
    }

    const reviewItems = buildReviewItemsForSignals({
      batchId,
      importAttemptId: attemptId,
      signals: reviewSignals
    })
    const gate = calculateReviewGate(
      reviewItems,
      acceptedRecords.reduce((sum, file) => sum + file.rows.length, 0)
    )

    const finalizedAcceptedRecords = gate.shouldFinalizeAcceptedTransactions ? acceptedRecords : []
    const finalizedImportedFiles = gate.shouldFinalizeAcceptedTransactions ? importedFiles : []
    const batchLabel =
      finalizedImportedFiles[0]?.statementPeriodLabel || importedFiles[0]?.statementPeriodLabel
        ? `ICICI import ${(finalizedImportedFiles[0] ?? importedFiles[0])?.statementPeriodLabel}`
        : `ICICI import ${importedAt.slice(0, 10)}`
    const lazyAccountCreated =
      finalizedAcceptedRecords.length > 0 &&
      this.repository.loadAccountProfile() === undefined &&
      this.repository.saveAccountProfile({
        bankName: 'ICICI',
        displayName: (finalizedImportedFiles[0] ?? importedFiles[0])?.accountLabel?.split(' - ')[0]?.trim() || 'Primary ICICI',
        accountHolderName:
          (finalizedImportedFiles[0] ?? importedFiles[0])?.accountLabel?.split(' - ').slice(1).join(' - ').trim() ||
          this.repository.loadAppState().onboarding.profile?.ownerName ||
          'Walnut Owner',
        baseCurrency: 'INR',
        skippedDuringOnboarding: true
      }) !== undefined

    const commitResult = this.repository.persistImportAttempt({
      attemptId,
      batchId,
      batchLabel,
      status: gate.status,
      importedAt,
      accountLabel: (importedFiles[0] ?? rejectedFiles[0] ?? duplicateBlockedFiles[0])?.accountLabel,
      importedFiles: finalizedImportedFiles,
      rejectedFiles,
      duplicateBlockedFiles,
      acceptedFiles: finalizedAcceptedRecords,
      reviewItems,
      lazyAccountCreated
    })

    for (const importedFile of commitResult.importedFiles) {
      const existing = this.stagedImportFiles.get(importedFile.id)
      if (existing) {
        this.stagedImportFiles.set(importedFile.id, {
          ...existing,
          parsedFile: {
            ...existing.parsedFile,
            stagedFile: importedFile
          }
        })
      }
    }

    return {
      ...commitResult,
      rejectedFiles,
      duplicateBlockedFiles
    }
  }

  inspectPriorImportBatch(priorBatchId: string): PriorImportBatchInspection {
    return this.repository.inspectPriorImportBatch(priorBatchId)
  }

  getStagedFiles() {
    return this.getStageResult()
  }

  private withDuplicateState(parsedFile: ParsedImportFile): StagedRecord {
    const duplicateResult = checkForDuplicates(this.repository, parsedFile)

    if (!duplicateResult.duplicateType || !duplicateResult.priorBatch) {
      return {
        parsedFile,
        fileFingerprint: duplicateResult.fileFingerprint,
        transactionSignatures: duplicateResult.transactionSignatures
      }
    }

    return {
      parsedFile: {
        ...parsedFile,
        stagedFile: {
          ...parsedFile.stagedFile,
          status: 'duplicate-blocked',
          reasonCode: duplicateResult.duplicateType === 'file' ? 'duplicate-file' : 'duplicate-transactions',
          reasonTitle: 'Walnut already imported this statement',
          reasonBody:
            duplicateResult.duplicateType === 'file'
              ? 'This file matches a previously imported statement, even if the filename changed.'
              : 'These normalized transactions already exist in an earlier import batch.',
          priorBatch: duplicateResult.priorBatch
        }
      },
      fileFingerprint: duplicateResult.fileFingerprint,
      transactionSignatures: duplicateResult.transactionSignatures
    }
  }

  private asDuplicateBlockedFile(
    record: StagedRecord,
    priorBatch: PriorImportBatchReference,
    duplicateType: 'file' | 'transactions'
  ): StagedImportFile {
    return {
      ...record.parsedFile.stagedFile,
      status: 'duplicate-blocked',
      reasonCode: duplicateType === 'file' ? 'duplicate-file' : 'duplicate-transactions',
      reasonTitle: 'Walnut already imported this statement',
      reasonBody:
        duplicateType === 'file'
          ? 'This file matches a previously imported statement, even if the filename changed.'
          : 'These normalized transactions already exist in an earlier import batch.',
      priorBatch
    }
  }

  private getStageResult(): StageImportFilesResult {
    return {
      stagedFiles: Array.from(this.stagedImportFiles.values()).map((record) => record.parsedFile.stagedFile)
    }
  }
}
