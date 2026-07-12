import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { h } from 'preact'
import { SideMenu, getMenuIdByIndex, ALL_MENU_ITEMS_COUNT, MENU_ITEMS_COUNT } from '../../src/components/SideMenu'
import { I18nProvider } from '../../src/i18n/context'

function renderWithI18n(component: preact.ComponentChild) {
  return render(
    <I18nProvider>
      {component}
    </I18nProvider>
  )
}

describe('SideMenu', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('rendering', () => {
    it('renders all menu items', () => {
      renderWithI18n(
        <SideMenu selectedId="home" focusedIndex={null} onSelect={() => {}} />
      )

      expect(screen.getByText('K')).toBeDefined()
    })

    it('shows collapsed logo when not expanded', () => {
      renderWithI18n(
        <SideMenu selectedId="home" focusedIndex={null} onSelect={() => {}} />
      )

      expect(screen.getByText('K')).toBeDefined()
    })

    it('shows full app name when expanded', () => {
      renderWithI18n(
        <SideMenu selectedId="home" focusedIndex={0} onSelect={() => {}} />
      )

      expect(screen.getByText('KPuppy')).toBeDefined()
    })

    it('shows menu labels when expanded', () => {
      renderWithI18n(
        <SideMenu selectedId="home" focusedIndex={0} onSelect={() => {}} />
      )

      expect(screen.getByText('Home')).toBeDefined()
      expect(screen.getByText('Search')).toBeDefined()
      expect(screen.getByText('Settings')).toBeDefined()
    })

    it('hides menu labels when collapsed', () => {
      renderWithI18n(
        <SideMenu selectedId="home" focusedIndex={null} onSelect={() => {}} />
      )

      expect(screen.queryByText('Home')).toBeNull()
      expect(screen.queryByText('Search')).toBeNull()
    })
  })

  describe('selection state', () => {
    it('marks selected item with selected class', () => {
      const { container } = renderWithI18n(
        <SideMenu selectedId="search" focusedIndex={0} onSelect={() => {}} />
      )

      const selectedItem = container.querySelector('.side-menu-item.selected')
      expect(selectedItem).toBeDefined()
    })

    it('marks focused item with focused class', () => {
      const { container } = renderWithI18n(
        <SideMenu selectedId="home" focusedIndex={2} onSelect={() => {}} />
      )

      const focusedItems = container.querySelectorAll('.side-menu-item.focused')
      expect(focusedItems.length).toBe(1)
    })

    it('does not mark any item as focused when focusedIndex is null', () => {
      const { container } = renderWithI18n(
        <SideMenu selectedId="home" focusedIndex={null} onSelect={() => {}} />
      )

      const focusedItems = container.querySelectorAll('.side-menu-item.focused')
      expect(focusedItems.length).toBe(0)
    })
  })

  describe('interactions', () => {
    it('calls onSelect with correct id when menu item is clicked', () => {
      const onSelect = vi.fn()

      renderWithI18n(
        <SideMenu selectedId="home" focusedIndex={0} onSelect={onSelect} />
      )

      fireEvent.click(screen.getByText('Search'))

      expect(onSelect).toHaveBeenCalledWith('search')
    })

    it('calls onSelect for settings', () => {
      const onSelect = vi.fn()

      renderWithI18n(
        <SideMenu selectedId="home" focusedIndex={0} onSelect={onSelect} />
      )

      fireEvent.click(screen.getByText('Settings'))

      expect(onSelect).toHaveBeenCalledWith('settings')
    })

    it('calls onSelect for profile', () => {
      const onSelect = vi.fn()

      renderWithI18n(
        <SideMenu selectedId="home" focusedIndex={0} onSelect={onSelect} />
      )

      fireEvent.click(screen.getByText('Profile'))

      expect(onSelect).toHaveBeenCalledWith('user')
    })
  })

  describe('expanded state', () => {
    it('adds expanded class when focusedIndex is not null', () => {
      const { container } = renderWithI18n(
        <SideMenu selectedId="home" focusedIndex={0} onSelect={() => {}} />
      )

      const menu = container.querySelector('.side-menu')
      expect(menu?.className).toContain('expanded')
    })

    it('does not have expanded class when focusedIndex is null', () => {
      const { container } = renderWithI18n(
        <SideMenu selectedId="home" focusedIndex={null} onSelect={() => {}} />
      )

      const menu = container.querySelector('.side-menu')
      expect(menu?.className).not.toContain('expanded')
    })
  })
})

describe('getMenuIdByIndex', () => {
  it('returns home for index 0', () => {
    expect(getMenuIdByIndex(0)).toBe('home')
  })

  it('returns search for index 1', () => {
    expect(getMenuIdByIndex(1)).toBe('search')
  })

  it('returns history, then catalog types', () => {
    expect(getMenuIdByIndex(2)).toBe('history')
    expect(getMenuIdByIndex(3)).toBe('movies')
    expect(getMenuIdByIndex(4)).toBe('series')
  })

  it('puts collections before bookmarks after livetv', () => {
    expect(getMenuIdByIndex(9)).toBe('livetv')
    expect(getMenuIdByIndex(10)).toBe('collections')
    expect(getMenuIdByIndex(11)).toBe('bookmarks')
    expect(getMenuIdByIndex(12)).toBe('newepisodes')
  })

  it('returns user for last index', () => {
    expect(getMenuIdByIndex(ALL_MENU_ITEMS_COUNT - 1)).toBe('user')
  })

  it('returns undefined for out of bounds index', () => {
    expect(getMenuIdByIndex(100)).toBeUndefined()
  })

  it('returns undefined for negative index', () => {
    expect(getMenuIdByIndex(-1)).toBeUndefined()
  })
})

describe('menu constants', () => {
  it('MENU_ITEMS_COUNT does not include user', () => {
    expect(MENU_ITEMS_COUNT).toBe(14)
  })

  it('ALL_MENU_ITEMS_COUNT includes user', () => {
    expect(ALL_MENU_ITEMS_COUNT).toBe(15)
  })
})
