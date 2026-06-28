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

import { registerWorldHandlers } from '../../../src/main/ipc/world.ipc'

describe('World IPC Handlers', () => {
  const testDir = path.join(__dirname, '../../temp')
  const testDbPath = path.join(testDir, `world-test-${testId()}.db`)
  let db: Database
  let registry: ReturnType<typeof createMockRegistry>

  beforeAll(async () => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true })
    }
    db = await Database.create(testDbPath)
    registry = createMockRegistry({ database: db as IDatabase })
    registerWorldHandlers(mockIpcMain as any, registry)
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

  describe('world:save', () => {
    it('should reject invalid world type', async () => {
      const handler = getRegisteredHandler('world:save')
      const project = await db.createProject({ name: 'World Test', genre: 'fantasy', status: 'planning' })
      const novel = await db.createNovel({
        projectId: project.id,
        title: 'World Novel',
        author: 'Test',
        synopsis: '',
        genre: 'fantasy',
        tags: [],
        targetAudience: ''
      })

      await expect(handler(null, { novelId: novel.id, name: 'Earth', type: 'unknown' })).rejects.toThrow(
        '世界观类型 必须是以下值之一'
      )
    })

    it('should reject missing novel ID', async () => {
      const handler = getRegisteredHandler('world:save')
      await expect(handler(null, { name: 'Earth', type: 'fantasy' })).rejects.toThrow('小说ID 不能为空')
    })
  })

  describe('outline:save', () => {
    it('should reject invalid outline type', async () => {
      const handler = getRegisteredHandler('outline:save')
      const project = await db.createProject({ name: 'Outline Test', genre: 'fantasy', status: 'planning' })
      const novel = await db.createNovel({
        projectId: project.id,
        title: 'Outline Novel',
        author: 'Test',
        synopsis: '',
        genre: 'fantasy',
        tags: [],
        targetAudience: ''
      })

      await expect(handler(null, { novelId: novel.id, type: 'verbose', content: '' })).rejects.toThrow(
        '大纲类型 必须是以下值之一'
      )
    })

    it('should reject missing novel ID', async () => {
      const handler = getRegisteredHandler('outline:save')
      await expect(handler(null, { type: 'brief', content: '' })).rejects.toThrow('小说ID 不能为空')
    })
  })

  describe('plot-structure:save', () => {
    it('should reject invalid framework', async () => {
      const handler = getRegisteredHandler('plot-structure:save')
      const project = await db.createProject({ name: 'Plot Test', genre: 'fantasy', status: 'planning' })
      const novel = await db.createNovel({
        projectId: project.id,
        title: 'Plot Novel',
        author: 'Test',
        synopsis: '',
        genre: 'fantasy',
        tags: [],
        targetAudience: ''
      })

      await expect(
        handler(null, {
          novelId: novel.id,
          framework: 'unknown',
          beats: []
        })
      ).rejects.toThrow('情节框架 必须是以下值之一')
    })

    it('should reject missing novel ID', async () => {
      const handler = getRegisteredHandler('plot-structure:save')
      await expect(handler(null, { framework: 'three_act', beats: [] })).rejects.toThrow('小说ID 不能为空')
    })
  })
})
