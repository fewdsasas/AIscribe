import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import path from 'path'
import fs from 'fs'
import { LRUCache } from '../../src/main/memory/lru-cache'
import { Database } from '../../src/main/memory/database'
import { testId } from '../setup'

vi.mock('electron', () => ({
  app: { getPath: () => '/mock/userData' }
}))

function memSnapshot(label: string): void {
  const m = process.memoryUsage()
  console.log(
    `[STRESS-DB] ${label.padEnd(40)} | heapUsed: ${(m.heapUsed / 1024 / 1024).toFixed(1)}MB | rss: ${(m.rss / 1024 / 1024).toFixed(1)}MB`
  )
}

describe('Database High-Concurrency Stress Tests', () => {
  describe('Scenario 1: DB write storm — 1000 create+update with debounced save', () => {
    const testDir = path.join(__dirname, '../temp')
    const dbPath = path.join(testDir, `stress-db-s1-${testId()}.db`)
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

    it('should collapse 1000 writes into a single debounced save', () => {
      memSnapshot('baseline')
      vi.useFakeTimers()
      try {
        const saveSpy = vi.spyOn(db, 'save')

        const projectId = `p-s1-${testId()}`
        const novelId = `n-s1-${testId()}`
        db.createProject({
          id: projectId,
          name: '压测项目-S1',
          description: '',
          genre: 'fantasy',
          status: 'writing',
          wordCount: 0
        })
        db.createNovel({
          id: novelId,
          projectId,
          title: '压测小说-S1',
          author: '',
          synopsis: '',
          genre: 'fantasy',
          tags: [],
          targetAudience: ''
        })

        // Clear save calls triggered by project/novel setup timers
        saveSpy.mockClear()

        const chapterIds: string[] = []
        for (let i = 0; i < 1000; i++) {
          if (i < 500) {
            const id = `ch-s1-${i}-${testId()}`
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
          } else {
            db.updateChapter(chapterIds[i - 500], {
              content: `更新内容-${i}`,
              wordCount: 20
            })
          }
          if (i === 499) memSnapshot('after 500 creates')
        }

        // Debounced: save must NOT fire mid-burst
        expect(saveSpy).not.toHaveBeenCalled()
        memSnapshot('after 1000 writes')

        // Advance past the 300ms debounce window — all writes collapse into one save
        vi.advanceTimersByTime(300)
        expect(saveSpy).toHaveBeenCalledTimes(1)
        memSnapshot('after save')

        // Verify data integrity: 500 chapters, each updated
        expect(db.listChapters(novelId).length).toBe(500)

        const first = db.getChapter(chapterIds[0])
        expect(first).toBeDefined()
        if (!first) throw new Error('chapter 0 missing')
        expect(first.wordCount).toBe(20)
        expect(first.content).toContain('更新内容-500')

        const last = db.getChapter(chapterIds[499])
        expect(last).toBeDefined()
        if (!last) throw new Error('chapter 499 missing')
        expect(last.wordCount).toBe(20)
        expect(last.content).toContain('更新内容-999')
      } finally {
        vi.useRealTimers()
      }
      memSnapshot('cleanup')
    })
  })

  describe('Scenario 2: OperationLog pending cap — 5000 trajectory records', () => {
    const testDir = path.join(__dirname, '../temp')
    const dbPath = path.join(testDir, `stress-db-s2-${testId()}.db`)
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

    it('should keep pending <= 1000 and trigger synchronous flush on cap', { timeout: 15_000 }, () => {
      memSnapshot('baseline')

      // Access operationLog via type assertion (private field on Database)
      const internal = db as unknown as {
        operationLog: {
          flush: () => void
          pending: string[]
        }
      }
      const opLog = internal.operationLog

      // Trigger trajectory repository initialization (injects operationLog)
      const repo = db.trajectories

      // Spy on flush to detect synchronous cap-triggered flushes
      const flushSpy = vi.spyOn(opLog, 'flush')

      const projectId = `p-s2-${testId()}`
      const sessionId = `s-s2-${testId()}`
      const skillId = 'stress-skill'

      for (let i = 0; i < 5000; i++) {
        repo.record({
          projectId,
          sessionId,
          skillId,
          query: `query-${i}`,
          response: `response-${i}`,
          duration: 100,
          context: { index: i }
        })
        // Every record must leave pending within the cap
        expect(opLog.pending.length).toBeLessThanOrEqual(1000)
        if (i === 2499) memSnapshot('after 2500 records')
      }

      // Hitting the cap at least once must have triggered a synchronous flush
      expect(flushSpy.mock.calls.length).toBeGreaterThan(0)
      memSnapshot('after 5000 records')
      memSnapshot('peak')
    })
  })

  describe('Scenario 3: LRU cache thrashing — 5000 alternating set/get', () => {
    it('should keep cache.size <= max during alternating read/write', () => {
      memSnapshot('baseline')

      const cache = new LRUCache<string, number>(100, 60_000)

      for (let i = 0; i < 5000; i++) {
        if (i % 2 === 0) {
          cache.set(`key-${i}`, i)
        } else {
          cache.get(`key-${i - 1}`)
        }
        expect(cache.size).toBeLessThanOrEqual(100)
        if (i === 2499) memSnapshot('after 2500 ops')
      }

      memSnapshot('after 5000 ops')
      memSnapshot('peak')
    })
  })

  describe('Scenario 4: Batch chapter insert — 1000 chapters in one transaction', () => {
    const testDir = path.join(__dirname, '../temp')
    const dbPath = path.join(testDir, `stress-db-s4-${testId()}.db`)
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

    it('should insert 1000 chapters in batch under 5s', () => {
      memSnapshot('baseline')

      const projectId = `p-s4-${testId()}`
      const novelId = `n-s4-${testId()}`
      db.createProject({
        id: projectId,
        name: '压测项目-S4',
        description: '',
        genre: 'fantasy',
        status: 'writing',
        wordCount: 0
      })
      db.createNovel({
        id: novelId,
        projectId,
        title: '压测小说-S4',
        author: '',
        synopsis: '',
        genre: 'fantasy',
        tags: [],
        targetAudience: ''
      })

      const chapters = Array.from({ length: 1000 }, (_, i) => ({
        id: `ch-s4-${i}-${testId()}`,
        novelId,
        title: `批量第${i + 1}章`,
        content: `批量内容-${i}`,
        sortOrder: i + 1,
        wordCount: 10,
        status: 'draft' as const
      }))

      const start = Date.now()
      db.createChaptersBatch(chapters)
      const elapsed = Date.now() - start
      memSnapshot('after batch insert')

      expect(elapsed).toBeLessThan(5000)
      expect(db.listChapters(novelId).length).toBe(1000)
      memSnapshot('peak')
    })
  })

  describe('Scenario 5: Trajectory TTL cleanup', () => {
    const testDir = path.join(__dirname, '../temp')
    const dbPath = path.join(testDir, `stress-db-s5-${testId()}.db`)
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

    it('should delete trajectories older than the TTL window', () => {
      memSnapshot('baseline')

      // Access underlying sql.js instance to insert trajectories with old timestamps
      const internal = db as unknown as {
        sqlDb: { run: (sql: string, params?: unknown[]) => void }
      }
      const sqlDb = internal.sqlDb

      // Insert 3 trajectories with timestamps well beyond the 90-day TTL window.
      // Use space-separated format (matching SQLite datetime() output) so the
      // string comparison in cleanupOldTrajectories works correctly.
      const oldTimestamp = '2020-01-01 00:00:00'
      for (let i = 0; i < 3; i++) {
        sqlDb.run(
          `INSERT INTO trajectories (id, project_id, session_id, skill_id, query, response, duration, timestamp, context)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            `traj-s5-${i}-${testId()}`,
            `p-s5-${testId()}`,
            `s-s5-${testId()}`,
            'ttl-skill',
            `old-query-${i}`,
            `old-response-${i}`,
            50,
            oldTimestamp,
            '{}'
          ]
        )
      }
      memSnapshot('after inserting old trajectories')

      const deleted = db.cleanupOldTrajectories(90)
      expect(deleted).toBeGreaterThan(0)
      memSnapshot('after cleanup')
      memSnapshot('peak')
    })
  })
})
