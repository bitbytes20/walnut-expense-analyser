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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'walnut-import-duplicates-'))
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

describe('import duplicate detection', () => {
  it('blocks a renamed file using its file fingerprint', () => {
    const repository = createRepository()
    const coordinator = new ImportCoordinator(repository)
    const originalPath = path.join(fixtureDir, 'icici-valid.xlsx')

    coordinator.stageFilePaths([originalPath])
    coordinator.commitBatch()

    const duplicateDir = withTempDir()
    const renamedPath = path.join(duplicateDir, 'renamed-import.xlsx')
    fs.copyFileSync(originalPath, renamedPath)

    const staged = coordinator.stageFilePaths([renamedPath]).stagedFiles.find((file) => file.fileName === 'renamed-import.xlsx')

    expect(staged?.status).toBe('duplicate-blocked')
    expect(staged?.reasonCode).toBe('duplicate-file')
    expect(staged?.priorBatch?.priorBatchId).toBeTruthy()

    repository.close()
  })

  it('blocks reformatted statement rows using normalized transaction signatures', () => {
    const repository = createRepository()
    const coordinator = new ImportCoordinator(repository)
    const originalPath = path.join(fixtureDir, 'icici-valid.xlsx')

    coordinator.stageFilePaths([originalPath])
    coordinator.commitBatch()

    const workbook = xlsx.readFile(originalPath)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as string[][]
    rows[13][5] = '  by   sal sep 16  '
    rows[14][5] = 'mmt/ref627415075707/3688010000280'

    const duplicateDir = withTempDir()
    const reformattedPath = path.join(duplicateDir, 'reformatted.xlsx')
    const outputBook = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(outputBook, xlsx.utils.aoa_to_sheet(rows), 'OpTransactionHistory')
    xlsx.writeFile(outputBook, reformattedPath)

    const staged = coordinator.stageFilePaths([reformattedPath]).stagedFiles.find((file) => file.fileName === 'reformatted.xlsx')

    expect(staged?.status).toBe('duplicate-blocked')
    expect(staged?.reasonCode).toBe('duplicate-transactions')
    expect(staged?.priorBatch?.priorBatchId).toBeTruthy()

    repository.close()
  })
})
