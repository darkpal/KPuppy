import '../styles/loading.css'

interface LoadingStateProps {
  message?: string
}

export function LoadingState({ message }: LoadingStateProps) {
  return (
    <div class="loading-state">
      <div class="loading-spinner" />
      {message && <span class="loading-message">{message}</span>}
    </div>
  )
}
