import { MovieItem } from '../api/kinopub'

interface MovieCardProps {
  movie: MovieItem
  focused: boolean
  onSelect?: () => void
}

function splitTitle(title: string): { primary: string; secondary?: string } {
  const separators = [' / ', ' / ']
  for (const sep of separators) {
    if (title.includes(sep)) {
      const parts = title.split(sep)
      return { primary: parts[0], secondary: parts[1] }
    }
  }
  return { primary: title }
}

export function MovieCard({ movie, focused, onSelect }: MovieCardProps) {
  const { primary, secondary } = splitTitle(movie.title)

  const cardStyle = {
    width: '300px',
    height: '450px',
    borderRadius: '4px',
    overflow: 'hidden',
    position: 'relative' as const,
    cursor: 'pointer',
    border: focused ? '2px solid #e50914' : '2px solid transparent',
    boxShadow: focused ? '0 8px 20px rgba(0,0,0,0.6)' : 'none',
    zIndex: focused ? 10 : 1,
    flexShrink: 0
  }

  const imageStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
    backgroundColor: '#1f1f1f'
  }

  const overlayStyle = {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    padding: '40px 12px 12px',
    background: 'linear-gradient(transparent, rgba(0,0,0,0.9))',
    opacity: focused ? 1 : 0.8
  }

  const titleStyle = {
    fontSize: '24px',
    fontWeight: 600,
    color: '#ffffff',
    marginBottom: '4px',
    lineHeight: 1.2
  }

  const secondaryTitleStyle = {
    fontSize: '18px',
    fontWeight: 400,
    color: '#b3b3b3',
    marginBottom: '6px',
    lineHeight: 1.2
  }

  const yearStyle = {
    fontSize: '20px',
    color: '#888888'
  }

  return (
    <div style={cardStyle} onClick={onSelect}>
      <img
        src={movie.posters?.medium || movie.posters?.big || movie.posters?.small}
        alt={movie.title}
        style={imageStyle}
      />
      <div style={overlayStyle}>
        <div style={titleStyle}>{primary}</div>
        {secondary && <div style={secondaryTitleStyle}>{secondary}</div>}
        <div style={yearStyle}>{movie.year}</div>
      </div>
    </div>
  )
}
