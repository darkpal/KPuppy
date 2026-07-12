interface IconProps {
  size?: number
  color?: string
}

const defaultSize = 48
const defaultColor = 'currentColor'

/** Material Icons–style filled glyph (matches Kinopub web aside). */
function MaterialIcon({
  size = defaultSize,
  color = defaultColor,
  children
}: IconProps & { children: preact.JSX.Element | preact.JSX.Element[] }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      {children}
    </svg>
  )
}

export function HomeIcon(props: IconProps) {
  return (
    <MaterialIcon {...props}>
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
    </MaterialIcon>
  )
}

export function SearchIcon(props: IconProps) {
  return (
    <MaterialIcon {...props}>
      <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
    </MaterialIcon>
  )
}

/** Kinopub web: notifications_active — «Я смотрю» */
export function PlayIcon(props: IconProps) {
  return (
    <MaterialIcon {...props}>
      <path d="M7.58 4.08 6.15 2.65C3.75 4.48 2.17 7.3 2.03 10.5h2c.15-2.65 1.51-4.97 3.55-6.42zm12.39 6.42h2c-.15-3.2-1.73-6.02-4.12-7.85l-1.42 1.43c2.02 1.45 3.39 3.77 3.54 6.42zM18 11c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2v-5zm-6 11c.14 0 .27-.01.4-.04.65-.14 1.18-.58 1.44-1.18.1-.24.15-.5.15-.78h-4c.01 1.1.9 2 2.01 2z" />
    </MaterialIcon>
  )
}

/** Kinopub web: movie */
export function FilmIcon(props: IconProps) {
  return (
    <MaterialIcon {...props}>
      <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
    </MaterialIcon>
  )
}

/** Kinopub web: tv */
export function TvIcon(props: IconProps) {
  return (
    <MaterialIcon {...props}>
      <path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z" />
    </MaterialIcon>
  )
}

/** Kinopub web: library_music — «Концерты» */
export function MicIcon(props: IconProps) {
  return (
    <MaterialIcon {...props}>
      <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 5h-3v5.5c0 1.38-1.12 2.5-2.5 2.5S10 13.88 10 12.5s1.12-2.5 2.5-2.5c.57 0 1.08.19 1.5.51V5h4v2zM2 6v14c0 1.1.9 2 2 2h14v-2H4V6H2z" />
    </MaterialIcon>
  )
}

export function GlassesIcon(props: IconProps) {
  return (
    <MaterialIcon {...props}>
      <path d="M21.98 14H22c0-3.35-1.76-6.27-4.39-7.87l.88-2.63-1.9-.63-.91 2.74A9.973 9.973 0 0 0 12 5c-1.53 0-2.97.35-4.28.96l-.91-2.74-1.9.63.88 2.63C3.76 7.73 2 10.65 2 14h.02c-.01.17-.02.33-.02.5 0 2.49 2.01 4.5 4.5 4.5s4.5-2.01 4.5-4.5c0-.17-.01-.33-.02-.5h5.04c-.01.17-.02.33-.02.5 0 2.49 2.01 4.5 4.5 4.5s4.5-2.01 4.5-4.5c0-.17-.01-.33-.02-.5zM6.5 16.5c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm11 0c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
    </MaterialIcon>
  )
}

/** Kinopub web: archive — «Докуфильмы» */
export function VideoIcon(props: IconProps) {
  return (
    <MaterialIcon {...props}>
      <path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5 6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z" />
    </MaterialIcon>
  )
}

/** Kinopub web: live_tv — «ТВ Шоу» */
export function RadioIcon(props: IconProps) {
  return (
    <MaterialIcon {...props}>
      <path d="M21 6h-7.59l3.29-3.29L16 2l-4 4-4-4-.71.71L10.59 6H3c-1.1 0-2 .89-2 2v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 14H3V8h18v12zM9 10v8l7-4z" />
    </MaterialIcon>
  )
}

export function SettingsIcon(props: IconProps) {
  return (
    <MaterialIcon {...props}>
      <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.493.493 0 0 0-.49-.41h-3.84c-.24 0-.44.17-.48.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.48-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z" />
    </MaterialIcon>
  )
}

export function UserIcon(props: IconProps) {
  return (
    <MaterialIcon {...props}>
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </MaterialIcon>
  )
}

/** Kinopub web: bookmark */
export function BookmarkIcon(props: IconProps) {
  return (
    <MaterialIcon {...props}>
      <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z" />
    </MaterialIcon>
  )
}

/** Kinopub web: list — «Подборки» */
export function CollectionIcon(props: IconProps) {
  return (
    <MaterialIcon {...props}>
      <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
    </MaterialIcon>
  )
}

/** Kinopub web: history */
export function HistoryIcon(props: IconProps) {
  return (
    <MaterialIcon {...props}>
      <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" />
    </MaterialIcon>
  )
}

export function LiveIcon(props: IconProps) {
  return (
    <MaterialIcon {...props}>
      <path d="M21 6h-7.59l3.29-3.29L16 2l-4 4-4-4-.71.71L10.59 6H3c-1.1 0-2 .89-2 2v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 14H3V8h18v12z" />
      <circle cx="12" cy="14" r="2.5" />
    </MaterialIcon>
  )
}

/** Kinopub web: new_releases — «Новые эпизоды» */
export function BellIcon(props: IconProps) {
  return (
    <MaterialIcon {...props}>
      <path d="M23 12l-2.44-2.78.34-3.68-3.61-.82-1.89-3.18L12 3 8.6 1.54 6.71 4.72l-3.61.81.34 3.68L1 12l2.44 2.78-.34 3.63 3.61.82 1.89 3.18L12 21l3.4 1.46 1.89-3.18 3.61-.82-.34-3.63L23 12zm-10 5h-2v-2h2v2zm0-4h-2V7h2v6z" />
    </MaterialIcon>
  )
}
