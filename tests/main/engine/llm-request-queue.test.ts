import { describe, expect, it, vi } from 'vitest'
import { LLMRequestQueue } from '../../../src/main/engine/llm-request-queue'

describe('LLMRequestQueue', () => {
  it('should execute a single request', async () => {
    const queue = new LLMRequestQueue()
    const result = await queue.enqueue(async () => 'ok')
    expect(result).toBe('ok')
  })

  it('should limit concurrency', async () => {
    const queue = new LLMRequestQueue({ maxConcurrency: 1 })
    let running = 0
    let maxRunning = 0

    const createTask = (delay: number) => async () => {
      running++
      maxRunning = Math.max(maxRunning, running)
      await new Promise(resolve => setTimeout(resolve, delay))
      running--
      return 'done'
    }

    const promise1 = queue.enqueue(createTask(50))
    const promise2 = queue.enqueue(createTask(50))
    await Promise.all([promise1, promise2])
    expect(maxRunning).toBe(1)
  })

  it('should retry on 5xx errors and succeed', async () => {
    vi.useFakeTimers()
    const queue = new LLMRequestQueue({ maxRetries: 2, baseDelayMs: 100 })
    let attempts = 0
    const task = async () => {
      attempts++
      if (attempts < 2) {
        throw new Error('API Error (503): service unavailable')
      }
      return 'success'
    }

    const promise = queue.enqueue(task)
    await vi.advanceTimersByTimeAsync(100)
    const result = await promise
    expect(result).toBe('success')
    expect(attempts).toBe(2)
    vi.useRealTimers()
  })

  it('should not retry on 4xx errors', async () => {
    const queue = new LLMRequestQueue({ maxRetries: 2 })
    let attempts = 0
    const task = async () => {
      attempts++
      throw new Error('API Error (401): invalid key')
    }

    await expect(queue.enqueue(task)).rejects.toThrow('API Error (401): invalid key')
    expect(attempts).toBe(1)
  })

  it('should not retry on timeout errors', async () => {
    const queue = new LLMRequestQueue({ maxRetries: 2 })
    let attempts = 0
    const task = async () => {
      attempts++
      throw new Error('LLM 请求超时')
    }

    await expect(queue.enqueue(task)).rejects.toThrow('LLM 请求超时')
    expect(attempts).toBe(1)
  })

  it('should give up after max retries', async () => {
    const queue = new LLMRequestQueue({ maxRetries: 2, baseDelayMs: 10 })
    const task = async () => {
      throw new Error('API Error (500): boom')
    }

    await expect(queue.enqueue(task)).rejects.toThrow('API Error (500): boom')
    // 等待足够时间让队列完全清空（10ms + 20ms + 处理时间）
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(queue.pendingCount).toBe(0)
    expect(queue.activeCount).toBe(0)
  })

  it('should expose pending and active counts', () => {
    const queue = new LLMRequestQueue({ maxConcurrency: 1 })
    queue.enqueue(async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
      return 'x'
    })
    queue.enqueue(async () => 'y')
    expect(queue.activeCount).toBeLessThanOrEqual(1)
    expect(queue.pendingCount).toBeGreaterThanOrEqual(0)
  })
})
