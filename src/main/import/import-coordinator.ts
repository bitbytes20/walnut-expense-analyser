import type {
  ChooseImportSheetInput,
  CommitImportBatchInput,
  CommitImportBatchResult,
  PriorImportBatchInspection,
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

    const readyRecords = selectedRecords
      .map(([, record]) => record)
      .filter((record) => record.parsedFile.stagedFile.status === 'ready')
      .map((record) => {
        const duplicateResult = checkForDuplicates(this.repository, record.parsedFile)
        if (duplicateResult.duplicateType && duplicateResult.priorBatch) {
          const blocked: StagedRecord = {
            parsedFile: {
              ...record.parsedFile,
              stagedFile: {
                ...record.parsedFile.stagedFile,
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
          this.stagedImportFiles.set(record.parsedFile.stagedFile.id, blocked)
          return undefined
        }

        return {
          stagedFile: record.parsedFile.stagedFile,
          fileFingerprint: record.fileFingerprint,
          transactionSignatures: record.transactionSignatures,
          rows: record.parsedFile.rows
        }
      })
      .filter((record): record is NonNullable<typeof record> => Boolean(record))

    const commitResult = this.repository.persistImportBatch(readyRecords)
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
      rejectedFiles: selectedRecords
        .map(([, record]) => record.parsedFile.stagedFile)
        .filter((file) => file.status === 'rejected'),
      duplicateBlockedFiles: selectedRecords
        .map(([, record]) => this.stagedImportFiles.get(record.parsedFile.stagedFile.id)?.parsedFile.stagedFile ?? record.parsedFile.stagedFile)
        .filter((file) => file.status === 'duplicate-blocked')
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

  private getStageResult(): StageImportFilesResult {
    return {
      stagedFiles: Array.from(this.stagedImportFiles.values()).map((record) => record.parsedFile.stagedFile)
    }
  }
}
