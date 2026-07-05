import { useState, useEffect, useRef, useCallback } from 'preact/hooks'
import { Audio, Subtitle } from '../api/kinopub'
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

export function PlayerScreen({ url, title, audios = [], subtitles = [], startTime = 0, onBack, onTimeUpdate }: PlayerProps) {
  const { t } = useI18n()
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsTimeoutRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [convertedSubs, setConvertedSubs] = useState<ConvertedSubtitle[]>([])
  const [controls, setControls] = useState<ControlsState>({
    visible: true,
    activePanel: 'none',
    selectedAudioIndex: 0,
    selectedSubtitleIndex: -1
  })
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

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
      if (isPlaying) {
        setControls(prev => ({ ...prev, visible: false, activePanel: 'none' }))
      }
    }, 5000)
  }, [isPlaying])

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play()
    } else {
      video.pause()
    }
  }, [])

  const seek = useCallback((delta: number) => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + delta))
    showControls()
  }, [showControls])

  const selectAudio = useCallback((index: number) => {
    const video = videoRef.current
    if (!video) return

    const audioTracks = (video as unknown as { audioTracks?: { length: number; [i: number]: { enabled: boolean } } }).audioTracks
    if (!audioTracks) return

    for (let i = 0; i < audioTracks.length; i++) {
      audioTracks[i].enabled = i === index
    }
    setControls(prev => ({ ...prev, selectedAudioIndex: index }))
  }, [])

  const selectSubtitle = useCallback((index: number) => {
    const video = videoRef.current
    if (!video) return

    const tracks = video.textTracks
    for (let i = 0; i < tracks.length; i++) {
      tracks[i].mode = i === index ? 'showing' : 'hidden'
    }
    setControls(prev => ({ ...prev, selectedSubtitleIndex: index }))
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
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
      }
      video.play()
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
  }, [startTime, onTimeUpdate])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      showControls()

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
          togglePlay()
          e.preventDefault()
          break
        case KEY_CODES.LEFT:
          seek(-10)
          e.preventDefault()
          break
        case KEY_CODES.RIGHT:
          seek(10)
          e.preventDefault()
          break
        case KEY_CODES.UP:
          seek(60)
          e.preventDefault()
          break
        case KEY_CODES.DOWN:
          seek(-60)
          e.preventDefault()
          break
        case KEY_CODES.BACK:
          onBack()
          e.preventDefault()
          break
        case KEY_CODES.RED:
          if (audios.length > 0) {
            setControls(prev => ({ ...prev, activePanel: 'audio' }))
          }
          e.preventDefault()
          break
        case KEY_CODES.GREEN:
          if (convertedSubs.length > 0) {
            setControls(prev => ({ ...prev, activePanel: 'subtitles' }))
          }
          e.preventDefault()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [controls, audios, convertedSubs, togglePlay, seek, selectAudio, selectSubtitle, showControls, onBack])

  useEffect(() => {
    showControls()
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
    }
  }, [showControls])

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const bufferedProgress = duration > 0 ? (buffered / duration) * 100 : 0

  return (
    <div class="player-screen">
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
              <div class="player-progress-bar">
                <div class="player-progress-buffered" style={{ width: `${bufferedProgress}%` }} />
                <div class="player-progress-current" style={{ width: `${progress}%` }} />
              </div>
              <div class="player-time">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div class="player-controls-row">
              <div class="player-state">
                {isPlaying ? <span class="icon-play" /> : <span class="icon-pause" />}
              </div>
              <div class="player-hints">
                {audios.length > 0 && (
                  <span class="player-hint">
                    <span class="player-hint-key red">●</span> {t.audio}
                  </span>
                )}
                {convertedSubs.length > 0 && (
                  <span class="player-hint">
                    <span class="player-hint-key green">●</span> {t.subtitles}
                  </span>
                )}
              </div>
            </div>
          </div>

          {controls.activePanel === 'audio' && (
            <div class="player-panel">
              <h2 class="player-panel-title">{t.audio}</h2>
              <div class="player-panel-list">
                {audios.map((audio, idx) => (
                  <div
                    key={audio.id}
                    class={`player-panel-item ${idx === controls.selectedAudioIndex ? 'selected' : ''}`}
                  >
                    {audio.author?.title || audio.type?.title || audio.lang}
                  </div>
                ))}
              </div>
            </div>
          )}

          {controls.activePanel === 'subtitles' && (
            <div class="player-panel">
              <h2 class="player-panel-title">{t.subtitles}</h2>
              <div class="player-panel-list">
                <div
                  class={`player-panel-item ${controls.selectedSubtitleIndex === -1 ? 'selected' : ''}`}
                >
                  {t.subtitlesOff}
                </div>
                {convertedSubs.map((sub, idx) => (
                  <div
                    key={sub.lang}
                    class={`player-panel-item ${idx === controls.selectedSubtitleIndex ? 'selected' : ''}`}
                  >
                    {sub.lang.toUpperCase()}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
