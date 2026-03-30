import path from 'node:path'
import { parse } from 'date-fns'
import xlsx from 'xlsx'
import type { ImportReasonCode, ParseRowError, StagedImportFile, WorksheetCandidate } from '../../shared/contracts/import'
import type { NormalizedImportRow } from '../../shared/contracts/import'
import { normalizeWhitespace, parseMinorUnits } from './normalizers'
import { getWorksheetCandidates } from './worksheet-selector'

const DATE_PATTERNS = ['dd/MM/yyyy', 'd/M/yyyy', 'yyyy-MM-dd']

// Excel date serials are positive numbers typically between 1 (1900-01-01) and ~80000 (2100s)
const EXCEL_SERIAL_MIN = 1
const EXCEL_SERIAL_MAX = 80000

const isValidDate = (value: string): boolean => {
  const trimmed = value.trim()
  if (!trimmed) return false
  // Accept Excel serial date numbers (xlsx returns these when date cells are numeric)
  const asNum = Number(trimmed)
  if (!Number.isNaN(asNum) && asNum >= EXCEL_SERIAL_MIN && asNum <= EXCEL_SERIAL_MAX) return true
  for (const pattern of DATE_PATTERNS) {
    const parsed = parse(trimmed, pattern, new Date())
    if (!Number.isNaN(parsed.getTime())) return true
  }
  return false
}

const isValidNumeric = (value: string | number | undefined): boolean => {
  if (value === undefined || value === null || value === '') return true // undefined is acceptable (optional field)
  const normalized = String(value).replace(/,/g, '').trim()
  if (!normalized) return true
  return !Number.isNaN(Number(normalized))
}

export interface ParsedImportFile {
  stagedFile: StagedImportFile
  rows: NormalizedImportRow[]
}

interface ColumnIndexes {
  transactionDate: number
  valueDate?: number
  narration: number
  withdrawal: number
  deposit: number
  balance: number
  reference?: number
}

const canonicalReasonBody =
  'Walnut supports ICICI statement exports when key transaction columns are recognizable. Use the detailed transaction export and keep the transaction remarks, debit, credit, and balance columns.'

const getFileExtension = (filePath: string): StagedImportFile['fileExtension'] => {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.csv' || ext === '.xls' || ext === '.xlsx') {
    return ext.slice(1) as StagedImportFile['fileExtension']
  }

  return 'unknown'
}

const createRejectedFile = (
  filePath: string,
  reasonCode: ImportReasonCode,
  reasonTitle: string,
  reasonBody: string,
  worksheetCandidates?: WorksheetCandidate[]
): ParsedImportFile => ({
  stagedFile: {
    id: filePath,
    fileName: path.basename(filePath),
    fileExtension: getFileExtension(filePath),
    filePath,
    status: 'rejected',
    reasonCode,
    reasonTitle,
    reasonBody,
    worksheetCandidates
  },
  rows: []
})

const findRowByLabel = (rows: string[][], label: string) =>
  rows.find((row) => row.some((cell) => normalizeWhitespace(String(cell)) === label))

const extractMetadata = (rows: string[][]) => {
  const accountRow = findRowByLabel(rows, 'Account Number')
  const dateRangeRow = findRowByLabel(rows, 'Transaction Date from')

  return {
    accountLabel: accountRow?.[3] ? normalizeWhitespace(String(accountRow[3])) : undefined,
    statementPeriodLabel:
      dateRangeRow?.[3] && dateRangeRow?.[5]
        ? `${normalizeWhitespace(String(dateRangeRow[3]))} to ${normalizeWhitespace(String(dateRangeRow[5]))}`
        : undefined
  }
}

const findHeaderRowIndex = (rows: string[][]) =>
  rows.findIndex((row) => {
    const values = row.map((cell) => normalizeWhitespace(String(cell)))
    return (
      values.includes('Transaction Remarks') &&
      values.includes('Withdrawal Amount(INR)') &&
      values.includes('Deposit Amount(INR)') &&
      values.includes('Balance(INR)') &&
      (values.includes('Transaction Date') || values.includes('Value Date'))
    )
  })

const resolveColumns = (headerRow: string[]): ColumnIndexes | undefined => {
  const findColumn = (...candidates: string[]) =>
    headerRow.findIndex((value) => candidates.includes(normalizeWhitespace(String(value))))

  const transactionDate = findColumn('Transaction Date')
  const valueDate = findColumn('Value Date')
  const narration = findColumn('Transaction Remarks')
  const withdrawal = findColumn('Withdrawal Amount(INR)')
  const deposit = findColumn('Deposit Amount(INR)')
  const balance = findColumn('Balance(INR)')
  const reference = findColumn('Cheque Number')

  if (narration === -1 || withdrawal === -1 || deposit === -1 || balance === -1 || (transactionDate === -1 && valueDate === -1)) {
    return undefined
  }

  return {
    transactionDate: transactionDate === -1 ? valueDate : transactionDate,
    valueDate: valueDate === -1 ? undefined : valueDate,
    narration,
    withdrawal,
    deposit,
    balance,
    reference: reference === -1 ? undefined : reference
  }
}

const buildRows = (fileId: string, rows: string[][], headerRowIndex: number, columns: ColumnIndexes) => {
  const normalizedRows: NormalizedImportRow[] = []
  const warnings: string[] = []
  const parseErrors: ParseRowError[] = []
  let previousBalance: number | undefined

  for (let i = 0; i < rows.slice(headerRowIndex + 1).length; i++) {
    const row = rows[headerRowIndex + 1 + i]!
    // 1-based row number in source file; header is at headerRowIndex+1 (1-based), data starts after
    const sourceRowNumber = headerRowIndex + 2 + i

    const transactionDateRaw = normalizeWhitespace(String(row[columns.transactionDate] ?? ''))
    const valueDateRaw = columns.valueDate === undefined ? undefined : normalizeWhitespace(String(row[columns.valueDate] ?? ''))
    const rawNarration = normalizeWhitespace(String(row[columns.narration] ?? ''))
    const rawWithdrawal = row[columns.withdrawal] as string | number | undefined
    const rawDeposit = row[columns.deposit] as string | number | undefined
    const rawBalance = row[columns.balance] as string | number | undefined
    const debitAmountMinor = parseMinorUnits(rawWithdrawal)
    const creditAmountMinor = parseMinorUnits(rawDeposit)
    const runningBalanceMinor = parseMinorUnits(rawBalance)
    const reference = columns.reference === undefined ? undefined : normalizeWhitespace(String(row[columns.reference] ?? '')) || undefined

    if (!transactionDateRaw && !valueDateRaw && !rawNarration && debitAmountMinor === undefined && creditAmountMinor === undefined) {
      continue
    }

    // Date validation
    const primaryDate = transactionDateRaw || valueDateRaw || ''
    if (primaryDate && !isValidDate(primaryDate)) {
      parseErrors.push({
        rowNumber: sourceRowNumber,
        expected: 'date in DD/MM/YYYY format',
        found: `'${primaryDate}'`,
        suggestion: 'Remove this row or correct the date value.'
      })
    }

    // Amount validation — check withdrawal and balance for non-numeric content
    const withdrawalStr = String(rawWithdrawal ?? '')
    if (withdrawalStr && withdrawalStr !== '0' && withdrawalStr !== '0.00' && !isValidNumeric(rawWithdrawal)) {
      parseErrors.push({
        rowNumber: sourceRowNumber,
        expected: 'numeric amount value',
        found: `'${withdrawalStr}'`,
        suggestion: 'Ensure the amount column contains a number.'
      })
    }

    const balanceStr = String(rawBalance ?? '')
    if (balanceStr && !isValidNumeric(rawBalance)) {
      parseErrors.push({
        rowNumber: sourceRowNumber,
        expected: 'numeric amount value',
        found: `'${balanceStr}'`,
        suggestion: 'Ensure the amount column contains a number.'
      })
    }

    const direction = creditAmountMinor && creditAmountMinor > 0 && (!debitAmountMinor || debitAmountMinor === 0) ? 'credit' : 'debit'

    if (previousBalance !== undefined && runningBalanceMinor !== undefined) {
      const expected = previousBalance - (debitAmountMinor ?? 0) + (creditAmountMinor ?? 0)
      if (expected !== runningBalanceMinor) {
        warnings.push(`Balance continuity warning near ${transactionDateRaw || valueDateRaw || rawNarration}.`)
      }
    }
    previousBalance = runningBalanceMinor

    normalizedRows.push({
      transactionDateRaw,
      valueDateRaw: valueDateRaw || undefined,
      rawNarration,
      cleanedDescription: rawNarration,
      debitAmountMinor,
      creditAmountMinor,
      runningBalanceMinor,
      direction,
      reference,
      sourceFileId: fileId,
      importBatchId: 'pending-import-batch'
    })
  }

  return {
    normalizedRows,
    warnings,
    parseErrors
  }
}

export const parseImportFile = (filePath: string, selectedWorksheetName?: string): ParsedImportFile => {
  const fileExtension = getFileExtension(filePath)
  if (fileExtension === 'unknown') {
    return createRejectedFile(filePath, 'unsupported-format', 'Unsupported file type', canonicalReasonBody)
  }

  try {
    const workbook = xlsx.readFile(filePath, { raw: false, cellDates: false })
    const worksheetCandidates = getWorksheetCandidates(workbook)

    if (worksheetCandidates.length === 0) {
      return createRejectedFile(filePath, 'missing-columns', 'ICICI columns were not recognized', canonicalReasonBody)
    }

    if (worksheetCandidates.length > 1 && !selectedWorksheetName) {
      const fallbackSheet = workbook.Sheets[worksheetCandidates[0].name]
      const fallbackRows = xlsx.utils.sheet_to_json(fallbackSheet, { header: 1, defval: '' }) as string[][]
      const metadata = extractMetadata(fallbackRows)

      return {
        stagedFile: {
          id: filePath,
          fileName: path.basename(filePath),
          fileExtension,
          filePath,
          accountLabel: metadata.accountLabel,
          statementPeriodLabel: metadata.statementPeriodLabel,
          status: 'needs-sheet-selection',
          worksheetCandidates,
          reasonCode: 'ambiguous-sheet',
          reasonTitle: 'Choose the worksheet to import',
          reasonBody: 'More than one worksheet looks like an ICICI transaction sheet. Review the recommended sheet before continuing.'
        },
        rows: []
      }
    }

    const worksheetName = selectedWorksheetName ?? worksheetCandidates.find((candidate) => candidate.recommended)?.name ?? worksheetCandidates[0]?.name
    if (!worksheetName) {
      return createRejectedFile(filePath, 'unsupported-sheet', 'No worksheet could be selected', canonicalReasonBody, worksheetCandidates)
    }

    const worksheet = workbook.Sheets[worksheetName]
    const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as string[][]
    const metadata = extractMetadata(rows)
    const headerRowIndex = findHeaderRowIndex(rows)
    if (headerRowIndex === -1) {
      return createRejectedFile(filePath, 'missing-columns', 'ICICI columns were not recognized', canonicalReasonBody, worksheetCandidates)
    }

    const columns = resolveColumns(rows[headerRowIndex]?.map((cell) => String(cell)) ?? [])
    if (!columns) {
      return createRejectedFile(filePath, 'missing-columns', 'ICICI columns were not recognized', canonicalReasonBody, worksheetCandidates)
    }

    const { normalizedRows, warnings, parseErrors } = buildRows(filePath, rows, headerRowIndex, columns)
    if (normalizedRows.length === 0 && parseErrors.length === 0) {
      return createRejectedFile(filePath, 'parse-error', 'No transaction rows were found', canonicalReasonBody, worksheetCandidates)
    }

    const hasParseErrors = parseErrors.length > 0

    return {
      stagedFile: {
        id: filePath,
        fileName: path.basename(filePath),
        fileExtension,
        filePath,
        accountLabel: metadata.accountLabel,
        statementPeriodLabel: metadata.statementPeriodLabel,
        status: hasParseErrors ? 'rejected' : 'ready',
        selectedWorksheetName: worksheetName,
        worksheetCandidates,
        warnings,
        parseErrors: hasParseErrors ? parseErrors : undefined,
        reasonCode: hasParseErrors ? 'parse-error' : undefined,
        reasonTitle: hasParseErrors ? 'Some rows could not be parsed' : undefined,
        reasonBody: hasParseErrors ? 'One or more rows contain invalid data. Expand the error details to see which rows need correction.' : undefined,
        rowsPreview: normalizedRows.slice(0, 3)
      },
      rows: normalizedRows
    }
  } catch (error) {
    return createRejectedFile(
      filePath,
      'parse-error',
      'Walnut could not read this statement',
      error instanceof Error ? error.message : canonicalReasonBody
    )
  }
}
