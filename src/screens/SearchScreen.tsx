import { useState, useEffect, useCallback, useRef, useMemo } from 'preact/hooks'
import { searchItems, getContentTypes, MovieItem, ContentType } from '../api/kinopub'
import { getContentTypesCache, saveContentTypesCache } from '../storage'
import { MovieCard } from '../components/MovieCard'
import { useKeyboardNavigation, useScrollToFocused, createGridNavigationHandlers } from '../hooks'
import { LoadingState } from '../components/LoadingSpinner'
import { useI18n } from '../i18n'
import '../styles/search.css'

export type SearchField = 'title' | 'director' | 'actor' | undefined

export interface SearchScreenState {
  query: string
  field: SearchField
  type: string | null
}

export const DEFAULT_SEARCH_STATE: SearchScreenState = {
  query: '',
  field: undefined,
  type: null
}

interface SearchScreenProps {
  onBack: () => void
  onSelectItem: (itemId: number) => void
  onNavigateToMenu: () => void
  isActive: boolean
  initialQuery?: string
  initialField?: 'title' | 'director' | 'actor'
  initialState?: SearchScreenState | null
  initialFocusIndex?: number
  onStateChange?: (state: SearchScreenState) => void
  onFocusChange?: (index: number) => void
}

type FocusArea = 'query' | 'filter' | 'field' | 'results'
type FilterTarget = 'type' | 'field'

const SEARCH_FIELDS: { id: SearchField; labelKey: 'searchFieldAny' | 'searchFieldTitle' | 'searchFieldActor' | 'searchFieldDirector' }[] = [
  { id: undefined, labelKey: 'searchFieldAny' },
  { id: 'title', labelKey: 'searchFieldTitle' },
  { id: 'actor', labelKey: 'searchFieldActor' },
  { id: 'director', labelKey: 'searchFieldDirector' },
]

function resolveInitialState(
  initialState?: SearchScreenState | null,
  initialQuery?: string,
  initialField?: 'title' | 'director' | 'actor'
): SearchScreenState {
  if (initialState) {
    return {
      ...DEFAULT_SEARCH_STATE,
      ...initialState,
      query: initialState.query || initialQuery || '',
      field: initialState.field ?? initialField
    }
  }
  return {
    ...DEFAULT_SEARCH_STATE,
    query: initialQuery || '',
    field: initialField
  }
}

export function SearchScreen({
  onBack,
  onSelectItem,
  onNavigateToMenu,
  isActive,
  initialQuery = '',
  initialField,
  initialState = null,
  initialFocusIndex = 0,
  onStateChange,
  onFocusChange
}: SearchScreenProps) {
  const { t } = useI18n()
  const resolved = resolveInitialState(initialState, initialQuery, initialField)
  const [query, setQuery] = useState(resolved.query)
  const [searchField, setSearchField] = useState<SearchField>(resolved.field)
  const [results, setResults] = useState<MovieItem[]>([])
  const [loading, setLoading] = useState(false)
  const [focusArea, setFocusArea] = useState<FocusArea>(resolved.query.trim().length >= 2 ? 'results' : 'query')
  const [resultIndex, setResultIndex] = useState(initialFocusIndex)
  const [hasSearched, setHasSearched] = useState(false)
  const [resultsPerRow, setResultsPerRow] = useState(6)
  const searchTimeoutRef = useRef<number | null>(null)
  const skipDebounceRef = useRef(resolved.query.trim().length >= 2)
  const resultsContainerRef = useRef<HTMLDivElement>(null)
  const queryInputRef = useRef<HTMLInputElement>(null)
  const onStateChangeRef = useRef(onStateChange)
  onStateChangeRef.current = onStateChange
  const onFocusChangeRef = useRef(onFocusChange)
  onFocusChangeRef.current = onFocusChange
  const [contentTypes, setContentTypes] = useState<ContentType[]>([])
  const [selectedType, setSelectedType] = useState<string | null>(resolved.type)
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false)
  const [filterDropdownIndex, setFilterDropdownIndex] = useState(0)
  const [activeFilter, setActiveFilter] = useState<FilterTarget>('type')

  useEffect(() => {
    onStateChangeRef.current?.({
      query,
      field: searchField,
      type: selectedType
    })
  }, [query, searchField, selectedType])

  useEffect(() => {
    onFocusChangeRef.current?.(resultIndex)
  }, [resultIndex])

  useEffect(() => {
    const updateResultsPerRow = () => {
      const grid = document.querySelector('.search-results-grid')
      if (grid && grid.children.length > 0) {
        const firstChild = grid.children[0] as HTMLElement
        const gridWidth = grid.clientWidth
        const itemWidth = firstChild.offsetWidth
        const gap = 32
        const count = Math.floor((gridWidth + gap) / (itemWidth + gap))
        setResultsPerRow(Math.max(1, count))
      }
    }
    const timer = setTimeout(updateResultsPerRow, 100)
    window.addEventListener('resize', updateResultsPerRow)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', updateResultsPerRow)
    }
  }, [results.length])

  useEffect(() => {
    const cached = getContentTypesCache()
    if (cached) {
      setContentTypes(cached)
      return
    }

    getContentTypes()
      .then(types => {
        setContentTypes(types)
        saveContentTypesCache(types)
      })
      .catch(err => {
        if (import.meta.env.DEV) console.error('getContentTypes failed:', err)
      })
  }, [])

  // Focus the real input so webOS opens the system keyboard / voice IME.
  useEffect(() => {
    if (!isActive) {
      queryInputRef.current?.blur()
      return
    }
    if (focusArea === 'query') {
      queryInputRef.current?.focus()
    } else {
      queryInputRef.current?.blur()
    }
  }, [focusArea, isActive])

  const performSearch = useCallback(async (searchQuery: string, type: string | null, field: SearchField) => {
    if (!searchQuery.trim()) {
      setResults([])
      setHasSearched(false)
      return
    }

    setLoading(true)
    setHasSearched(true)
    try {
      const response = await searchItems({
        q: searchQuery,
        perpage: 48,
        type: type || undefined,
        field
      })
      setResults(response.items)
      setResultIndex(prev => {
        if (response.items.length === 0) return 0
        return Math.min(prev, response.items.length - 1)
      })
    } catch (err) {
      if (import.meta.env.DEV) console.error('Search failed:', err)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (query.trim().length >= 2) {
      const delay = skipDebounceRef.current ? 0 : 500
      skipDebounceRef.current = false
      searchTimeoutRef.current = window.setTimeout(() => {
        performSearch(query, selectedType, searchField)
      }, delay)
    } else {
      setResults([])
      setHasSearched(false)
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [query, selectedType, searchField, performSearch])

  const isQueryInputFocused = useCallback(() => {
    return document.activeElement === queryInputRef.current
  }, [])

  const typeOptions = useMemo(() => {
    return [{ id: '', title: '' }, ...contentTypes]
  }, [contentTypes])

  const currentDropdownOptions = activeFilter === 'type' ? typeOptions : SEARCH_FIELDS

  const handlers = useMemo(() => {
    const inFilterBar = focusArea === 'filter' || focusArea === 'field'

    if (inFilterBar) {
      if (filterDropdownOpen) {
        return {
          onBack: () => setFilterDropdownOpen(false),
          onLeft: () => {},
          onRight: () => {},
          onUp: () => setFilterDropdownIndex(prev => (prev > 0 ? prev - 1 : prev)),
          onDown: () => setFilterDropdownIndex(prev => (prev < currentDropdownOptions.length - 1 ? prev + 1 : prev)),
          onEnter: () => {
            if (activeFilter === 'type') {
              const option = typeOptions[filterDropdownIndex]
              setSelectedType(option?.id || null)
            } else {
              setSearchField(SEARCH_FIELDS[filterDropdownIndex]?.id)
            }
            setFilterDropdownOpen(false)
          }
        }
      }
      return {
        onBack: onBack,
        onLeft: () => {
          if (focusArea === 'field') {
            setFocusArea('filter')
            setActiveFilter('type')
          } else {
            onNavigateToMenu()
          }
        },
        onRight: () => {
          if (focusArea === 'filter') {
            setFocusArea('field')
            setActiveFilter('field')
          }
        },
        onUp: () => {},
        onDown: () => {
          setFocusArea('query')
        },
        onEnter: () => {
          setFilterDropdownIndex(0)
          setFilterDropdownOpen(true)
        }
      }
    }

    if (focusArea === 'query') {
      return {
        onBack: () => {
          // Remote Back while IME is open: dismiss input first, then leave search.
          if (isQueryInputFocused()) {
            queryInputRef.current?.blur()
            return
          }
          onBack()
        },
        onLeft: onNavigateToMenu,
        onRight: () => {
          setFocusArea('filter')
          setActiveFilter('type')
        },
        onUp: () => {
          setFocusArea('filter')
          setActiveFilter('type')
        },
        onDown: () => {
          if (results.length > 0) {
            setFocusArea('results')
            setResultIndex(0)
          }
        },
        onEnter: () => {
          queryInputRef.current?.focus()
        }
      }
    }

    return {
      ...createGridNavigationHandlers({
        itemCount: results.length,
        itemsPerRow: resultsPerRow,
        focusedIndex: resultIndex,
        setFocusedIndex: setResultIndex,
        onSelect: (index) => {
          const item = results[index]
          if (item) {
            onSelectItem(item.id)
          }
        },
        onLeftEdge: onNavigateToMenu,
        onTopEdge: () => setFocusArea('query')
      }),
      onBack: () => setFocusArea('query')
    }
  }, [focusArea, results, resultIndex, resultsPerRow, onBack, onSelectItem, onNavigateToMenu, filterDropdownOpen, filterDropdownIndex, currentDropdownOptions.length, activeFilter, typeOptions, isQueryInputFocused])

  useKeyboardNavigation(handlers, isActive)

  useScrollToFocused({
    containerRef: resultsContainerRef,
    focusedIndex: focusArea === 'results' ? resultIndex : null,
    itemSelector: '[data-result-index]',
    itemCount: results.length
  })

  const selectedTypeName = useMemo(() => {
    if (!selectedType) return t.allTypes
    const type = contentTypes.find(ct => ct.id === selectedType)
    return type?.title || t.allTypes
  }, [selectedType, contentTypes, t.allTypes])

  const selectedFieldName = useMemo(() => {
    const found = SEARCH_FIELDS.find(f => f.id === searchField)
    return t[found?.labelKey || 'searchFieldAny']
  }, [searchField, t])

  const openFilter = (target: FilterTarget) => {
    setActiveFilter(target)
    setFocusArea(target === 'type' ? 'filter' : 'field')
    let initial = 0
    if (target === 'type') {
      initial = selectedType ? typeOptions.findIndex(o => o.id === selectedType) : 0
    } else {
      initial = Math.max(0, SEARCH_FIELDS.findIndex(f => f.id === searchField))
    }
    setFilterDropdownIndex(Math.max(0, initial))
    setFilterDropdownOpen(true)
  }

  return (
    <div class="search-screen">
      <div class="search-header">
        <div class="search-icon" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
        </div>
        <div
          class={`search-input-container ${focusArea === 'query' ? 'focused' : ''}`}
          onClick={() => {
            setFocusArea('query')
            queryInputRef.current?.focus()
          }}
        >
          {searchField === 'actor' && <span class="search-field-badge">A</span>}
          {searchField === 'director' && <span class="search-field-badge">D</span>}
          {searchField === 'title' && <span class="search-field-badge">Aa</span>}
          <input
            ref={queryInputRef}
            class="search-query-input"
            type="text"
            value={query}
            placeholder={t.searchPlaceholder}
            autocomplete="off"
            autocorrect="off"
            spellcheck={false}
            onInput={(e) => {
              const value = (e.currentTarget as HTMLInputElement).value
              setQuery(value)
              if (!value) {
                setResults([])
                setHasSearched(false)
              }
            }}
            onFocus={() => setFocusArea('query')}
          />
        </div>
        <div class="search-filters">
          {contentTypes.length > 0 && (
            <div class="search-filter">
              <button
                class={`search-filter-button ${focusArea === 'filter' ? 'focused' : ''}`}
                onClick={() => openFilter('type')}
              >
                <span class="search-filter-label">{t.type}:</span>
                <span class="search-filter-value">{selectedTypeName}</span>
                <span class="search-filter-arrow">{filterDropdownOpen && activeFilter === 'type' ? '▲' : '▼'}</span>
              </button>
              {filterDropdownOpen && activeFilter === 'type' && (
                <div class="search-filter-dropdown">
                  {typeOptions.map((option, index) => (
                    <button
                      key={option.id || 'all'}
                      class={`search-filter-option ${filterDropdownIndex === index ? 'focused' : ''} ${selectedType === (option.id || null) ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedType(option.id || null)
                        setFilterDropdownOpen(false)
                      }}
                    >
                      {option.title || t.allTypes}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <div class="search-filter">
            <button
              class={`search-filter-button ${focusArea === 'field' ? 'focused' : ''}`}
              onClick={() => openFilter('field')}
            >
              <span class="search-filter-label">{t.searchField}:</span>
              <span class="search-filter-value">{selectedFieldName}</span>
              <span class="search-filter-arrow">{filterDropdownOpen && activeFilter === 'field' ? '▲' : '▼'}</span>
            </button>
            {filterDropdownOpen && activeFilter === 'field' && (
              <div class="search-filter-dropdown">
                {SEARCH_FIELDS.map((option, index) => (
                  <button
                    key={option.labelKey}
                    class={`search-filter-option ${filterDropdownIndex === index ? 'focused' : ''} ${searchField === option.id ? 'selected' : ''}`}
                    onClick={() => {
                      setSearchField(option.id)
                      setFilterDropdownOpen(false)
                    }}
                  >
                    {t[option.labelKey]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div class="search-results" ref={resultsContainerRef}>
        {loading && (
          <LoadingState />
        )}

        {!loading && hasSearched && results.length === 0 && (
          <div class="search-empty">
            <span>{t.searchNoResults}</span>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div class="search-results-grid">
            {results.map((item, index) => (
              <div key={item.id} data-result-index={index}>
                <MovieCard
                  movie={item}
                  focused={focusArea === 'results' && resultIndex === index}
                  onSelect={() => onSelectItem(item.id)}
                />
              </div>
            ))}
          </div>
        )}

        {!loading && !hasSearched && (
          <div class="search-hint">
            <span>{t.searchHint}</span>
          </div>
        )}
      </div>
    </div>
  )
}
