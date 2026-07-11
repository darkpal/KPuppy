import { useState, useEffect, useCallback, useRef, useMemo } from 'preact/hooks'
import { getItems, getWatching, getGenres, getCountries, MovieItem, ItemsParams, Genre, Country } from '../api/kinopub'
import { MovieCard } from '../components/MovieCard'
import { GridScreen } from '../components/GridScreen'
import { useKeyboardNavigation, useGridLayout, createGridNavigationHandlers } from '../hooks'
import { LoadingState } from '../components/LoadingSpinner'
import { useI18n } from '../i18n'
import '../styles/category.css'

interface CategoryScreenProps {
  categoryId: string
  title: string
  onSelectItem: (itemId: number) => void
  onNavigateToMenu: () => void
  isActive: boolean
  initialFocusIndex?: number
  onFocusChange?: (index: number) => void
  initialGenreId?: number | null
}

const CATEGORY_PARAMS: Record<string, ItemsParams> = {
  movies: { type: 'movie', sort: 'created-' },
  series: { type: 'serial', sort: 'created-' },
  concerts: { type: 'concert', sort: 'created-' },
  '3d': { type: '3D', sort: 'created-' },
  docs: { type: 'documovie', sort: 'created-' },
  tvshows: { type: 'tvshow', sort: 'created-' },
}

const ITEMS_PER_PAGE = 48

type FocusArea = 'filter' | 'grid'

export function CategoryScreen({ categoryId, title, onSelectItem, onNavigateToMenu, isActive, initialFocusIndex = 0, onFocusChange, initialGenreId = null }: CategoryScreenProps) {
  const { t } = useI18n()
  const [items, setItems] = useState<MovieItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(initialFocusIndex)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const prevCategoryIdRef = useRef<string>(categoryId)
  const onFocusChangeRef = useRef(onFocusChange)
  onFocusChangeRef.current = onFocusChange
  const { itemsPerRow, cardWidth } = useGridLayout('.category-grid', 240, [items.length])

  const [genres, setGenres] = useState<Genre[]>([])
  const [countries, setCountries] = useState<Country[]>([])
  const [selectedGenre, setSelectedGenre] = useState<number | null>(initialGenreId)
  const [selectedCountry, setSelectedCountry] = useState<number | null>(null)
  const [focusArea, setFocusArea] = useState<FocusArea>('grid')
  const [filterFocusIndex, setFilterFocusIndex] = useState(0)
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false)
  const [dropdownFocusIndex, setDropdownFocusIndex] = useState(0)

  const showFilters = categoryId !== 'watching' && CATEGORY_PARAMS[categoryId]

  useEffect(() => {
    onFocusChangeRef.current?.(focusedIndex)
  }, [focusedIndex])

  useEffect(() => {
    if (showFilters) {
      const categoryType = CATEGORY_PARAMS[categoryId]?.type
      const genreTypeMap: Record<string, string> = {
        'movie': 'movie',
        'serial': 'movie',
        'concert': 'music',
        '3D': 'movie',
        'documovie': 'docu',
        'tvshow': 'tvshow'
      }
      const genreType = categoryType ? genreTypeMap[categoryType] : null
      getGenres().then(allGenres => {
        const filtered = genreType
          ? allGenres.filter(g => g.type === genreType)
          : allGenres
        setGenres(filtered)
      }).catch(err => {
        if (import.meta.env.DEV) console.error('getGenres failed:', err)
      })
      getCountries().then(setCountries).catch(err => {
        if (import.meta.env.DEV) console.error('getCountries failed:', err)
      })
    }
  }, [showFilters, categoryId])

  const loadItems = useCallback(async (page: number, append: boolean = false) => {
    if (page > 1) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }

    try {
      if (categoryId === 'watching') {
        const watchingItems = await getWatching()
        setItems(watchingItems)
        setHasMore(false)
      } else {
        const params = CATEGORY_PARAMS[categoryId]
        if (params) {
          const filterParams: ItemsParams = {
            ...params,
            page,
            perpage: ITEMS_PER_PAGE,
            ...(selectedGenre && { genre: selectedGenre }),
            ...(selectedCountry && { country: selectedCountry })
          }
          const response = await getItems(filterParams)
          if (append) {
            setItems(prev => [...prev, ...response.items])
          } else {
            setItems(response.items)
          }
          setHasMore(page < response.pagination.total)
        }
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to load category:', err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [categoryId, selectedGenre, selectedCountry])

  useEffect(() => {
    const categoryChanged = prevCategoryIdRef.current !== categoryId
    prevCategoryIdRef.current = categoryId

    setItems([])
    setCurrentPage(1)
    if (categoryChanged) {
      setFocusedIndex(0)
      setSelectedGenre(initialGenreId ?? null)
      setSelectedCountry(null)
      setFocusArea('grid')
    } else {
      setFocusedIndex(0)
      setFocusArea('grid')
    }
    setHasMore(true)
    loadItems(1, false)
  }, [categoryId, selectedGenre, selectedCountry, loadItems, initialGenreId])

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      const nextPage = currentPage + 1
      setCurrentPage(nextPage)
      loadItems(nextPage, true)
    }
  }, [loadingMore, hasMore, currentPage, loadItems])

  const handlers = useMemo(() => {
    const itemCount = items.length
    const currentRow = Math.floor(focusedIndex / itemsPerRow)
    const totalRows = Math.ceil(itemCount / itemsPerRow)

    if (focusArea === 'filter' && filterDropdownOpen) {
      const currentList = filterFocusIndex === 0 ? genres : countries
      return {
        onUp: () => setDropdownFocusIndex(prev => Math.max(0, prev - 1)),
        onDown: () => setDropdownFocusIndex(prev => Math.min(currentList.length, prev + 1)),
        onBack: () => setFilterDropdownOpen(false),
        onEnter: () => {
          if (filterFocusIndex === 0) {
            setSelectedGenre(dropdownFocusIndex === 0 ? null : genres[dropdownFocusIndex - 1]?.id || null)
          } else {
            setSelectedCountry(dropdownFocusIndex === 0 ? null : countries[dropdownFocusIndex - 1]?.id || null)
          }
          setFilterDropdownOpen(false)
        }
      }
    }

    if (focusArea === 'filter') {
      return {
        onLeft: () => {
          if (filterFocusIndex > 0) {
            setFilterFocusIndex(prev => prev - 1)
          } else {
            onNavigateToMenu()
          }
        },
        onRight: () => setFilterFocusIndex(prev => Math.min(1, prev + 1)),
        onDown: () => setFocusArea('grid'),
        onEnter: () => {
          setDropdownFocusIndex(0)
          setFilterDropdownOpen(true)
        }
      }
    }

    const gridHandlers = createGridNavigationHandlers({
      itemCount,
      itemsPerRow,
      focusedIndex,
      setFocusedIndex,
      onSelect: (index) => {
        const item = items[index]
        if (item) {
          onSelectItem(item.id)
        }
      },
      onLeftEdge: onNavigateToMenu,
      onTopEdge: showFilters ? () => setFocusArea('filter') : undefined,
      onBottomEdge: () => {
        if (hasMore) {
          loadMore()
        }
      }
    })

    return {
      ...gridHandlers,
      onDown: () => {
        gridHandlers.onDown?.()
        if (currentRow >= totalRows - 2 && hasMore) {
          loadMore()
        }
      }
    }
  }, [items, focusedIndex, onNavigateToMenu, onSelectItem, itemsPerRow, hasMore, loadMore, focusArea, filterFocusIndex, filterDropdownOpen, genres, countries, dropdownFocusIndex, showFilters])

  useKeyboardNavigation(handlers, isActive)

  useEffect(() => {
    if (filterDropdownOpen) {
      const dropdown = document.querySelector('.category-filter-dropdown') as HTMLElement
      const focusedOption = dropdown?.querySelector('.category-filter-option.focused') as HTMLElement
      if (dropdown && focusedOption) {
        const optionTop = focusedOption.offsetTop
        const optionHeight = focusedOption.offsetHeight
        const dropdownHeight = dropdown.clientHeight
        const scrollTop = dropdown.scrollTop
        if (optionTop < scrollTop) {
          dropdown.scrollTop = optionTop
        } else if (optionTop + optionHeight > scrollTop + dropdownHeight) {
          dropdown.scrollTop = optionTop + optionHeight - dropdownHeight
        }
      }
    }
  }, [dropdownFocusIndex, filterDropdownOpen])

  if (loading) {
    return (
      <div class="category-screen">
        <h1 class="category-title">{title}</h1>
        <LoadingState />
      </div>
    )
  }

  const selectedGenreTitle = selectedGenre ? genres.find(g => g.id === selectedGenre)?.title : null
  const selectedCountryTitle = selectedCountry ? countries.find(c => c.id === selectedCountry)?.title : null

  return (
    <GridScreen
      title={title}
      loading={false}
      items={items}
      focusedIndex={focusedIndex}
      itemsPerRow={itemsPerRow}
      renderItem={(item, _index, focused) => (
        <MovieCard
          movie={item}
          focused={focused}
          onSelect={() => onSelectItem(item.id)}
        />
      )}
      getItemKey={(item) => item.id}
      emptyMessage={t.errorNoItems}
      containerRef={containerRef}
      cardWidth={cardWidth}
      header={showFilters && (
        <div class="category-filters">
          <div class={`category-filter ${focusArea === 'filter' && filterFocusIndex === 0 ? 'focused' : ''}`}>
            <span class="category-filter-label">{t.genre}:</span>
            <span class="category-filter-value">{selectedGenreTitle || t.allGenres}</span>
            {focusArea === 'filter' && filterFocusIndex === 0 && filterDropdownOpen && (
              <div class="category-filter-dropdown">
                <div class={`category-filter-option ${dropdownFocusIndex === 0 ? 'focused' : ''}`}>
                  {t.allGenres}
                </div>
                {genres.map((genre, idx) => (
                  <div
                    key={genre.id}
                    class={`category-filter-option ${dropdownFocusIndex === idx + 1 ? 'focused' : ''}`}
                  >
                    {genre.title}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div class={`category-filter ${focusArea === 'filter' && filterFocusIndex === 1 ? 'focused' : ''}`}>
            <span class="category-filter-label">{t.country}:</span>
            <span class="category-filter-value">{selectedCountryTitle || t.allCountries}</span>
            {focusArea === 'filter' && filterFocusIndex === 1 && filterDropdownOpen && (
              <div class="category-filter-dropdown">
                <div class={`category-filter-option ${dropdownFocusIndex === 0 ? 'focused' : ''}`}>
                  {t.allCountries}
                </div>
                {countries.map((country, idx) => (
                  <div
                    key={country.id}
                    class={`category-filter-option ${dropdownFocusIndex === idx + 1 ? 'focused' : ''}`}
                  >
                    {country.title}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      footer={loadingMore && (
        <div class="category-loading-more">
          <div class="category-spinner-small" />
          <span>{t.loadingMore}</span>
        </div>
      )}
    />
  )
}
