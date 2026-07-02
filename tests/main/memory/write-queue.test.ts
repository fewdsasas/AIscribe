import { describe, expect, it, vi } from 'vitest'
import { WriteQueue } from '../../../src/main/memory/write-queue'

describe('WriteQueue', () => {
  it('should execute enqueued tasks on flush', () => {
    const queue = new WriteQueue({ flushInterval: 10_000 })
    const task = vi.fn()
    queue.enqueue(task)
    expect(task).not.toHaveBeenCalled()
    queue.flush()
    expect(task).toHaveBeenCalledTimes(1)
  })

  it('should merge tasks in the same flush window', () => {
    vi.useFakeTimers()
    const queue = new WriteQueue({ flushInterval: 300 })
    const task = vi.fn()
    queue.enqueue(task)
    queue.enqueue(task)
    queue.enqueue(task)
    expect(task).not.toHaveBeenCalled()
    vi.advanceTimersByTime(300)
    expect(task).toHaveBeenCalledTimes(3)
    vi.useRealTimers()
  })

  it('should flush immediately when maxBatchSize reached', () => {
    const queue = new WriteQueue({ flushInterval: 10_000, maxBatchSize: 2 })
    const task = vi.fn()
    queue.enqueue(task)
    expect(task).not.toHaveBeenCalled()
    queue.enqueue(task)
    expect(task).toHaveBeenCalledTimes(2)
  })

  it('should flush remaining tasks on close', () => {
    vi.useFakeTimers()
    const queue = new WriteQueue({ flushInterval: 10_000 })
    const task = vi.fn()
    queue.enqueue(task)
    queue.close()
    expect(task).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  it('should expose pending count', () => {
    const queue = new WriteQueue({ flushInterval: 10_000 })
    queue.enqueue(() => {})
    queue.enqueue(() => {})
    expect(queue.pendingCount).toBe(2)
    queue.flush()
    expect(queue.pendingCount).toBe(0)
  })

  it('should re-schedule remaining tasks after a flush failure', () => {
    const queue = new WriteQueue({ flushInterval: 10_000 })
    const goodTask = vi.fn()
    let shouldFail = true
    const badTask = vi.fn(() => {
      if (shouldFail) {
        shouldFail = false
        throw new Error('fail')
      }
    })
    queue.enqueue(goodTask)
    queue.enqueue(badTask)
    expect(() => queue.flush()).toThrow('fail')
    // goodTask executed before failure; only badTask remains
    expect(queue.pendingCount).toBe(1)
    queue.flush()
    expect(badTask).toHaveBeenCalledTimes(2)
    expect(goodTask).toHaveBeenCalledTimes(1)
  })
})
