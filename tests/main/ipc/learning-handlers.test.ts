import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
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
import type { ILearningEngine } from '../../../src/main/di'

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

const mockRecordInteraction = vi.fn().mockResolvedValue(undefined)
const mockAnalyzeProject = vi.fn().mockResolvedValue({ skills: [] })
const mockGetProjectSummary = vi.fn().mockResolvedValue({ summary: 'test summary' })
const mockSearchMemory = vi.fn().mockResolvedValue([])

const mockLearningEngine: ILearningEngine = {
  recordInteraction: mockRecordInteraction,
  analyzeProject: mockAnalyzeProject,
  getProjectSummary: mockGetProjectSummary,
  getRecorder: () => ({
    searchMemory: mockSearchMemory
  }),
  close: () => {}
}

import { registerLearningHandlers } from '../../../src/main/ipc/learning.ipc'

describe('Learning IPC Handlers', () => {
  const testDir = path.join(__dirname, '../../temp')
  const testDbPath = path.join(testDir, `learning-test-${testId()}.db`)
  let db: Database
  let registry: ReturnType<typeof createMockRegistry>

  beforeAll(async () => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true })
    }
    db = await Database.create(testDbPath)
    registry = createMockRegistry({ learningEngine: mockLearningEngine })
    registerLearningHandlers(mockIpcMain as any, registry)
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

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('learning:record', () => {
    it('should record an interaction', async () => {
      const handler = getRegisteredHandler('learning:record')
      const project = await db.createProject({ name: 'Learning Test', genre: 'fantasy', status: 'planning' })

      const result = await handler(null, { projectId: project.id, query: 'test query' })
      expect(result).toBe(true)
      expect(mockRecordInteraction).toHaveBeenCalled()
    })

    it('should reject empty query', async () => {
      const handler = getRegisteredHandler('learning:record')
      const project = await db.createProject({ name: 'Learning Empty', genre: 'fantasy', status: 'planning' })

      await expect(handler(null, { projectId: project.id, query: '' })).rejects.toThrow('查询内容 不能为空')
    })
  })

  describe('learning:analyze', () => {
    it('should analyze a project', async () => {
      const handler = getRegisteredHandler('learning:analyze')
      const project = await db.createProject({ name: 'Analyze Test', genre: 'fantasy', status: 'planning' })

      const result = await handler(null, project.id)
      expect(mockAnalyzeProject).toHaveBeenCalledWith(project.id)
      expect(result).toBeDefined()
    })

    it('should reject invalid project ID', async () => {
      const handler = getRegisteredHandler('learning:analyze')
      await expect(handler(null, 'invalid')).rejects.toThrow('项目ID 格式无效')
    })
  })

  describe('learning:summary', () => {
    it('should get project summary', async () => {
      const handler = getRegisteredHandler('learning:summary')
      const project = await db.createProject({ name: 'Summary Test', genre: 'fantasy', status: 'planning' })

      const result = await handler(null, project.id)
      expect(mockGetProjectSummary).toHaveBeenCalledWith(project.id)
      expect(result).toBeDefined()
    })
  })

  describe('memory:search', () => {
    it('should search memory', async () => {
      const handler = getRegisteredHandler('memory:search')
      const project = await db.createProject({ name: 'Memory Test', genre: 'fantasy', status: 'planning' })

      const result = await handler(null, project.id, 'test query')
      expect(mockSearchMemory).toHaveBeenCalledWith(project.id, 'test query')
      expect(Array.isArray(result)).toBe(true)
    })

    it('should reject empty query', async () => {
      const handler = getRegisteredHandler('memory:search')
      const project = await db.createProject({ name: 'Memory Empty', genre: 'fantasy', status: 'planning' })

      await expect(handler(null, project.id, '')).rejects.toThrow('搜索关键词 不能为空')
    })
  })
})
