export type Language = 'en' | 'ru' | 'uk' | 'de'

export const LANGUAGES: { id: Language; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'ru', label: 'Русский' },
  { id: 'uk', label: 'Українська' },
  { id: 'de', label: 'Deutsch' },
]

export function isLanguage(value: string | null | undefined): value is Language {
  return value === 'en' || value === 'ru' || value === 'uk' || value === 'de'
}

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
  menuWatching: string
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
  startWatching: string
  allWatched: string
  seasons: string
  season: string
  episode: string
  episodes: string
  previousEpisode: string
  nextEpisode: string
  toggleWatchedHint: string
  director: string
  cast: string
  country: string
  fullInfo: string
  backToSummary: string
  synopsis: string
  hourShort: string
  minuteShort: string
  typeMovie: string
  typeSeries: string
  typeDocumentary: string
  typeDocuseries: string
  typeTvShow: string
  typeConcert: string
  type3D: string

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
  collectionsShuffle: string
  collectionsPageDown: string
  collectionsJumpTop: string
  collectionsSortAz: string
  bookmarkAdded: string
  bookmarkRemoved: string

  // Similar
  similar: string
  seeAll: string

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
  filterKp: string
  filterImdb: string
  ratingAny: string
  ratingFrom6: string
  ratingFrom7: string
  ratingFrom8: string
  filterFinished: string
  finishedAny: string
  finishedOnly: string
  searchField: string
  searchFieldAny: string
  searchFieldTitle: string
  searchFieldActor: string
  searchFieldDirector: string
  applyRecommendedSettings: string
  recommendedSettingsApplied: string

  // Home screen
  showContinueWatching: string
  pinSideMenu: string
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
  menuWatching: "I'm Watching",
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
  startWatching: 'Start watching',
  allWatched: 'All watched',
  seasons: 'Seasons',
  season: 'Season',
  episode: 'Episode',
  episodes: 'Episodes',
  previousEpisode: 'Previous',
  nextEpisode: 'Next',
  toggleWatchedHint: 'Green — mark watched / unwatched',
  director: 'Director',
  cast: 'Cast',
  country: 'Country',
  fullInfo: 'Full information',
  backToSummary: 'Back to overview',
  synopsis: 'Synopsis',
  hourShort: 'h',
  minuteShort: 'min',
  typeMovie: 'Movie',
  typeSeries: 'Series',
  typeDocumentary: 'Documentary',
  typeDocuseries: 'Docuseries',
  typeTvShow: 'TV show',
  typeConcert: 'Concert',
  type3D: '3D',

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
  collectionsShuffle: 'Shuffle',
  collectionsPageDown: 'Page down',
  collectionsJumpTop: 'Jump to top',
  collectionsSortAz: 'A–Z',
  bookmarkAdded: 'Added to bookmarks',
  bookmarkRemoved: 'Removed from bookmarks',

  similar: 'Similar',
  seeAll: 'See all',
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
  filterKp: 'Kinopoisk',
  filterImdb: 'IMDb',
  ratingAny: 'Any',
  ratingFrom6: '6+',
  ratingFrom7: '7+',
  ratingFrom8: '8+',
  filterFinished: 'Status',
  finishedAny: 'All',
  finishedOnly: 'Finished',
  searchField: 'Search in',
  searchFieldAny: 'Anywhere',
  searchFieldTitle: 'Title',
  searchFieldActor: 'Actor',
  searchFieldDirector: 'Director',
  applyRecommendedSettings: 'Apply Recommended Device Settings',
  recommendedSettingsApplied: 'Recommended settings applied',

  showContinueWatching: 'Show Continue Watching on Home',
  pinSideMenu: 'Keep side menu expanded',
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
  menuNewEpisodes: 'Новые эпизоды',
  menuWatching: 'Я смотрю',
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
  startWatching: 'Начать просмотр',
  allWatched: 'Всё просмотрено',
  seasons: 'Сезоны',
  season: 'Сезон',
  episode: 'Серия',
  episodes: 'Серии',
  previousEpisode: 'Предыдущая',
  nextEpisode: 'Следующая',
  toggleWatchedHint: 'Зелёная — отметить просмотренным',
  director: 'Режиссёр',
  cast: 'В ролях',
  country: 'Страна',
  fullInfo: 'Полная информация',
  backToSummary: 'К основному экрану',
  synopsis: 'Описание',
  hourShort: 'ч',
  minuteShort: 'мин',
  typeMovie: 'Фильм',
  typeSeries: 'Сериал',
  typeDocumentary: 'Документальный фильм',
  typeDocuseries: 'Документальный сериал',
  typeTvShow: 'ТВ-шоу',
  typeConcert: 'Концерт',
  type3D: '3D',

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
  collectionsShuffle: 'Перемешать',
  collectionsPageDown: 'Страница вниз',
  collectionsJumpTop: 'В начало',
  collectionsSortAz: 'А–Я',
  bookmarkAdded: 'Добавлено в закладки',
  bookmarkRemoved: 'Удалено из закладок',

  similar: 'Похожее',
  seeAll: 'Смотреть все',
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
  filterKp: 'Кинопоиск',
  filterImdb: 'IMDb',
  ratingAny: 'Любой',
  ratingFrom6: 'от 6',
  ratingFrom7: 'от 7',
  ratingFrom8: 'от 8',
  filterFinished: 'Статус',
  finishedAny: 'Все',
  finishedOnly: 'Завершённые',
  searchField: 'Искать в',
  searchFieldAny: 'Везде',
  searchFieldTitle: 'Название',
  searchFieldActor: 'Актёр',
  searchFieldDirector: 'Режиссёр',
  applyRecommendedSettings: 'Применить рекомендуемые настройки',
  recommendedSettingsApplied: 'Рекомендуемые настройки применены',

  showContinueWatching: 'Показывать «Продолжить просмотр» на главной',
  pinSideMenu: 'Не скрывать боковую панель',
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
  menuWatching: 'Ich schaue',
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
  startWatching: 'Ansehen starten',
  allWatched: 'Alles gesehen',
  seasons: 'Staffeln',
  season: 'Staffel',
  episode: 'Folge',
  episodes: 'Folgen',
  previousEpisode: 'Vorherige',
  nextEpisode: 'Nächste',
  toggleWatchedHint: 'Grün — gesehen / ungesehen',
  director: 'Regisseur',
  cast: 'Besetzung',
  country: 'Land',
  fullInfo: 'Vollständige Informationen',
  backToSummary: 'Zurück zur Übersicht',
  synopsis: 'Handlung',
  hourShort: 'Std.',
  minuteShort: 'Min.',
  typeMovie: 'Film',
  typeSeries: 'Serie',
  typeDocumentary: 'Dokumentarfilm',
  typeDocuseries: 'Dokuserie',
  typeTvShow: 'TV-Show',
  typeConcert: 'Konzert',
  type3D: '3D',

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
  collectionsShuffle: 'Mischen',
  collectionsPageDown: 'Seite nach unten',
  collectionsJumpTop: 'Nach oben',
  collectionsSortAz: 'A–Z',
  bookmarkAdded: 'Zu Lesezeichen hinzugefügt',
  bookmarkRemoved: 'Aus Lesezeichen entfernt',

  similar: 'Ähnlich',
  seeAll: 'Alle anzeigen',
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
  filterKp: 'Kinopoisk',
  filterImdb: 'IMDb',
  ratingAny: 'Beliebig',
  ratingFrom6: 'ab 6',
  ratingFrom7: 'ab 7',
  ratingFrom8: 'ab 8',
  filterFinished: 'Status',
  finishedAny: 'Alle',
  finishedOnly: 'Abgeschlossen',
  searchField: 'Suchen in',
  searchFieldAny: 'Überall',
  searchFieldTitle: 'Titel',
  searchFieldActor: 'Schauspieler',
  searchFieldDirector: 'Regisseur',
  applyRecommendedSettings: 'Empfohlene Geräteeinstellungen anwenden',
  recommendedSettingsApplied: 'Empfohlene Einstellungen angewendet',

  showContinueWatching: '„Weiterschauen“ auf Startseite anzeigen',
  pinSideMenu: 'Seitenmenü ausgeklappt lassen',
  freshMovies: 'Frische Filme',
  freshSeries: 'Frische Serien',
}

const uk: Translations = {
  appName: 'KPuppy',
  loading: 'Завантаження...',
  loadingContent: 'Завантаження вмісту...',

  menuHome: 'Головна',
  menuSearch: 'Пошук',
  menuContinue: 'Продовжити',
  menuNewEpisodes: 'Нові епізоди',
  menuWatching: 'Я дивлюся',
  menuBookmarks: 'Закладки',
  menuCollections: 'Добірки',
  menuHistory: 'Історія',
  menuMovies: 'Фільми',
  menuSeries: 'Серіали',
  menuConcerts: 'Концерти',
  menu3D: '3D',
  menuDocs: 'Документальні',
  menuTvShows: 'ТБ-шоу',
  menuLiveTV: 'Прямий ефір',
  menuSettings: 'Налаштування',
  menuProfile: 'Профіль',

  categoryMovies: 'Фільми',
  categorySeries: 'Серіали',
  categoryConcerts: 'Концерти',
  category3D: '3D',
  categoryDocs: 'Документальні',
  categoryTvShows: 'ТБ-шоу',
  categoryContinueWatching: 'Продовжити перегляд',

  popularMovies: 'Популярні фільми',
  newMovies: 'Нові фільми',
  popularSeries: 'Популярні серіали',
  newSeries: 'Нові серіали',
  newConcerts: 'Нові концерти',
  new3D: 'Нове 3D',
  newDocs: 'Нові документальні',
  newDocuseries: 'Нові докусеріали',
  newTvShows: 'Нові ТБ-шоу',

  searchPlaceholder: 'Пошук...',
  searchHint: 'Введіть запит',
  searchNoResults: 'Нічого не знайдено',
  searchResults: 'Результати пошуку',

  play: 'Дивитися',
  startWatching: 'Почати перегляд',
  allWatched: 'Усе переглянуто',
  seasons: 'Сезони',
  season: 'Сезон',
  episode: 'Серія',
  episodes: 'Серії',
  previousEpisode: 'Попередня',
  nextEpisode: 'Наступна',
  toggleWatchedHint: 'Зелена — позначити переглянутим',
  director: 'Режисер',
  cast: 'У ролях',
  country: 'Країна',
  fullInfo: 'Повна інформація',
  backToSummary: 'До основного екрана',
  synopsis: 'Опис',
  hourShort: 'год',
  minuteShort: 'хв',
  typeMovie: 'Фільм',
  typeSeries: 'Серіал',
  typeDocumentary: 'Документальний фільм',
  typeDocuseries: 'Документальний серіал',
  typeTvShow: 'ТБ-шоу',
  typeConcert: 'Концерт',
  type3D: '3D',

  settings: 'Налаштування',
  clientSettings: 'Відтворення',
  localSettings: 'Застосунок',
  support4k: 'Підтримка 4K',
  supportHevc: 'HEVC/H.265',
  supportHdr: 'HDR',
  supportSsl: 'SSL/HTTPS',
  mixedPlaylist: 'Змішаний плейлист',
  server: 'Сервер',
  streaming: 'Тип потоку',
  language: 'Мова',
  on: 'Увімк',
  off: 'Вимк',
  notSelected: 'Не вибрано',
  saving: 'Збереження...',

  profile: 'Профіль',
  subscription: 'Підписка',
  subscriptionActive: 'Активна',
  subscriptionInactive: 'Неактивна',
  expires: 'Закінчується',
  daysLeft: 'днів залишилось',
  logout: 'Вийти',

  authTitle: 'Вхід',
  authInstructions: 'Для входу перейдіть на:',
  authVisit: 'kino.watch/device',
  authEnterCode: 'Введіть код:',
  authWaiting: 'Очікування авторизації...',

  errorLoading: 'Помилка завантаження',
  errorNoItems: 'Нічого не знайдено',
  retry: 'Повторити',
  noSeasonsAvailable: 'Сезони недоступні',
  newEpisodesCount: 'нових',

  loadingMore: 'Завантаження...',

  quality: 'Якість відео',
  qualityAuto: 'Авто (найкраща)',
  quality4k: '4K (2160p)',
  quality1080p: 'Full HD (1080p)',
  quality720p: 'HD (720p)',
  quality480p: 'SD (480p)',

  audio: 'Озвучення',
  subtitles: 'Субтитри',
  subtitlesOff: 'Вимк',
  original: 'Оригінал',

  player: 'Плеєр',
  playerNative: 'Нативний (webOS)',
  playerBuiltin: 'Вбудований',

  addToBookmarks: 'Додати до закладок',
  removeFromBookmarks: 'Видалити із закладок',
  createFolder: 'Створити теку',
  deleteFolder: 'Видалити теку',
  newFolderName: 'Нова тека',
  confirmDelete: 'Видалити цю теку?',
  collectionsShuffle: 'Перемішати',
  collectionsPageDown: 'Сторінка вниз',
  collectionsJumpTop: 'На початок',
  collectionsSortAz: 'А–Я',
  bookmarkAdded: 'Додано до закладок',
  bookmarkRemoved: 'Видалено із закладок',

  similar: 'Схоже',
  seeAll: 'Дивитися все',
  trailer: 'Трейлер',

  addToWatchlist: 'Буду дивитися',
  removeFromWatchlist: 'Прибрати зі списку',

  genre: 'Жанр',
  allGenres: 'Усі жанри',
  allCountries: 'Усі країни',
  allTypes: 'Усі типи',
  type: 'Тип',
  sort: 'Сортування',
  sortNewest: 'Новинки',
  sortRating: 'Рейтинг',
  sortViews: 'Перегляди',
  sortYear: 'Рік',
  sortTitle: 'Назва',
  year: 'Рік',
  allYears: 'Усі роки',
  filter4k: 'Лише 4K',
  allQualities: 'Будь-яка якість',
  filterKp: 'Кінопошук',
  filterImdb: 'IMDb',
  ratingAny: 'Будь-який',
  ratingFrom6: 'від 6',
  ratingFrom7: 'від 7',
  ratingFrom8: 'від 8',
  filterFinished: 'Статус',
  finishedAny: 'Усі',
  finishedOnly: 'Завершені',
  searchField: 'Шукати в',
  searchFieldAny: 'Скрізь',
  searchFieldTitle: 'Назва',
  searchFieldActor: 'Актор',
  searchFieldDirector: 'Режисер',
  applyRecommendedSettings: 'Застосувати рекомендовані налаштування',
  recommendedSettingsApplied: 'Рекомендовані налаштування застосовано',

  showContinueWatching: 'Показувати «Продовжити перегляд» на головній',
  pinSideMenu: 'Не ховати бічну панель',
  freshMovies: 'Свіжі фільми',
  freshSeries: 'Свіжі серіали',
}

export const translations: Record<Language, Translations> = { en, ru, uk, de }

export function getTranslations(lang: Language): Translations {
  return translations[lang] || translations.en
}
