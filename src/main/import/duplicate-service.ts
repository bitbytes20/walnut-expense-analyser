import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import type { PriorImportBatchReference } from '../../shared/contracts/import'
import type { WalnutRepository } from '../persistence/db'
import type { ParsedImportFile } from './parser'
import { normalizeDateForSignature, normalizeNarrationForSignature } from './normalizers'

export interface DuplicateCheckResult {
  duplicateType?: 'file' | 'transactions'
  priorBatch?: PriorImportBatchReference
  fileFingerprint: string
  transactionSignatures: string[]
}

export const createFileFingerprint = (filePath: string) =>
  createHash('sha256').update(readFileSync(filePath)).digest('hex')

export const createTransactionSignature = (row: ParsedImportFile['rows'][number]) => {
  const signedAmount = row.creditAmountMinor && row.creditAmountMinor > 0 ? row.creditAmountMinor : -(row.debitAmountMinor ?? 0)
  return createHash('sha256')
    .update(
      JSON.stringify({
        transactionDate: normalizeDateForSignature(row.transactionDateRaw),
        valueDate: normalizeDateForSignature(row.valueDateRaw),
        amountMinor: signedAmount,
        narration: normalizeNarrationForSignature(row.rawNarration),
        reference: normalizeNarrationForSignature(row.reference ?? ''),
        runningBalanceMinor: row.runningBalanceMinor ?? null
      })
    )
    .digest('hex')
}

export const checkForDuplicates = (repository: WalnutRepository, parsedFile: ParsedImportFile): DuplicateCheckResult => {
  const fileFingerprint = parsedFile.stagedFile.filePath ? createFileFingerprint(parsedFile.stagedFile.filePath) : ''
  const fingerprintMatch = fileFingerprint ? repository.findDuplicateImportByFingerprint(fileFingerprint) : undefined
  if (fingerprintMatch) {
    return {
      duplicateType: 'file',
      priorBatch: fingerprintMatch,
      fileFingerprint,
      transactionSignatures: []
    }
  }

  const transactionSignatures = parsedFile.rows.map(createTransactionSignature)
  const transactionMatch = repository.findDuplicateImportByTransactionSignatures(transactionSignatures)

  return {
    duplicateType: transactionMatch ? 'transactions' : undefined,
    priorBatch: transactionMatch,
    fileFingerprint,
    transactionSignatures
  }
}
