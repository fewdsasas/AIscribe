import { logger } from '../utils/logger'

export interface LLMRequestQueueOptions {
  maxConcurrency?: number
  maxRetries?: number
  baseDelayMs?: number
}

interface QueueItem {
  task: () => Promise<unknown>
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  retries: number
}

/**
 * LLM 非流式请求的统一队列。
 *
 * 控制最大并发数，对可重试错误执行指数退避重试，避免网络抖动或
 * 临时服务过载导致请求直接失败。
 */
export class LLMRequestQueue {
  private queue: Array<QueueItem> = []
  private running = 0
  private readonly maxConcurrency: number
  private readonly maxRetries: number
  private readonly baseDelayMs: number

  constructor(options: LLMRequestQueueOptions = {}) {
    this.maxConcurrency = options.maxConcurrency ?? 2
    this.maxRetries = options.maxRetries ?? 2
    this.baseDelayMs = options.baseDelayMs ?? 500
  }

  enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        task: async () => await task(),
        resolve: value => resolve(value as T),
        reject,
        retries: 0
      })
      this.process()
    })
  }

  get pendingCount(): number {
    return this.queue.length
  }

  get activeCount(): number {
    return this.running
  }

  private async process(): Promise<void> {
    if (this.running >= this.maxConcurrency || this.queue.length === 0) return
    this.running++
    const item = this.queue.shift() as QueueItem
    try {
      const result = await item.task()
      item.resolve(result)
    } catch (error) {
      if (this.isRetryable(error) && item.retries < this.maxRetries) {
        item.retries++
        const delay = this.baseDelayMs * 2 ** (item.retries - 1)
        logger.warn(`LLM request failed, retrying ${item.retries}/${this.maxRetries} after ${delay}ms`, error)
        this.queue.unshift(item)
        await new Promise(resolve => setTimeout(resolve, delay))
      } else {
        item.reject(error instanceof Error ? error : new Error(String(error)))
      }
    } finally {
      this.running--
      // 仅在队列非空时继续处理，避免创建无意义的异步 Promise
      if (this.queue.length > 0) {
        this.process()
      }
    }
  }

  private isRetryable(error: unknown): boolean {
    if (!(error instanceof Error)) return false
    const msg = error.message
    // 客户端错误不重试
    if (msg.startsWith('API Error (4')) return false
    // AbortError 触发的固定超时不重试
    if (msg === 'LLM 请求超时') return false
    // 服务端错误可重试
    if (msg.startsWith('API Error (5')) return true
    // 网络错误可重试
    if (msg.includes('fetch failed') || msg.includes('ENOTFOUND') || msg.includes('ECONNREFUSED')) return true
    return false
  }
}
