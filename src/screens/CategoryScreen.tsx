import { useState, useEffect, useCallback, useRef, useMemo } from 'preact/hooks'
import { getItems, getWatching, getGenres, getCountries, MovieItem, ItemsParams, Genre, Country } from '../api/kinopub'
import { MovieCard } from '../components/MovieCard'
import { GridScreen } from '../components/GridScreen'
import { useKeyboardNavigation, useGridLayout, createGridNavigationHandlers } from '../hooks'
import { LoadingState } from '../components/LoadingSpinner'
import { useI18n } from '../i18n'
import '../styles/category.css'

export type CategorySortOption = NonNullable<ItemsParams['sort']>

export interface CategoryFilters {
  genreId: number | null
  countryId: number | null
  sort: CategorySortOption
  year: number | null
  only4k: boolean
  kpRatingFrom: number | null
  imdbRatingFrom: number | null
  finishedOnly: boolean
}

export const DEFAULT_CATEGORY_FILTERS: CategoryFilters = {
  genreId: null,
  countryId: null,
  sort: 'created-',
  year: null,
  only4k: false,
  kpRatingFrom: null,
  imdbRatingFrom: null,
  finishedOnly: false
}

interface CategoryScreenProps {
  categoryId: string
  title: string
  onSelectItem: (itemId: number, preview?: MovieItem) => void
  onNavigateToMenu: () => void
  isActive: boolean
  initialFocusIndex?: number
  onFocusChange?: (index: number) => void
  initialGenreId?: number | null
  initialFilters?: CategoryFilters | null
  onFiltersChange?: (filters: CategoryFilters) => void
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
const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - 1969 }, (_, i) => CURRENT_YEAR - i)
const RATING_OPTIONS = [6, 7, 8] as const
const SERIES_TYPES = new Set(['serial', 'docuserial', 'tvshow'])

type FocusArea = 'filter' | 'grid'
type SortOption = CategorySortOption
type FilterKind = 'genre' | 'country' | 'sort' | 'year' | 'quality' | 'kp' | 'imdb' | 'finished'

function resolveInitialFilters(
  initialFilters?: CategoryFilters | null,
  initialGenreId?: number | null
): CategoryFilters {
  if (initialFilters) {
    return {
      ...DEFAULT_CATEGORY_FILTERS,
      ...initialFilters,
      genreId: initialFilters.genreId ?? initialGenreId ?? null
    }
  }
  return {
    ...DEFAULT_CATEGORY_FILTERS,
    genreId: initialGenreId ?? null
  }
}

const SORT_OPTIONS: { id: SortOption; labelKey: 'sortNewest' | 'sortRating' | 'sortViews' | 'sortYear' | 'sortTitle' }[] = [
  { id: 'created-', labelKey: 'sortNewest' },
  { id: 'rating-', labelKey: 'sortRating' },
  { id: 'views-', labelKey: 'sortViews' },
  { id: 'year-', labelKey: 'sortYear' },
  { id: 'title', labelKey: 'sortTitle' },
]

const BASE_FILTER_KINDS: FilterKind[] = ['genre', 'country', 'sort', 'year', 'quality', 'kp', 'imdb']

function ratingLabel(
  value: number | null,
  t: { ratingAny: string; ratingFrom6: string; ratingFrom7: string; ratingFrom8: string }
): string {
  if (value === 6) return t.ratingFrom6
  if (value === 7) return t.ratingFrom7
  if (value === 8) return t.ratingFrom8
  return t.ratingAny
}

export function CategoryScreen({
  categoryId,
  title,
  onSelectItem,
  onNavigateToMenu,
  isActive,
  initialFocusIndex = 0,
  onFocusChange,
  initialGenreId = null,
  initialFilters = null,
  onFiltersChange
}: CategoryScreenProps) {
  const { t } = useI18n()
  const [items, setItems] = useState<MovieItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(initialFocusIndex)
  const [scrollWithFocus, setScrollWithFocus] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const prevCategoryIdRef = useRef<string>(categoryId)
  const onFocusChangeRef = useRef(onFocusChange)
  onFocusChangeRef.current = onFocusChange
  const onFiltersChangeRef = useRef(onFiltersChange)
  onFiltersChangeRef.current = onFiltersChange
  const { itemsPerRow, cardWidth } = useGridLayout('.category-grid', 240, [items.length])

  const resolvedInitial = resolveInitialFilters(initialFilters, initialGenreId)
  const [genres, setGenres] = useState<Genre[]>([])
  const [countries, setCountries] = useState<Country[]>([])
  const [selectedGenre, setSelectedGenre] = useState<number | null>(resolvedInitial.genreId)
  const [selectedCountry, setSelectedCountry] = useState<number | null>(resolvedInitial.countryId)
  const [selectedSort, setSelectedSort] = useState<SortOption>(resolvedInitial.sort)
  const [selectedYear, setSelectedYear] = useState<number | null>(resolvedInitial.year)
  const [only4k, setOnly4k] = useState(resolvedInitial.only4k)
  const [kpRatingFrom, setKpRatingFrom] = useState<number | null>(resolvedInitial.kpRatingFrom)
  const [imdbRatingFrom, setImdbRatingFrom] = useState<number | null>(resolvedInitial.imdbRatingFrom)
  const [finishedOnly, setFinishedOnly] = useState(resolvedInitial.finishedOnly)
  const [focusArea, setFocusArea] = useState<FocusArea>('grid')
  const [filterFocusIndex, setFilterFocusIndex] = useState(0)
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false)
  const [dropdownFocusIndex, setDropdownFocusIndex] = useState(0)

  const showFilters = categoryId !== 'watching' && !!CATEGORY_PARAMS[categoryId]
  const supportsFinished = SERIES_TYPES.has(CATEGORY_PARAMS[categoryId]?.type || '')
  const filterKinds = useMemo(
    () => (supportsFinished ? [...BASE_FILTER_KINDS, 'finished' as const] : BASE_FILTER_KINDS),
    [supportsFinished]
  )
  const filterCount = filterKinds.length
  const activeFilter = filterKinds[filterFocusIndex] || 'genre'

  useEffect(() => {
    onFocusChangeRef.current?.(focusedIndex)
  }, [focusedIndex])

  useEffect(() => {
    onFiltersChangeRef.current?.({
      genreId: selectedGenre,
      countryId: selectedCountry,
      sort: selectedSort,
      year: selectedYear,
      only4k,
      kpRatingFrom,
      imdbRatingFrom,
      finishedOnly: supportsFinished ? finishedOnly : false
    })
  }, [selectedGenre, selectedCountry, selectedSort, selectedYear, only4k, kpRatingFrom, imdbRatingFrom, finishedOnly, supportsFinished])

  useEffect(() => {
    if (filterFocusIndex >= filterCount) {
      setFilterFocusIndex(Math.max(0, filterCount - 1))
    }
  }, [filterCount, filterFocusIndex])

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
          const conditions: string[] = []
          if (kpRatingFrom) conditions.push(`kinopoisk_rating>=${kpRatingFrom}`)
          if (imdbRatingFrom) conditions.push(`imdb_rating>=${imdbRatingFrom}`)
          const filterParams: ItemsParams = {
            ...params,
            page,
            perpage: ITEMS_PER_PAGE,
            sort: selectedSort,
            ...(selectedGenre && { genre: selectedGenre }),
            ...(selectedCountry && { country: selectedCountry }),
            ...(selectedYear && { year: String(selectedYear) }),
            ...(only4k && { quality: '4k' }),
            ...(supportsFinished && finishedOnly && { finished: 1 }),
            ...(conditions.length > 0 && { conditions })
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
  }, [categoryId, selectedGenre, selectedCountry, selectedSort, selectedYear, only4k, kpRatingFrom, imdbRatingFrom, finishedOnly, supportsFinished])

  useEffect(() => {
    const categoryChanged = prevCategoryIdRef.current !== categoryId
    prevCategoryIdRef.current = categoryId

    setItems([])
    setCurrentPage(1)
    if (categoryChanged) {
      const next = resolveInitialFilters(initialFilters, initialGenreId)
      setFocusedIndex(0)
      setSelectedGenre(next.genreId)
      setSelectedCountry(next.countryId)
      setSelectedSort(next.sort)
      setSelectedYear(next.year)
      setOnly4k(next.only4k)
      setKpRatingFrom(next.kpRatingFrom)
      setImdbRatingFrom(next.imdbRatingFrom)
      setFinishedOnly(next.finishedOnly)
      setFocusArea('grid')
      setFilterFocusIndex(0)
      setFilterDropdownOpen(false)
    } else {
      setFocusedIndex(0)
      setFocusArea('grid')
    }
    setHasMore(true)
    loadItems(1, false)
    // initialFilters / initialGenreId are only applied when the category changes;
    // otherwise filters stay in local state and are reported via onFiltersChange.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, selectedGenre, selectedCountry, selectedSort, selectedYear, only4k, kpRatingFrom, imdbRatingFrom, finishedOnly, loadItems])

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
      case 'kp':
      case 'imdb': return RATING_OPTIONS.length + 1
      case 'finished': return 2
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
      case 'kp':
        setKpRatingFrom(index === 0 ? null : RATING_OPTIONS[index - 1] || null)
        break
      case 'imdb':
        setImdbRatingFrom(index === 0 ? null : RATING_OPTIONS[index - 1] || null)
        break
      case 'finished':
        setFinishedOnly(index === 1)
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
    } else if (kind === 'kp') {
      initial = kpRatingFrom ? RATING_OPTIONS.indexOf(kpRatingFrom as 6 | 7 | 8) + 1 : 0
    } else if (kind === 'imdb') {
      initial = imdbRatingFrom ? RATING_OPTIONS.indexOf(imdbRatingFrom as 6 | 7 | 8) + 1 : 0
    } else if (kind === 'finished') {
      initial = finishedOnly ? 1 : 0
    }
    setDropdownFocusIndex(Math.max(0, initial))
    setFilterDropdownOpen(true)
  }, [activeFilter, selectedGenre, selectedCountry, selectedSort, selectedYear, only4k, kpRatingFrom, imdbRatingFrom, finishedOnly, genres, countries])

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
        onRight: () => setFilterFocusIndex(prev => Math.min(filterCount - 1, prev + 1)),
        onDown: () => setFocusArea('grid'),
        onEnter: openDropdown
      }
    }

    const setFocusedIndexFromKeys = (index: number) => {
      setScrollWithFocus(true)
      setFocusedIndex(index)
    }

    const gridHandlers = createGridNavigationHandlers({
      itemCount,
      itemsPerRow,
      focusedIndex,
      setFocusedIndex: setFocusedIndexFromKeys,
      onSelect: (index) => {
        const item = items[index]
        if (item) {
          onSelectItem(item.id, item)
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
  }, [items, focusedIndex, onNavigateToMenu, onSelectItem, itemsPerRow, hasMore, loadMore, focusArea, filterFocusIndex, filterCount, filterDropdownOpen, dropdownFocusIndex, dropdownOptionCount, applyDropdownSelection, openDropdown, showFilters])

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

    const option = (index: number, label: string, key?: string | number) => (
      <div
        key={key ?? index}
        class={`category-filter-option ${dropdownFocusIndex === index ? 'focused' : ''}`}
        onMouseEnter={() => setDropdownFocusIndex(index)}
        onClick={(event) => {
          event.stopPropagation()
          applyDropdownSelection(index)
        }}
      >
        {label}
      </div>
    )

    if (kind === 'genre') {
      return (
        <div class="category-filter-dropdown" onClick={(event) => event.stopPropagation()}>
          {option(0, t.allGenres)}
          {genres.map((genre, idx) => option(idx + 1, genre.title, genre.id))}
        </div>
      )
    }
    if (kind === 'country') {
      return (
        <div class="category-filter-dropdown" onClick={(event) => event.stopPropagation()}>
          {option(0, t.allCountries)}
          {countries.map((country, idx) => option(idx + 1, country.title, country.id))}
        </div>
      )
    }
    if (kind === 'sort') {
      return (
        <div class="category-filter-dropdown" onClick={(event) => event.stopPropagation()}>
          {SORT_OPTIONS.map((sortOption, idx) => option(idx, t[sortOption.labelKey], sortOption.id))}
        </div>
      )
    }
    if (kind === 'year') {
      return (
        <div class="category-filter-dropdown" onClick={(event) => event.stopPropagation()}>
          {option(0, t.allYears)}
          {YEAR_OPTIONS.map((year, idx) => option(idx + 1, String(year), year))}
        </div>
      )
    }
    if (kind === 'quality') {
      return (
        <div class="category-filter-dropdown" onClick={(event) => event.stopPropagation()}>
          {option(0, t.allQualities)}
          {option(1, t.filter4k)}
        </div>
      )
    }
    if (kind === 'kp' || kind === 'imdb') {
      return (
        <div class="category-filter-dropdown" onClick={(event) => event.stopPropagation()}>
          {option(0, t.ratingAny)}
          {RATING_OPTIONS.map((rating, idx) => option(idx + 1, ratingLabel(rating, t), rating))}
        </div>
      )
    }
    if (kind === 'finished') {
      return (
        <div class="category-filter-dropdown" onClick={(event) => event.stopPropagation()}>
          {option(0, t.finishedAny)}
          {option(1, t.finishedOnly)}
        </div>
      )
    }
    return null
  }

  const filterDefs: { kind: FilterKind; label: string; value: string }[] = [
    { kind: 'genre', label: t.genre, value: selectedGenreTitle || t.allGenres },
    { kind: 'country', label: t.country, value: selectedCountryTitle || t.allCountries },
    { kind: 'sort', label: t.sort, value: selectedSortLabel },
    { kind: 'year', label: t.year, value: selectedYear ? String(selectedYear) : t.allYears },
    { kind: 'quality', label: t.quality, value: only4k ? t.filter4k : t.allQualities },
    { kind: 'kp', label: t.filterKp, value: ratingLabel(kpRatingFrom, t) },
    { kind: 'imdb', label: t.filterImdb, value: ratingLabel(imdbRatingFrom, t) },
    ...(supportsFinished
      ? [{ kind: 'finished' as const, label: t.filterFinished, value: finishedOnly ? t.finishedOnly : t.finishedAny }]
      : []),
  ]

  return (
    <GridScreen
      title={title}
      loading={false}
      items={items}
      focusedIndex={focusedIndex}
      itemsPerRow={itemsPerRow}
      scrollToFocused={scrollWithFocus}
      renderItem={(item, index, focused) => (
        <MovieCard
          movie={item}
          focused={focused}
          onHover={() => {
            setScrollWithFocus(false)
            setFocusArea('grid')
            setFocusedIndex(index)
          }}
          onSelect={() => onSelectItem(item.id, item)}
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
