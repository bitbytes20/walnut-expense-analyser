import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import xlsx from 'xlsx'
import { afterEach, describe, expect, it } from 'vitest'
import { parseImportFile } from '../../../src/main/import/parser'
import type { ParseRowError } from '../../../src/shared/contracts/import'

const fixtureDir = path.resolve(process.cwd(), 'tests/fixtures/import')
const tempDirs: string[] = []

afterEach(() => {
  while (tempDirs.length) {
    const dir = tempDirs.pop()
    if (dir && fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  }
})

describe('import parser', () => {
  it('parses supported ICICI CSV, XLS, and XLSX fixtures into ready staged files', () => {
    for (const fileName of ['icici-valid.csv', 'icici-valid.xls', 'icici-valid.xlsx']) {
      const parsed = parseImportFile(path.join(fixtureDir, fileName))

      expect(parsed.stagedFile.status, `${fileName} should stage as ready`).toBe('ready')
      expect(parsed.stagedFile.accountLabel).toContain('INR')
      expect(parsed.stagedFile.statementPeriodLabel).toContain('to')
      expect(parsed.rows.length).toBeGreaterThan(0)
      expect(parsed.rows[0]?.rawNarration).toBeTruthy()
      expect(parsed.rows[0]?.cleanedDescription).toBe(parsed.rows[0]?.rawNarration)
    }
  })

  it('returns needs-sheet-selection when multiple worksheets look like ICICI transaction sheets', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'walnut-import-parser-'))
    tempDirs.push(tempDir)

    const workbook = xlsx.utils.book_new()
    const sharedRows = [
      ['', 'Account Number', '', '187501504556 ( INR )  - OMPRAKASH HARISHCHANDRA GAUTAM'],
      ['', 'Transaction Date from', '', '01/07/2016', 'to', '31/12/2016'],
      ['', 'S No.', 'Value Date', 'Transaction Date', 'Cheque Number', 'Transaction Remarks', 'Withdrawal Amount(INR)', 'Deposit Amount(INR)', 'Balance(INR)'],
      ['', '1', '30/09/2016', '30/09/2016', '', 'BY SAL SEP 16', '0.00', '64021.00', '64021.00']
    ]
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet(sharedRows), 'OpTransactionHistory')
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet(sharedRows), 'Transactions')

    const filePath = path.join(tempDir, 'ambiguous.xlsx')
    xlsx.writeFile(workbook, filePath)

    const parsed = parseImportFile(filePath)

    expect(parsed.stagedFile.status).toBe('needs-sheet-selection')
    expect(parsed.stagedFile.worksheetCandidates).toHaveLength(2)
    expect(parsed.stagedFile.worksheetCandidates?.some((candidate) => candidate.recommended)).toBe(true)
  })

  it('populates parseErrors with rowNumber, expected, found, and suggestion when a row has an invalid date', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'walnut-import-parser-'))
    tempDirs.push(tempDir)

    const workbook = xlsx.utils.book_new()
    const rows = [
      ['', 'Account Number', '', '187501504556 ( INR )  - TEST USER'],
      ['', 'Transaction Date from', '', '01/01/2017', 'to', '31/12/2017'],
      ['', 'S No.', 'Value Date', 'Transaction Date', 'Cheque Number', 'Transaction Remarks', 'Withdrawal Amount(INR)', 'Deposit Amount(INR)', 'Balance(INR)'],
      ['', '1', 'INVALID-DATE', 'INVALID-DATE', '', 'Salary Payment', '0.00', '50000.00', '50000.00']
    ]
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet(rows), 'Transactions')
    const filePath = path.join(tempDir, 'bad-date.xlsx')
    xlsx.writeFile(workbook, filePath)

    const parsed = parseImportFile(filePath, 'Transactions')

    expect(parsed.stagedFile.parseErrors).toBeDefined()
    expect(parsed.stagedFile.parseErrors?.length).toBeGreaterThan(0)
    const err = parsed.stagedFile.parseErrors?.[0] as ParseRowError
    expect(err.rowNumber).toBeGreaterThan(0)
    expect(err.expected).toContain('DD/MM/YYYY')
    expect(err.found).toBeTruthy()
    expect(err.suggestion).toBeTruthy()
  })

  it('populates parseErrors with correct fields when a row has a non-numeric amount', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'walnut-import-parser-'))
    tempDirs.push(tempDir)

    const workbook = xlsx.utils.book_new()
    const rows = [
      ['', 'Account Number', '', '187501504556 ( INR )  - TEST USER'],
      ['', 'Transaction Date from', '', '01/01/2017', 'to', '31/12/2017'],
      ['', 'S No.', 'Value Date', 'Transaction Date', 'Cheque Number', 'Transaction Remarks', 'Withdrawal Amount(INR)', 'Deposit Amount(INR)', 'Balance(INR)'],
      ['', '1', '27/01/2017', '27/01/2017', '', 'Salary', 'N/A', '0.00', 'BADBALANCE']
    ]
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet(rows), 'Transactions')
    const filePath = path.join(tempDir, 'bad-amount.xlsx')
    xlsx.writeFile(workbook, filePath)

    const parsed = parseImportFile(filePath, 'Transactions')

    expect(parsed.stagedFile.parseErrors).toBeDefined()
    expect(parsed.stagedFile.parseErrors?.length).toBeGreaterThan(0)
    const err = parsed.stagedFile.parseErrors?.[0] as ParseRowError
    expect(err.expected).toContain('numeric')
    expect(err.found).toBeTruthy()
    expect(err.suggestion).toBeTruthy()
  })

  it('collects parseErrors from multiple bad rows', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'walnut-import-parser-'))
    tempDirs.push(tempDir)

    const workbook = xlsx.utils.book_new()
    const rows = [
      ['', 'Account Number', '', '187501504556 ( INR )  - TEST USER'],
      ['', 'Transaction Date from', '', '01/01/2017', 'to', '31/12/2017'],
      ['', 'S No.', 'Value Date', 'Transaction Date', 'Cheque Number', 'Transaction Remarks', 'Withdrawal Amount(INR)', 'Deposit Amount(INR)', 'Balance(INR)'],
      ['', '1', 'BAD-DATE-1', 'BAD-DATE-1', '', 'First payment', '0.00', '50000.00', '50000.00'],
      ['', '2', 'BAD-DATE-2', 'BAD-DATE-2', '', 'Second payment', '0.00', '60000.00', '110000.00']
    ]
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet(rows), 'Transactions')
    const filePath = path.join(tempDir, 'multi-bad.xlsx')
    xlsx.writeFile(workbook, filePath)

    const parsed = parseImportFile(filePath, 'Transactions')

    expect(parsed.stagedFile.parseErrors).toBeDefined()
    expect(parsed.stagedFile.parseErrors?.length).toBeGreaterThanOrEqual(2)
  })

  it('has no parseErrors when all rows are valid', () => {
    const parsed = parseImportFile(path.join(fixtureDir, 'icici-valid.csv'))
    expect(parsed.stagedFile.parseErrors === undefined || parsed.stagedFile.parseErrors?.length === 0).toBe(true)
  })

  it('uses the selected worksheet when ambiguity is resolved explicitly', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'walnut-import-parser-'))
    tempDirs.push(tempDir)

    const workbook = xlsx.utils.book_new()
    const decoyRows = [['Date', 'Narration', 'Amount']]
    const validRows = [
      ['', 'Account Number', '', '187501504556 ( INR )  - OMPRAKASH HARISHCHANDRA GAUTAM'],
      ['', 'Transaction Date from', '', '01/01/2017', 'to', '31/12/2017'],
      ['', 'S No.', 'Value Date', 'Transaction Date', 'Cheque Number', 'Transaction Remarks', 'Withdrawal Amount(INR)', 'Deposit Amount(INR)', 'Balance(INR)'],
      ['', '1', '27/01/2017', '27/01/2017', '', 'UPI/702721269163/omprakash201194@ubi', '0.00', '100.00', '10194.62']
    ]
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet(validRows), 'Transactions')
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet(decoyRows), 'Summary')

    const filePath = path.join(tempDir, 'selected-sheet.xlsx')
    xlsx.writeFile(workbook, filePath)

    const parsed = parseImportFile(filePath, 'Transactions')

    expect(parsed.stagedFile.status).toBe('ready')
    expect(parsed.stagedFile.selectedWorksheetName).toBe('Transactions')
    expect(parsed.rows[0]?.direction).toBe('credit')
  })
})
