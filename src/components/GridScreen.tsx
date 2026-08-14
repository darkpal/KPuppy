import { ComponentChildren, Ref, RefObject } from 'preact'
import { VirtualGrid } from './VirtualGrid'
import { LoadingState } from './LoadingSpinner'

interface GridScreenProps<T> {
  title: string
  loading: boolean
  items: T[]
  focusedIndex: number
  itemsPerRow: number
  renderItem: (item: T, index: number, focused: boolean) => ComponentChildren
  getItemKey: (item: T, index: number) => string | number
  emptyMessage?: string
  containerRef?: Ref<HTMLDivElement>
  /** Below the title row (filters, etc.). Stays pinned above the scroll area. */
  header?: ComponentChildren
  /** Right side of the title row (sort actions, etc.). */
  trailing?: ComponentChildren
  footer?: ComponentChildren
  cardWidth?: number
  scrollToFocused?: boolean
}

export function GridScreen<T>({
  title,
  loading,
  items,
  focusedIndex,
  itemsPerRow,
  renderItem,
  getItemKey,
  emptyMessage,
  containerRef,
  header,
  trailing,
  footer,
  cardWidth,
  scrollToFocused = true
}: GridScreenProps<T>) {
  if (loading) {
    return (
      <div class="category-screen">
        <h1 class="category-title">{title}</h1>
        <LoadingState />
      </div>
    )
  }

  return (
    <div class="category-screen category-screen--chrome">
      <div class="category-chrome">
        <div class="category-chrome-bar">
          <h1 class="category-title">{title}</h1>
          {trailing}
        </div>
        {header}
      </div>
      <div class="category-scroll" ref={containerRef}>
        <VirtualGrid
          items={items}
          focusedIndex={focusedIndex}
          itemsPerRow={itemsPerRow}
          renderItem={renderItem}
          getItemKey={getItemKey}
          emptyMessage={emptyMessage}
          cardWidth={cardWidth}
          scrollContainerRef={containerRef as RefObject<HTMLElement> | undefined}
          scrollToFocused={scrollToFocused}
        />
        {footer}
      </div>
    </div>
  )
}
