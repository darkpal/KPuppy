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
  movies: { type: 'movie' },
  series: { type: 'serial' },
  concerts: { type: 'concert' },
  '3d': { type: '3D' },
  docs: { type: 'documovie' },
  tvshows: { type: 'tvshow' },
}

const ITEMS_PER_PAGE = 48
const FILTER_COUNT = 5
const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - 1969 }, (_, i) => CURRENT_YEAR - i)

type FocusArea = 'filter' | 'grid'
type SortOption = NonNullable<ItemsParams['sort']>
type FilterKind = 'genre' | 'country' | 'sort' | 'year' | 'quality'

const SORT_OPTIONS: { id: SortOption; labelKey: 'sortNewest' | 'sortRating' | 'sortViews' | 'sortYear' | 'sortTitle' }[] = [
  { id: 'created-', labelKey: 'sortNewest' },
  { id: 'rating-', labelKey: 'sortRating' },
  { id: 'views-', labelKey: 'sortViews' },
  { id: 'year-', labelKey: 'sortYear' },
  { id: 'title', labelKey: 'sortTitle' },
]

const FILTER_KINDS: FilterKind[] = ['genre', 'country', 'sort', 'year', 'quality']

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
  const [selectedSort, setSelectedSort] = useState<SortOption>('created-')
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [only4k, setOnly4k] = useState(false)
  const [focusArea, setFocusArea] = useState<FocusArea>('grid')
  const [filterFocusIndex, setFilterFocusIndex] = useState(0)
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false)
  const [dropdownFocusIndex, setDropdownFocusIndex] = useState(0)

  const showFilters = categoryId !== 'watching' && !!CATEGORY_PARAMS[categoryId]
  const activeFilter = FILTER_KINDS[filterFocusIndex]

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
            sort: selectedSort,
            ...(selectedGenre && { genre: selectedGenre }),
            ...(selectedCountry && { country: selectedCountry }),
            ...(selectedYear && { year: String(selectedYear) }),
            ...(only4k && { quality: '4k' })
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
  }, [categoryId, selectedGenre, selectedCountry, selectedSort, selectedYear, only4k])

  useEffect(() => {
    const categoryChanged = prevCategoryIdRef.current !== categoryId
    prevCategoryIdRef.current = categoryId

    setItems([])
    setCurrentPage(1)
    if (categoryChanged) {
      setFocusedIndex(0)
      setSelectedGenre(initialGenreId ?? null)
      setSelectedCountry(null)
      setSelectedSort('created-')
      setSelectedYear(null)
      setOnly4k(false)
      setFocusArea('grid')
      setFilterFocusIndex(0)
      setFilterDropdownOpen(false)
    } else {
      setFocusedIndex(0)
      setFocusArea('grid')
    }
    setHasMore(true)
    loadItems(1, false)
  }, [categoryId, selectedGenre, selectedCountry, selectedSort, selectedYear, only4k, loadItems, initialGenreId])

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      const nextPage = currentPage + 1
      setCurrentPage(nextPage)
      loadItems(nextPage, true)
    }
  }, [loadingMore, hasMore, currentPage, loadItems])

  const dropdownOptionCount = useMemo(() => {
    switch (activeFilter) {
      case 'genre': return genres.length + 1
      case 'country': return countries.length + 1
      case 'sort': return SORT_OPTIONS.length
      case 'year': return YEAR_OPTIONS.length + 1
      case 'quality': return 2
      default: return 0
    }
  }, [activeFilter, genres.length, countries.length])

  const applyDropdownSelection = useCallback((index: number) => {
    switch (activeFilter) {
      case 'genre':
        setSelectedGenre(index === 0 ? null : genres[index - 1]?.id || null)
        break
      case 'country':
        setSelectedCountry(index === 0 ? null : countries[index - 1]?.id || null)
        break
      case 'sort':
        setSelectedSort(SORT_OPTIONS[index]?.id || 'created-')
        break
      case 'year':
        setSelectedYear(index === 0 ? null : YEAR_OPTIONS[index - 1] || null)
        break
      case 'quality':
        setOnly4k(index === 1)
        break
    }
    setFilterDropdownOpen(false)
  }, [activeFilter, genres, countries])

  const openDropdown = useCallback((kind: FilterKind = activeFilter) => {
    let initial = 0
    if (kind === 'genre') {
      initial = selectedGenre ? genres.findIndex(g => g.id === selectedGenre) + 1 : 0
    } else if (kind === 'country') {
      initial = selectedCountry ? countries.findIndex(c => c.id === selectedCountry) + 1 : 0
    } else if (kind === 'sort') {
      initial = Math.max(0, SORT_OPTIONS.findIndex(o => o.id === selectedSort))
    } else if (kind === 'year') {
      initial = selectedYear ? YEAR_OPTIONS.indexOf(selectedYear) + 1 : 0
    } else if (kind === 'quality') {
      initial = only4k ? 1 : 0
    }
    setDropdownFocusIndex(Math.max(0, initial))
    setFilterDropdownOpen(true)
  }, [activeFilter, selectedGenre, selectedCountry, selectedSort, selectedYear, only4k, genres, countries])

  const handlers = useMemo(() => {
    const itemCount = items.length
    const currentRow = Math.floor(focusedIndex / itemsPerRow)
    const totalRows = Math.ceil(itemCount / itemsPerRow)

    if (focusArea === 'filter' && filterDropdownOpen) {
      return {
        onUp: () => setDropdownFocusIndex(prev => Math.max(0, prev - 1)),
        onDown: () => setDropdownFocusIndex(prev => Math.min(dropdownOptionCount - 1, prev + 1)),
        onBack: () => setFilterDropdownOpen(false),
        onEnter: () => applyDropdownSelection(dropdownFocusIndex)
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
        onRight: () => setFilterFocusIndex(prev => Math.min(FILTER_COUNT - 1, prev + 1)),
        onDown: () => setFocusArea('grid'),
        onEnter: openDropdown
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
  }, [items, focusedIndex, onNavigateToMenu, onSelectItem, itemsPerRow, hasMore, loadMore, focusArea, filterFocusIndex, filterDropdownOpen, dropdownFocusIndex, dropdownOptionCount, applyDropdownSelection, openDropdown, showFilters])

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
  const selectedSortLabel = t[SORT_OPTIONS.find(o => o.id === selectedSort)?.labelKey || 'sortNewest']

  const renderDropdown = (kind: FilterKind) => {
    if (!(focusArea === 'filter' && activeFilter === kind && filterDropdownOpen)) return null

    if (kind === 'genre') {
      return (
        <div class="category-filter-dropdown">
          <div class={`category-filter-option ${dropdownFocusIndex === 0 ? 'focused' : ''}`}>{t.allGenres}</div>
          {genres.map((genre, idx) => (
            <div key={genre.id} class={`category-filter-option ${dropdownFocusIndex === idx + 1 ? 'focused' : ''}`}>
              {genre.title}
            </div>
          ))}
        </div>
      )
    }
    if (kind === 'country') {
      return (
        <div class="category-filter-dropdown">
          <div class={`category-filter-option ${dropdownFocusIndex === 0 ? 'focused' : ''}`}>{t.allCountries}</div>
          {countries.map((country, idx) => (
            <div key={country.id} class={`category-filter-option ${dropdownFocusIndex === idx + 1 ? 'focused' : ''}`}>
              {country.title}
            </div>
          ))}
        </div>
      )
    }
    if (kind === 'sort') {
      return (
        <div class="category-filter-dropdown">
          {SORT_OPTIONS.map((option, idx) => (
            <div key={option.id} class={`category-filter-option ${dropdownFocusIndex === idx ? 'focused' : ''}`}>
              {t[option.labelKey]}
            </div>
          ))}
        </div>
      )
    }
    if (kind === 'year') {
      return (
        <div class="category-filter-dropdown">
          <div class={`category-filter-option ${dropdownFocusIndex === 0 ? 'focused' : ''}`}>{t.allYears}</div>
          {YEAR_OPTIONS.map((year, idx) => (
            <div key={year} class={`category-filter-option ${dropdownFocusIndex === idx + 1 ? 'focused' : ''}`}>
              {year}
            </div>
          ))}
        </div>
      )
    }
    return (
      <div class="category-filter-dropdown">
        <div class={`category-filter-option ${dropdownFocusIndex === 0 ? 'focused' : ''}`}>{t.allQualities}</div>
        <div class={`category-filter-option ${dropdownFocusIndex === 1 ? 'focused' : ''}`}>{t.filter4k}</div>
      </div>
    )
  }

  const filterDefs: { kind: FilterKind; label: string; value: string }[] = [
    { kind: 'genre', label: t.genre, value: selectedGenreTitle || t.allGenres },
    { kind: 'country', label: t.country, value: selectedCountryTitle || t.allCountries },
    { kind: 'sort', label: t.sort, value: selectedSortLabel },
    { kind: 'year', label: t.year, value: selectedYear ? String(selectedYear) : t.allYears },
    { kind: 'quality', label: t.quality, value: only4k ? t.filter4k : t.allQualities },
  ]

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
          {filterDefs.map((filter, index) => (
            <div
              key={filter.kind}
              class={`category-filter ${focusArea === 'filter' && filterFocusIndex === index ? 'focused' : ''}`}
              onMouseEnter={() => {
                setFocusArea('filter')
                setFilterFocusIndex(index)
              }}
              onClick={() => {
                setFocusArea('filter')
                setFilterFocusIndex(index)
                openDropdown(filter.kind)
              }}
            >
              <span class="category-filter-label">{filter.label}:</span>
              <span class="category-filter-value">{filter.value}</span>
              {renderDropdown(filter.kind)}
            </div>
          ))}
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
