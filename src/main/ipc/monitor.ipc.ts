import type { IpcMain } from 'electron'
import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { IPC_CHANNELS } from '../../shared/types/ipc'
import { wrap } from './index'
import { logger } from '../utils/logger'
import type { ServiceRegistry } from '../di'

/** 内存阈值（500MB），超过时记录告警 */
const MEMORY_THRESHOLD = 500 * 1024 * 1024

/** 定期检查间隔（60 秒） */
const MONITOR_INTERVAL_MS = 60_000

let monitorTimer: NodeJS.Timeout | null = null

/**
 * 内存监控 IPC handler
 * 提供 main 进程内存使用情况和数据库大小监控
 */
export function registerMonitorHandlers(ipcMain: IpcMain, _services: ServiceRegistry): void {
  ipcMain.handle(
    IPC_CHANNELS.MONITOR_MEMORY_USAGE,
    wrap(() => {
      const memUsage = process.memoryUsage()
      const dbPath = path.join(app.getPath('userData'), 'aiscribe.db')
      let dbSize = 0
      try {
        if (fs.existsSync(dbPath)) {
          dbSize = fs.statSync(dbPath).size
        }
      } catch {
        // 忽略 stat 错误
      }
      return {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external,
        arrayBuffers: memUsage.arrayBuffers,
        dbSize,
        timestamp: Date.now()
      }
    })
  )

  // 定期内存监控，超阈值告警
  if (monitorTimer) clearInterval(monitorTimer)
  monitorTimer = setInterval(() => {
    const mem = process.memoryUsage()
    if (mem.heapUsed > MEMORY_THRESHOLD) {
      logger.warn(
        `[Memory Monitor] Heap usage exceeded threshold: ${Math.round(mem.heapUsed / 1024 / 1024)}MB / ${Math.round(MEMORY_THRESHOLD / 1024 / 1024)}MB`
      )
    }
  }, MONITOR_INTERVAL_MS)
}
