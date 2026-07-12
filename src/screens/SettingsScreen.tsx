import { useState, useEffect, useCallback, useMemo } from 'preact/hooks'
import { getDeviceInfo, updateDeviceSettings, DeviceSettings, SelectOption } from '../api/kinopub'
import { getLocalSettings, saveLocalSettings, VideoQuality, PlayerType } from '../storage'
import { applyPreferredDeviceDefaults } from '../preferredDefaults'
import { LoadingState } from '../components/LoadingSpinner'
import { useKeyboardNavigation } from '../hooks'
import { useI18n, Language } from '../i18n'
import '../styles/settings.css'

const QUALITY_OPTIONS: { id: VideoQuality; labelKey: keyof typeof import('../i18n/translations').translations.en }[] = [
  { id: 'auto', labelKey: 'qualityAuto' },
  { id: '2160p', labelKey: 'quality4k' },
  { id: '1080p', labelKey: 'quality1080p' },
  { id: '720p', labelKey: 'quality720p' },
  { id: '480p', labelKey: 'quality480p' },
]

const PLAYER_OPTIONS: { id: PlayerType; labelKey: keyof typeof import('../i18n/translations').translations.en }[] = [
  { id: 'native', labelKey: 'playerNative' },
  { id: 'builtin', labelKey: 'playerBuiltin' },
]

interface SettingsScreenProps {
  onNavigateToMenu: () => void
  isActive: boolean
}

type SettingType = 'toggle' | 'select' | 'language' | 'action'

interface SettingItem {
  id: string
  labelKey: keyof typeof import('../i18n/translations').translations.en
  type: SettingType
  key?: keyof DeviceSettings
  section: 'client' | 'local'
}

const ALL_SETTINGS: SettingItem[] = [
  { id: 'support4k', labelKey: 'support4k', type: 'toggle', key: 'support4k', section: 'client' },
  { id: 'supportHevc', labelKey: 'supportHevc', type: 'toggle', key: 'supportHevc', section: 'client' },
  { id: 'supportHdr', labelKey: 'supportHdr', type: 'toggle', key: 'supportHdr', section: 'client' },
  { id: 'supportSsl', labelKey: 'supportSsl', type: 'toggle', key: 'supportSsl', section: 'client' },
  { id: 'mixedPlaylist', labelKey: 'mixedPlaylist', type: 'toggle', key: 'mixedPlaylist', section: 'client' },
  { id: 'serverLocation', labelKey: 'server', type: 'select', key: 'serverLocation', section: 'client' },
  { id: 'streamingType', labelKey: 'streaming', type: 'select', key: 'streamingType', section: 'client' },
  { id: 'applyRecommended', labelKey: 'applyRecommendedSettings', type: 'action', section: 'client' },
  { id: 'quality', labelKey: 'quality', type: 'select', section: 'local' },
  { id: 'player', labelKey: 'player', type: 'select', section: 'local' },
  { id: 'showContinueWatching', labelKey: 'showContinueWatching', type: 'toggle', section: 'local' },
  { id: 'pinSideMenu', labelKey: 'pinSideMenu', type: 'toggle', section: 'local' },
  { id: 'language', labelKey: 'language', type: 'language', section: 'local' },
]

export function SettingsScreen({ onNavigateToMenu, isActive }: SettingsScreenProps) {
  const { t, language, setLanguage, languages } = useI18n()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deviceId, setDeviceId] = useState<number | null>(null)
  const [settings, setSettings] = useState<DeviceSettings | null>(null)
  const [quality, setQuality] = useState<VideoQuality>(() => getLocalSettings().defaultQuality)
  const [playerType, setPlayerType] = useState<PlayerType>(() => getLocalSettings().playerType)
  const [showContinueWatching, setShowContinueWatching] = useState<boolean>(() => getLocalSettings().showContinueWatching)
  const [pinSideMenu, setPinSideMenu] = useState<boolean>(() => getLocalSettings().pinSideMenu)
  const [focusedCol, setFocusedCol] = useState(0)
  const [focusedRow, setFocusedRow] = useState(0)
  const [expandedSelect, setExpandedSelect] = useState<string | null>(null)
  const [selectFocusIndex, setSelectFocusIndex] = useState(0)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  useEffect(() => {
    async function loadSettings() {
      try {
        const deviceInfo = await getDeviceInfo()
        setDeviceId(deviceInfo.id)
        setSettings(deviceInfo.settings)
      } catch (err) {
        if (import.meta.env.DEV) console.error('Failed to load settings:', err)
      } finally {
        setLoading(false)
      }
    }
    loadSettings()
  }, [])

  const saveSettingChange = useCallback(async (key: string, value: number) => {
    if (!deviceId) return
    setSaving(true)
    try {
      await updateDeviceSettings(deviceId, { [key]: value })
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to save setting:', err)
    } finally {
      setSaving(false)
    }
  }, [deviceId])

  const servers = settings?.serverLocation || []
  const streamingTypes = settings?.streamingType || []

  const columns = useMemo(() => {
    const visible = ALL_SETTINGS.filter(item => {
      if (item.key === 'serverLocation' && servers.length === 0) return false
      if (item.key === 'streamingType' && streamingTypes.length === 0) return false
      return true
    })
    return [
      visible.filter(s => s.section === 'client'),
      visible.filter(s => s.section === 'local'),
    ]
  }, [servers.length, streamingTypes.length])

  const getSelectOptions = (key: string): SelectOption[] => {
    if (key === 'serverLocation') return servers
    if (key === 'streamingType') return streamingTypes
    if (key === 'quality') {
      return QUALITY_OPTIONS.map((opt, idx) => ({
        id: idx,
        label: t[opt.labelKey],
        selected: opt.id === quality ? 1 : 0
      }))
    }
    if (key === 'player') {
      return PLAYER_OPTIONS.map((opt, idx) => ({
        id: idx,
        label: t[opt.labelKey],
        selected: opt.id === playerType ? 1 : 0
      }))
    }
    if (key === 'language') {
      return languages.map(lang => ({
        id: lang.id === 'en' ? 1 : lang.id === 'ru' ? 2 : 3,
        label: lang.label,
        selected: lang.id === language ? 1 : 0
      }))
    }
    return []
  }

  const handleSelectOption = useCallback((index: number = selectFocusIndex) => {
    if (!expandedSelect) return
    const options = getSelectOptions(expandedSelect)
    const selectedOption = options[index]
    if (selectedOption) {
      if (expandedSelect === 'language') {
        const langId = languages[index]?.id
        if (langId) setLanguage(langId as Language)
      } else if (expandedSelect === 'quality') {
        const newQuality = QUALITY_OPTIONS[index]?.id
        if (newQuality) {
          setQuality(newQuality)
          saveLocalSettings({ defaultQuality: newQuality })
        }
      } else if (expandedSelect === 'player') {
        const newPlayer = PLAYER_OPTIONS[index]?.id
        if (newPlayer) {
          setPlayerType(newPlayer)
          saveLocalSettings({ playerType: newPlayer })
        }
      } else if (settings) {
        const newOptions = options.map(o => ({
          ...o,
          selected: o.id === selectedOption.id ? 1 : 0
        }))
        setSettings({ ...settings, [expandedSelect]: newOptions })
        saveSettingChange(expandedSelect, selectedOption.id)
      }
    }
    setExpandedSelect(null)
  }, [expandedSelect, selectFocusIndex, languages, settings, saveSettingChange, setLanguage])

  const activateItem = useCallback((item: SettingItem) => {
    if (item.type === 'action' && item.id === 'applyRecommended') {
      setSaving(true)
      setStatusMessage(null)
      applyPreferredDeviceDefaults(true)
        .then(async () => {
          const deviceInfo = await getDeviceInfo()
          setDeviceId(deviceInfo.id)
          setSettings(deviceInfo.settings)
          setStatusMessage(t.recommendedSettingsApplied)
        })
        .catch(err => {
          if (import.meta.env.DEV) console.error('applyPreferredDeviceDefaults failed:', err)
        })
        .finally(() => setSaving(false))
      return
    }
    if (item.type === 'toggle' && item.id === 'showContinueWatching') {
      const newValue = !showContinueWatching
      setShowContinueWatching(newValue)
      saveLocalSettings({ showContinueWatching: newValue })
    } else if (item.type === 'toggle' && item.id === 'pinSideMenu') {
      const newValue = !pinSideMenu
      setPinSideMenu(newValue)
      saveLocalSettings({ pinSideMenu: newValue })
    } else if (item.type === 'toggle' && settings && item.key) {
      const currentValue = settings[item.key] as number
      const newValue = currentValue ? 0 : 1
      setSettings({ ...settings, [item.key]: newValue })
      saveSettingChange(item.key, newValue)
    } else if (item.type === 'select') {
      const selectKey = item.key || item.id
      const options = getSelectOptions(selectKey)
      const selectedIdx = options.findIndex(o => o.selected === 1)
      setSelectFocusIndex(Math.max(0, selectedIdx))
      setExpandedSelect(selectKey)
    } else if (item.type === 'language') {
      const options = getSelectOptions('language')
      const selectedIdx = options.findIndex(o => o.selected === 1)
      setSelectFocusIndex(Math.max(0, selectedIdx))
      setExpandedSelect('language')
    }
  }, [settings, saveSettingChange, showContinueWatching, pinSideMenu, t.recommendedSettingsApplied])

  const handleActivateItem = useCallback(() => {
    const currentItem = columns[focusedCol]?.[focusedRow]
    if (!currentItem) return
    activateItem(currentItem)
  }, [columns, focusedCol, focusedRow, activateItem])

  const handlers = useMemo(() => {
    if (expandedSelect) {
      const options = getSelectOptions(expandedSelect)
      return {
        onUp: () => setSelectFocusIndex(prev => Math.max(0, prev - 1)),
        onDown: () => setSelectFocusIndex(prev => Math.min(options.length - 1, prev + 1)),
        onEnter: () => handleSelectOption(),
        onBack: () => setExpandedSelect(null)
      }
    }
    const currentColLength = columns[focusedCol]?.length || 0
    return {
      onLeft: () => {
        if (focusedCol > 0) {
          const targetCol = focusedCol - 1
          setFocusedCol(targetCol)
          setFocusedRow(prev => Math.min(prev, (columns[targetCol]?.length || 1) - 1))
        } else {
          onNavigateToMenu()
        }
      },
      onRight: () => {
        if (focusedCol < columns.length - 1 && (columns[focusedCol + 1]?.length || 0) > 0) {
          const targetCol = focusedCol + 1
          setFocusedCol(targetCol)
          setFocusedRow(prev => Math.min(prev, (columns[targetCol]?.length || 1) - 1))
        }
      },
      onUp: () => setFocusedRow(prev => Math.max(0, prev - 1)),
      onDown: () => setFocusedRow(prev => Math.min(currentColLength - 1, prev + 1)),
      onEnter: handleActivateItem
    }
  }, [expandedSelect, focusedCol, focusedRow, columns, onNavigateToMenu, handleSelectOption, handleActivateItem])

  useKeyboardNavigation(handlers, isActive && !loading)

  const getSelectedOption = (key: string): SelectOption | undefined => {
    const options = getSelectOptions(key)
    return options.find(o => o.selected === 1)
  }

  const getCurrentLanguageLabel = (): string => {
    return languages.find(l => l.id === language)?.label || 'English'
  }

  const renderSettingItem = (item: SettingItem, col: number, row: number) => {
    const isFocused = focusedCol === col && focusedRow === row

    return (
      <div
        key={item.id}
        class={`settings-item ${isFocused ? 'focused' : ''}`}
        onMouseEnter={() => {
          setFocusedCol(col)
          setFocusedRow(row)
        }}
        onClick={() => {
          setFocusedCol(col)
          setFocusedRow(row)
          activateItem(item)
        }}
      >
        <span class="settings-item-label">{t[item.labelKey]}</span>
        {item.type === 'toggle' && item.id === 'showContinueWatching' && (
          <div class={`settings-toggle ${showContinueWatching ? 'on' : 'off'}`}>
            <div class="settings-toggle-track">
              <div class="settings-toggle-thumb" />
            </div>
            <span class="settings-toggle-text">
              {showContinueWatching ? t.on : t.off}
            </span>
          </div>
        )}
        {item.type === 'toggle' && item.id === 'pinSideMenu' && (
          <div class={`settings-toggle ${pinSideMenu ? 'on' : 'off'}`}>
            <div class="settings-toggle-track">
              <div class="settings-toggle-thumb" />
            </div>
            <span class="settings-toggle-text">
              {pinSideMenu ? t.on : t.off}
            </span>
          </div>
        )}
        {item.type === 'toggle' && settings && item.key && (
          <div class={`settings-toggle ${settings[item.key] ? 'on' : 'off'}`}>
            <div class="settings-toggle-track">
              <div class="settings-toggle-thumb" />
            </div>
            <span class="settings-toggle-text">
              {settings[item.key] ? t.on : t.off}
            </span>
          </div>
        )}
        {item.type === 'select' && (
          <div class="settings-select">
            <span class="settings-select-value">
              {getSelectedOption(item.key || item.id)?.label || t.notSelected}
            </span>
            <span class="settings-select-arrow">▶</span>
          </div>
        )}
        {item.type === 'language' && (
          <div class="settings-select">
            <span class="settings-select-value">{getCurrentLanguageLabel()}</span>
            <span class="settings-select-arrow">▶</span>
          </div>
        )}
        {item.type === 'action' && (
          <div class="settings-select">
            <span class="settings-select-arrow">▶</span>
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div class="settings-screen">
        <h1 class="settings-title">{t.settings}</h1>
        <LoadingState />
      </div>
    )
  }

  return (
    <div class="settings-screen">
      <h1 class="settings-title">{t.settings}</h1>
      {saving && <div class="settings-saving">{t.saving}</div>}
      {!saving && statusMessage && <div class="settings-saving">{statusMessage}</div>}

      <div class="settings-sections">
        {columns[0].length > 0 && (
          <div class="settings-section">
            <h2 class="settings-section-title">{t.clientSettings}</h2>
            <div class="settings-list">
              {columns[0].map((item, idx) => renderSettingItem(item, 0, idx))}
            </div>
          </div>
        )}

        {columns[1].length > 0 && (
          <div class="settings-section">
            <h2 class="settings-section-title">{t.localSettings}</h2>
            <div class="settings-list">
              {columns[1].map((item, idx) => renderSettingItem(item, 1, idx))}
            </div>
          </div>
        )}
      </div>

      {expandedSelect && (
        <div class="settings-select-dropdown">
          <div class="settings-select-list">
            {getSelectOptions(expandedSelect).map((option, index) => (
              <div
                key={option.id}
                class={`settings-select-item ${selectFocusIndex === index ? 'focused' : ''} ${option.selected ? 'selected' : ''}`}
                onMouseEnter={() => setSelectFocusIndex(index)}
                onClick={() => handleSelectOption(index)}
              >
                {option.label}
                {option.selected === 1 && <span class="settings-select-check">✓</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
