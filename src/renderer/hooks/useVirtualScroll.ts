import { useCallback, useEffect, useRef, useState } from 'react'

export interface VirtualScrollOptions {
  /** 每项估计高度（像素） */
  itemHeight: number
  /** 可视区域外额外渲染的项数 */
  overscan?: number
  /** 容器高度（像素），不指定时自动计算 */
  containerHeight?: number
}

/**
 * 简单的虚拟滚动 Hook
 * 适用于聊天消息、列表等场景
 *
 * @param itemCount 总项目数
 * @param options 配置选项
 * @example
 * const { virtualItems, containerProps, onScroll } = useVirtualScroll(messages.length, { itemHeight: 80 })
 */
export function computeVisibleRange(
  scrollTop: number,
  visibleHeight: number,
  itemCount: number,
  itemHeight: number,
  overscan: number
): { startIndex: number; endIndex: number; totalHeight: number; topOffset: number } {
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(itemCount - 1, Math.ceil((scrollTop + visibleHeight) / itemHeight) + overscan)
  const totalHeight = itemCount * itemHeight
  const topOffset = startIndex * itemHeight
  return { startIndex, endIndex, totalHeight, topOffset }
}

export function useVirtualScroll(itemCount: number, options: VirtualScrollOptions) {
  const { itemHeight, overscan = 5, containerHeight: propHeight } = options
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [visibleHeight, setVisibleHeight] = useState(propHeight || 400)

  const range = computeVisibleRange(scrollTop, visibleHeight, itemCount, itemHeight, overscan)

  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  // Update container height on resize
  useEffect(() => {
    if (propHeight) return
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setVisibleHeight(entry.contentRect.height)
      }
    })
    if (containerRef.current) {
      observer.observe(containerRef.current)
    }
    return () => observer.disconnect()
  }, [propHeight])

  return {
    containerRef,
    containerProps: {
      ref: containerRef,
      onScroll,
      style: { overflow: 'auto', height: propHeight || '100%' }
    } as React.HTMLAttributes<HTMLDivElement>,
    startIndex: range.startIndex,
    endIndex: range.endIndex,
    topOffset: range.topOffset,
    totalHeight: range.totalHeight,
    visibleHeight
  }
}
