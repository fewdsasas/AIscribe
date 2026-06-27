import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import path from 'path'
import fs from 'fs'
import { LRUCache } from '../../src/main/memory/lru-cache'
import { OperationLog } from '../../src/main/memory/operation-log'
import { LLMProvider } from '../../src/main/engine/llm-provider'
import { Database } from '../../src/main/memory/database'
import { testId } from '../setup'

let provider: LLMProvider

vi.mock('electron', () => ({
  app: { getPath: () => '/mock/userData' }
}))

describe('Memory Stress Tests', () => {
  describe('LRUCache', () => {
    it('should cap size at max when writing 200 entries', () => {
      const cache = new LRUCache<string, number>(100, 60_000)
      for (let i = 0; i < 200; i++) {
        cache.set(`key-${i}`, i)
      }
      expect(cache.size).toBe(100)
    })

    it('should evict oldest entries first (LRU order)', () => {
      const cache = new LRUCache<string, number>(100, 60_000)
      for (let i = 0; i < 200; i++) {
        cache.set(`key-${i}`, i)
      }
      // keys 0..99 evicted, keys 100..199 retained
      expect(cache.get('key-0')).toBeUndefined()
      expect(cache.get('key-99')).toBeUndefined()
      expect(cache.get('key-100')).toBe(100)
      expect(cache.get('key-199')).toBe(199)
    })

    it('should promote entries to recency-end on get (access-order eviction)', () => {
      const cache = new LRUCache<string, number>(3, 60_000)
      cache.set('a', 1)
      cache.set('b', 2)
      cache.set('c', 3)
      // Touch 'a' so it becomes most-recently-used
      expect(cache.get('a')).toBe(1)
      // Insert 'd' — least-recently-used is now 'b', not 'a'
      cache.set('d', 4)
      expect(cache.get('a')).toBe(1)
      expect(cache.get('b')).toBeUndefined()
      expect(cache.get('c')).toBe(3)
      expect(cache.get('d')).toBe(4)
      expect(cache.size).toBe(3)
    })

    it('should expire entries after TTL', async () => {
      const cache = new LRUCache<string, number>(100, 100) // 100ms TTL
      cache.set('temp', 42)
      expect(cache.get('temp')).toBe(42)
      await new Promise(resolve => setTimeout(resolve, 150))
      expect(cache.get('temp')).toBeUndefined()
    })

    it('should delete and clear entries', () => {
      const cache = new LRUCache<string, number>(100, 60_000)
      cache.set('a', 1)
      cache.set('b', 2)
      expect(cache.size).toBe(2)

      cache.delete('a')
      expect(cache.size).toBe(1)
      expect(cache.get('a')).toBeUndefined()
      expect(cache.get('b')).toBe(2)

      cache.clear()
      expect(cache.size).toBe(0)
      expect(cache.get('b')).toBeUndefined()
    })
  })

  describe('OperationLog pending limit', () => {
    const testDir = path.join(__dirname, '../temp')
    const logPath = path.join(testDir, `oplog-${testId()}.db`)
    let opLog: OperationLog

    beforeEach(() => {
      if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true })
      opLog = new OperationLog(logPath)
    })

    afterEach(() => {
      try {
        opLog.stopAutoFlush()
      } catch {
        /* ignore */
      }
      try {
        opLog.clear()
      } catch {
        /* ignore */
      }
    })

    it('should not let pending exceed MAX_PENDING (1000) when appending 1500 ops', () => {
      const flushSpy = vi.spyOn(opLog, 'flush')
      const pendingAccess = opLog as unknown as { pending: string[] }

      for (let i = 0; i < 1500; i++) {
        opLog.append('INSERT INTO t (v) VALUES (?)', [i])
        expect(pendingAccess.pending.length).toBeLessThanOrEqual(1000)
      }

      // Hitting the cap at least once must have triggered a synchronous flush
      expect(flushSpy.mock.calls.length).toBeGreaterThan(0)
    })

    it('should clear pending after explicit flush', () => {
      const pendingAccess = opLog as unknown as { pending: string[] }

      opLog.append('INSERT INTO t (v) VALUES (?)', [9999])
      expect(pendingAccess.pending.length).toBeGreaterThan(0)

      opLog.flush()
      expect(pendingAccess.pending.length).toBe(0)
    })
  })

  describe('LLM SSE parsing memory stability', () => {
    beforeEach(() => {
      provider = new LLMProvider()
    })

    afterEach(() => {
      provider.resetConfig()
      vi.unstubAllGlobals()
    })

    it('should call onChunk exactly 1000 times for 1000 SSE chunks without errors', async () => {
      provider.configure({
        provider: 'openai',
        apiKey: 'sk-stress',
        model: 'gpt-4o'
      })

      const chunkCount = 1000
      const sseLine = 'data: {"choices":[{"delta":{"content":"x"}}]}\n\n'
      const encoder = new TextEncoder()
      let index = 0
      const chunks: string[] = Array.from({ length: chunkCount }, () => sseLine)

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          body: {
            getReader: () => ({
              read: async () => {
                if (index < chunks.length) {
                  return { done: false, value: encoder.encode(chunks[index++]) }
                }
                return { done: true, value: undefined }
              },
              cancel: () => {},
              releaseLock: () => {}
            })
          }
        })
      )

      const onChunk = vi.fn()
      const onDone = vi.fn()
      const onError = vi.fn()

      await provider.chatStream({ messages: [{ role: 'user', content: 'Hi' }] }, { onChunk, onDone, onError })

      expect(onChunk).toHaveBeenCalledTimes(chunkCount)
      expect(onDone).toHaveBeenCalledTimes(1)
      expect(onError).not.toHaveBeenCalled()
      // Every parsed chunk must carry the delta content "x"
      for (let i = 0; i < chunkCount; i++) {
        expect(onChunk.mock.calls[i][0]).toBe('x')
      }
    })
  })

  describe('DB high-frequency writes', () => {
    const testDir = path.join(__dirname, '../temp')
    const dbPath = path.join(testDir, `stress-${testId()}.db`)
    let db: Database

    beforeAll(async () => {
      if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true })
      db = await Database.create(dbPath)
    })

    afterAll(() => {
      try {
        if (db) db.close()
      } catch {
        /* ignore */
      }
      try {
        if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
      } catch {
        /* ignore */
      }
      try {
        if (fs.existsSync(dbPath + '.log')) fs.unlinkSync(dbPath + '.log')
      } catch {
        /* ignore */
      }
      try {
        if (fs.existsSync(dbPath + '.tmp')) fs.unlinkSync(dbPath + '.tmp')
      } catch {
        /* ignore */
      }
    })

    it('should handle 100 chapter create + update with debounced save', () => {
      vi.useFakeTimers()
      try {
        const saveSpy = vi.spyOn(db, 'save')

        const projectId = `p-${testId()}`
        const novelId = `n-${testId()}`
        db.createProject({
          id: projectId,
          name: '压测项目',
          description: '',
          genre: 'fantasy',
          status: 'writing',
          wordCount: 0
        })
        db.createNovel({
          id: novelId,
          projectId,
          title: '压测小说',
          author: '',
          synopsis: '',
          genre: 'fantasy',
          tags: [],
          targetAudience: ''
        })

        // Isolate chapter-write saves: clear history after setup timers are scheduled
        saveSpy.mockClear()

        const chapterIds: string[] = []
        for (let i = 0; i < 100; i++) {
          const id = `ch-${i}-${testId()}`
          chapterIds.push(id)
          db.createChapter({
            id,
            novelId,
            title: `第${i + 1}章`,
            content: `内容-${i}`,
            sortOrder: i + 1,
            wordCount: 10,
            status: 'draft'
          })
        }

        // Debounced: save must NOT fire mid-burst
        expect(saveSpy).not.toHaveBeenCalled()

        for (let i = 0; i < 100; i++) {
          db.updateChapter(chapterIds[i], {
            content: `更新内容-${i}`,
            wordCount: 20
          })
        }

        // Still debounced
        expect(saveSpy).not.toHaveBeenCalled()

        // Advance past the 300ms debounce window — all writes collapse into one save
        vi.advanceTimersByTime(300)
        expect(saveSpy).toHaveBeenCalledTimes(1)

        // Verify DB state: 100 chapters, each updated
        const chapters = db.listChapters(novelId)
        expect(chapters.length).toBe(100)

        const first = db.getChapter(chapterIds[0])
        expect(first).toBeDefined()
        if (!first) throw new Error('chapter 0 missing')
        expect(first.wordCount).toBe(20)
        expect(first.content).toContain('更新内容-0')

        const last = db.getChapter(chapterIds[99])
        expect(last).toBeDefined()
        if (!last) throw new Error('chapter 99 missing')
        expect(last.wordCount).toBe(20)
        expect(last.content).toContain('更新内容-99')

        const mid = db.getChapter(chapterIds[50])
        expect(mid).toBeDefined()
        if (!mid) throw new Error('chapter 50 missing')
        expect(mid.wordCount).toBe(20)
        expect(mid.content).toContain('更新内容-50')
      } finally {
        vi.useRealTimers()
      }
    })
  })
})
