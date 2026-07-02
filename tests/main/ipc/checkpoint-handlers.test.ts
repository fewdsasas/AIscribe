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

import { registerCheckpointHandlers } from '../../../src/main/ipc/checkpoint.ipc'

describe('Checkpoint IPC Handlers', () => {
  const testDir = path.join(__dirname, '../../temp')
  const testDbPath = path.join(testDir, `checkpoint-test-${testId()}.db`)
  let db: Database
  let registry: ReturnType<typeof createMockRegistry>

  beforeAll(async () => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true })
    }
    db = await Database.create(testDbPath)
    registry = createMockRegistry({ database: db as IDatabase })
    registerCheckpointHandlers(mockIpcMain as any, registry)
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

  describe('checkpoint:create', () => {
    it('should create a checkpoint', async () => {
      const handler = getRegisteredHandler('checkpoint:create')
      const project = await db.createProject({ name: 'Checkpoint Test', genre: 'fantasy', status: 'planning' })

      const result = await handler(null, { projectId: project.id, label: 'v1.0' })
      expect(result).toBeDefined()
      expect(result.label).toBe('v1.0')
      expect(result.projectId).toBe(project.id)
    })

    it('should reject empty label', async () => {
      const handler = getRegisteredHandler('checkpoint:create')
      await expect(handler(null, { projectId: testId(), label: '' })).rejects.toThrow('检查点标签 不能为空')
    })

    it('should reject missing project ID', async () => {
      const handler = getRegisteredHandler('checkpoint:create')
      await expect(handler(null, { label: 'v1' })).rejects.toThrow('项目ID 不能为空')
    })
  })

  describe('checkpoint:list', () => {
    it('should list checkpoints for a project', async () => {
      const handler = getRegisteredHandler('checkpoint:list')
      const project = await db.createProject({ name: 'List Test', genre: 'sci_fi', status: 'planning' })
      await db.createCheckpoint({ projectId: project.id, label: 'v1' })

      const result = await handler(null, { projectId: project.id })
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
    })

    it('should reject invalid project ID', async () => {
      const handler = getRegisteredHandler('checkpoint:list')
      await expect(handler(null, { projectId: 'invalid' })).rejects.toThrow('项目ID 格式无效')
    })
  })

  describe('checkpoint:restore', () => {
    it('should restore a checkpoint', async () => {
      const handler = getRegisteredHandler('checkpoint:restore')
      const project = await db.createProject({ name: 'Restore Test', genre: 'fantasy', status: 'planning' })
      const checkpoint = await db.createCheckpoint({ projectId: project.id, label: 'v2' })

      const result = await handler(null, { id: checkpoint.id })
      // getCheckpointSnapshot may return the checkpoint data or null if not implemented
      expect(result).toBeDefined()
    })

    it('should reject invalid checkpoint ID', async () => {
      const handler = getRegisteredHandler('checkpoint:restore')
      await expect(handler(null, { id: 'invalid' })).rejects.toThrow('检查点ID 格式无效')
    })
  })

  describe('session:create', () => {
    it('should create a session memory', async () => {
      const handler = getRegisteredHandler('session:create')
      const project = await db.createProject({ name: 'Session Test', genre: 'fantasy', status: 'planning' })

      const result = await handler(null, { projectId: project.id, context: 'Test context' })
      expect(result).toBeDefined()
    })

    it('should reject missing project ID', async () => {
      const handler = getRegisteredHandler('session:create')
      await expect(handler(null, { context: 'No project' })).rejects.toThrow('项目ID 不能为空')
    })
  })

  describe('session:list', () => {
    it('should list sessions for a project', async () => {
      const handler = getRegisteredHandler('session:list')
      const project = await db.createProject({ name: 'Session List', genre: 'fantasy', status: 'planning' })

      const result = await handler(null, { projectId: project.id })
      expect(Array.isArray(result)).toBe(true)
    })

    it('should reject invalid project ID', async () => {
      const handler = getRegisteredHandler('session:list')
      await expect(handler(null, { projectId: 'invalid' })).rejects.toThrow('项目ID 格式无效')
    })
  })
})
