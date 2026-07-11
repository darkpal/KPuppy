import { useState, useEffect, useRef, useCallback } from 'preact/hooks'
import type { JSX } from 'preact'
import { Audio, Subtitle } from '../api/kinopub'
import { withHlsAudioIndex } from '../webos/player'
import { saveAudioPreference } from '../storage'
import { KEY_CODES } from '../hooks'
import { useI18n } from '../i18n'
import '../styles/player.css'

function srtToVtt(srt: string): string {
  let vtt = 'WEBVTT\n\n'
  const lines = srt.trim().split(/\r?\n/)
  let i = 0

  while (i < lines.length) {
    if (/^\d+$/.test(lines[i]?.trim())) {
      i++
    }

    if (lines[i] && lines[i].includes('-->')) {
      const timestamp = lines[i].replace(/,/g, '.')
      vtt += timestamp + '\n'
      i++

      while (i < lines.length && lines[i]?.trim() !== '') {
        vtt += lines[i] + '\n'
        i++
      }
      vtt += '\n'
    }
    i++
  }

  return vtt
}

export interface PlayerProps {
  url: string
  title: string
  audios?: Audio[]
  subtitles?: Subtitle[]
  startTime?: number
  initialAudioIndex?: number
  itemId?: number
  onBack: () => void
  onTimeUpdate?: (time: number) => void
}

interface ControlsState {
  visible: boolean
  activePanel: 'none' | 'audio' | 'subtitles'
  selectedAudioIndex: number
  selectedSubtitleIndex: number
}

interface ConvertedSubtitle {
  lang: string
  url: string
}

export function PlayerScreen({ url, title, audios = [], subtitles = [], startTime = 0, initialAudioIndex = 0, itemId = 0, onBack, onTimeUpdate }: PlayerProps) {
  const { t } = useI18n()
  const videoRef = useRef<HTMLVideoElement>(null)
  const progressBarRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const isSeekingRef = useRef(false)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [convertedSubs, setConvertedSubs] = useState<ConvertedSubtitle[]>([])
  const [controls, setControls] = useState<ControlsState>({
    visible: true,
    activePanel: 'none',
    selectedAudioIndex: Math.max(0, Math.min(initialAudioIndex, Math.max(0, audios.length - 1))),
    selectedSubtitleIndex: -1
  })
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [hoverPreview, setHoverPreview] = useState<{ percent: number; time: number } | null>(null)

  const flushTime = useCallback((time?: number) => {
    const video = videoRef.current
    const value = Math.floor(time ?? video?.currentTime ?? 0)
    if (value > 0) {
      lastTimeRef.current = value
      onTimeUpdate?.(value)
    }
  }, [onTimeUpdate])

  const getRatioFromClientX = useCallback((clientX: number) => {
    const bar = progressBarRef.current
    if (!bar) return null
    const rect = bar.getBoundingClientRect()
    if (rect.width <= 0) return null
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  }, [])

  useEffect(() => {
    const blobUrls: string[] = []

    async function convertSubtitles() {
      const converted: ConvertedSubtitle[] = []

      for (const sub of subtitles) {
        try {
          const response = await fetch(sub.url)
          if (!response.ok) continue

          const srtText = await response.text()
          const vttText = srtToVtt(srtText)
          const blob = new Blob([vttText], { type: 'text/vtt' })
          const blobUrl = URL.createObjectURL(blob)
          blobUrls.push(blobUrl)
          converted.push({ lang: sub.lang, url: blobUrl })
        } catch (e) {
          if (import.meta.env.DEV) console.error('Failed to convert subtitle:', sub.lang, e)
        }
      }

      setConvertedSubs(converted)
    }

    if (subtitles.length > 0) {
      convertSubtitles()
    }

    return () => {
      blobUrls.forEach(url => URL.revokeObjectURL(url))
    }
  }, [subtitles])

  const formatTime = (seconds: number): string => {
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
      }
    }, 5000)
  }, [isPlaying])

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      void video.play()
    } else {
      video.pause()
    }
    showControls()
  }, [showControls])

  const seek = useCallback((delta: number) => {
    const video = videoRef.current
    if (!video || !Number.isFinite(video.duration)) return
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

  const handleSurfaceClick = useCallback((event: JSX.TargetedMouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null
    if (!target) return
    if (target.closest('.player-progress-bar, .player-panel, .player-state-button, .player-hints')) {
      return
    }
    togglePlay()
  }, [togglePlay])

  const selectAudio = useCallback((listIndex: number) => {
    const video = videoRef.current
    setControls(prev => ({ ...prev, selectedAudioIndex: listIndex }))
    const selected = audios[listIndex]
    if (itemId > 0 && selected) {
      saveAudioPreference(itemId, selected)
    }
    if (!video || listIndex < 0) return

    // Kinopub classic HLS switches озвучка by playlist: master-v1a1, master-v1a2, …
    const currentSrc = video.currentSrc || video.getAttribute('src') || url
    const nextSrc = withHlsAudioIndex(currentSrc, listIndex)
    if (nextSrc !== currentSrc) {
      const resumeAt = video.currentTime
      const wasPaused = video.paused
      const onLoaded = () => {
        video.removeEventListener('loadedmetadata', onLoaded)
        if (resumeAt > 0 && Number.isFinite(resumeAt)) {
          video.currentTime = resumeAt
        }
        if (!wasPaused) {
          void video.play()
        }
      }
      video.addEventListener('loadedmetadata', onLoaded)
      video.src = nextSrc
      flushTime(resumeAt)
      return
    }

    // Some streams expose multiple HTML5 audioTracks (rare on webOS without HLS.js)
    const audioTracks = (video as unknown as {
      audioTracks?: { length: number; [i: number]: { enabled: boolean } }
    }).audioTracks
    if (!audioTracks || audioTracks.length <= 1) return

    const trackIndex = Math.min(listIndex, audioTracks.length - 1)
    for (let i = 0; i < audioTracks.length; i++) {
      audioTracks[i].enabled = i === trackIndex
    }
  }, [url, flushTime, audios, itemId])

  const selectSubtitle = useCallback((index: number) => {
    const video = videoRef.current
    setControls(prev => ({ ...prev, selectedSubtitleIndex: index }))
    if (!video) return

    const tracks = video.textTracks
    for (let i = 0; i < tracks.length; i++) {
      tracks[i].mode = i === index ? 'showing' : 'hidden'
    }
  }, [])

  const openAudioPanel = useCallback(() => {
    if (audios.length === 0) return
    setControls(prev => ({ ...prev, visible: true, activePanel: 'audio' }))
    showControls()
  }, [audios.length, showControls])

  const openSubtitlesPanel = useCallback(() => {
    if (convertedSubs.length === 0) return
    setControls(prev => ({ ...prev, visible: true, activePanel: 'subtitles' }))
    showControls()
  }, [convertedSubs.length, showControls])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => {
      setIsPlaying(false)
      flushTime(video.currentTime)
    }
    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
      if (onTimeUpdate && Math.abs(video.currentTime - lastTimeRef.current) >= 10) {
        lastTimeRef.current = video.currentTime
        onTimeUpdate(video.currentTime)
      }
    }
    const handleDurationChange = () => setDuration(video.duration)
    const handleProgress = () => {
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1))
      }
    }
    const handleLoadedMetadata = () => {
      if (startTime > 0) {
        video.currentTime = startTime
        setCurrentTime(startTime)
        lastTimeRef.current = startTime
      }
      void video.play()
    }

    const handleError = () => {
      const error = video.error
      const errorCodes: Record<number, string> = {
        1: 'MEDIA_ERR_ABORTED',
        2: 'MEDIA_ERR_NETWORK',
        3: 'MEDIA_ERR_DECODE',
        4: 'MEDIA_ERR_SRC_NOT_SUPPORTED'
      }
      const errorType = errorCodes[error?.code || 0] || 'UNKNOWN'
      const msg = `${errorType} (${error?.code}): ${error?.message || 'No details'}`
      setErrorMessage(msg)
    }

    video.addEventListener('play', handlePlay)
    video.addEventListener('error', handleError)
    video.addEventListener('pause', handlePause)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('durationchange', handleDurationChange)
    video.addEventListener('progress', handleProgress)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)

    return () => {
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('error', handleError)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('durationchange', handleDurationChange)
      video.removeEventListener('progress', handleProgress)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [startTime, onTimeUpdate, flushTime])

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
          void videoRef.current?.play()
        } else if (mediaKey === 'MediaPause' || e.keyCode === KEY_CODES.PAUSE) {
          videoRef.current?.pause()
        } else {
          togglePlay()
        }
        e.preventDefault()
        return
      }

      if (controls.activePanel !== 'none') {
        const items = controls.activePanel === 'audio' ? audios : convertedSubs
        const currentIndex = controls.activePanel === 'audio'
          ? controls.selectedAudioIndex
          : controls.selectedSubtitleIndex

        switch (e.keyCode) {
          case KEY_CODES.UP:
            if (controls.activePanel === 'audio' && currentIndex > 0) {
              selectAudio(currentIndex - 1)
            } else if (controls.activePanel === 'subtitles' && currentIndex > -1) {
              selectSubtitle(currentIndex - 1)
            }
            e.preventDefault()
            break
          case KEY_CODES.DOWN:
            if (controls.activePanel === 'audio' && currentIndex < items.length - 1) {
              selectAudio(currentIndex + 1)
            } else if (controls.activePanel === 'subtitles' && currentIndex < items.length - 1) {
              selectSubtitle(currentIndex + 1)
            }
            e.preventDefault()
            break
          case KEY_CODES.ENTER:
          case KEY_CODES.BACK:
            setControls(prev => ({ ...prev, activePanel: 'none' }))
            e.preventDefault()
            break
        }
        return
      }

      switch (e.keyCode) {
        case KEY_CODES.ENTER:
        case 32: // Space
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
          if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current)
          }
          setControls(prev => ({ ...prev, visible: false, activePanel: 'none' }))
          e.preventDefault()
          break
        case KEY_CODES.BACK:
          flushTime()
          onBack()
          e.preventDefault()
          break
        case KEY_CODES.RED:
          openAudioPanel()
          e.preventDefault()
          break
        case KEY_CODES.GREEN:
          openSubtitlesPanel()
          e.preventDefault()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [controls, audios, convertedSubs, togglePlay, seek, selectAudio, selectSubtitle, showControls, onBack, flushTime, openAudioPanel, openSubtitlesPanel])

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
        src={url}
        preload="metadata"
      >
        {convertedSubs.map((sub) => (
          <track
            key={sub.lang}
            kind="subtitles"
            src={sub.url}
            srcLang={sub.lang}
            label={sub.lang.toUpperCase()}
          />
        ))}
      </video>

      {errorMessage && (
        <div class="player-error">
          <div class="player-error-title">Playback Error</div>
          <div class="player-error-message">{errorMessage}</div>
          <div class="player-error-url">{url.substring(0, 80)}...</div>
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
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div class="player-controls-row">
              <button
                type="button"
                class="player-state-button"
                onClick={(event) => {
                  event.stopPropagation()
                  togglePlay()
                }}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <span class="icon-pause" /> : <span class="icon-play" />}
              </button>
              <div class="player-hints">
                {audios.length > 0 && (
                  <button
                    type="button"
                    class="player-hint player-hint-button"
                    onClick={(event) => {
                      event.stopPropagation()
                      openAudioPanel()
                    }}
                  >
                    <span class="player-hint-key red">●</span> {t.audio}
                  </button>
                )}
                {convertedSubs.length > 0 && (
                  <button
                    type="button"
                    class="player-hint player-hint-button"
                    onClick={(event) => {
                      event.stopPropagation()
                      openSubtitlesPanel()
                    }}
                  >
                    <span class="player-hint-key green">●</span> {t.subtitles}
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
                    {audio.author?.title || audio.type?.title || audio.lang}
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
                {convertedSubs.map((sub, idx) => (
                  <button
                    type="button"
                    key={sub.lang}
                    class={`player-panel-item ${idx === controls.selectedSubtitleIndex ? 'selected' : ''}`}
                    onMouseEnter={() => showControls()}
                    onClick={(event) => {
                      event.stopPropagation()
                      selectSubtitle(idx)
                    }}
                  >
                    {sub.lang.toUpperCase()}
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
