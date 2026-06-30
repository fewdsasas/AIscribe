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

// Mock ExportEngine
vi.mock('../../../src/main/export', () => ({
  ExportEngine: class {
    constructor(_db: IDatabase) {}
    async exportProject(options: any) {
      const isLarge = options.includeSynopsis === false
      return {
        content: isLarge ? '中'.repeat(500_000) : `# Export\n\n${options.projectId}`,
        filename: `export-${options.projectId}.md`
      }
    }
  }
}))

import { registerDbHandlers } from '../../../src/main/ipc/db.ipc'
import { registerExportHandlers } from '../../../src/main/ipc/export.ipc'

describe('DB and Export IPC Handlers', () => {
  const testDir = path.join(__dirname, '../../temp')
  const testDbPath = path.join(testDir, `db-export-test-${testId()}.db`)
  let db: Database
  let registry: ReturnType<typeof createMockRegistry>

  beforeAll(async () => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true })
    }
    db = await Database.create(testDbPath)
    registry = createMockRegistry({ database: db as IDatabase })
    registerDbHandlers(mockIpcMain as any, registry)
    registerExportHandlers(mockIpcMain as any, registry)
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

  describe('db:tables', () => {
    it('should return table names', async () => {
      const handler = getRegisteredHandler('db:tables')
      const result = await handler(null)

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('export:project', () => {
    it('should export a project', async () => {
      const handler = getRegisteredHandler('export:project')
      const project = await db.createProject({ name: 'Export Test', genre: 'fantasy', status: 'planning' })

      const result = await handler(null, { projectId: project.id, format: 'markdown' })
      expect(result).toBeDefined()
      expect(result.chunked).toBe(false)
      expect(result.content).toContain(project.id)
    })

    it('should reject invalid project ID', async () => {
      const handler = getRegisteredHandler('export:project')
      await expect(handler(null, { projectId: 'invalid', format: 'markdown' })).rejects.toThrow('项目ID 格式无效')
    })

    it('should chunk large export payloads', async () => {
      const exportHandler = getRegisteredHandler('export:project')
      const chunkHandler = getRegisteredHandler('export:project:chunk')
      const project = await db.createProject({ name: 'Large Export', genre: 'fantasy', status: 'planning' })

      const first = await exportHandler(null, { projectId: project.id, format: 'markdown', includeSynopsis: false })
      expect(first.chunked).toBe(true)
      expect(first.totalChunks).toBeGreaterThan(1)

      const chunks: string[] = []
      for (let i = 0; i < first.totalChunks; i++) {
        const part = await chunkHandler(null, { chunkId: first.chunkId, index: i })
        chunks[part.index] = part.data
      }
      expect(chunks.join('')).toBe('中'.repeat(500_000))
    })

    it('should reject expired chunk session', async () => {
      const exportHandler = getRegisteredHandler('export:project')
      const chunkHandler = getRegisteredHandler('export:project:chunk')
      const project = await db.createProject({ name: 'Chunk TTL', genre: 'fantasy', status: 'planning' })

      const first = await exportHandler(null, { projectId: project.id, format: 'markdown', includeSynopsis: false })
      await expect(chunkHandler(null, { chunkId: '550e8400-e29b-41d4-a716-446655440000', index: 0 })).rejects.toThrow(
        '分块会话不存在或已过期'
      )
      await expect(chunkHandler(null, { chunkId: first.chunkId, index: first.totalChunks })).rejects.toThrow(
        '分块索引越界'
      )
    })
  })
})
