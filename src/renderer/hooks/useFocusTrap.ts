import { useEffect } from 'react'

const FOCUSABLE_SELECTOR = 'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const elements = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  return Array.from(elements).filter(el => {
    if (el.offsetWidth === 0 || el.offsetHeight === 0) return false
    const style = window.getComputedStyle(el)
    if (style.display === 'none' || style.visibility === 'hidden') return false
    if ((el as HTMLInputElement).disabled) return false
    return true
  })
}

export function useFocusTrap(containerRef: React.RefObject<HTMLElement | null>, isActive: boolean): void {
  useEffect(() => {
    if (!isActive || !containerRef.current) return

    const container = containerRef.current

    // Auto-focus the first focusable element when activated
    const focusables = getFocusableElements(container)
    if (focusables.length > 0) {
      focusables[0].focus()
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      const elements = getFocusableElements(container)
      if (elements.length === 0) return

      const first = elements[0]
      const last = elements[elements.length - 1]
      const currentIndex = elements.indexOf(document.activeElement as HTMLElement)

      e.preventDefault()

      if (e.shiftKey) {
        // Shift+Tab: previous element, cycle to last when reaching beginning
        if (currentIndex <= 0) {
          last.focus()
        } else {
          elements[currentIndex - 1].focus()
        }
      } else {
        // Tab: next element, cycle to first when reaching end
        if (currentIndex === -1 || currentIndex >= elements.length - 1) {
          first.focus()
        } else {
          elements[currentIndex + 1].focus()
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)

    return () => {
      container.removeEventListener('keydown', handleKeyDown)
    }
  }, [isActive, containerRef])
}
