interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  return <div class={`spinner spinner-${size} ${className}`} />
}

interface LoadingStateProps {
  size?: 'sm' | 'md' | 'lg'
  message?: string
  className?: string
}

export function LoadingState({ size = 'md', message, className = '' }: LoadingStateProps) {
  return (
    <div class={`loading-container ${className}`}>
      <LoadingSpinner size={size} />
      {message && <span class="loading-message">{message}</span>}
    </div>
  )
}
