import { useState, useEffect, useRef, useCallback, useMemo } from 'preact/hooks'
import type { JSX } from 'preact'
import { Audio, Subtitle, VideoFile } from '../api/kinopub'
import { withHlsAudioIndex, getStreamUrl, getAvailableQualities } from '../webos/player'
import { saveAudioPreference, getAudioTrackName } from '../storage'
import { KEY_CODES } from '../hooks'
import { useI18n } from '../i18n'
import { convertSrtUrlToVtt, isSrtUrl, subtitleLanguageLabel } from '../utils/subtitles'
import type { EpisodeNavigationTarget } from '../utils/episodes'
import {
  collectLiveHlsDiagnostics,
  createLiveHls,
  Hls,
  isHlsPlaylistUrl,
  isLivePlaybackStalled,
  recoverLiveEdge,
  seekIntoBuffered,
  shouldPreferMseHls
} from '../player/mseHls'
import '../styles/player.css'

function IconAudio() {
  return (
    <svg class="player-hint-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zm-7 8a1 1 0 0 1 2 0 5 5 0 0 0 10 0 1 1 0 1 1 2 0 7 7 0 0 1-6 6.93V21a1 1 0 1 1-2 0v-3.07A7 7 0 0 1 5 11z" />
    </svg>
  )
}

function IconSubtitles() {
  return (
    <svg class="player-hint-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M4 5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H4zm2 11h5a1 1 0 1 1 0 2H6a1 1 0 1 1 0-2zm7 0h5a1 1 0 1 1 0 2h-5a1 1 0 1 1 0-2zM6 12h12a1 1 0 1 1 0 2H6a1 1 0 1 1 0-2z" />
    </svg>
  )
}

function IconQuality() {
  return (
    <span class="player-hint-icon player-hint-icon-hd" aria-hidden="true">HD</span>
  )
}

/** LG Magic Remote colored keys: red=1, green=2, yellow=3 dots. */
function RemoteKeyDots({ count }: { count: 1 | 2 | 3 }) {
  return (
    <span class={`player-hint-key-dots dots-${count}`} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} class="player-hint-key-dot" />
      ))}
    </span>
  )
}

function formatPlayerSubtitleLabel(lang: string): string {
  const forced = /-forced$/i.test(lang || '')
  return subtitleLanguageLabel(lang, forced)
}

function playVideo(video: HTMLVideoElement | null | undefined): void {
  if (!video) return
  video.play().catch(err => {
    if (import.meta.env.DEV) console.error('play failed:', err)
  })
}

export interface PlayerProps {
  url: string
  title: string
  poster?: string
  audios?: Audio[]
  subtitles?: Subtitle[]
  files?: VideoFile[]
  streamingType?: string
  initialQuality?: string
  startTime?: number
  initialAudioIndex?: number
  itemId?: number
  previousEpisode?: EpisodeNavigationTarget
  nextEpisode?: EpisodeNavigationTarget
  onPlayPreviousEpisode?: () => void
  onPlayNextEpisode?: () => void
  onBack: () => void
  onTimeUpdate?: (time: number) => void
}

interface ControlsState {
  visible: boolean
  activePanel: 'none' | 'audio' | 'subtitles' | 'quality'
  selectedAudioIndex: number
  selectedSubtitleIndex: number
  selectedQuality: string | null
}

type PrimaryControl = 'previous' | 'play' | 'next'

export function PlayerScreen({
  url,
  title,
  poster,
  audios = [],
  subtitles = [],
  files = [],
  streamingType,
  initialQuality,
  startTime = 0,
  initialAudioIndex = 0,
  itemId = 0,
  previousEpisode,
  nextEpisode,
  onPlayPreviousEpisode,
  onPlayNextEpisode,
  onBack,
  onTimeUpdate
}: PlayerProps) {
  const { t } = useI18n()
  const videoRef = useRef<HTMLVideoElement>(null)
  const progressBarRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const isSeekingRef = useRef(false)
  const startTimeAppliedRef = useRef(false)
  const resumeAfterReloadRef = useRef<number | null>(null)
  const endedNavigationRef = useRef(false)
  const hlsRef = useRef<Hls | null>(null)
  const mseFallbackTriedRef = useRef(false)
  const liveStreamRef = useRef(false)
  const lastHlsErrorRef = useRef<string | null>(null)

  const availableQualities = getAvailableQualities(files)
  const canUseMseHls = shouldPreferMseHls(url, files.length)
  const [useMseHls, setUseMseHls] = useState(false)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [subtitleLoading, setSubtitleLoading] = useState(false)
  const vttCacheRef = useRef<Map<string, string>>(new Map())
  const subtitleRequestRef = useRef(0)
  const audioApplyTimerRef = useRef<number>(0)
  const pendingAudioIndexRef = useRef<number | null>(null)
  /** Debounce HLS reload while browsing the audio list with Up/Down. */
  const AUDIO_SELECT_DEBOUNCE_MS = 500
  const [controls, setControls] = useState<ControlsState>({
    visible: true,
    activePanel: 'none',
    selectedAudioIndex: Math.max(0, Math.min(initialAudioIndex, Math.max(0, audios.length - 1))),
    selectedSubtitleIndex: -1,
    selectedQuality: initialQuality || availableQualities[0] || null
  })
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [liveDiagLines, setLiveDiagLines] = useState<string[] | null>(null)
  const [isLiveStream, setIsLiveStream] = useState(false)
  const [hoverPreview, setHoverPreview] = useState<{ percent: number; time: number } | null>(null)
  const [primaryControlsActive, setPrimaryControlsActive] = useState(false)
  const [primaryControlFocus, setPrimaryControlFocus] = useState<PrimaryControl>('play')

  const selectableSubs = useMemo(
    () => subtitles.filter(sub => Boolean(sub.url)),
    [subtitles]
  )
  const hasSubtitles = selectableSubs.length > 0

  useEffect(() => {
    endedNavigationRef.current = false
    startTimeAppliedRef.current = false
    resumeAfterReloadRef.current = null
    lastTimeRef.current = 0
    mseFallbackTriedRef.current = false
    liveStreamRef.current = false
    lastHlsErrorRef.current = null
    setUseMseHls(false)
    setIsLiveStream(false)
    setLiveDiagLines(null)
    setCurrentTime(0)
    setDuration(0)
    setBuffered(0)
    setErrorMessage(null)
    setControls(prev => ({
      ...prev,
      visible: true,
      activePanel: 'none',
      selectedAudioIndex: Math.max(0, Math.min(initialAudioIndex, Math.max(0, audios.length - 1))),
      selectedSubtitleIndex: -1,
      selectedQuality: initialQuality || availableQualities[0] || null
    }))
    setPrimaryControlsActive(false)
    setPrimaryControlFocus('play')
  }, [url, initialAudioIndex, audios.length, initialQuality, availableQualities[0]])

  const flushTime = useCallback((time?: number) => {
    const video = videoRef.current
    const value = Math.floor(time ?? video?.currentTime ?? 0)
    if (value > 0) {
      lastTimeRef.current = value
      onTimeUpdate?.(value)
    }
  }, [onTimeUpdate])

  const reloadStream = useCallback((nextSrc: string, resumeAt: number, wasPaused: boolean) => {
    const video = videoRef.current
    if (!video) return
    resumeAfterReloadRef.current = resumeAt
    const onLoaded = () => {
      video.removeEventListener('loadedmetadata', onLoaded)
      const target = resumeAfterReloadRef.current
      resumeAfterReloadRef.current = null
      if (target != null && target > 0 && Number.isFinite(target)) {
        video.currentTime = target
        setCurrentTime(target)
      }
      if (!wasPaused) {
        playVideo(video)
      }
    }
    video.addEventListener('loadedmetadata', onLoaded)
    const hls = hlsRef.current
    if (hls) {
      hls.loadSource(nextSrc)
    } else {
      video.src = nextSrc
    }
    flushTime(resumeAt)
  }, [flushTime])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !useMseHls) {
      hlsRef.current?.destroy()
      hlsRef.current = null
      return
    }

    setErrorMessage(null)
    setLiveDiagLines(null)
    lastHlsErrorRef.current = null
    video.removeAttribute('src')
    // Avoid video.load() here — it races MediaSource attach on webOS.

    const hls = createLiveHls()
    hlsRef.current = hls
    let startupSeekDone = false
    liveStreamRef.current = true
    setIsLiveStream(true)
    hls.attachMedia(video)
    hls.loadSource(url)

    const refreshDiag = (forceShow = false) => {
      const lines = collectLiveHlsDiagnostics(hlsRef.current, video, {
        lastError: lastHlsErrorRef.current,
        url
      })
      if (forceShow || isLivePlaybackStalled(video)) {
        setLiveDiagLines(lines)
      }
    }

    const onParsed = () => {
      if (!startupSeekDone) {
        startupSeekDone = seekIntoBuffered(video) || startupSeekDone
      }
      playVideo(video)
      refreshDiag(false)
    }
    const onLevelLoaded = (_event: string, data: { details?: { live?: boolean } }) => {
      if (data.details && data.details.live === false) {
        liveStreamRef.current = false
        setIsLiveStream(false)
      }
      refreshDiag(false)
    }
    const onFragBuffered = () => {
      if (!startupSeekDone) {
        startupSeekDone = seekIntoBuffered(video) || startupSeekDone
      }
      if (video.paused) playVideo(video)
      if (!isLivePlaybackStalled(video)) {
        setLiveDiagLines(null)
      }
    }
    const onWaiting = () => {
      if (!liveStreamRef.current) return
      recoverLiveEdge(video)
      hls.startLoad()
      playVideo(video)
    }
    const onHlsError = (_event: string, data: { fatal?: boolean; type?: string; details?: string }) => {
      lastHlsErrorRef.current = `${data.fatal ? 'fatal' : 'warn'} ${data.type || '?'}: ${data.details || '?'}`
      if (!data.fatal) {
        if (data.details === 'bufferStalledError' || data.details === 'bufferNudgeOnStall') {
          recoverLiveEdge(video)
          playVideo(video)
        }
        refreshDiag(false)
        return
      }
      if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
        hls.startLoad()
        refreshDiag(true)
        return
      }
      if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
        hls.recoverMediaError()
        refreshDiag(true)
        return
      }
      refreshDiag(true)
      setErrorMessage(`HLS.js ${data.type || 'ERROR'}: ${data.details || 'fatal'}`)
      hls.destroy()
      if (hlsRef.current === hls) hlsRef.current = null
    }

    hls.on(Hls.Events.MANIFEST_PARSED, onParsed)
    hls.on(Hls.Events.LEVEL_LOADED, onLevelLoaded)
    hls.on(Hls.Events.FRAG_BUFFERED, onFragBuffered)
    hls.on(Hls.Events.ERROR, onHlsError)
    video.addEventListener('waiting', onWaiting)

    const stallTimer = window.setTimeout(() => {
      if (hlsRef.current === hls && isLivePlaybackStalled(video)) {
        refreshDiag(true)
      }
    }, 7000)

    return () => {
      window.clearTimeout(stallTimer)
      video.removeEventListener('waiting', onWaiting)
      hls.off(Hls.Events.MANIFEST_PARSED, onParsed)
      hls.off(Hls.Events.LEVEL_LOADED, onLevelLoaded)
      hls.off(Hls.Events.FRAG_BUFFERED, onFragBuffered)
      hls.off(Hls.Events.ERROR, onHlsError)
      hls.destroy()
      if (hlsRef.current === hls) hlsRef.current = null
    }
  }, [url, useMseHls])

  const getRatioFromClientX = useCallback((clientX: number) => {
    const bar = progressBarRef.current
    if (!bar) return null
    const rect = bar.getBoundingClientRect()
    if (rect.width <= 0) return null
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  }, [])

  useEffect(() => {
    const cache = vttCacheRef.current
    return () => {
      cache.forEach(url => URL.revokeObjectURL(url))
      cache.clear()
    }
  }, [])

  const clearVideoTracks = useCallback((video: HTMLVideoElement) => {
    while (video.firstChild) {
      video.removeChild(video.lastChild!)
    }
    const tracks = video.textTracks
    for (let i = 0; i < tracks.length; i++) {
      tracks[i].mode = 'disabled'
    }
  }, [])

  const formatTime = (seconds: number): string => {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const showControls = useCallback(() => {
    setControls(prev => ({ ...prev, visible: true }))
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    controlsTimeoutRef.current = window.setTimeout(() => {
      if (isPlaying && !isSeekingRef.current) {
        setControls(prev => ({ ...prev, visible: false, activePanel: 'none' }))
        setPrimaryControlsActive(false)
      }
    }, 5000)
  }, [isPlaying])

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      playVideo(video)
    } else {
      video.pause()
    }
    showControls()
  }, [showControls])

  const seek = useCallback((delta: number) => {
    const video = videoRef.current
    if (!video || !Number.isFinite(video.duration) || !Number.isFinite(video.currentTime)) return
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + delta))
    setCurrentTime(video.currentTime)
    showControls()
  }, [showControls])

  const seekToClientX = useCallback((clientX: number) => {
    const video = videoRef.current
    const ratio = getRatioFromClientX(clientX)
    if (!video || ratio === null || !Number.isFinite(video.duration) || video.duration <= 0) return

    const nextTime = ratio * video.duration
    video.currentTime = nextTime
    setCurrentTime(nextTime)
    flushTime(nextTime)
    showControls()
  }, [flushTime, getRatioFromClientX, showControls])

  const updateHoverPreview = useCallback((clientX: number) => {
    const video = videoRef.current
    const ratio = getRatioFromClientX(clientX)
    if (!video || ratio === null || !Number.isFinite(video.duration) || video.duration <= 0) {
      setHoverPreview(null)
      return
    }
    setHoverPreview({
      percent: ratio * 100,
      time: ratio * video.duration
    })
  }, [getRatioFromClientX])

  const handleProgressPointerDown = useCallback((event: JSX.TargetedPointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    isSeekingRef.current = true
    showControls()
    seekToClientX(event.clientX)
    updateHoverPreview(event.clientX)

    const target = event.currentTarget
    target.setPointerCapture?.(event.pointerId)

    const handleMove = (moveEvent: PointerEvent) => {
      seekToClientX(moveEvent.clientX)
      updateHoverPreview(moveEvent.clientX)
    }
    const handleUp = (upEvent: PointerEvent) => {
      isSeekingRef.current = false
      seekToClientX(upEvent.clientX)
      target.releasePointerCapture?.(upEvent.pointerId)
      target.removeEventListener('pointermove', handleMove)
      target.removeEventListener('pointerup', handleUp)
      target.removeEventListener('pointercancel', handleUp)
      showControls()
    }

    target.addEventListener('pointermove', handleMove)
    target.addEventListener('pointerup', handleUp)
    target.addEventListener('pointercancel', handleUp)
  }, [seekToClientX, showControls, updateHoverPreview])

  const handleProgressClick = useCallback((event: JSX.TargetedMouseEvent<HTMLDivElement>) => {
    event.stopPropagation()
    if (isSeekingRef.current) return
    seekToClientX(event.clientX)
  }, [seekToClientX])

  const handleProgressMouseMove = useCallback((event: JSX.TargetedMouseEvent<HTMLDivElement>) => {
    showControls()
    updateHoverPreview(event.clientX)
  }, [showControls, updateHoverPreview])

  const handleProgressMouseLeave = useCallback(() => {
    if (!isSeekingRef.current) {
      setHoverPreview(null)
    }
  }, [])

  const playAdjacentEpisode = useCallback((callback?: () => void) => {
    if (!callback) return
    videoRef.current?.pause()
    flushTime()
    callback()
  }, [flushTime])

  const clearAudioApplyTimer = useCallback(() => {
    if (audioApplyTimerRef.current) {
      window.clearTimeout(audioApplyTimerRef.current)
      audioApplyTimerRef.current = 0
    }
  }, [])

  const applyAudioTrack = useCallback((listIndex: number) => {
    const video = videoRef.current
    const selected = audios[listIndex]
    if (itemId > 0 && selected) {
      saveAudioPreference(itemId, selected)
    }
    if (!video || listIndex < 0) return

    const currentSrc = video.currentSrc || video.getAttribute('src') || url
    const nextSrc = withHlsAudioIndex(currentSrc, listIndex)
    if (nextSrc !== currentSrc) {
      reloadStream(nextSrc, video.currentTime, video.paused)
      return
    }

    const audioTracks = (video as unknown as {
      audioTracks?: { length: number; [i: number]: { enabled: boolean } }
    }).audioTracks
    if (!audioTracks || audioTracks.length <= 1) return

    const trackIndex = Math.min(listIndex, audioTracks.length - 1)
    for (let i = 0; i < audioTracks.length; i++) {
      audioTracks[i].enabled = i === trackIndex
    }
  }, [url, reloadStream, audios, itemId])

  const flushAudioSelection = useCallback(() => {
    clearAudioApplyTimer()
    const pending = pendingAudioIndexRef.current
    if (pending == null) return
    pendingAudioIndexRef.current = null
    applyAudioTrack(pending)
  }, [clearAudioApplyTimer, applyAudioTrack])

  const selectAudio = useCallback((listIndex: number, options?: { debounce?: boolean }) => {
    setControls(prev => ({ ...prev, selectedAudioIndex: listIndex }))
    pendingAudioIndexRef.current = listIndex

    if (!options?.debounce) {
      clearAudioApplyTimer()
      pendingAudioIndexRef.current = null
      applyAudioTrack(listIndex)
      return
    }

    clearAudioApplyTimer()
    audioApplyTimerRef.current = window.setTimeout(() => {
      audioApplyTimerRef.current = 0
      const pending = pendingAudioIndexRef.current
      pendingAudioIndexRef.current = null
      if (pending != null) applyAudioTrack(pending)
    }, AUDIO_SELECT_DEBOUNCE_MS)
  }, [clearAudioApplyTimer, applyAudioTrack])

  useEffect(() => () => clearAudioApplyTimer(), [clearAudioApplyTimer])

  const handleSurfaceClick = useCallback((event: JSX.TargetedMouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null
    if (!target) return
    if (target.closest('.player-progress-bar, .player-panel, .player-state-button, .player-episode-button, .player-hints')) {
      return
    }
    if (controls.activePanel !== 'none') {
      if (controls.activePanel === 'audio') flushAudioSelection()
      setControls(prev => ({ ...prev, activePanel: 'none' }))
      return
    }
    togglePlay()
  }, [togglePlay, controls.activePanel, flushAudioSelection])

  const selectQuality = useCallback((quality: string) => {
    const video = videoRef.current
    if (!video || !files.length) return
    if (quality === controls.selectedQuality) {
      setControls(prev => ({ ...prev, activePanel: 'none' }))
      return
    }

    let nextSrc = getStreamUrl(files, quality, streamingType, { preferClassicHls: true })
    if (!nextSrc) return
    nextSrc = withHlsAudioIndex(nextSrc, controls.selectedAudioIndex)

    setControls(prev => ({ ...prev, selectedQuality: quality, activePanel: 'none' }))
    setErrorMessage(null)
    reloadStream(nextSrc, video.currentTime, video.paused)
  }, [files, streamingType, controls.selectedQuality, controls.selectedAudioIndex, reloadStream])

  const selectSubtitle = useCallback(async (index: number) => {
    const video = videoRef.current
    setControls(prev => ({ ...prev, selectedSubtitleIndex: index }))
    if (!video) return

    clearVideoTracks(video)

    if (index < 0) {
      setSubtitleLoading(false)
      return
    }

    const sub = selectableSubs[index]
    if (!sub?.url) return

    const requestId = ++subtitleRequestRef.current
    setSubtitleLoading(true)

    try {
      let src = sub.url
      if (isSrtUrl(sub.url, sub.file)) {
        const cached = vttCacheRef.current.get(sub.url)
        if (cached) {
          src = cached
        } else {
          const converted = await convertSrtUrlToVtt(sub.url)
          if (requestId !== subtitleRequestRef.current) return
          if (!converted) {
            if (import.meta.env.DEV) console.error('Subtitle convert failed:', sub.lang)
            return
          }
          vttCacheRef.current.set(sub.url, converted)
          src = converted
        }
      }

      if (requestId !== subtitleRequestRef.current) return

      const track = document.createElement('track')
      track.kind = 'subtitles'
      track.src = src
      track.srclang = sub.lang
      track.label = formatPlayerSubtitleLabel(sub.forced ? `${sub.lang}-forced` : sub.lang)
      track.default = true
      video.appendChild(track)

      const applyShowing = () => {
        if (track.track) track.track.mode = 'showing'
      }
      track.addEventListener('load', applyShowing)
      applyShowing()
    } finally {
      if (requestId === subtitleRequestRef.current) {
        setSubtitleLoading(false)
      }
    }
  }, [selectableSubs, clearVideoTracks])

  const openAudioPanel = useCallback(() => {
    if (audios.length === 0) return
    if (controls.activePanel === 'audio') {
      flushAudioSelection()
      setControls(prev => ({ ...prev, activePanel: 'none' }))
    } else {
      setControls(prev => ({ ...prev, visible: true, activePanel: 'audio' }))
    }
    showControls()
  }, [audios.length, showControls, controls.activePanel, flushAudioSelection])

  const openSubtitlesPanel = useCallback(() => {
    if (!hasSubtitles) return
    setControls(prev => ({
      ...prev,
      visible: true,
      activePanel: prev.activePanel === 'subtitles' ? 'none' : 'subtitles'
    }))
    showControls()
  }, [hasSubtitles, showControls])

  const openQualityPanel = useCallback(() => {
    if (availableQualities.length <= 1) return
    setControls(prev => ({
      ...prev,
      visible: true,
      activePanel: prev.activePanel === 'quality' ? 'none' : 'quality'
    }))
    showControls()
  }, [availableQualities.length, showControls])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => {
      setIsPlaying(false)
      flushTime(video.currentTime)
    }
    const handleEnded = () => {
      setIsPlaying(false)
      flushTime(Number.isFinite(video.duration) ? video.duration : video.currentTime)
      if (onPlayNextEpisode && !endedNavigationRef.current) {
        endedNavigationRef.current = true
        onPlayNextEpisode()
      }
    }
    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
      if (onTimeUpdate && Math.abs(video.currentTime - lastTimeRef.current) >= 10) {
        lastTimeRef.current = video.currentTime
        onTimeUpdate(video.currentTime)
      }
    }
    const handleDurationChange = () => setDuration(Number.isFinite(video.duration) ? video.duration : 0)
    const handleProgress = () => {
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1))
      }
    }
    const handleLoadedMetadata = () => {
      if (resumeAfterReloadRef.current != null) return
      if (!startTimeAppliedRef.current && Number.isFinite(startTime) && startTime > 0) {
        startTimeAppliedRef.current = true
        video.currentTime = startTime
        setCurrentTime(startTime)
        lastTimeRef.current = startTime
      }
      playVideo(video)
    }

    const handleError = () => {
      // MSE/hls.js owns fatal errors when attached — ignore empty native media errors.
      if (hlsRef.current) return
      const error = video.error
      // Native HLS rejected the live playlist — retry once via MSE (desktop-like path).
      if (
        error?.code === 4 &&
        canUseMseHls &&
        !mseFallbackTriedRef.current &&
        !useMseHls
      ) {
        mseFallbackTriedRef.current = true
        setErrorMessage(null)
        setUseMseHls(true)
        return
      }
      const errorCodes: Record<number, string> = {
        1: 'MEDIA_ERR_ABORTED',
        2: 'MEDIA_ERR_NETWORK',
        3: 'MEDIA_ERR_DECODE',
        4: 'MEDIA_ERR_SRC_NOT_SUPPORTED'
      }
      const errorType = errorCodes[error?.code || 0] || 'UNKNOWN'
      const details = error?.message || 'No details'
      const isHls = isHlsPlaylistUrl(url)
      const hint = error?.code === 4 && isHls
        ? ' This live stream format is likely unsupported on this TV (codec/playlist), not a broken app URL.'
        : ''
      const msg = `${errorType} (${error?.code}): ${details}${hint}`
      setErrorMessage(msg)
    }

    video.addEventListener('play', handlePlay)
    video.addEventListener('error', handleError)
    video.addEventListener('pause', handlePause)
    video.addEventListener('ended', handleEnded)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('durationchange', handleDurationChange)
    video.addEventListener('progress', handleProgress)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)

    return () => {
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('error', handleError)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('durationchange', handleDurationChange)
      video.removeEventListener('progress', handleProgress)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [startTime, onTimeUpdate, onPlayNextEpisode, flushTime, url, canUseMseHls, useMseHls])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isDownKey = e.keyCode === KEY_CODES.DOWN
      if (!isDownKey) {
        showControls()
      }

      const mediaKey = e.key
      if (
        mediaKey === 'MediaPlayPause' ||
        mediaKey === 'MediaPlay' ||
        mediaKey === 'MediaPause' ||
        e.keyCode === KEY_CODES.PLAY_PAUSE ||
        e.keyCode === KEY_CODES.PLAY ||
        e.keyCode === KEY_CODES.PAUSE
      ) {
        if (mediaKey === 'MediaPlay' || e.keyCode === KEY_CODES.PLAY) {
          playVideo(videoRef.current)
        } else if (mediaKey === 'MediaPause' || e.keyCode === KEY_CODES.PAUSE) {
          videoRef.current?.pause()
        } else {
          togglePlay()
        }
        e.preventDefault()
        return
      }

      if (controls.activePanel !== 'none') {
        if (controls.activePanel === 'quality') {
          const currentIndex = Math.max(0, availableQualities.indexOf(controls.selectedQuality || ''))
          switch (e.keyCode) {
            case KEY_CODES.UP:
              if (currentIndex > 0) selectQuality(availableQualities[currentIndex - 1])
              e.preventDefault()
              break
            case KEY_CODES.DOWN:
              if (currentIndex < availableQualities.length - 1) selectQuality(availableQualities[currentIndex + 1])
              e.preventDefault()
              break
            case KEY_CODES.ENTER:
            case KEY_CODES.BACK:
            case KEY_CODES.RED:
              setControls(prev => ({ ...prev, activePanel: 'none' }))
              e.preventDefault()
              break
            case KEY_CODES.GREEN:
              openAudioPanel()
              e.preventDefault()
              break
            case KEY_CODES.YELLOW:
              openSubtitlesPanel()
              e.preventDefault()
              break
          }
          return
        }

        const items = controls.activePanel === 'audio' ? audios : selectableSubs
        const currentIndex = controls.activePanel === 'audio'
          ? controls.selectedAudioIndex
          : controls.selectedSubtitleIndex

        switch (e.keyCode) {
          case KEY_CODES.UP:
            if (controls.activePanel === 'audio' && currentIndex > 0) {
              selectAudio(currentIndex - 1, { debounce: true })
            } else if (controls.activePanel === 'subtitles' && currentIndex > -1) {
              selectSubtitle(currentIndex - 1)
            }
            e.preventDefault()
            break
          case KEY_CODES.DOWN:
            if (controls.activePanel === 'audio' && currentIndex < items.length - 1) {
              selectAudio(currentIndex + 1, { debounce: true })
            } else if (controls.activePanel === 'subtitles' && currentIndex < items.length - 1) {
              selectSubtitle(currentIndex + 1)
            }
            e.preventDefault()
            break
          case KEY_CODES.ENTER:
          case KEY_CODES.BACK:
            if (controls.activePanel === 'audio') flushAudioSelection()
            setControls(prev => ({ ...prev, activePanel: 'none' }))
            e.preventDefault()
            break
          case KEY_CODES.RED:
            if (controls.activePanel === 'audio') flushAudioSelection()
            openQualityPanel()
            e.preventDefault()
            break
          case KEY_CODES.GREEN:
            if (controls.activePanel === 'audio') {
              flushAudioSelection()
              setControls(prev => ({ ...prev, activePanel: 'none' }))
            } else {
              openAudioPanel()
            }
            e.preventDefault()
            break
          case KEY_CODES.YELLOW:
            if (controls.activePanel === 'audio') flushAudioSelection()
            if (controls.activePanel === 'subtitles') {
              setControls(prev => ({ ...prev, activePanel: 'none' }))
            } else {
              openSubtitlesPanel()
            }
            e.preventDefault()
            break
        }
        return
      }

      if (primaryControlsActive) {
        const availableControls: PrimaryControl[] = [
          ...(onPlayPreviousEpisode ? ['previous' as const] : []),
          'play',
          ...(onPlayNextEpisode ? ['next' as const] : [])
        ]
        const currentIndex = Math.max(0, availableControls.indexOf(primaryControlFocus))

        if (e.keyCode === KEY_CODES.LEFT) {
          setPrimaryControlFocus(availableControls[Math.max(0, currentIndex - 1)])
          e.preventDefault()
          return
        }
        if (e.keyCode === KEY_CODES.RIGHT) {
          setPrimaryControlFocus(availableControls[Math.min(availableControls.length - 1, currentIndex + 1)])
          e.preventDefault()
          return
        }
        if (e.keyCode === KEY_CODES.ENTER) {
          if (primaryControlFocus === 'previous') playAdjacentEpisode(onPlayPreviousEpisode)
          else if (primaryControlFocus === 'next') playAdjacentEpisode(onPlayNextEpisode)
          else togglePlay()
          e.preventDefault()
          return
        }
        if (e.keyCode === KEY_CODES.UP) {
          setPrimaryControlsActive(false)
          e.preventDefault()
          return
        }
        if (e.keyCode === KEY_CODES.DOWN) {
          if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
          setPrimaryControlsActive(false)
          setControls(prev => ({ ...prev, visible: false, activePanel: 'none' }))
          e.preventDefault()
          return
        }
      }

      switch (e.keyCode) {
        case KEY_CODES.ENTER:
        case 32:
          togglePlay()
          e.preventDefault()
          break
        case KEY_CODES.LEFT:
        case KEY_CODES.REWIND:
          seek(-10)
          e.preventDefault()
          break
        case KEY_CODES.RIGHT:
        case KEY_CODES.FAST_FORWARD:
          seek(10)
          e.preventDefault()
          break
        case KEY_CODES.UP:
          showControls()
          e.preventDefault()
          break
        case KEY_CODES.DOWN:
          if (controls.visible && (onPlayPreviousEpisode || onPlayNextEpisode)) {
            setPrimaryControlsActive(true)
            setPrimaryControlFocus('play')
            showControls()
          } else {
            if (controlsTimeoutRef.current) {
              clearTimeout(controlsTimeoutRef.current)
            }
            setControls(prev => ({ ...prev, visible: false, activePanel: 'none' }))
          }
          e.preventDefault()
          break
        case KEY_CODES.BACK:
          flushTime()
          onBack()
          e.preventDefault()
          break
        case KEY_CODES.RED:
          openQualityPanel()
          e.preventDefault()
          break
        case KEY_CODES.GREEN:
          openAudioPanel()
          e.preventDefault()
          break
        case KEY_CODES.YELLOW:
          openSubtitlesPanel()
          e.preventDefault()
          break
        case KEY_CODES.BLUE:
          if (onPlayNextEpisode) {
            playAdjacentEpisode(onPlayNextEpisode)
            e.preventDefault()
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [
    controls,
    audios,
    selectableSubs,
    availableQualities,
    togglePlay,
    seek,
    selectAudio,
    flushAudioSelection,
    selectSubtitle,
    selectQuality,
    showControls,
    onBack,
    flushTime,
    openAudioPanel,
    openSubtitlesPanel,
    openQualityPanel,
    primaryControlsActive,
    primaryControlFocus,
    onPlayPreviousEpisode,
    onPlayNextEpisode,
    playAdjacentEpisode
  ])

  useEffect(() => {
    showControls()
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
    }
  }, [showControls])

  useEffect(() => {
    return () => {
      flushTime()
    }
  }, [flushTime])

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const bufferedProgress = duration > 0 ? (buffered / duration) * 100 : 0

  return (
    <div class="player-screen" onMouseMove={showControls} onClick={handleSurfaceClick}>
      <video
        ref={videoRef}
        class="player-video"
        src={useMseHls ? undefined : url}
        poster={poster}
        preload="metadata"
      />

      {errorMessage && (
        <div class="player-error">
          <div class="player-error-title">Playback Error</div>
          <div class="player-error-message">{errorMessage}</div>
          <div class="player-error-url">{url.substring(0, 80)}...</div>
        </div>
      )}

      {!errorMessage && liveDiagLines && (
        <div class="player-diag" role="status">
          <div class="player-diag-title">Live stream diagnostics</div>
          <ul class="player-diag-list">
            {liveDiagLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      {controls.visible && (
        <div class="player-overlay">
          <div class="player-top">
            <h1 class="player-title">{title}</h1>
          </div>

          <div class="player-bottom">
            <div class="player-progress-container">
              <div
                ref={progressBarRef}
                class="player-progress-bar"
                role="slider"
                aria-valuemin={0}
                aria-valuemax={Math.floor(duration) || 0}
                aria-valuenow={Math.floor(currentTime)}
                onPointerDown={handleProgressPointerDown}
                onClick={handleProgressClick}
                onMouseMove={handleProgressMouseMove}
                onMouseLeave={handleProgressMouseLeave}
              >
                <div class="player-progress-buffered" style={{ width: `${bufferedProgress}%` }} />
                <div class="player-progress-current" style={{ width: `${progress}%` }} />
                <div class="player-progress-thumb" style={{ left: `${progress}%` }} />
                {hoverPreview && (
                  <div
                    class="player-progress-preview"
                    style={{ left: `${hoverPreview.percent}%` }}
                  >
                    {formatTime(hoverPreview.time)}
                  </div>
                )}
              </div>
              <div class="player-time">
                <span>{formatTime(currentTime)}</span>
                <span>{isLiveStream ? 'LIVE' : formatTime(duration)}</span>
              </div>
            </div>

            <div class="player-controls-row">
              <div class="player-episode-controls">
                {previousEpisode && onPlayPreviousEpisode && (
                  <button
                    type="button"
                    class={`player-episode-button ${primaryControlsActive && primaryControlFocus === 'previous' ? 'focused' : ''}`}
                    aria-label={`${t.previousEpisode} S${previousEpisode.season}E${previousEpisode.episode}`}
                    onMouseEnter={() => {
                      setPrimaryControlsActive(true)
                      setPrimaryControlFocus('previous')
                    }}
                    onClick={(event) => {
                      event.stopPropagation()
                      playAdjacentEpisode(onPlayPreviousEpisode)
                    }}
                  >
                    <span class="player-episode-skip-icon player-episode-skip-icon-previous" aria-hidden="true" />
                  </button>
                )}
                <button
                  type="button"
                  class={`player-state-button ${primaryControlsActive && primaryControlFocus === 'play' ? 'focused' : ''}`}
                  onMouseEnter={() => {
                    setPrimaryControlsActive(true)
                    setPrimaryControlFocus('play')
                  }}
                  onClick={(event) => {
                    event.stopPropagation()
                    togglePlay()
                  }}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <span class="icon-pause" /> : <span class="icon-play" />}
                </button>
                {nextEpisode && onPlayNextEpisode && (
                  <button
                    type="button"
                    class={`player-episode-button ${primaryControlsActive && primaryControlFocus === 'next' ? 'focused' : ''}`}
                    aria-label={`${t.nextEpisode} S${nextEpisode.season}E${nextEpisode.episode}`}
                    onMouseEnter={() => {
                      setPrimaryControlsActive(true)
                      setPrimaryControlFocus('next')
                    }}
                    onClick={(event) => {
                      event.stopPropagation()
                      playAdjacentEpisode(onPlayNextEpisode)
                    }}
                  >
                    <span class="player-episode-skip-icon player-episode-skip-icon-next" aria-hidden="true" />
                  </button>
                )}
              </div>
              <div class="player-hints">
                {availableQualities.length > 1 && (
                  <button
                    type="button"
                    class="player-hint player-hint-quality"
                    onClick={(event) => {
                      event.stopPropagation()
                      openQualityPanel()
                    }}
                  >
                    <RemoteKeyDots count={1} />
                    <IconQuality />
                    <span class="player-hint-label">{controls.selectedQuality || t.quality}</span>
                  </button>
                )}
                {audios.length > 0 && (
                  <button
                    type="button"
                    class="player-hint player-hint-audio"
                    onClick={(event) => {
                      event.stopPropagation()
                      openAudioPanel()
                    }}
                  >
                    <RemoteKeyDots count={2} />
                    <IconAudio />
                    <span class="player-hint-label">{t.audio}</span>
                  </button>
                )}
                {hasSubtitles && (
                  <button
                    type="button"
                    class="player-hint player-hint-subtitles"
                    onClick={(event) => {
                      event.stopPropagation()
                      openSubtitlesPanel()
                    }}
                  >
                    <RemoteKeyDots count={3} />
                    <IconSubtitles />
                    <span class="player-hint-label">{t.subtitles}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {controls.activePanel === 'audio' && (
            <div class="player-panel" onClick={(event) => event.stopPropagation()}>
              <h2 class="player-panel-title">{t.audio}</h2>
              <div class="player-panel-list">
                {audios.map((audio, idx) => (
                  <button
                    type="button"
                    key={audio.id}
                    class={`player-panel-item ${idx === controls.selectedAudioIndex ? 'selected' : ''}`}
                    onMouseEnter={() => showControls()}
                    onClick={(event) => {
                      event.stopPropagation()
                      selectAudio(idx)
                    }}
                  >
                    {getAudioTrackName(audio)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {controls.activePanel === 'subtitles' && (
            <div class="player-panel" onClick={(event) => event.stopPropagation()}>
              <h2 class="player-panel-title">{t.subtitles}</h2>
              <div class="player-panel-list">
                <button
                  type="button"
                  class={`player-panel-item ${controls.selectedSubtitleIndex === -1 ? 'selected' : ''}`}
                  onMouseEnter={() => showControls()}
                  onClick={(event) => {
                    event.stopPropagation()
                    selectSubtitle(-1)
                  }}
                >
                  {t.subtitlesOff}
                </button>
                {selectableSubs.map((sub, idx) => (
                  <button
                    type="button"
                    key={`${sub.lang}-${sub.url}-${idx}`}
                    class={`player-panel-item ${idx === controls.selectedSubtitleIndex ? 'selected' : ''}`}
                    onMouseEnter={() => showControls()}
                    onClick={(event) => {
                      event.stopPropagation()
                      selectSubtitle(idx)
                    }}
                  >
                    {formatPlayerSubtitleLabel(sub.forced ? `${sub.lang}-forced` : sub.lang)}
                    {subtitleLoading && idx === controls.selectedSubtitleIndex ? ` (${t.loading})` : ''}
                  </button>
                ))}
              </div>
            </div>
          )}

          {controls.activePanel === 'quality' && (
            <div class="player-panel" onClick={(event) => event.stopPropagation()}>
              <h2 class="player-panel-title">{t.quality}</h2>
              <div class="player-panel-list">
                {availableQualities.map((q) => (
                  <button
                    type="button"
                    key={q}
                    class={`player-panel-item ${q === controls.selectedQuality ? 'selected' : ''}`}
                    onMouseEnter={() => showControls()}
                    onClick={(event) => {
                      event.stopPropagation()
                      selectQuality(q)
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
