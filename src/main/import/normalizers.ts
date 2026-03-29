import { format, parse } from 'date-fns'

export const normalizeHeader = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '')

export const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim()

export const parseMinorUnits = (value: string | number | undefined) => {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  const normalized = String(value).replace(/,/g, '').trim()
  if (!normalized) {
    return undefined
  }

  const numeric = Number(normalized)
  if (Number.isNaN(numeric)) {
    return undefined
  }

  return Math.round(numeric * 100)
}

export const normalizeDateForSignature = (value: string | undefined) => {
  if (!value) {
    return ''
  }

  const trimmed = value.trim()
  const patterns = ['dd/MM/yyyy', 'd/M/yyyy', 'yyyy-MM-dd']
  for (const pattern of patterns) {
    const parsed = parse(trimmed, pattern, new Date())
    if (!Number.isNaN(parsed.getTime())) {
      return format(parsed, 'yyyy-MM-dd')
    }
  }

  return trimmed.toLowerCase()
}

export const normalizeNarrationForSignature = (value: string) =>
  normalizeWhitespace(value)
    .toLowerCase()
    .replace(/\s+/g, '')
