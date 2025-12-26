import { useI18n } from '../i18n'
import '../styles/loading.css'

interface ErrorStateProps {
  message?: string
  onRetry?: () => void
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  const { t } = useI18n()

  return (
    <div class="error-state">
      <span class="error-message">{message || t.errorLoading}</span>
      {onRetry && (
        <button class="error-retry-button" onClick={onRetry}>
          {t.retry}
        </button>
      )}
    </div>
  )
}
