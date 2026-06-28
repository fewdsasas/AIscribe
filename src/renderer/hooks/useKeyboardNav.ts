import { useCallback, useState } from 'react'

export interface KeyboardNavOptions<T> {
  /** The list of items */
  items: T[]
  /** Direction of navigation, default: 'vertical' */
  direction?: 'horizontal' | 'vertical'
  /** Whether to loop when reaching ends, default: true */
  loop?: boolean
  /** Called on Enter/Space with the current index */
  onActivate?: (index: number) => void
}

/**
 * 键盘导航 Hook，支持方向键、Home/End、Enter/Space 操作
 *
 * @example
 * const { activeIndex, handleKeyDown } = useKeyboardNav({
 *   items: tabs,
 *   direction: 'horizontal',
 *   loop: true,
 *   onActivate: (i) => setActiveTab(i),
 * })
 * // 在容器上绑定 onKeyDown
 * <div onKeyDown={handleKeyDown}>...</div>
 */
export function useKeyboardNav<T>(options: KeyboardNavOptions<T>): {
  activeIndex: number
  setActiveIndex: (index: number) => void
  handleKeyDown: (e: React.KeyboardEvent) => void
} {
  const { items, direction = 'vertical', loop = true, onActivate } = options
  const [activeIndex, setActiveIndexState] = useState<number>(0)

  /** Wrapped setter matching the exposed signature (number only, not updater function) */
  const setActiveIndex = useCallback((index: number) => {
    setActiveIndexState(index)
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const lastIndex = items.length - 1
      if (lastIndex < 0) return

      const isVertical = direction === 'vertical'
      let newIndex: number | null = null

      switch (e.key) {
        case 'ArrowUp':
          if (!isVertical) break
          e.preventDefault()
          if (activeIndex > 0) {
            newIndex = activeIndex - 1
          } else if (loop) {
            newIndex = lastIndex
          }
          break

        case 'ArrowDown':
          if (!isVertical) break
          e.preventDefault()
          if (activeIndex < lastIndex) {
            newIndex = activeIndex + 1
          } else if (loop) {
            newIndex = 0
          }
          break

        case 'ArrowLeft':
          if (isVertical) break
          e.preventDefault()
          if (activeIndex > 0) {
            newIndex = activeIndex - 1
          } else if (loop) {
            newIndex = lastIndex
          }
          break

        case 'ArrowRight':
          if (isVertical) break
          e.preventDefault()
          if (activeIndex < lastIndex) {
            newIndex = activeIndex + 1
          } else if (loop) {
            newIndex = 0
          }
          break

        case 'Home':
          e.preventDefault()
          newIndex = 0
          break

        case 'End':
          e.preventDefault()
          newIndex = lastIndex
          break

        case 'Enter':
        case ' ':
          e.preventDefault()
          if (onActivate && activeIndex >= 0 && activeIndex <= lastIndex) {
            onActivate(activeIndex)
          }
          break
      }

      if (newIndex !== null) {
        setActiveIndexState(newIndex)
      }
    },
    [items.length, direction, loop, activeIndex, onActivate]
  )

  return { activeIndex, setActiveIndex, handleKeyDown }
}
