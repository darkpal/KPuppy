export type Language = 'en' | 'ru' | 'de'

export const LANGUAGES: { id: Language; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'ru', label: 'Русский' },
  { id: 'de', label: 'Deutsch' },
]

export interface Translations {
  // App
  appName: string
  loading: string
  loadingContent: string

  // Menu
  menuHome: string
  menuSearch: string
  menuContinue: string
  menuNewEpisodes: string
  menuBookmarks: string
  menuCollections: string
  menuHistory: string
  menuMovies: string
  menuSeries: string
  menuConcerts: string
  menu3D: string
  menuDocs: string
  menuTvShows: string
  menuLiveTV: string
  menuSettings: string
  menuProfile: string

  // Categories
  categoryMovies: string
  categorySeries: string
  categoryConcerts: string
  category3D: string
  categoryDocs: string
  categoryTvShows: string
  categoryContinueWatching: string

  // Main Screen
  popularMovies: string
  newMovies: string
  popularSeries: string
  newSeries: string
  newConcerts: string
  new3D: string
  newDocs: string
  newDocuseries: string
  newTvShows: string

  // Search
  searchPlaceholder: string
  searchHint: string
  searchNoResults: string
  searchResults: string

  // Item Details
  play: string
  seasons: string
  season: string
  episode: string
  director: string
  cast: string
  country: string

  // Settings
  settings: string
  clientSettings: string
  localSettings: string
  support4k: string
  supportHevc: string
  supportHdr: string
  supportSsl: string
  mixedPlaylist: string
  server: string
  streaming: string
  language: string
  on: string
  off: string
  notSelected: string
  saving: string

  // Profile
  profile: string
  subscription: string
  subscriptionActive: string
  subscriptionInactive: string
  expires: string
  daysLeft: string
  logout: string

  // Auth
  authTitle: string
  authInstructions: string
  authVisit: string
  authEnterCode: string
  authWaiting: string

  // Errors
  errorLoading: string
  errorNoItems: string
  retry: string
  noSeasonsAvailable: string
  newEpisodesCount: string

  // Common
  loadingMore: string

  // Quality
  quality: string
  qualityAuto: string
  quality4k: string
  quality1080p: string
  quality720p: string
  quality480p: string

  // Audio/Subtitles
  audio: string
  subtitles: string
  subtitlesOff: string
  original: string

  // Player
  player: string
  playerNative: string
  playerBuiltin: string

  // Bookmarks
  addToBookmarks: string
  removeFromBookmarks: string
  createFolder: string
  deleteFolder: string
  newFolderName: string
  confirmDelete: string
  bookmarkAdded: string
  bookmarkRemoved: string

  // Similar
  similar: string

  // Trailer
  trailer: string

  // Watchlist
  addToWatchlist: string
  removeFromWatchlist: string

  // Filters
  genre: string
  allGenres: string
  allCountries: string
  allTypes: string
  type: string
  sort: string
  sortNewest: string
  sortRating: string
  sortViews: string
  sortYear: string
  sortTitle: string
  year: string
  allYears: string
  filter4k: string
  allQualities: string
  searchField: string
  searchFieldAny: string
  searchFieldTitle: string
  searchFieldActor: string
  searchFieldDirector: string
  applyRecommendedSettings: string
  recommendedSettingsApplied: string

  // Home screen
  showContinueWatching: string
  freshMovies: string
  freshSeries: string
}

const en: Translations = {
  appName: 'KPuppy',
  loading: 'Loading...',
  loadingContent: 'Loading content...',

  menuHome: 'Home',
  menuSearch: 'Search',
  menuContinue: 'Continue',
  menuNewEpisodes: 'New Episodes',
  menuBookmarks: 'Bookmarks',
  menuCollections: 'Collections',
  menuHistory: 'History',
  menuMovies: 'Movies',
  menuSeries: 'Series',
  menuConcerts: 'Concerts',
  menu3D: '3D',
  menuDocs: 'Docs',
  menuTvShows: 'TV Shows',
  menuLiveTV: 'Live TV',
  menuSettings: 'Settings',
  menuProfile: 'Profile',

  categoryMovies: 'Movies',
  categorySeries: 'Series',
  categoryConcerts: 'Concerts',
  category3D: '3D',
  categoryDocs: 'Documentaries',
  categoryTvShows: 'TV Shows',
  categoryContinueWatching: 'Continue Watching',

  popularMovies: 'Popular Movies',
  newMovies: 'New Movies',
  popularSeries: 'Popular Series',
  newSeries: 'New Series',
  newConcerts: 'New Concerts',
  new3D: 'New 3D',
  newDocs: 'New Documentaries',
  newDocuseries: 'New Docuseries',
  newTvShows: 'New TV Shows',

  searchPlaceholder: 'Search...',
  searchHint: 'Type to search',
  searchNoResults: 'No results found',
  searchResults: 'Search Results',

  play: 'Play',
  seasons: 'Seasons',
  season: 'Season',
  episode: 'Episode',
  director: 'Director',
  cast: 'Cast',
  country: 'Country',

  settings: 'Settings',
  clientSettings: 'Streaming',
  localSettings: 'Application',
  support4k: '4K Support',
  supportHevc: 'HEVC/H.265',
  supportHdr: 'HDR',
  supportSsl: 'SSL/HTTPS',
  mixedPlaylist: 'Mixed Playlist',
  server: 'Server',
  streaming: 'Streaming',
  language: 'Language',
  on: 'On',
  off: 'Off',
  notSelected: 'Not selected',
  saving: 'Saving...',

  profile: 'Profile',
  subscription: 'Subscription',
  subscriptionActive: 'Active',
  subscriptionInactive: 'Inactive',
  expires: 'Expires',
  daysLeft: 'days left',
  logout: 'Logout',

  authTitle: 'Sign In',
  authInstructions: 'To sign in, visit:',
  authVisit: 'kino.watch/device',
  authEnterCode: 'Enter the code:',
  authWaiting: 'Waiting for authorization...',

  errorLoading: 'Failed to load',
  errorNoItems: 'No items found',
  retry: 'Retry',
  noSeasonsAvailable: 'No seasons available',
  newEpisodesCount: 'new',

  loadingMore: 'Loading more...',

  quality: 'Video Quality',
  qualityAuto: 'Auto (Best)',
  quality4k: '4K (2160p)',
  quality1080p: 'Full HD (1080p)',
  quality720p: 'HD (720p)',
  quality480p: 'SD (480p)',

  audio: 'Audio',
  subtitles: 'Subtitles',
  subtitlesOff: 'Off',
  original: 'Original',

  player: 'Player',
  playerNative: 'Native (webOS)',
  playerBuiltin: 'Built-in',

  addToBookmarks: 'Add to Bookmarks',
  removeFromBookmarks: 'Remove from Bookmarks',
  createFolder: 'Create Folder',
  deleteFolder: 'Delete Folder',
  newFolderName: 'New Folder',
  confirmDelete: 'Delete this folder?',
  bookmarkAdded: 'Added to bookmarks',
  bookmarkRemoved: 'Removed from bookmarks',

  similar: 'Similar',
  trailer: 'Trailer',

  addToWatchlist: 'Want to Watch',
  removeFromWatchlist: 'Remove from Watchlist',

  genre: 'Genre',
  allGenres: 'All Genres',
  allCountries: 'All Countries',
  allTypes: 'All Types',
  type: 'Type',
  sort: 'Sort',
  sortNewest: 'Newest',
  sortRating: 'Rating',
  sortViews: 'Views',
  sortYear: 'Year',
  sortTitle: 'Title',
  year: 'Year',
  allYears: 'All Years',
  filter4k: '4K only',
  allQualities: 'All Qualities',
  searchField: 'Search in',
  searchFieldAny: 'Anywhere',
  searchFieldTitle: 'Title',
  searchFieldActor: 'Actor',
  searchFieldDirector: 'Director',
  applyRecommendedSettings: 'Apply Recommended Device Settings',
  recommendedSettingsApplied: 'Recommended settings applied',

  showContinueWatching: 'Show Continue Watching on Home',
  freshMovies: 'Fresh Movies',
  freshSeries: 'Fresh Series',
}

const ru: Translations = {
  appName: 'KPuppy',
  loading: 'Загрузка...',
  loadingContent: 'Загрузка контента...',

  menuHome: 'Главная',
  menuSearch: 'Поиск',
  menuContinue: 'Продолжить',
  menuNewEpisodes: 'Новые серии',
  menuBookmarks: 'Закладки',
  menuCollections: 'Подборки',
  menuHistory: 'История',
  menuMovies: 'Фильмы',
  menuSeries: 'Сериалы',
  menuConcerts: 'Концерты',
  menu3D: '3D',
  menuDocs: 'Документальные',
  menuTvShows: 'ТВ-шоу',
  menuLiveTV: 'Прямой эфир',
  menuSettings: 'Настройки',
  menuProfile: 'Профиль',

  categoryMovies: 'Фильмы',
  categorySeries: 'Сериалы',
  categoryConcerts: 'Концерты',
  category3D: '3D',
  categoryDocs: 'Документальные',
  categoryTvShows: 'ТВ-шоу',
  categoryContinueWatching: 'Продолжить просмотр',

  popularMovies: 'Популярные фильмы',
  newMovies: 'Новые фильмы',
  popularSeries: 'Популярные сериалы',
  newSeries: 'Новые сериалы',
  newConcerts: 'Новые концерты',
  new3D: 'Новое 3D',
  newDocs: 'Новые документальные',
  newDocuseries: 'Новые докусериалы',
  newTvShows: 'Новые ТВ-шоу',

  searchPlaceholder: 'Поиск...',
  searchHint: 'Введите запрос',
  searchNoResults: 'Ничего не найдено',
  searchResults: 'Результаты поиска',

  play: 'Смотреть',
  seasons: 'Сезоны',
  season: 'Сезон',
  episode: 'Серия',
  director: 'Режиссёр',
  cast: 'В ролях',
  country: 'Страна',

  settings: 'Настройки',
  clientSettings: 'Воспроизведение',
  localSettings: 'Приложение',
  support4k: 'Поддержка 4K',
  supportHevc: 'HEVC/H.265',
  supportHdr: 'HDR',
  supportSsl: 'SSL/HTTPS',
  mixedPlaylist: 'Смешанный плейлист',
  server: 'Сервер',
  streaming: 'Тип потока',
  language: 'Язык',
  on: 'Вкл',
  off: 'Выкл',
  notSelected: 'Не выбрано',
  saving: 'Сохранение...',

  profile: 'Профиль',
  subscription: 'Подписка',
  subscriptionActive: 'Активна',
  subscriptionInactive: 'Неактивна',
  expires: 'Истекает',
  daysLeft: 'дней осталось',
  logout: 'Выйти',

  authTitle: 'Вход',
  authInstructions: 'Для входа перейдите на:',
  authVisit: 'kino.watch/device',
  authEnterCode: 'Введите код:',
  authWaiting: 'Ожидание авторизации...',

  errorLoading: 'Ошибка загрузки',
  errorNoItems: 'Ничего не найдено',
  retry: 'Повторить',
  noSeasonsAvailable: 'Сезоны недоступны',
  newEpisodesCount: 'новых',

  loadingMore: 'Загрузка...',

  quality: 'Качество видео',
  qualityAuto: 'Авто (лучшее)',
  quality4k: '4K (2160p)',
  quality1080p: 'Full HD (1080p)',
  quality720p: 'HD (720p)',
  quality480p: 'SD (480p)',

  audio: 'Озвучка',
  subtitles: 'Субтитры',
  subtitlesOff: 'Выкл',
  original: 'Оригинал',

  player: 'Плеер',
  playerNative: 'Нативный (webOS)',
  playerBuiltin: 'Встроенный',

  addToBookmarks: 'Добавить в закладки',
  removeFromBookmarks: 'Удалить из закладок',
  createFolder: 'Создать папку',
  deleteFolder: 'Удалить папку',
  newFolderName: 'Новая папка',
  confirmDelete: 'Удалить эту папку?',
  bookmarkAdded: 'Добавлено в закладки',
  bookmarkRemoved: 'Удалено из закладок',

  similar: 'Похожее',
  trailer: 'Трейлер',

  addToWatchlist: 'Буду смотреть',
  removeFromWatchlist: 'Убрать из списка',

  genre: 'Жанр',
  allGenres: 'Все жанры',
  allCountries: 'Все страны',
  allTypes: 'Все типы',
  type: 'Тип',
  sort: 'Сортировка',
  sortNewest: 'Новинки',
  sortRating: 'Рейтинг',
  sortViews: 'Просмотры',
  sortYear: 'Год',
  sortTitle: 'Название',
  year: 'Год',
  allYears: 'Все годы',
  filter4k: 'Только 4K',
  allQualities: 'Любое качество',
  searchField: 'Искать в',
  searchFieldAny: 'Везде',
  searchFieldTitle: 'Название',
  searchFieldActor: 'Актёр',
  searchFieldDirector: 'Режиссёр',
  applyRecommendedSettings: 'Применить рекомендуемые настройки',
  recommendedSettingsApplied: 'Рекомендуемые настройки применены',

  showContinueWatching: 'Показывать «Продолжить просмотр» на главной',
  freshMovies: 'Свежие фильмы',
  freshSeries: 'Свежие сериалы',
}

const de: Translations = {
  appName: 'KPuppy',
  loading: 'Laden...',
  loadingContent: 'Inhalte werden geladen...',

  menuHome: 'Startseite',
  menuSearch: 'Suche',
  menuContinue: 'Fortsetzen',
  menuNewEpisodes: 'Neue Folgen',
  menuBookmarks: 'Lesezeichen',
  menuCollections: 'Sammlungen',
  menuHistory: 'Verlauf',
  menuMovies: 'Filme',
  menuSeries: 'Serien',
  menuConcerts: 'Konzerte',
  menu3D: '3D',
  menuDocs: 'Dokus',
  menuTvShows: 'TV-Shows',
  menuLiveTV: 'Live TV',
  menuSettings: 'Einstellungen',
  menuProfile: 'Profil',

  categoryMovies: 'Filme',
  categorySeries: 'Serien',
  categoryConcerts: 'Konzerte',
  category3D: '3D',
  categoryDocs: 'Dokumentationen',
  categoryTvShows: 'TV-Shows',
  categoryContinueWatching: 'Weiterschauen',

  popularMovies: 'Beliebte Filme',
  newMovies: 'Neue Filme',
  popularSeries: 'Beliebte Serien',
  newSeries: 'Neue Serien',
  newConcerts: 'Neue Konzerte',
  new3D: 'Neues 3D',
  newDocs: 'Neue Dokumentationen',
  newDocuseries: 'Neue Doku-Serien',
  newTvShows: 'Neue TV-Shows',

  searchPlaceholder: 'Suchen...',
  searchHint: 'Suchbegriff eingeben',
  searchNoResults: 'Keine Ergebnisse gefunden',
  searchResults: 'Suchergebnisse',

  play: 'Abspielen',
  seasons: 'Staffeln',
  season: 'Staffel',
  episode: 'Folge',
  director: 'Regisseur',
  cast: 'Besetzung',
  country: 'Land',

  settings: 'Einstellungen',
  clientSettings: 'Streaming',
  localSettings: 'Anwendung',
  support4k: '4K-Unterstützung',
  supportHevc: 'HEVC/H.265',
  supportHdr: 'HDR',
  supportSsl: 'SSL/HTTPS',
  mixedPlaylist: 'Gemischte Playlist',
  server: 'Server',
  streaming: 'Streaming',
  language: 'Sprache',
  on: 'An',
  off: 'Aus',
  notSelected: 'Nicht ausgewählt',
  saving: 'Speichern...',

  profile: 'Profil',
  subscription: 'Abonnement',
  subscriptionActive: 'Aktiv',
  subscriptionInactive: 'Inaktiv',
  expires: 'Läuft ab',
  daysLeft: 'Tage übrig',
  logout: 'Abmelden',

  authTitle: 'Anmelden',
  authInstructions: 'Zum Anmelden besuchen Sie:',
  authVisit: 'kino.watch/device',
  authEnterCode: 'Code eingeben:',
  authWaiting: 'Warte auf Autorisierung...',

  errorLoading: 'Laden fehlgeschlagen',
  errorNoItems: 'Keine Einträge gefunden',
  retry: 'Erneut versuchen',
  noSeasonsAvailable: 'Keine Staffeln verfügbar',
  newEpisodesCount: 'neu',

  loadingMore: 'Mehr laden...',

  quality: 'Videoqualität',
  qualityAuto: 'Auto (Beste)',
  quality4k: '4K (2160p)',
  quality1080p: 'Full HD (1080p)',
  quality720p: 'HD (720p)',
  quality480p: 'SD (480p)',

  audio: 'Audio',
  subtitles: 'Untertitel',
  subtitlesOff: 'Aus',
  original: 'Original',

  player: 'Player',
  playerNative: 'Nativ (webOS)',
  playerBuiltin: 'Eingebaut',

  addToBookmarks: 'Zu Lesezeichen hinzufügen',
  removeFromBookmarks: 'Aus Lesezeichen entfernen',
  createFolder: 'Ordner erstellen',
  deleteFolder: 'Ordner löschen',
  newFolderName: 'Neuer Ordner',
  confirmDelete: 'Diesen Ordner löschen?',
  bookmarkAdded: 'Zu Lesezeichen hinzugefügt',
  bookmarkRemoved: 'Aus Lesezeichen entfernt',

  similar: 'Ähnlich',
  trailer: 'Trailer',

  addToWatchlist: 'Merkliste',
  removeFromWatchlist: 'Von Merkliste entfernen',

  genre: 'Genre',
  allGenres: 'Alle Genres',
  allCountries: 'Alle Länder',
  allTypes: 'Alle Typen',
  type: 'Typ',
  sort: 'Sortierung',
  sortNewest: 'Neueste',
  sortRating: 'Bewertung',
  sortViews: 'Aufrufe',
  sortYear: 'Jahr',
  sortTitle: 'Titel',
  year: 'Jahr',
  allYears: 'Alle Jahre',
  filter4k: 'Nur 4K',
  allQualities: 'Alle Qualitäten',
  searchField: 'Suchen in',
  searchFieldAny: 'Überall',
  searchFieldTitle: 'Titel',
  searchFieldActor: 'Schauspieler',
  searchFieldDirector: 'Regisseur',
  applyRecommendedSettings: 'Empfohlene Geräteeinstellungen anwenden',
  recommendedSettingsApplied: 'Empfohlene Einstellungen angewendet',

  showContinueWatching: '„Weiterschauen“ auf Startseite anzeigen',
  freshMovies: 'Frische Filme',
  freshSeries: 'Frische Serien',
}

export const translations: Record<Language, Translations> = { en, ru, de }

export function getTranslations(lang: Language): Translations {
  return translations[lang] || translations.en
}
