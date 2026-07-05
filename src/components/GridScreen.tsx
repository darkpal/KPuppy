import { ComponentChildren, Ref } from 'preact'
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
  header?: ComponentChildren
  footer?: ComponentChildren
  cardWidth?: number
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
  footer,
  cardWidth
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
    <div class="category-screen" ref={containerRef}>
      <h1 class="category-title">{title}</h1>
      {header}
      <VirtualGrid
        items={items}
        focusedIndex={focusedIndex}
        itemsPerRow={itemsPerRow}
        renderItem={renderItem}
        getItemKey={getItemKey}
        emptyMessage={emptyMessage}
        cardWidth={cardWidth}
      />
      {footer}
    </div>
  )
}
