import { ComponentChildren } from 'preact'
import { SideMenu } from './SideMenu'
import { ErrorBoundary } from './ErrorBoundary'

interface ScreenManagerProps {
  selectedMenuId: string
  menuFocusIndex: number | null
  isMenuFocused: boolean
  onMenuSelect: (menuId: string) => void
  children: ComponentChildren
}

export function ScreenManager({
  selectedMenuId,
  menuFocusIndex,
  isMenuFocused,
  onMenuSelect,
  children
}: ScreenManagerProps) {
  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <SideMenu
        selectedId={selectedMenuId}
        focusedIndex={isMenuFocused ? menuFocusIndex : null}
        onSelect={onMenuSelect}
      />
      <ErrorBoundary>
        <div class={`app-with-menu ${isMenuFocused ? 'menu-expanded' : ''}`}>
          {children}
        </div>
      </ErrorBoundary>
    </div>
  )
}
