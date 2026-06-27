import { useCallback, useEffect, useState } from 'react'

export type ThemeId = 'light' | 'dark' | 'sepia' | 'paper' | 'night'

export interface ThemeMeta {
  id: ThemeId
  label: string
  icon: string
  desc: string
}

export const THEMES: ThemeMeta[] = [
  { id: 'light', label: '明亮', icon: '☀️', desc: '浅色模式，适合白天使用' },
  { id: 'dark', label: '暗色', icon: '🌙', desc: '深色模式，适合夜间使用' },
  { id: 'sepia', label: '羊皮纸', icon: '📜', desc: '暖黄底色，模拟纸张质感' },
  { id: 'paper', label: '白纸', icon: '📄', desc: '高对比白底，适合长时间阅读' },
  { id: 'night', label: '夜读', icon: '🌃', desc: '深蓝背景，柔和护眼' }
]

const STORAGE_KEY = 'aiscribe-theme'

export function getInitialTheme(ls: { getItem: (k: string) => string | null }, mm: { matches: boolean }): ThemeId {
  const saved = ls.getItem(STORAGE_KEY) as ThemeId | null
  if (saved && THEMES.some(t => t.id === saved)) return saved
  return mm.matches ? 'dark' : 'light'
}

export function nextTheme(current: ThemeId): ThemeId {
  const cycle: ThemeId[] = ['light', 'dark', 'sepia', 'paper', 'night']
  const idx = cycle.indexOf(current)
  return cycle[(idx + 1) % cycle.length]
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeId>(() =>
    getInitialTheme(localStorage, window.matchMedia('(prefers-color-scheme: dark)'))
  )

  // Apply theme: set data-theme attribute and toggle .dark class for backward compat
  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', theme)
    if (theme === 'dark' || theme === 'night') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const setTheme = useCallback((t: ThemeId) => {
    setThemeState(t)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState(prev => nextTheme(prev))
  }, [])

  return {
    theme,
    setTheme,
    toggleTheme,
    isDark: theme === 'dark' || theme === 'night'
  }
}
