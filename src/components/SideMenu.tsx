import { ComponentType } from 'preact'
import { useI18n } from '../i18n'
import { Translations } from '../i18n/translations'
import {
  HomeIcon, SearchIcon, PlayIcon, FilmIcon, TvIcon,
  MicIcon, GlassesIcon, VideoIcon, RadioIcon, SettingsIcon, UserIcon
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
  { id: 'watching', Icon: PlayIcon, labelKey: 'menuContinue' },
  { id: 'movies', Icon: FilmIcon, labelKey: 'menuMovies' },
  { id: 'series', Icon: TvIcon, labelKey: 'menuSeries' },
  { id: 'concerts', Icon: MicIcon, labelKey: 'menuConcerts' },
  { id: '3d', Icon: GlassesIcon, labelKey: 'menu3D' },
  { id: 'docs', Icon: VideoIcon, labelKey: 'menuDocs' },
  { id: 'tvshows', Icon: RadioIcon, labelKey: 'menuTvShows' },
  { id: 'settings', Icon: SettingsIcon, labelKey: 'menuSettings' },
]

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
  const isExpanded = focusedIndex !== null

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
      <ul class="side-menu-items">
        {MENU_ITEM_CONFIGS.map((item, index) => renderMenuItem(item, index))}
      </ul>
      <ul class="side-menu-bottom">
        {renderMenuItem(USER_MENU_CONFIG, MENU_ITEM_CONFIGS.length)}
      </ul>
    </nav>
  )
}
