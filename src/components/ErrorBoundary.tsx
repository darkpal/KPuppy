import * as Sentry from '@sentry/browser'
import { Component, ComponentChildren } from 'preact'
import { ErrorState } from './ErrorState'

interface ErrorBoundaryProps {
  children: ComponentChildren
  fallback?: ComponentChildren
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: { componentStack?: string }) {
    Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } })
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught error:', error, errorInfo)
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      return (
        <div class="error-boundary">
          <ErrorState
            message={this.state.error?.message}
            onRetry={this.handleRetry}
          />
        </div>
      )
    }

    return this.props.children
  }
}
