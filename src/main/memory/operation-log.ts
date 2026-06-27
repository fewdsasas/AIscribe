import crypto from 'crypto'
import fs from 'fs'
import readline from 'readline'
import type { Database as SqlJsDatabase } from 'sql.js'
import { logger } from '../utils/logger'

// pending 数组内存风险：无上限增长可能导致 OOM。
// 优化思路：通过 MAX_PENDING 限制条目数，达到上限时同步 flush 落盘后再追加。
// 资源生命周期：pending 在 flush 后清空，日志文件持久化到磁盘。
const MAX_PENDING = 1000

export class OperationLog {
  private logPath: string
  // 内存缓冲区：累计的待落盘操作条目。flush() 后会被清空，避免长期驻留内存。
  private pending: string[] = []
  private flushTimer: ReturnType<typeof setTimeout> | null = null
  private readonly FLUSH_INTERVAL_MS = 5000

  constructor(dbPath: string) {
    this.logPath = dbPath + '.log'
    this.startAutoFlush()
  }

  append(sql: string, params?: unknown[]): void {
    // 达到上限时先同步落盘，防止 pending 数组无限增长导致 OOM
    if (this.pending.length >= MAX_PENDING) {
      this.flush()
    }
    const checksum = crypto
      .createHash('sha256')
      .update(JSON.stringify({ sql, params: params ?? [] }))
      .digest('hex')
    const serialized = JSON.stringify({ sql, params: params ?? [], checksum })
    this.pending.push(serialized)
  }

  // 逐行读取日志文件，避免一次性读入整个文件导致内存峰值过高。
  // 改为 async 以使用 readline 的流式异步迭代；调用方需 await。
  async replay(db: SqlJsDatabase): Promise<void> {
    if (!fs.existsSync(this.logPath)) return
    try {
      const rl = readline.createInterface({
        input: fs.createReadStream(this.logPath, { encoding: 'utf-8' }),
        crlfDelay: Infinity
      })
      for await (const line of rl) {
        if (!line.trim()) continue
        try {
          const entry = JSON.parse(line)
          const expected = crypto
            .createHash('sha256')
            .update(JSON.stringify({ sql: entry.sql, params: entry.params ?? [] }))
            .digest('hex')
          if (entry.checksum !== expected) {
            logger.warn('Operation log entry checksum mismatch, skipping:', line)
            continue
          }
          db.run(entry.sql, entry.params ?? [])
        } catch (e) {
          logger.warn('Failed to replay operation log entry:', line, e)
        }
      }
    } catch (e) {
      logger.warn('Failed to replay operation log:', e)
    }
  }

  flush(): void {
    if (this.pending.length === 0) return
    const lines = this.pending.join('\n') + '\n'
    fs.appendFileSync(this.logPath, lines)
    this.pending = []
  }

  clear(): void {
    this.pending = []
    try {
      if (fs.existsSync(this.logPath)) {
        fs.unlinkSync(this.logPath)
      }
    } catch (e) {
      logger.warn('Failed to clear operation log:', e)
    }
  }

  private startAutoFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flush()
    }, this.FLUSH_INTERVAL_MS)
  }

  stopAutoFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }
  }
}
