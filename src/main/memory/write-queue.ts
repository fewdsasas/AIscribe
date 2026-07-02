import { logger } from '../utils/logger'

export interface WriteQueueOptions {
  flushInterval?: number
  maxBatchSize?: number
}

/**
 * 异步写入队列：合并高频写请求并按批次刷新。
 *
 * 当前主要用于合并多次 scheduleSave() 落盘请求：在 flushInterval 窗口内
 * 的多个 enqueue 调用最终只会触发一次磁盘保存，降低 IPC/内存峰值。
 * 队列中的任务按 FIFO 顺序在一个事务（或外部协调的同步块）中批量执行。
 */
export class WriteQueue {
  private pending: Array<() => void> = []
  private timer: ReturnType<typeof setTimeout> | null = null
  private flushing = false
  private readonly flushInterval: number
  private readonly maxBatchSize: number

  constructor(options: WriteQueueOptions = {}) {
    this.flushInterval = options.flushInterval ?? 300
    this.maxBatchSize = options.maxBatchSize ?? 100
  }

  /**
   * 将写任务入队。相同窗口内的任务会被合并，达到 maxBatchSize 时立即刷新。
   */
  enqueue(task: () => void): void {
    this.pending.push(task)
    if (this.pending.length >= this.maxBatchSize) {
      this.flush()
    } else {
      this.scheduleFlush()
    }
  }

  /**
   * 立即执行当前队列中的所有任务。关闭数据库前必须调用，确保数据落盘。
   */
  flush(): void {
    if (this.flushing || this.pending.length === 0) return
    this.flushing = true
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    const batch = this.pending.splice(0, this.maxBatchSize)
    let executed = 0
    try {
      for (let i = 0; i < batch.length; i++) {
        batch[i]()
        executed = i + 1
      }
    } catch (e) {
      logger.error('WriteQueue flush failed:', e)
      // 已执行的任务不再放回；未执行的任务重新调度
      const remaining = batch.slice(executed)
      this.pending.unshift(...remaining)
      throw e
    } finally {
      this.flushing = false
      if (this.pending.length > 0) {
        this.scheduleFlush()
      }
    }
  }

  /**
   * 停止定时器并强制刷新。用于应用退出前的安全落盘。
   */
  close(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    this.flush()
  }

  get pendingCount(): number {
    return this.pending.length
  }

  private scheduleFlush(): void {
    if (this.timer) return
    this.timer = setTimeout(() => {
      this.timer = null
      this.flush()
    }, this.flushInterval)
  }
}
