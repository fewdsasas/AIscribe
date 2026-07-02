import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import path from 'path'
import fs from 'fs'
import { Database } from '../../src/main/memory/database'
import { testId } from '../setup'
import { logger } from '../../src/main/utils/logger'
import { createMockRegistry } from '../main/helpers/mock-registry'
import type { IDatabase } from '../../src/main/di'

// ===== Mock Electron =====
const mockHandlers = new Map<string, Function>()
const mockIpcMain = {
  handle: (channel: string, handler: Function) => {
    mockHandlers.set(channel, handler)
  }
}

function getRegisteredHandler(channel: string): Function {
  const handler = mockHandlers.get(channel)
  if (!handler) throw new Error(`handler ${channel} not registered`)
  return handler
}

vi.mock('electron', () => ({
  app: {
    getPath: () => path.join(__dirname, '../temp'),
    on: () => {}
  }
}))

import { registerProjectHandlers } from '../../src/main/ipc/project.ipc'
import { registerNovelHandlers } from '../../src/main/ipc/novel.ipc'
import { registerCheckpointHandlers } from '../../src/main/ipc/checkpoint.ipc'

// ===== Memory snapshot helper =====

function memSnapshot(label: string): number {
  const m = process.memoryUsage()
  const heap = m.heapUsed / 1024 / 1024
  console.log(
    `[STRESS-IPC] ${label.padEnd(40)} | heapUsed: ${heap.toFixed(1)}MB | rss: ${(m.rss / 1024 / 1024).toFixed(1)}MB`
  )
  return heap
}

function gcIfAvailable(): void {
  if (global.gc) global.gc()
}

// ===== Shared fixtures =====

describe('IPC Stress Tests', () => {
  const testDir = path.join(__dirname, '../temp')
  const testDbPath = path.join(testDir, `stress-ipc-${testId()}.db`)
  let db: Database
  let registry: ReturnType<typeof createMockRegistry>

  beforeAll(async () => {
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true })
    db = await Database.create(testDbPath)
    registry = createMockRegistry({ database: db as IDatabase })
    registerProjectHandlers(mockIpcMain as any, registry)
    registerNovelHandlers(mockIpcMain as any, registry)
    registerCheckpointHandlers(mockIpcMain as any, registry)
  })

  afterAll(() => {
    try {
      vi.restoreAllMocks()
    } catch {
      /* ignore */
    }
    try {
      if (db) db.close()
    } catch {
      /* ignore */
    }
    try {
      if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath)
    } catch {
      /* ignore */
    }
    try {
      if (fs.existsSync(testDbPath + '.log')) fs.unlinkSync(testDbPath + '.log')
    } catch {
      /* ignore */
    }
    try {
      if (fs.existsSync(testDbPath + '.tmp')) fs.unlinkSync(testDbPath + '.tmp')
    } catch {
      /* ignore */
    }
  })

  // ============================================================
  // Scenario 1: IPC 并发 — 50 个 chapter:create 同时调用
  // ============================================================
  it('scenario 1: 50 concurrent chapter:create calls all succeed', async () => {
    gcIfAvailable()
    memSnapshot('scenario1 baseline')

    const projectHandler = getRegisteredHandler('project:create')
    const novelHandler = getRegisteredHandler('novel:create')
    const chapterHandler = getRegisteredHandler('chapter:create')
    const listHandler = getRegisteredHandler('chapter:list')

    const project = await projectHandler(null, { name: 'S1 项目', description: '', genre: 'fantasy' })
    const novel = await novelHandler(null, { projectId: project.id, title: 'S1 小说' })

    const t0 = Date.now()
    const results = await Promise.all(
      Array.from({ length: 50 }, (_, i) =>
        chapterHandler(null, {
          novelId: novel.id,
          title: `第${i + 1}章-并发`,
          content: `内容-${i}`
        })
      )
    )
    const elapsed = Date.now() - t0

    // All 50 must resolve to chapter objects with ids
    expect(results.length).toBe(50)
    for (const ch of results) {
      expect(ch).toBeDefined()
      expect(ch.id).toBeDefined()
      expect(ch.novelId).toBe(novel.id)
    }

    // listChapters should reflect all 50
    const list = await listHandler(null, { novelId: novel.id })
    expect(Array.isArray(list)).toBe(true)
    expect(list.length).toBe(50)

    memSnapshot('scenario1 after 50 creates')
    console.log(`[STRESS-IPC] scenario 1 elapsed: ${elapsed}ms`)
  })

  // ============================================================
  // Scenario 2: 大 payload 告警 — chapter content > 1MB
  // ============================================================
  it('scenario 2: 2MB chapter content triggers logger.warn but handler still runs', async () => {
    gcIfAvailable()
    memSnapshot('scenario2 baseline')

    const novelHandler = getRegisteredHandler('novel:create')
    const chapterHandler = getRegisteredHandler('chapter:create')
    const novel = await novelHandler(null, {
      projectId: '00000000-0000-0000-0000-000000000001',
      title: 'S2 大 payload 小说'
    })

    const bigContent = 'x'.repeat(2 * 1024 * 1024) // 2MB

    const warnSpy = vi.spyOn(logger, 'warn')
    try {
      const result = await chapterHandler(null, {
        novelId: novel.id,
        title: 'S2 大章节',
        content: bigContent
      })

      // wrap() checks JSON.stringify(args).length > 1_000_000 → must warn
      expect(warnSpy).toHaveBeenCalled()
      const largePayloadCalled = warnSpy.mock.calls.some(
        args => typeof args[0] === 'string' && args[0].includes('Large payload')
      )
      expect(largePayloadCalled).toBe(true)

      // warn must not block execution
      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.title).toBe('S2 大章节')
    } finally {
      warnSpy.mockRestore()
    }

    memSnapshot('scenario2 after 2MB create')
  })

  // ============================================================
  // Scenario 3: checkpoint 快照内存峰值
  // ============================================================
  it('scenario 3: 100 checkpoint snapshots keep memory growth under 100MB', { timeout: 30000 }, async () => {
    gcIfAvailable()
    const projectHandler = getRegisteredHandler('project:create')
    const novelHandler = getRegisteredHandler('novel:create')
    const chapterHandler = getRegisteredHandler('chapter:create')
    const checkpointHandler = getRegisteredHandler('checkpoint:create')

    const project = await projectHandler(null, { name: 'S3 快照项目', description: '', genre: 'sci_fi' })
    const novel = await novelHandler(null, { projectId: project.id, title: 'S3 快照小说' })

    // 10 chapters, each 50KB content
    const chapterContent = 'c'.repeat(50 * 1024)
    for (let i = 0; i < 10; i++) {
      await chapterHandler(null, {
        novelId: novel.id,
        title: `S3 第${i + 1}章`,
        content: chapterContent
      })
    }

    // Build a full novel+chapters snapshot once (simulates real snapshot payload)
    const novelRow = db.getNovel(novel.id)
    const chaptersWithContent = db.listChaptersWithContent(novel.id)
    const snapshot = {
      novel: JSON.stringify(novelRow),
      characters: '[]',
      worlds: '[]',
      plots: '[]',
      outline: JSON.stringify(chaptersWithContent)
    }

    gcIfAvailable()
    const baseline = memSnapshot('scenario3 baseline (after setup)')

    const samples: Array<{ at: number; heap: number }> = []
    for (let i = 1; i <= 100; i++) {
      await checkpointHandler(null, {
        projectId: project.id,
        label: `v${i}`,
        description: `第 ${i} 个快照`,
        snapshot,
        tags: ['stress']
      })
      if (i === 25 || i === 50 || i === 75 || i === 100) {
        gcIfAvailable()
        const heap = memSnapshot(`scenario3 after ${i} checkpoints`)
        samples.push({ at: i, heap })
      }
    }

    // Flush any debounced disk save so state is durable
    try {
      db.save()
    } catch {
      /* ignore */
    }

    const checkpoints = db.listCheckpoints(project.id)
    expect(checkpoints.length).toBe(100)

    const peak = samples.reduce((max, s) => (s.heap > max ? s.heap : max), baseline)
    const growth = peak - baseline
    console.log(`[STRESS-IPC] scenario 3 peak growth: ${growth.toFixed(1)}MB`)
    expect(growth).toBeLessThan(100)

    // Cleanup pass
    gcIfAvailable()
    memSnapshot('scenario3 after cleanup')
  })

  // ============================================================
  // Scenario 4: 混合读写并发 — 模拟真实用户
  // ============================================================
  it('scenario 4: mixed read/write concurrency completes with no dirty reads', async () => {
    gcIfAvailable()
    memSnapshot('scenario4 baseline')

    const projectHandler = getRegisteredHandler('project:create')
    const novelHandler = getRegisteredHandler('novel:create')
    const chapterHandler = getRegisteredHandler('chapter:create')
    const listHandler = getRegisteredHandler('chapter:list')
    const getHandler = getRegisteredHandler('chapter:get')
    const updateHandler = getRegisteredHandler('chapter:update')
    const countsHandler = getRegisteredHandler('chapter:counts')

    const project = await projectHandler(null, { name: 'S4 混合并发项目', description: '', genre: 'fantasy' })
    const novel = await novelHandler(null, { projectId: project.id, title: 'S4 混合并发小说' })

    // 50 chapters
    const chapterIds: string[] = []
    for (let i = 0; i < 50; i++) {
      const ch = await chapterHandler(null, {
        novelId: novel.id,
        title: `S4 第${i + 1}章`,
        content: `内容-${i}`
      })
      chapterIds.push(ch.id)
    }

    const t0 = Date.now()
    const tasks: Promise<unknown>[] = []

    // 10 listChapters (summary)
    for (let i = 0; i < 10; i++) {
      tasks.push(listHandler(null, { novelId: novel.id }))
    }
    // 10 getChapter (full)
    for (let i = 0; i < 10; i++) {
      tasks.push(getHandler(null, { id: chapterIds[i] }))
    }
    // 10 updateChapter
    for (let i = 0; i < 10; i++) {
      tasks.push(updateHandler(null, { id: chapterIds[10 + i], updates: { title: `S4 已更新-${i}` } }))
    }
    // 10 createChapter
    for (let i = 0; i < 10; i++) {
      tasks.push(chapterHandler(null, { novelId: novel.id, title: `S4 新增-${i}`, content: '' }))
    }
    // 10 chapterCounts
    for (let i = 0; i < 10; i++) {
      tasks.push(countsHandler(null, { novelIds: [novel.id] }))
    }

    const results = await Promise.all(tasks)
    const elapsed = Date.now() - t0

    // All 50 ops must resolve without rejection
    expect(results.length).toBe(50)

    // listChapters results (first 10): each must be a valid array snapshot
    const lists = results.slice(0, 10) as unknown[][]
    for (const l of lists) {
      expect(Array.isArray(l)).toBe(true)
      // Each snapshot is internally consistent — chapter ids are strings
      for (const ch of l) {
        expect(typeof (ch as { id: string }).id).toBe('string')
      }
    }

    // getChapter results (next 10): full chapter objects
    const gets = results.slice(10, 20) as { id: string; content: string }[]
    for (let i = 0; i < 10; i++) {
      expect(gets[i]).toBeDefined()
      expect(gets[i].id).toBe(chapterIds[i])
      expect(gets[i].content).toContain(`内容-${i}`)
    }

    // updateChapter results (next 10): OperationResult
    const updates = results.slice(20, 30) as { success: boolean }[]
    for (const u of updates) expect(u.success).toBe(true)

    // createChapter results (next 10): new chapter objects
    const creates = results.slice(30, 40) as { id: string }[]
    for (const c of creates) expect(c.id).toBeDefined()

    // chapterCounts results (last 10): object keyed by novelId, count >= 50
    const counts = results.slice(40, 50) as Record<string, number>[]
    for (const c of counts) {
      expect(c[novel.id]).toBeGreaterThanOrEqual(50)
    }

    // Final consistent state: 50 initial + 10 new = 60, no dirty reads
    const finalList = await listHandler(null, { novelId: novel.id })
    expect(finalList.length).toBe(60)

    // The 10 updated chapters must reflect their new titles
    for (let i = 0; i < 10; i++) {
      const updated = await getHandler(null, { id: chapterIds[10 + i] })
      expect(updated.title).toBe(`S4 已更新-${i}`)
    }

    memSnapshot('scenario4 after mixed concurrency')
    console.log(`[STRESS-IPC] scenario 4 elapsed: ${elapsed}ms`)
  })

  // ============================================================
  // Scenario 5: Registry 异步解析单例竞态
  // ============================================================
  describe('scenario 5: registry async resolve race', () => {
    it('concurrent resolveAsync() calls share the same database instance', async () => {
      const { ServiceRegistry, DATABASE_TOKEN } = await import('../../src/main/di')
      const testRegistry = new ServiceRegistry()
      let createCallCount = 0
      const fakeInstance = { _fakeDb: true, close: vi.fn(), save: vi.fn() }

      testRegistry.register(DATABASE_TOKEN, () => {
        createCallCount++
        return fakeInstance
      })

      gcIfAvailable()
      memSnapshot('scenario5 baseline')
      const t0 = Date.now()

      // 10 concurrent async resolves must all return the same cached instance.
      const results = await Promise.all(Array.from({ length: 10 }, () => testRegistry.resolveAsync(DATABASE_TOKEN)))

      const elapsed = Date.now() - t0
      memSnapshot('scenario5 after 10 concurrent resolveAsync')
      console.log(`[STRESS-IPC] scenario 5 elapsed: ${elapsed}ms`)

      // Lazy resolution should only invoke the factory once.
      expect(createCallCount).toBe(1)

      // Every caller must receive the SAME instance (no duplicate init)
      expect(results.length).toBe(10)
      for (const r of results) {
        expect(r).toBe(fakeInstance)
      }
    })
  })
})
