import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({
  app: { getPath: () => '/mock/userData' }
}))

import { LLMProvider } from '../../src/main/engine/llm-provider'

let provider: LLMProvider

function memSnapshot(label: string) {
  const m = process.memoryUsage()
  console.log(
    `[STRESS-LLM] ${label.padEnd(40)} | heapUsed: ${(m.heapUsed / 1024 / 1024).toFixed(1)}MB | rss: ${(m.rss / 1024 / 1024).toFixed(1)}MB`
  )
}

function getActiveControllers(): Map<string, AbortController> {
  return (provider as unknown as { activeControllers: Map<string, AbortController> }).activeControllers
}

function sseChunk(content: string): string {
  return `data: {"choices":[{"delta":{"content":"${content}"}}]}\n\n`
}

interface ReaderSpies {
  cancel: ReturnType<typeof vi.fn>
  releaseLock: ReturnType<typeof vi.fn>
  read: ReturnType<typeof vi.fn>
}

function createMockStreamResponse(
  chunks: string[],
  opts?: { delayMs?: number; signal?: AbortSignal }
): { response: unknown; spies: ReaderSpies } {
  const encoder = new TextEncoder()
  let index = 0
  const delayMs = opts?.delayMs ?? 0
  const signal = opts?.signal
  const cancel = vi.fn()
  const releaseLock = vi.fn()
  const read = vi.fn(() => {
    if (delayMs <= 0 && !signal) {
      if (index < chunks.length) {
        return Promise.resolve({ done: false, value: encoder.encode(chunks[index++]) })
      }
      return Promise.resolve({ done: true, value: undefined })
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (index < chunks.length) {
          resolve({ done: false, value: encoder.encode(chunks[index++]) })
        } else {
          resolve({ done: true, value: undefined })
        }
      }, delayMs)
      if (signal) {
        const onAbort = () => {
          clearTimeout(timer)
          reject(new DOMException('Aborted', 'AbortError'))
        }
        signal.addEventListener('abort', onAbort, { once: true })
      }
    })
  })
  return {
    response: { ok: true, body: { getReader: () => ({ read, cancel, releaseLock }) } },
    spies: { cancel, releaseLock, read }
  }
}

describe('LLM Streaming Stress Tests', () => {
  beforeEach(() => {
    provider = new LLMProvider()
  })

  afterEach(() => {
    provider.resetConfig()
    vi.unstubAllGlobals()
  })

  it('scenario 1: single long stream — 5000 SSE chunks parsed incrementally', async () => {
    provider.configure({ provider: 'openai', apiKey: 'sk-stress-1', model: 'gpt-4o' })

    const total = 5000
    const chunks = Array.from({ length: total }, (_, i) => sseChunk(`chunk-${i}`))
    const mock = createMockStreamResponse(chunks)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mock.response))

    const milestones = new Set([1000, 3000, 5000])
    let received = 0
    const onChunk = vi.fn(() => {
      received++
      if (milestones.has(received)) memSnapshot(`scenario1 chunk ${received}`)
    })
    const onDone = vi.fn()
    const onError = vi.fn()

    memSnapshot('scenario1 baseline')
    const start = Date.now()

    await provider.chatStream({ messages: [{ role: 'user', content: 'Hi' }] }, { onChunk, onDone, onError })

    const elapsed = Date.now() - start

    expect(onChunk).toHaveBeenCalledTimes(total)
    expect(onDone).toHaveBeenCalledTimes(1)
    expect(onError).not.toHaveBeenCalled()
    memSnapshot('scenario1 done')
    console.log(`[STRESS-LLM] scenario1 total elapsed: ${elapsed}ms`)
  })

  it('scenario 2: 10 concurrent streams via Promise.all — 1000 total chunks', async () => {
    provider.configure({ provider: 'openai', apiKey: 'sk-stress-2', model: 'gpt-4o' })

    const perStream = 100
    const chunks = Array.from({ length: perStream }, () => sseChunk('y'))
    // Each fetch call must produce an independent reader with its own chunk index
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(createMockStreamResponse(chunks).response))
    )

    memSnapshot('scenario2 baseline')
    const start = Date.now()

    const streams = Array.from({ length: 10 }, () => {
      const onChunk = vi.fn()
      const onDone = vi.fn()
      const onError = vi.fn()
      const promise = provider.chatStream({ messages: [{ role: 'user', content: 'Hi' }] }, { onChunk, onDone, onError })
      return { promise, onChunk, onDone, onError }
    })

    memSnapshot('scenario2 all-started')
    await Promise.all(streams.map(s => s.promise))
    const elapsed = Date.now() - start
    memSnapshot('scenario2 all-done')

    const totalChunks = streams.reduce((sum, s) => sum + s.onChunk.mock.calls.length, 0)
    expect(totalChunks).toBe(1000)
    for (const s of streams) {
      expect(s.onDone).toHaveBeenCalledTimes(1)
      expect(s.onError).not.toHaveBeenCalled()
    }
    console.log(`[STRESS-LLM] scenario2 total elapsed: ${elapsed}ms`)
  })

  it('scenario 3: 10 concurrent streams + cancel 5 mid-flight', async () => {
    provider.configure({ provider: 'openai', apiKey: 'sk-stress-3', model: 'gpt-4o' })

    const perStream = 200
    // 5ms/chunk → ~1000ms per stream so streams are still in-flight at the 500ms
    // cancel point (1ms/chunk would finish at 200ms, before cancellation).
    const delayMs = 5
    const chunks = Array.from({ length: perStream }, () => sseChunk('z'))
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, opts: { signal?: AbortSignal }) =>
        Promise.resolve(createMockStreamResponse(chunks, { delayMs, signal: opts.signal }).response)
      )
    )

    memSnapshot('scenario3 baseline')
    const start = Date.now()

    const streams = Array.from({ length: 10 }, (_, i) => {
      const requestId = `req-${i}`
      const onChunk = vi.fn()
      const onDone = vi.fn()
      const onError = vi.fn()
      const promise = provider.chatStream(
        { messages: [{ role: 'user', content: 'Hi' }] },
        { onChunk, onDone, onError },
        undefined,
        requestId
      )
      return { requestId, promise, onChunk, onDone, onError }
    })

    memSnapshot('scenario3 all-started')

    // Wait 500ms (real timers) then cancel the first 5 streams
    await new Promise(resolve => setTimeout(resolve, 500))
    for (let i = 0; i < 5; i++) {
      expect(provider.cancelStream(streams[i].requestId)).toBe(true)
    }

    await Promise.all(streams.map(s => s.promise))
    const elapsed = Date.now() - start
    memSnapshot('scenario3 all-settled')

    // Cancelled 5: must NOT call onDone (silent abort is acceptable — onError optional)
    for (let i = 0; i < 5; i++) {
      expect(streams[i].onDone).not.toHaveBeenCalled()
    }
    // Non-cancelled 5: must complete normally
    for (let i = 5; i < 10; i++) {
      expect(streams[i].onDone).toHaveBeenCalledTimes(1)
      expect(streams[i].onError).not.toHaveBeenCalled()
    }
    // All controllers must be cleaned up after every stream settles
    expect(getActiveControllers().size).toBe(0)
    console.log(`[STRESS-LLM] scenario3 total elapsed: ${elapsed}ms`)
  })

  it('scenario 4: 1MB buffer overflow triggers onError and reader.cancel', async () => {
    provider.configure({ provider: 'openai', apiKey: 'sk-stress-4', model: 'gpt-4o' })

    const oversized = 'x'.repeat(2 * 1024 * 1024) // 2MB > 1MB MAX_STREAM_BUFFER_SIZE
    const mock = createMockStreamResponse([oversized])
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mock.response))

    const onChunk = vi.fn()
    const onDone = vi.fn()
    const onError = vi.fn()

    memSnapshot('scenario4 baseline')
    await provider.chatStream({ messages: [{ role: 'user', content: 'Hi' }] }, { onChunk, onDone, onError })

    expect(onError).toHaveBeenCalledTimes(1)
    expect(String(onError.mock.calls[0][0])).toMatch(/overflow|exceeded/i)
    expect(mock.spies.cancel).toHaveBeenCalled()
    expect(onDone).not.toHaveBeenCalled()
    memSnapshot('scenario4 done')
  })

  it('scenario 5: stream timeout — 120s hang triggers onError and controller.abort', async () => {
    vi.useFakeTimers()
    try {
      provider.configure({ provider: 'openai', apiKey: 'sk-stress-5', model: 'gpt-4o' })

      let capturedSignal: AbortSignal | undefined
      vi.stubGlobal(
        'fetch',
        vi.fn((_url: string, opts: { signal?: AbortSignal }) => {
          capturedSignal = opts.signal
          // Never resolves unless aborted; rejects with AbortError on signal abort
          const read = vi.fn(
            () =>
              new Promise<never>((_, reject) => {
                const onAbort = () => reject(new DOMException('Aborted', 'AbortError'))
                if (opts.signal) opts.signal.addEventListener('abort', onAbort, { once: true })
              })
          )
          return Promise.resolve({
            ok: true,
            body: { getReader: () => ({ read, cancel: () => {}, releaseLock: () => {} }) }
          })
        })
      )

      const onChunk = vi.fn()
      const onDone = vi.fn()
      const onError = vi.fn()

      memSnapshot('scenario5 baseline')
      const streamPromise = provider.chatStream(
        { messages: [{ role: 'user', content: 'Hi' }] },
        { onChunk, onDone, onError }
      )

      // Advance past LLM_STREAM_TIMEOUT_MS (120_000ms) — fires the internal timeout
      await vi.advanceTimersByTimeAsync(120_000)
      await streamPromise

      expect(onError).toHaveBeenCalledTimes(1)
      expect(String(onError.mock.calls[0][0])).toMatch(/timed out|timeout/i)
      expect(onDone).not.toHaveBeenCalled()
      expect(onChunk).not.toHaveBeenCalled()
      // controller.abort() was invoked → the fetch signal is now aborted
      expect(capturedSignal?.aborted).toBe(true)
      memSnapshot('scenario5 done')
    } finally {
      vi.useRealTimers()
    }
  })
})
