import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import path from 'path'
import fs from 'fs'

vi.mock('electron', () => ({
  app: {
    getPath: () => path.join(__dirname, '../../temp'),
    on: () => {}
  }
}))

import { Database } from '../../../src/main/memory/database'
import { testId } from '../../setup'
import { createMockRegistry } from '../helpers/mock-registry'
import type { IDatabase } from '../../../src/main/di'

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

import { registerNovelHandlers } from '../../../src/main/ipc/novel.ipc'

describe('Novel IPC Handlers', () => {
  const testDir = path.join(__dirname, '../../temp')
  const testDbPath = path.join(testDir, `novel-test-${testId()}.db`)
  let db: Database
  let registry: ReturnType<typeof createMockRegistry>

  beforeAll(async () => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true })
    }
    db = await Database.create(testDbPath)
    registry = createMockRegistry({ database: db as IDatabase })
    registerNovelHandlers(mockIpcMain as any, registry)
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

  describe('chapter:list-paginated', () => {
    it('should return paginated chapter summaries', async () => {
      const handler = getRegisteredHandler('chapter:list-paginated')
      const project = await db.createProject({ name: 'Page Project', genre: 'fantasy', status: 'planning' })
      const novel = await db.createNovel({
        projectId: project.id,
        title: 'Page Novel',
        author: 'Test',
        synopsis: '',
        genre: 'fantasy',
        tags: [],
        targetAudience: ''
      })
      for (let i = 0; i < 5; i++) {
        db.createChapter({ novelId: novel.id, title: `Ch ${i + 1}`, sortOrder: i, status: 'draft' })
      }

      const result = await handler(null, { novelId: novel.id, offset: 0, limit: 3 })
      expect(result.items).toHaveLength(3)
      expect(result.total).toBe(5)
      expect(result.offset).toBe(0)
      expect(result.limit).toBe(3)
      expect(result.items[0].title).toBe('Ch 1')
    })

    it('should reject negative offset', async () => {
      const handler = getRegisteredHandler('chapter:list-paginated')
      await expect(
        handler(null, { novelId: '12345678-1234-1234-1234-123456789abc', offset: -1, limit: 10 })
      ).rejects.toThrow('offset 不能为负数')
    })

    it('should reject negative limit', async () => {
      const handler = getRegisteredHandler('chapter:list-paginated')
      await expect(
        handler(null, { novelId: '12345678-1234-1234-1234-123456789abc', offset: 0, limit: -1 })
      ).rejects.toThrow('limit 不能为负数')
    })

    it('should reject invalid novel ID', async () => {
      const handler = getRegisteredHandler('chapter:list-paginated')
      await expect(handler(null, { novelId: 'invalid', offset: 0, limit: 10 })).rejects.toThrow('小说ID 格式无效')
    })
  })

  describe('chapter:count', () => {
    it('should return chapter count for novel', async () => {
      const handler = getRegisteredHandler('chapter:count')
      const project = await db.createProject({ name: 'Count Project', genre: 'fantasy', status: 'planning' })
      const novel = await db.createNovel({
        projectId: project.id,
        title: 'Count Novel',
        author: 'Test',
        synopsis: '',
        genre: 'fantasy',
        tags: [],
        targetAudience: ''
      })
      db.createChapter({ novelId: novel.id, title: 'One', sortOrder: 0, status: 'draft' })
      db.createChapter({ novelId: novel.id, title: 'Two', sortOrder: 1, status: 'draft' })

      const result = await handler(null, { novelId: novel.id })
      expect(result).toBe(2)
    })

    it('should reject invalid novel ID', async () => {
      const handler = getRegisteredHandler('chapter:count')
      await expect(handler(null, { novelId: 'invalid' })).rejects.toThrow('小说ID 格式无效')
    })
  })
})
