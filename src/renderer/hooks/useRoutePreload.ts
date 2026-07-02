import { useEffect, useRef } from 'react'
import { logger } from '../utils/logger'
import type { ViewType } from '../App'

const preloadMap: Record<ViewType, (() => Promise<unknown>) | undefined> = {
  dashboard: undefined,
  editor: () => import('../views/EditorView'),
  studio: () => import('../views/StudioView'),
  workshop: () => import('../views/WorkshopView'),
  aiChat: () => import('../components/ai-chat/AIChatView'),
  settings: () => import('../views/SettingsView'),
  reader: () => import('../views/ReaderView')
}

function requestIdleCallbackSafely(callback: () => void, timeout = 2000): number | void {
  if (typeof requestIdleCallback === 'function') {
    return requestIdleCallback(callback, { timeout })
  }
  const id = setTimeout(callback, 1)
  return id as unknown as number
}

function cancelIdleCallbackSafely(id: number | void): void {
  if (id === undefined) return
  if (typeof cancelIdleCallback === 'function') {
    cancelIdleCallback(id)
  } else {
    clearTimeout(id as unknown as ReturnType<typeof setTimeout>)
  }
}

/**
 * 根据当前视图预测下一可能视图并进行空闲预加载。
 * 默认预加载 editor（最常用的写作视图），当前在 dashboard 时额外预加载 reader。
 */
export function useRoutePreload(currentView: ViewType): void {
  const idleIdRef = useRef<number | void>(undefined)

  useEffect(() => {
    const targets: ViewType[] = ['editor']
    if (currentView === 'dashboard') {
      targets.push('reader')
    } else if (currentView === 'editor') {
      targets.push('studio')
    }

    idleIdRef.current = requestIdleCallbackSafely(() => {
      for (const view of targets) {
        const preload = preloadMap[view]
        if (preload) {
          preload().catch(err => {
            logger.warn(`Route preload failed for ${view}:`, err)
          })
        }
      }
    })

    return () => {
      cancelIdleCallbackSafely(idleIdRef.current)
    }
  }, [currentView])
}
