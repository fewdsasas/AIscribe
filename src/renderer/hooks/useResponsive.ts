import { useEffect, useState } from 'react'

interface ResponsiveState {
  /** 窗口宽度 */
  width: number
  /** 窗口高度 */
  height: number
  /** 是否移动端 (< 768px) */
  isMobile: boolean
  /** 是否平板 (768px - 1024px) */
  isTablet: boolean
  /** 是否桌面端 (> 1024px) */
  isDesktop: boolean
  /** 是否小屏幕 (< 640px) */
  isSmall: boolean
  /** 是否大屏幕 (> 1280px) */
  isLarge: boolean
}

const breakpoints = {
  small: 640,
  tablet: 768,
  desktop: 1024,
  large: 1280
}

export function classifyBreakpoint(width: number): ResponsiveState {
  return {
    width,
    height: 0,
    isMobile: width < breakpoints.tablet,
    isTablet: width >= breakpoints.tablet && width < breakpoints.desktop,
    isDesktop: width >= breakpoints.desktop,
    isSmall: width < breakpoints.small,
    isLarge: width >= breakpoints.large
  }
}

/**
 * 响应式 Hook，监听窗口大小变化
 * @example
 * const { isMobile, isDesktop } = useResponsive()
 */
export function useResponsive(): ResponsiveState {
  const [state, setState] = useState<ResponsiveState>(() => {
    const width = window.innerWidth
    const height = window.innerHeight
    const bp = classifyBreakpoint(width)
    return { ...bp, height }
  })

  useEffect(() => {
    let rafId: number | null = null

    const handleResize = () => {
      if (rafId) return
      rafId = requestAnimationFrame(() => {
        const width = window.innerWidth
        const height = window.innerHeight
        const bp = classifyBreakpoint(width)
        setState({ ...bp, height })
        rafId = null
      })
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [])

  return state
}
