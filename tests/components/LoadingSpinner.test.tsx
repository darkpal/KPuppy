import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { h } from 'preact'
import { LoadingSpinner, LoadingState } from '../../src/components/LoadingSpinner'

describe('LoadingSpinner', () => {
  describe('size variants', () => {
    it('renders with default medium size', () => {
      const { container } = render(<LoadingSpinner />)

      const spinner = container.firstChild as HTMLElement
      expect(spinner.className).toContain('spinner-md')
    })

    it('renders with small size', () => {
      const { container } = render(<LoadingSpinner size="sm" />)

      const spinner = container.firstChild as HTMLElement
      expect(spinner.className).toContain('spinner-sm')
    })

    it('renders with large size', () => {
      const { container } = render(<LoadingSpinner size="lg" />)

      const spinner = container.firstChild as HTMLElement
      expect(spinner.className).toContain('spinner-lg')
    })
  })

  describe('custom className', () => {
    it('applies custom className', () => {
      const { container } = render(<LoadingSpinner className="custom-class" />)

      const spinner = container.firstChild as HTMLElement
      expect(spinner.className).toContain('custom-class')
    })

    it('combines size and custom className', () => {
      const { container } = render(<LoadingSpinner size="lg" className="my-spinner" />)

      const spinner = container.firstChild as HTMLElement
      expect(spinner.className).toContain('spinner-lg')
      expect(spinner.className).toContain('my-spinner')
    })
  })
})

describe('LoadingState', () => {
  describe('rendering', () => {
    it('renders spinner inside container', () => {
      const { container } = render(<LoadingState />)

      expect(container.querySelector('.loading-container')).toBeDefined()
      expect(container.querySelector('.spinner')).toBeDefined()
    })

    it('renders with default medium spinner', () => {
      const { container } = render(<LoadingState />)

      expect(container.querySelector('.spinner-md')).toBeDefined()
    })
  })

  describe('size prop', () => {
    it('passes size to spinner', () => {
      const { container } = render(<LoadingState size="lg" />)

      expect(container.querySelector('.spinner-lg')).toBeDefined()
    })
  })

  describe('message prop', () => {
    it('shows message when provided', () => {
      render(<LoadingState message="Loading content..." />)

      expect(screen.getByText('Loading content...')).toBeDefined()
    })

    it('does not show message element when not provided', () => {
      const { container } = render(<LoadingState />)

      expect(container.querySelector('.loading-message')).toBeNull()
    })
  })

  describe('custom className', () => {
    it('applies custom className to container', () => {
      const { container } = render(<LoadingState className="my-loading" />)

      const loadingContainer = container.querySelector('.loading-container')
      expect(loadingContainer?.className).toContain('my-loading')
    })
  })
})
