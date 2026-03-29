import xlsx from 'xlsx'
import type { WorksheetCandidate } from '../../shared/contracts/import'
import { normalizeHeader } from './normalizers'

const requiredHeaderGroups = [
  ['transactiondate', 'valuedate'],
  ['transactionremarks', 'remarks', 'description', 'memo', 'narration'],
  ['withdrawalamountinr', 'withdrawalamount', 'debitamount', 'debit'],
  ['depositamountinr', 'depositamount', 'creditamount', 'credit'],
  ['balanceinr', 'balance']
]

const scoreHeaderRow = (row: string[]) => {
  const normalized = row.map((value) => normalizeHeader(String(value)))
  return requiredHeaderGroups.reduce((score, group) => {
    return score + (group.some((candidate) => normalized.includes(candidate)) ? 1 : 0)
  }, 0)
}

export const getWorksheetCandidates = (workbook: xlsx.WorkBook): WorksheetCandidate[] => {
  const scoredCandidates = workbook.SheetNames.flatMap((name) => {
    const sheet = workbook.Sheets[name]
    if (!sheet) {
      return []
    }

    const data = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as string[][]
    let bestRow: string[] | undefined
    let bestScore = 0

    for (const row of data) {
      const score = scoreHeaderRow(row.map((cell) => String(cell)))
      if (score > bestScore) {
        bestScore = score
        bestRow = row.map((cell) => String(cell))
      }
    }

    if (bestScore < 4 || !bestRow) {
      return []
    }

    return [
      {
        name,
        rowCount: data.length,
        headerPreview: bestRow.filter(Boolean),
        recommended: false,
        score: bestScore
      }
    ]
  })

  const highestScore = scoredCandidates.reduce((best, candidate) => Math.max(best, candidate.score), 0)
  const preferredName =
    scoredCandidates.find((candidate) => normalizeHeader(candidate.name) === 'optransactionhistory' && candidate.score === highestScore)?.name ??
    scoredCandidates.find((candidate) => candidate.score === highestScore)?.name

  return scoredCandidates.map(({ score: _score, ...candidate }) => ({
    ...candidate,
    recommended: candidate.name === preferredName
  }))
}
