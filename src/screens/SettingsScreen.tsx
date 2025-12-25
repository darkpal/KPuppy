import { useState, useEffect, useCallback, useMemo } from 'preact/hooks'
import { getDeviceInfo, updateDeviceSettings, DeviceSettings, SelectOption } from '../api/kinopub'
import { getLocalSettings, saveLocalSettings, VideoQuality, PlayerType } from '../storage'
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

type SettingType = 'toggle' | 'select' | 'language'

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
  { id: 'quality', labelKey: 'quality', type: 'select', section: 'local' },
  { id: 'player', labelKey: 'player', type: 'select', section: 'local' },
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
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [expandedSelect, setExpandedSelect] = useState<string | null>(null)
  const [selectFocusIndex, setSelectFocusIndex] = useState(0)

  useEffect(() => {
    async function loadSettings() {
      try {
        const deviceInfo = await getDeviceInfo()
        setDeviceId(deviceInfo.id)
        setSettings(deviceInfo.settings)
      } catch (err) {
        console.error('Failed to load settings:', err)
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
      console.error('Failed to save setting:', err)
    } finally {
      setSaving(false)
    }
  }, [deviceId])

  const servers = settings?.serverLocation || []
  const streamingTypes = settings?.streamingType || []

  const visibleSettings = ALL_SETTINGS.filter(item => {
    if (item.key === 'serverLocation' && servers.length === 0) return false
    if (item.key === 'streamingType' && streamingTypes.length === 0) return false
    return true
  })

  const clientSettings = visibleSettings.filter(s => s.section === 'client')
  const localSettings = visibleSettings.filter(s => s.section === 'local')
  const allItems = [...clientSettings, ...localSettings]

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

  const handleSelectOption = useCallback(() => {
    if (!expandedSelect) return
    const options = getSelectOptions(expandedSelect)
    const selectedOption = options[selectFocusIndex]
    if (selectedOption) {
      if (expandedSelect === 'language') {
        const langId = languages[selectFocusIndex]?.id
        if (langId) setLanguage(langId as Language)
      } else if (expandedSelect === 'quality') {
        const newQuality = QUALITY_OPTIONS[selectFocusIndex]?.id
        if (newQuality) {
          setQuality(newQuality)
          saveLocalSettings({ defaultQuality: newQuality })
        }
      } else if (expandedSelect === 'player') {
        const newPlayer = PLAYER_OPTIONS[selectFocusIndex]?.id
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

  const handleActivateItem = useCallback(() => {
    const currentItem = allItems[focusedIndex]
    if (!currentItem) return
    if (currentItem.type === 'toggle' && settings && currentItem.key) {
      const currentValue = settings[currentItem.key] as number
      const newValue = currentValue ? 0 : 1
      setSettings({ ...settings, [currentItem.key]: newValue })
      saveSettingChange(currentItem.key, newValue)
    } else if (currentItem.type === 'select') {
      const selectKey = currentItem.key || currentItem.id
      const options = getSelectOptions(selectKey)
      const selectedIdx = options.findIndex(o => o.selected === 1)
      setSelectFocusIndex(Math.max(0, selectedIdx))
      setExpandedSelect(selectKey)
    } else if (currentItem.type === 'language') {
      const options = getSelectOptions('language')
      const selectedIdx = options.findIndex(o => o.selected === 1)
      setSelectFocusIndex(Math.max(0, selectedIdx))
      setExpandedSelect('language')
    }
  }, [allItems, focusedIndex, settings, saveSettingChange])

  const handlers = useMemo(() => {
    if (expandedSelect) {
      const options = getSelectOptions(expandedSelect)
      return {
        onUp: () => setSelectFocusIndex(prev => Math.max(0, prev - 1)),
        onDown: () => setSelectFocusIndex(prev => Math.min(options.length - 1, prev + 1)),
        onEnter: handleSelectOption,
        onBack: () => setExpandedSelect(null)
      }
    }
    return {
      onLeft: onNavigateToMenu,
      onUp: () => setFocusedIndex(prev => Math.max(0, prev - 1)),
      onDown: () => setFocusedIndex(prev => Math.min(allItems.length - 1, prev + 1)),
      onEnter: handleActivateItem,
      onRight: handleActivateItem
    }
  }, [expandedSelect, allItems.length, onNavigateToMenu, handleSelectOption, handleActivateItem])

  useKeyboardNavigation(handlers, isActive && !loading)

  const getSelectedOption = (key: string): SelectOption | undefined => {
    const options = getSelectOptions(key)
    return options.find(o => o.selected === 1)
  }

  const getCurrentLanguageLabel = (): string => {
    return languages.find(l => l.id === language)?.label || 'English'
  }

  const renderSettingItem = (item: SettingItem, globalIndex: number) => {
    const isFocused = focusedIndex === globalIndex

    return (
      <div
        key={item.id}
        class={`settings-item ${isFocused ? 'focused' : ''}`}
      >
        <span class="settings-item-label">{t[item.labelKey]}</span>
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
      </div>
    )
  }

  if (loading) {
    return (
      <div class="settings-screen">
        <h1 class="settings-title">{t.settings}</h1>
        <div class="settings-loading">
          <div class="settings-spinner" />
        </div>
      </div>
    )
  }

  return (
    <div class="settings-screen">
      <h1 class="settings-title">{t.settings}</h1>
      {saving && <div class="settings-saving">{t.saving}</div>}

      <div class="settings-sections">
        {clientSettings.length > 0 && (
          <div class="settings-section">
            <h2 class="settings-section-title">{t.clientSettings}</h2>
            <div class="settings-list">
              {clientSettings.map((item, idx) => renderSettingItem(item, idx))}
            </div>
          </div>
        )}

        {localSettings.length > 0 && (
          <div class="settings-section">
            <h2 class="settings-section-title">{t.localSettings}</h2>
            <div class="settings-list">
              {localSettings.map((item, idx) => renderSettingItem(item, clientSettings.length + idx))}
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
