import { ComponentType, Fragment } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import { useI18n } from '../i18n'
import { useScrollToFocused } from '../hooks/useScrollToFocused'
import { Translations } from '../i18n/translations'
import { getLocalSettings } from '../storage'
import {
  HomeIcon, SearchIcon, BookmarkIcon, CollectionIcon, HistoryIcon, FilmIcon, TvIcon,
  MicIcon, GlassesIcon, VideoIcon, RadioIcon, LiveIcon, SettingsIcon, UserIcon, BellIcon
} from './Icons'
import '../styles/sidemenu.css'

export interface MenuItem {
  id: string
  Icon: ComponentType<{ size?: number; color?: string }>
  labelKey: keyof Translations
}

const MENU_ITEM_CONFIGS: MenuItem[] = [
  { id: 'home', Icon: HomeIcon, labelKey: 'menuHome' },
  { id: 'search', Icon: SearchIcon, labelKey: 'menuSearch' },
  { id: 'history', Icon: HistoryIcon, labelKey: 'menuHistory' },
  { id: 'movies', Icon: FilmIcon, labelKey: 'menuMovies' },
  { id: 'series', Icon: TvIcon, labelKey: 'menuSeries' },
  { id: 'concerts', Icon: MicIcon, labelKey: 'menuConcerts' },
  { id: '3d', Icon: GlassesIcon, labelKey: 'menu3D' },
  { id: 'docs', Icon: VideoIcon, labelKey: 'menuDocs' },
  { id: 'tvshows', Icon: RadioIcon, labelKey: 'menuTvShows' },
  { id: 'livetv', Icon: LiveIcon, labelKey: 'menuLiveTV' },
  { id: 'collections', Icon: CollectionIcon, labelKey: 'menuCollections' },
  { id: 'bookmarks', Icon: BookmarkIcon, labelKey: 'menuBookmarks' },
  { id: 'newepisodes', Icon: BellIcon, labelKey: 'menuNewEpisodes' },
  { id: 'settings', Icon: SettingsIcon, labelKey: 'menuSettings' },
]

/** Visual group breaks — after History and after Live TV. */
const SEPARATOR_AFTER_IDS = new Set(['history', 'livetv'])

const USER_MENU_CONFIG: MenuItem = { id: 'user', Icon: UserIcon, labelKey: 'menuProfile' }

export const MENU_ITEMS_COUNT = MENU_ITEM_CONFIGS.length
export const ALL_MENU_ITEMS_COUNT = MENU_ITEM_CONFIGS.length + 1

const ALL_MENU_IDS = [...MENU_ITEM_CONFIGS.map(m => m.id), USER_MENU_CONFIG.id]

export function getMenuIdByIndex(index: number): string | undefined {
  return ALL_MENU_IDS[index]
}

interface SideMenuProps {
  selectedId: string
  focusedIndex: number | null
  onSelect: (id: string) => void
}

export function SideMenu({ selectedId, focusedIndex, onSelect }: SideMenuProps) {
  const { t } = useI18n()
  const [pinSideMenu, setPinSideMenu] = useState(() => getLocalSettings().pinSideMenu)
  const isExpanded = pinSideMenu || focusedIndex !== null
  const menuItemsRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    const sync = () => setPinSideMenu(getLocalSettings().pinSideMenu)
    window.addEventListener('kpuppy-settings-changed', sync)
    return () => window.removeEventListener('kpuppy-settings-changed', sync)
  }, [])

  useScrollToFocused({
    containerRef: menuItemsRef,
    focusedIndex: focusedIndex ?? 0,
    itemSelector: '.side-menu-item',
    direction: 'vertical',
    center: false
  })

  const renderMenuItem = (item: MenuItem, index: number) => {
    const isFocused = focusedIndex === index
    const isSelected = selectedId === item.id
    const { Icon } = item
    return (
      <li
        key={item.id}
        class={`side-menu-item ${isFocused ? 'focused' : ''} ${isSelected ? 'selected' : ''}`}
        onClick={() => onSelect(item.id)}
      >
        <span class="side-menu-icon"><Icon size={36} /></span>
        {isExpanded && <span class="side-menu-label">{t[item.labelKey]}</span>}
      </li>
    )
  }

  return (
    <nav class={`side-menu ${isExpanded ? 'expanded' : ''}`}>
      <div class="side-menu-logo">
        {isExpanded ? t.appName : 'K'}
      </div>
      <ul class="side-menu-items" ref={menuItemsRef}>
        {MENU_ITEM_CONFIGS.map((item, index) => (
          <Fragment key={item.id}>
            {renderMenuItem(item, index)}
            {SEPARATOR_AFTER_IDS.has(item.id) && (
              <li class="side-menu-separator" aria-hidden="true" />
            )}
          </Fragment>
        ))}
      </ul>
      <ul class="side-menu-bottom">
        {renderMenuItem(USER_MENU_CONFIG, MENU_ITEM_CONFIGS.length)}
      </ul>
    </nav>
  )
}
