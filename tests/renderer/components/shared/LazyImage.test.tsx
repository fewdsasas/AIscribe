import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { LazyImage } from '../../../../src/renderer/components/shared/LazyImage'

type ObserverCallback = (entries: { isIntersecting: boolean }[]) => void

/**
 * Active IntersectionObserver mock: calls the callback with isIntersecting=true
 * as soon as `observe` is invoked, so the lazy image renders immediately.
 *
 * Uses a regular `function` (not an arrow function) because the component calls
 * `new IntersectionObserver(...)` and arrow functions cannot be constructors.
 */
function stubActiveIntersectionObserver(): void {
  vi.stubGlobal(
    'IntersectionObserver',
    vi.fn(function (callback: ObserverCallback) {
      return {
        observe: vi.fn(() => callback([{ isIntersecting: true }])),
        unobserve: vi.fn(),
        disconnect: vi.fn()
      }
    })
  )
}

/**
 * Passive IntersectionObserver mock: never triggers the callback, so the image
 * stays out of view (initial state).
 */
function stubPassiveIntersectionObserver(): void {
  vi.stubGlobal(
    'IntersectionObserver',
    vi.fn(function () {
      return {
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn()
      }
    })
  )
}

describe('LazyImage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('does not render img when not visible (initial state)', () => {
    stubPassiveIntersectionObserver()

    const { container } = render(<LazyImage src="test.jpg" alt="Test image" />)

    // No img should be rendered while outside the viewport
    expect(screen.queryByRole('img')).not.toBeInTheDocument()

    // Placeholder div should display the placeholder background and pre-load opacity
    const placeholder = container.firstChild as HTMLElement
    expect(placeholder).toBeTruthy()
    expect(placeholder.style.backgroundColor).toBe('var(--ink-100)')
    expect(placeholder.style.opacity).toBe('0.5')
  })

  it('renders img after IntersectionObserver triggers', () => {
    stubActiveIntersectionObserver()

    render(<LazyImage src="loaded.jpg" alt="Loaded image" />)

    const img = screen.getByRole('img')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'loaded.jpg')
    expect(img).toHaveAttribute('alt', 'Loaded image')
  })

  it('transitions opacity and calls onLoad when img loads', () => {
    stubActiveIntersectionObserver()

    const onLoad = vi.fn()
    const { container } = render(<LazyImage src="loaded.jpg" alt="Loaded" onLoad={onLoad} />)

    const img = screen.getByRole('img')
    const outerDiv = container.firstChild as HTMLElement

    // Before load: outer div is faded (0.5) and img is hidden (0)
    expect(outerDiv.style.opacity).toBe('0.5')
    expect(img.style.opacity).toBe('0')

    fireEvent.load(img)

    // After load: both reach full opacity and the callback fires
    expect(onLoad).toHaveBeenCalledTimes(1)
    expect(outerDiv.style.opacity).toBe('1')
    expect(img.style.opacity).toBe('1')
  })

  it('calls onError when img fails to load', () => {
    stubActiveIntersectionObserver()

    const onError = vi.fn()
    render(<LazyImage src="broken.jpg" alt="Broken" onError={onError} />)

    const img = screen.getByRole('img')
    fireEvent.error(img)

    expect(onError).toHaveBeenCalledTimes(1)
  })

  it('is wrapped with React.memo for shallow prop comparison', () => {
    stubActiveIntersectionObserver()

    // Structural: React.memo returns a memo component object (not a function)
    // with the react.memo type symbol and the assigned displayName.
    expect(LazyImage.$$typeof).toBe(Symbol.for('react.memo'))
    expect(LazyImage.displayName).toBe('LazyImage')

    // Behavioral: same props keep output stable; changing props updates it.
    const { rerender } = render(<LazyImage src="first.jpg" alt="First" />)
    expect(screen.getByRole('img')).toHaveAttribute('src', 'first.jpg')

    rerender(<LazyImage src="first.jpg" alt="First" />)
    expect(screen.getByRole('img')).toHaveAttribute('src', 'first.jpg')

    rerender(<LazyImage src="second.jpg" alt="Second" />)
    expect(screen.getByRole('img')).toHaveAttribute('src', 'second.jpg')
  })
})
