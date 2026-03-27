import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import xlsx from 'xlsx'
import { afterEach, describe, expect, it } from 'vitest'
import { ImportCoordinator } from '../../../src/main/import/import-coordinator'
import { WalnutRepository } from '../../../src/main/persistence/db'

const fixtureDir = path.resolve(process.cwd(), 'tests/fixtures/import')
const tempDirs: string[] = []

const withTempDir = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'walnut-import-persistence-'))
  tempDirs.push(dir)
  return dir
}

afterEach(() => {
  while (tempDirs.length) {
    const dir = tempDirs.pop()
    if (dir && fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  }
})

const createRepository = () => new WalnutRepository(':memory:')

describe('import persistence', () => {
  it('persists only import metadata and normalized rows without statement blobs', () => {
    const repository = createRepository()
    const coordinator = new ImportCoordinator(repository)

    const result = coordinator.stageFilePaths([path.join(fixtureDir, 'icici-valid.xlsx')])
    expect(result.stagedFiles[0]?.status).toBe('ready')

    const commit = coordinator.commitBatch()
    expect(commit.transactionsCreated).toBeGreaterThan(0)

    const sqlite = (repository as unknown as { sqlite: import('better-sqlite3').Database }).sqlite
    const sourceColumns = sqlite.prepare('PRAGMA table_info(import_source_files)').all() as Array<{ name: string; type: string }>
    const transactionColumns = sqlite.prepare('PRAGMA table_info(imported_transactions)').all() as Array<{ name: string; type: string }>

    expect(sourceColumns.map((column) => column.name)).not.toContain('file_blob')
    expect(sourceColumns.map((column) => column.name)).not.toContain('file_contents')
    expect(sourceColumns.some((column) => column.type.toUpperCase() === 'BLOB')).toBe(false)
    expect(transactionColumns.map((column) => column.name)).toContain('raw_narration')
    expect(transactionColumns.map((column) => column.name)).toContain('cleaned_description')

    repository.close()
  })

  it('records mixed rejected and duplicate-candidate batches without finalizing accepted rows and still loads prior-batch details', () => {
    const repository = createRepository()
    const coordinator = new ImportCoordinator(repository)
    const originalPath = path.join(fixtureDir, 'icici-valid.xlsx')

    coordinator.stageFilePaths([originalPath])
    const firstCommit = coordinator.commitBatch()
    expect(firstCommit.importedFiles).toHaveLength(1)

    const tempDir = withTempDir()
    const uniquePath = path.join(tempDir, 'unique.xlsx')
    const workbook = xlsx.readFile(originalPath)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as string[][]
    rows[13][3] = '29/09/2016'
    rows[13][5] = 'UNIQUE SALARY CREDIT'
    rows[13][7] = '65000.00'
    rows[13][8] = '65000.00'
    const outputBook = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(outputBook, xlsx.utils.aoa_to_sheet(rows), 'OpTransactionHistory')
    xlsx.writeFile(outputBook, uniquePath)

    const staged = coordinator.stageFilePaths([
      path.join(fixtureDir, 'icici-unsupported-variant.xlsx'),
      originalPath,
      uniquePath
    ])

    expect(staged.stagedFiles.find((file) => file.fileName === 'icici-unsupported-variant.xlsx')?.status).toBe('rejected')
    const duplicateFile = staged.stagedFiles.find((file) => file.fileName === 'icici-valid.xlsx')
    expect(duplicateFile?.status).toBe('duplicate-blocked')
    expect(staged.stagedFiles.find((file) => file.fileName === 'unique.xlsx')?.status).toBe('ready')

    const secondCommit = coordinator.commitBatch()

    expect(secondCommit.status).toBe('needs-review')
    expect(secondCommit.importedFiles).toHaveLength(0)
    expect(secondCommit.rejectedFiles.map((file) => file.fileName)).toContain('icici-unsupported-variant.xlsx')
    expect(secondCommit.duplicateBlockedFiles.map((file) => file.fileName)).toContain('icici-valid.xlsx')
    expect(secondCommit.reviewItems.some((item) => item.reasonCode === 'duplicate-candidate' && item.severity === 'blocking')).toBe(true)
    expect(secondCommit.acceptedTransactionCount).toBe(0)
    expect(secondCommit.transactionsCreated).toBe(0)

    const inspection = coordinator.inspectPriorImportBatch(duplicateFile?.priorBatch?.priorBatchId ?? '')
    expect(inspection.fileNames).toContain('icici-valid.xlsx')
    expect(inspection.importedTransactionCount).toBeGreaterThan(0)

    repository.close()
  })
})
