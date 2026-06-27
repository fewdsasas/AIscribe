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
      return { success: true, path: `/tmp/export-${options.projectId}.md` }
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
      expect(result.success).toBe(true)
    })

    it('should reject invalid project ID', async () => {
      const handler = getRegisteredHandler('export:project')
      await expect(handler(null, { projectId: 'invalid', format: 'markdown' })).rejects.toThrow('项目ID 格式无效')
    })
  })
})
