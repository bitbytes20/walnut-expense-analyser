import path from 'node:path'
import xlsx from 'xlsx'
import { describe, expect, it } from 'vitest'

const fixtureDir = path.resolve(process.cwd(), 'tests/fixtures/import')
const sampleDir = path.resolve(process.cwd(), 'sample_files')

const readWorkbook = (filePath: string) => xlsx.readFile(filePath)

describe('import rejection fixtures', () => {
  it('keeps the unsupported workbook variant visibly different from the supported ICICI source shape', () => {
    const unsupportedWorkbook = readWorkbook(path.join(fixtureDir, 'icici-unsupported-variant.xlsx'))
    const summaryRows = xlsx.utils.sheet_to_json(unsupportedWorkbook.Sheets.Summary, { header: 1, defval: '' }) as string[][]
    const transactionsRows = xlsx.utils.sheet_to_json(unsupportedWorkbook.Sheets.Transactions, { header: 1, defval: '' }) as string[][]

    expect(unsupportedWorkbook.SheetNames).toEqual(['Summary', 'Transactions'])
    expect(summaryRows[0]?.slice(0, 2)).toEqual(['Export Type', 'Statement Summary'])
    expect(transactionsRows[0]?.slice(0, 4)).toEqual(['S No.', 'Booked On', 'Memo', 'Amount'])
    expect(transactionsRows[0]).not.toContain('Transaction Remarks')
    expect(transactionsRows[0]).not.toContain('Withdrawal Amount(INR)')
  })

  it('uses the real OpTransactionHistory sample files as the source-of-truth baseline for supported columns', () => {
    const sampleWorkbook = readWorkbook(path.join(sampleDir, 'OpTransactionHistory-2017.xls'))
    const rows = xlsx.utils.sheet_to_json(sampleWorkbook.Sheets.OpTransactionHistory, { header: 1, defval: '' }) as string[][]
    const headerIndex = rows.findIndex((row) => row.includes('Transaction Remarks'))
    const headerRow = rows[headerIndex]

    expect(headerRow).toContain('Value Date')
    expect(headerRow).toContain('Transaction Date')
    expect(headerRow).toContain('Withdrawal Amount(INR)')
    expect(headerRow).toContain('Deposit Amount(INR)')
    expect(headerRow).toContain('Balance(INR)')
  })
})
