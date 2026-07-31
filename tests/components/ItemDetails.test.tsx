import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/preact'
import { ItemDetails } from '../../src/components/ItemDetails'
import { I18nProvider } from '../../src/i18n/context'

describe('ItemDetails', () => {
  it('keeps country and director together and attaches the extra audio count inline', () => {
    const { container } = render(
      <I18nProvider>
        <ItemDetails
          countries="USA"
          directors={[{ id: 1, name: 'Test Director' }]}
          audios={Array.from({ length: 8 }, (_, index) => ({
            id: index + 1,
            index,
            lang: `en${index}`,
            codec: 'aac',
            channels: 2,
            type: {
              id: index + 1,
              title: `Track ${index + 1}`,
              short_title: `Track ${index + 1}`,
            },
            author: null,
          }))}
        />
      </I18nProvider>
    )

    const topline = container.querySelector('.item-detail-topline')
    expect(topline?.textContent).toContain('USA')
    expect(topline?.textContent).toContain('Test Director')

    const extraCount = container.querySelector('.item-detail-more')
    expect(extraCount?.textContent).toBe('+2')
    expect(extraCount?.parentElement?.classList.contains('item-detail-list-item')).toBe(true)
  })

  it('shows every actor in full details and respects an explicit summary limit', () => {
    const actors = Array.from({ length: 9 }, (_, index) => ({
      id: index + 1,
      name: `Actor ${index + 1}`
    }))

    const { container, rerender } = render(
      <I18nProvider>
        <ItemDetails actors={actors} />
      </I18nProvider>
    )

    expect(container.querySelectorAll('.item-person-chip')).toHaveLength(9)

    rerender(
      <I18nProvider>
        <ItemDetails actors={actors} maxActors={6} />
      </I18nProvider>
    )

    expect(container.querySelectorAll('.item-person-chip')).toHaveLength(6)
  })
})
