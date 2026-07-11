export type WatchingInfo = {
  status?: number
  time?: number
}

/** Kinopub: -1 not started, 0 in progress, 1 finished */
export const WatchingStatus = {
  NotStarted: -1,
  Watching: 0,
  Watched: 1,
} as const

export function getResumeTime(
  watching?: WatchingInfo | null,
  durationSeconds?: number
): number {
  const time = Math.floor(watching?.time ?? 0)
  if (time <= 0) return 0

  // Finished episodes should start from the beginning
  if (watching?.status === WatchingStatus.Watched) return 0

  // Near the end — treat as finished
  if (durationSeconds && durationSeconds > 0 && time >= durationSeconds - 30) {
    return 0
  }

  return time
}
