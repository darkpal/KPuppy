import type { HistoryItem } from '../api/kinopub'

export const HISTORY_SERIES_TYPES = ['serial', 'docuserial', 'tvshow'] as const

export function isHistorySeriesType(type: string): boolean {
  return (HISTORY_SERIES_TYPES as readonly string[]).includes(type)
}

/** Keep first occurrence per title id (API order is newest-first). */
export function dedupeHistoryByTitle(items: HistoryItem[]): HistoryItem[] {
  const seen = new Set<number>()
  const result: HistoryItem[] = []
  for (const item of items) {
    if (seen.has(item.id)) continue
    seen.add(item.id)
    result.push(item)
  }
  return result
}

export function splitHistoryItems(items: HistoryItem[]): {
  series: HistoryItem[]
  movies: HistoryItem[]
} {
  const seriesRaw: HistoryItem[] = []
  const moviesRaw: HistoryItem[] = []
  for (const item of items) {
    if (isHistorySeriesType(item.type)) seriesRaw.push(item)
    else moviesRaw.push(item)
  }
  return {
    series: dedupeHistoryByTitle(seriesRaw),
    movies: dedupeHistoryByTitle(moviesRaw),
  }
}
