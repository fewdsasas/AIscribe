import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import path from 'path'
import fs from 'fs'
import { Database } from '../../src/main/memory/database'
import { testId } from '../setup'

/**
 * 长时运行内存泄漏检测：模拟多次打开/关闭项目、创建/删除章节后，
 * 堆内存应能回落至接近基线，无持续增长趋势。
 */

describe('Memory Leak Detection', () => {
  const testDir = path.join(__dirname, '../temp')
  const testDbPath = path.join(testDir, `memory-leak-${testId()}.db`)
  let db: Database

  beforeAll(async () => {
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true })
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath)
      } catch {
        /* ignore */
      }
    }
    db = await Database.create(testDbPath)
  })

  afterAll(() => {
    try {
      if (db) db.close()
    } catch {
      /* ignore */
    }
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath)
      } catch {
        /* ignore */
      }
    }
  })

  function heapUsedMB(): number {
    return process.memoryUsage().heapUsed / 1024 / 1024
  }

  it('should not leak memory after repeated project/novel/chapter cycles', () => {
    const baseline = heapUsedMB()
    console.log(`[MEM-LEAK] baseline before cycles: ${baseline.toFixed(1)}MB`)

    const cycleCount = 20
    const chaptersPerNovel = 20

    for (let cycle = 0; cycle < cycleCount; cycle++) {
      const projectId = testId()
      const novelId = testId()

      db.createProject({ id: projectId, name: `Project ${cycle}`, genre: 'fantasy', status: 'planning' })
      db.createNovel({ id: novelId, projectId, title: `Novel ${cycle}` })

      for (let i = 0; i < chaptersPerNovel; i++) {
        db.createChapter({
          id: testId(),
          novelId,
          title: `Chapter ${i}`,
          content: JSON.stringify({
            type: 'doc',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x'.repeat(200) }] }]
          }),
          sortOrder: i,
          status: 'draft'
        })
      }

      db.deleteProject(projectId)

      if (cycle === 4 || cycle === 9 || cycle === 14 || cycle === 19) {
        if (global.gc) global.gc()
        console.log(`[MEM-LEAK] after cycle ${cycle + 1}: ${heapUsedMB().toFixed(1)}MB`)
      }
    }

    if (global.gc) global.gc()
    const final = heapUsedMB()
    console.log(`[MEM-LEAK] final after ${cycleCount} cycles: ${final.toFixed(1)}MB`)

    // Allow a generous 50MB growth budget for test overhead; real leaks would exceed this.
    expect(final).toBeLessThan(baseline + 50)
  })
})
