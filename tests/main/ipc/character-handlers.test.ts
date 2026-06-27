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

import { registerCharacterHandlers } from '../../../src/main/ipc/character.ipc'

describe('Character IPC Handlers', () => {
  const testDir = path.join(__dirname, '../../temp')
  const testDbPath = path.join(testDir, `character-test-${testId()}.db`)
  let db: Database
  let registry: ReturnType<typeof createMockRegistry>

  beforeAll(async () => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true })
    }
    db = await Database.create(testDbPath)
    registry = createMockRegistry({ database: db as IDatabase })
    registerCharacterHandlers(mockIpcMain as any, registry)
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

  describe('character:create', () => {
    it('should create a character', async () => {
      const handler = getRegisteredHandler('character:create')
      const project = await db.createProject({ name: 'Char Test', genre: 'fantasy', status: 'planning' })
      const novel = await db.createNovel({
        projectId: project.id,
        title: 'Char Novel',
        author: 'Test',
        synopsis: '',
        genre: 'fantasy',
        tags: [],
        targetAudience: ''
      })

      const result = await handler(null, { novelId: novel.id, name: 'Hero' })
      expect(result).toBeDefined()
      expect(result.name).toBe('Hero')
      expect(result.novelId).toBe(novel.id)
    })

    it('should reject empty character name', async () => {
      const handler = getRegisteredHandler('character:create')
      await expect(handler(null, { novelId: testId(), name: '' })).rejects.toThrow('角色名称 不能为空')
    })
  })

  describe('character:list', () => {
    it('should list characters for a novel', async () => {
      const handler = getRegisteredHandler('character:list')
      const project = await db.createProject({ name: 'List Char', genre: 'fantasy', status: 'planning' })
      const novel = await db.createNovel({
        projectId: project.id,
        title: 'List Novel',
        author: 'Test',
        synopsis: '',
        genre: 'fantasy',
        tags: [],
        targetAudience: ''
      })

      await db.createCharacter({ novelId: novel.id, name: 'Villain' })

      const result = await handler(null, novel.id)
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
    })

    it('should reject invalid novel ID', async () => {
      const handler = getRegisteredHandler('character:list')
      await expect(handler(null, 'invalid')).rejects.toThrow('小说ID 格式无效')
    })
  })
})
