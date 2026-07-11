import { useState, useEffect, useCallback, useRef, useMemo } from 'preact/hooks'
import { searchItems, getContentTypes, MovieItem, ContentType } from '../api/kinopub'
import { getContentTypesCache, saveContentTypesCache } from '../storage'
import { MovieCard } from '../components/MovieCard'
import { Keyboard, KEYBOARD_ROWS_WITH_SEARCH, handleSpecialKey } from '../components/Keyboard'
import { useKeyboardNavigation, useScrollToFocused, createGridNavigationHandlers } from '../hooks'
import { LoadingState } from '../components/LoadingSpinner'
import { useI18n } from '../i18n'
import '../styles/search.css'

interface SearchScreenProps {
  onBack: () => void
  onSelectItem: (itemId: number) => void
  onNavigateToMenu: () => void
  isActive: boolean
  initialQuery?: string
  initialField?: 'title' | 'director' | 'actor'
}

type FocusArea = 'keyboard' | 'filter' | 'results'


export function SearchScreen({ onBack, onSelectItem, onNavigateToMenu, isActive, initialQuery = '', initialField }: SearchScreenProps) {
  const { t } = useI18n()
  const [query, setQuery] = useState(initialQuery)
  const [searchField, setSearchField] = useState<'title' | 'director' | 'actor' | undefined>(initialField)
  const [results, setResults] = useState<MovieItem[]>([])
  const [loading, setLoading] = useState(false)
  const [focusArea, setFocusArea] = useState<FocusArea>(initialQuery.trim().length >= 2 ? 'results' : 'keyboard')
  const [keyboardRow, setKeyboardRow] = useState(0)
  const [keyboardCol, setKeyboardCol] = useState(0)
  const [resultIndex, setResultIndex] = useState(0)
  const [hasSearched, setHasSearched] = useState(false)
  const [resultsPerRow, setResultsPerRow] = useState(6)
  const searchTimeoutRef = useRef<number | null>(null)
  const resultsContainerRef = useRef<HTMLDivElement>(null)
  const [contentTypes, setContentTypes] = useState<ContentType[]>([])
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false)
  const [filterDropdownIndex, setFilterDropdownIndex] = useState(0)

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

  const performSearch = useCallback(async (searchQuery: string, type: string | null) => {
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
        field: searchField
      })
      setResults(response.items)
    } catch (err) {
      if (import.meta.env.DEV) console.error('Search failed:', err)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [searchField])

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (query.trim().length >= 2) {
      searchTimeoutRef.current = window.setTimeout(() => {
        performSearch(query, selectedType)
      }, 500)
    } else {
      setResults([])
      setHasSearched(false)
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [query, selectedType, performSearch])

  const handleKeyPress = useCallback((key: string) => {
    const result = handleSpecialKey(key, query)

    if (result.action === 'search') {
      if (results.length > 0) {
        setFocusArea('results')
        setResultIndex(0)
      }
      return
    }

    if (result.text !== query) {
      setQuery(result.text)
      if (result.text === '') {
        setResults([])
        setHasSearched(false)
        setSearchField(undefined)
      }
    }
  }, [query, results.length])

  const filterOptions = useMemo(() => {
    return [{ id: '', title: '' }, ...contentTypes]
  }, [contentTypes])

  const handlers = useMemo(() => {
    const cols = KEYBOARD_ROWS_WITH_SEARCH[keyboardRow]?.length || 12

    if (focusArea === 'filter') {
      if (filterDropdownOpen) {
        return {
          onBack: () => setFilterDropdownOpen(false),
          onLeft: () => {},
          onRight: () => {},
          onUp: () => setFilterDropdownIndex(prev => (prev > 0 ? prev - 1 : prev)),
          onDown: () => setFilterDropdownIndex(prev => (prev < filterOptions.length - 1 ? prev + 1 : prev)),
          onEnter: () => {
            const option = filterOptions[filterDropdownIndex]
            setSelectedType(option?.id || null)
            setFilterDropdownOpen(false)
          }
        }
      }
      return {
        onBack: onBack,
        onLeft: onNavigateToMenu,
        onRight: () => {},
        onUp: () => {},
        onDown: () => {
          setFocusArea('keyboard')
          setKeyboardRow(0)
        },
        onEnter: () => setFilterDropdownOpen(true)
      }
    }

    if (focusArea === 'keyboard') {
      return {
        onBack: () => {
          if (query) {
            setQuery(prev => prev.slice(0, -1))
          } else {
            onBack()
          }
        },
        onLeft: () => {
          if (keyboardCol === 0) {
            onNavigateToMenu()
          } else {
            setKeyboardCol(prev => prev - 1)
          }
        },
        onRight: () => setKeyboardCol(prev => (prev < cols - 1 ? prev + 1 : 0)),
        onUp: () => {
          if (keyboardRow > 0) {
            setKeyboardRow(prev => prev - 1)
            setKeyboardCol(prev => Math.min(prev, KEYBOARD_ROWS_WITH_SEARCH[keyboardRow - 1].length - 1))
          } else if (contentTypes.length > 0) {
            setFocusArea('filter')
          }
        },
        onDown: () => {
          if (keyboardRow < KEYBOARD_ROWS_WITH_SEARCH.length - 1) {
            setKeyboardRow(prev => prev + 1)
            setKeyboardCol(prev => Math.min(prev, KEYBOARD_ROWS_WITH_SEARCH[keyboardRow + 1].length - 1))
          } else if (results.length > 0) {
            setFocusArea('results')
            setResultIndex(0)
          }
        },
        onEnter: () => {
          const key = KEYBOARD_ROWS_WITH_SEARCH[keyboardRow]?.[keyboardCol]
          if (key) {
            handleKeyPress(key)
          }
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
        onTopEdge: () => setFocusArea('keyboard')
      }),
      onBack: () => setFocusArea('keyboard')
    }
  }, [focusArea, keyboardRow, keyboardCol, results, resultIndex, resultsPerRow, query, onBack, onSelectItem, handleKeyPress, onNavigateToMenu, filterDropdownOpen, filterDropdownIndex, filterOptions, contentTypes.length])

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

  return (
    <div class="search-screen">
      <div class="search-header">
        <div class="search-icon">🔍</div>
        <div class="search-input-container">
          {searchField === 'actor' && <span class="search-field-badge">👤</span>}
          <span class="search-query">{query}</span>
          <span class="search-cursor" />
        </div>
        {contentTypes.length > 0 && (
          <div class="search-filter">
            <button
              class={`search-filter-button ${focusArea === 'filter' ? 'focused' : ''}`}
              onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
            >
              <span class="search-filter-label">{t.type}:</span>
              <span class="search-filter-value">{selectedTypeName}</span>
              <span class="search-filter-arrow">{filterDropdownOpen ? '▲' : '▼'}</span>
            </button>
            {filterDropdownOpen && (
              <div class="search-filter-dropdown">
                {filterOptions.map((option, index) => (
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
      </div>

      {focusArea !== 'results' && (
        <Keyboard
          rows={KEYBOARD_ROWS_WITH_SEARCH}
          focusedRow={keyboardRow}
          focusedCol={keyboardCol}
          isFocused={focusArea === 'keyboard'}
          onKeyPress={handleKeyPress}
          className="search-keyboard"
        />
      )}

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
