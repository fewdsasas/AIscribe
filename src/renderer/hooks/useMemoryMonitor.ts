import { useEffect, useRef } from 'react'
import { logger } from '../utils/logger'
import { memoryService } from '../services/memoryService'

/**
 * 视图级内存监控 Hook
 *
 * 在组件挂载/卸载时采集内存快照，并在运行期间周期性采样。
 * 用于确认 EditorView ↔ ReaderView 切换时是否存在内存泄漏。
 *
 * 采集两类数据：
 * - Renderer 进程: performance.memory (Chromium 提供)
 * - Main 进程: window.aiscribe.getMemoryUsage() (IPC)
 */

interface MemorySnapshot {
  label: string
  timestamp: number
  renderer?: {
    usedJSHeapSize: number
    totalJSHeapSize: number
    jsHeapSizeLimit: number
  }
  main?: {
    heapUsed: number
    heapTotal: number
    rss: number
    external: number
    dbSize: number
  }
}

function formatMB(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

async function takeSnapshot(label: string): Promise<MemorySnapshot> {
  const snapshot: MemorySnapshot = {
    label,
    timestamp: Date.now()
  }

  // Renderer 进程内存 (Chromium performance.memory)
  const perfMemory = (performance as unknown as { memory?: PerformanceMemory }).memory
  if (perfMemory) {
    snapshot.renderer = {
      usedJSHeapSize: perfMemory.usedJSHeapSize,
      totalJSHeapSize: perfMemory.totalJSHeapSize,
      jsHeapSizeLimit: perfMemory.jsHeapSizeLimit
    }
  }

  // Main 进程内存 (via IPC) — 添加 3 秒超时
  try {
    const mainMem = await Promise.race([
      memoryService.getMemoryUsage(),
      new Promise<null>(resolve => setTimeout(() => resolve(null), 3000))
    ])
    if (mainMem) {
      snapshot.main = {
        heapUsed: mainMem.heapUsed,
        heapTotal: mainMem.heapTotal,
        rss: mainMem.rss,
        external: mainMem.external,
        dbSize: mainMem.dbSize
      }
    }
  } catch {
    // IPC 不可用时静默跳过
  }

  return snapshot
}

function logSnapshot(snap: MemorySnapshot): void {
  const parts: string[] = [`[MemMonitor] ${snap.label}`]
  if (snap.renderer) {
    parts.push(
      `renderer: used=${formatMB(snap.renderer.usedJSHeapSize)} total=${formatMB(snap.renderer.totalJSHeapSize)}`
    )
  }
  if (snap.main) {
    parts.push(
      `main: heapUsed=${formatMB(snap.main.heapUsed)} rss=${formatMB(snap.main.rss)} db=${formatMB(snap.main.dbSize)}`
    )
  }
  logger.log(parts.join(' | '))
}

function logDelta(from: MemorySnapshot, to: MemorySnapshot): void {
  const elapsed = ((to.timestamp - from.timestamp) / 1000).toFixed(1)
  const parts: string[] = [`[MemMonitor] delta over ${elapsed}s`]

  if (from.renderer && to.renderer) {
    const usedDelta = to.renderer.usedJSHeapSize - from.renderer.usedJSHeapSize
    const totalDelta = to.renderer.totalJSHeapSize - from.renderer.totalJSHeapSize
    parts.push(
      `renderer: used ${usedDelta >= 0 ? '+' : ''}${formatMB(usedDelta)} total ${totalDelta >= 0 ? '+' : ''}${formatMB(totalDelta)}`
    )
  }

  if (from.main && to.main) {
    const heapDelta = to.main.heapUsed - from.main.heapUsed
    const rssDelta = to.main.rss - from.main.rss
    parts.push(
      `main: heapUsed ${heapDelta >= 0 ? '+' : ''}${formatMB(heapDelta)} rss ${rssDelta >= 0 ? '+' : ''}${formatMB(rssDelta)}`
    )
  }

  logger.log(parts.join(' | '))
}

interface PerformanceMemory {
  usedJSHeapSize: number
  totalJSHeapSize: number
  jsHeapSizeLimit: number
}

export function useMemoryMonitor(viewName: string): void {
  const mountSnapshotRef = useRef<MemorySnapshot | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastSampleRef = useRef<MemorySnapshot | null>(null)

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      // 挂载快照
      const mountSnap = await takeSnapshot(`${viewName} mount`)
      if (cancelled) return
      mountSnapshotRef.current = mountSnap
      lastSampleRef.current = mountSnap
      logSnapshot(mountSnap)

      // 周期性采样 (每 3 秒)
      intervalRef.current = setInterval(async () => {
        const sample = await takeSnapshot(`${viewName} sample`)
        if (cancelled) return
        if (lastSampleRef.current) {
          logDelta(lastSampleRef.current, sample)
        }
        lastSampleRef.current = sample
      }, 3000)
    }

    init()

    return () => {
      cancelled = true
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }

      // 卸载快照 (异步，不阻塞 unmount)
      takeSnapshot(`${viewName} unmount`).then(unmountSnap => {
        logSnapshot(unmountSnap)
        if (mountSnapshotRef.current) {
          logDelta(mountSnapshotRef.current, unmountSnap)
          // 泄漏判断：如果 unmount 时 renderer heapUsed 比 mount 时高出 5MB，发出警告
          if (
            mountSnapshotRef.current.renderer &&
            unmountSnap.renderer &&
            unmountSnap.renderer.usedJSHeapSize - mountSnapshotRef.current.renderer.usedJSHeapSize > 5 * 1024 * 1024
          ) {
            const leaked = unmountSnap.renderer.usedJSHeapSize - mountSnapshotRef.current.renderer.usedJSHeapSize
            logger.warn(
              `[MemMonitor] ⚠️ ${viewName} 可能存在内存泄漏: mount→unmount renderer heapUsed 增长 ${formatMB(leaked)}`
            )
          } else {
            logger.log(`[MemMonitor] ✅ ${viewName} 内存释放正常`)
          }
        }
      })
    }
  }, [viewName])
}
