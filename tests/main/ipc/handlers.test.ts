import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import path from 'path'
import fs from 'fs'

// Mock Electron before importing IPC handlers
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

import { registerProjectHandlers } from '../../../src/main/ipc/project.ipc'
import { registerNovelHandlers } from '../../../src/main/ipc/novel.ipc'

describe('IPC Handlers', () => {
  const testDir = path.join(__dirname, '../../temp')
  const testDbPath = path.join(testDir, `ipc-test-${testId()}.db`)
  let db: Database
  let registry: ReturnType<typeof createMockRegistry>

  beforeAll(async () => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true })
    }
    db = await Database.create(testDbPath)
    registry = createMockRegistry({ database: db as IDatabase })

    // Register IPC handlers with mock ipcMain
    registerProjectHandlers(mockIpcMain as any, registry)
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

  describe('project:create', () => {
    it('should create a project via IPC', async () => {
      const handler = getRegisteredHandler('project:create')
      expect(handler).toBeDefined()

      const result = await handler(null, { name: 'IPC Test Project', description: 'Test', genre: 'fantasy' })
      expect(result).toBeDefined()
      expect(result.name).toBe('IPC Test Project')
      expect(result.id).toBeDefined()
    })

    it('should reject empty project name', async () => {
      const handler = getRegisteredHandler('project:create')
      await expect(handler(null, { name: '' })).rejects.toThrow('项目名称 不能为空')
    })
  })

  describe('project:list', () => {
    it('should list projects via IPC', async () => {
      const handler = getRegisteredHandler('project:list')
      expect(handler).toBeDefined()

      const result = await handler(null)
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('project:get', () => {
    it('should get a project by ID', async () => {
      const createHandler = getRegisteredHandler('project:create')
      const project = await createHandler(null, { name: 'Get Test', description: '', genre: 'sci_fi' })

      const getHandler = getRegisteredHandler('project:get')
      const result = await getHandler(null, project.id)
      expect(result).toBeDefined()
      expect(result.name).toBe('Get Test')
    })
  })

  describe('novel:create', () => {
    it('should create a novel via IPC', async () => {
      const handler = getRegisteredHandler('novel:create')
      expect(handler).toBeDefined()

      const project = await getRegisteredHandler('project:create')(null, {
        name: 'Novel Create Project',
        description: '',
        genre: 'fantasy'
      })

      const result = await handler(null, {
        projectId: project.id,
        title: 'IPC Test Novel',
        author: 'Test Author'
      })
      expect(result).toBeDefined()
      expect(result.title).toBe('IPC Test Novel')
      expect(result.id).toBeDefined()
    })

    it('should reject non-object data', async () => {
      const handler = getRegisteredHandler('novel:create')
      await expect(handler(null, null)).rejects.toThrow('小说数据 格式无效')
    })

    it('should reject empty novel title', async () => {
      const handler = getRegisteredHandler('novel:create')
      await expect(handler(null, { projectId: '00000000-0000-0000-0000-000000000001', title: '' })).rejects.toThrow(
        '小说标题 不能为空'
      )
    })

    it('should reject missing project ID', async () => {
      const handler = getRegisteredHandler('novel:create')
      await expect(handler(null, { title: 'No Project' })).rejects.toThrow('项目ID 不能为空')
    })

    it('should reject invalid project ID', async () => {
      const handler = getRegisteredHandler('novel:create')
      await expect(handler(null, { projectId: 'invalid', title: 'Bad Project' })).rejects.toThrow('项目ID 格式无效')
    })
  })

  describe('chapter:create', () => {
    it('should create a chapter via IPC', async () => {
      const novelHandler = getRegisteredHandler('novel:create')
      const novel = await novelHandler(null, {
        projectId: '00000000-0000-0000-0000-000000000001',
        title: 'Chapter Test Novel'
      })

      const handler = getRegisteredHandler('chapter:create')
      const result = await handler(null, {
        novelId: novel.id,
        title: '第一章',
        content: ''
      })
      expect(result).toBeDefined()
      expect(result.title).toBe('第一章')
      expect(result.id).toBeDefined()
    })

    it('should reject missing novel ID', async () => {
      const handler = getRegisteredHandler('chapter:create')
      await expect(handler(null, { title: 'No Novel' })).rejects.toThrow('小说ID 不能为空')
    })

    it('should reject non-object data', async () => {
      const handler = getRegisteredHandler('chapter:create')
      await expect(handler(null, null)).rejects.toThrow('章节数据 格式无效')
    })

    it('should reject invalid novel ID', async () => {
      const handler = getRegisteredHandler('chapter:create')
      await expect(handler(null, { novelId: 'invalid', title: 'Bad Novel' })).rejects.toThrow('小说ID 格式无效')
    })
  })

  describe('project:update', () => {
    it('should update a project name', async () => {
      const createHandler = getRegisteredHandler('project:create')
      const project = await createHandler(null, { name: 'Original Name', description: '', genre: 'fantasy' })

      const handler = getRegisteredHandler('project:update')
      const result = await handler(null, project.id, { name: 'Updated Name' })
      expect(result).toBe(true)

      const getHandler = getRegisteredHandler('project:get')
      const updated = await getHandler(null, project.id)
      expect(updated).toBeDefined()
      expect(updated.name).toBe('Updated Name')
    })

    it('should reject invalid data', async () => {
      const handler = getRegisteredHandler('project:update')
      await expect(handler(null, '00000000-0000-0000-0000-000000000001', null)).rejects.toThrow('项目更新数据 格式无效')
    })

    it('should reject empty project name', async () => {
      const handler = getRegisteredHandler('project:update')
      await expect(handler(null, '00000000-0000-0000-0000-000000000001', { name: '' })).rejects.toThrow(
        '项目名称 不能为空'
      )
    })
  })

  describe('project:delete', () => {
    it('should delete a project', async () => {
      const createHandler = getRegisteredHandler('project:create')
      const project = await createHandler(null, { name: 'To Delete', description: '', genre: 'fantasy' })

      const handler = getRegisteredHandler('project:delete')
      const result = await handler(null, project.id)
      expect(result).toBe(true)

      const getHandler = getRegisteredHandler('project:get')
      const deleted = await getHandler(null, project.id)
      expect(deleted).toBeNull()
    })

    it('should not throw when deleting non-existent ID', async () => {
      const handler = getRegisteredHandler('project:delete')
      await expect(handler(null, '00000000-0000-0000-0000-000000000001')).resolves.not.toThrow()
    })
  })

  describe('project:dashboard-stats', () => {
    it('should return project stats with novel/chapter counts', async () => {
      const projectHandler = getRegisteredHandler('project:create')
      const project = await projectHandler(null, { name: 'Stats Project', description: '', genre: 'fantasy' })

      const novelHandler = getRegisteredHandler('novel:create')
      const novel = await novelHandler(null, { projectId: project.id, title: 'Stats Novel' })

      const chapterHandler = getRegisteredHandler('chapter:create')
      await chapterHandler(null, { novelId: novel.id, title: 'Ch1', content: '' })

      const handler = getRegisteredHandler('project:dashboard-stats')
      const result = await handler(null)
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThanOrEqual(1)

      const statsProject = result.find((p: Record<string, unknown>) => p.id === project.id)
      expect(statsProject).toBeDefined()
      if (!statsProject) throw new Error('statsProject not found')
      expect(statsProject.novelCount).toBeGreaterThanOrEqual(1)
      expect(statsProject.chapterCount).toBeGreaterThanOrEqual(1)
    })
  })

  describe('novel:get', () => {
    it('should get a novel by ID', async () => {
      const createHandler = getRegisteredHandler('novel:create')
      const novel = await createHandler(null, {
        projectId: '00000000-0000-0000-0000-000000000001',
        title: 'Get Novel',
        author: 'Author'
      })

      const handler = getRegisteredHandler('novel:get')
      const result = await handler(null, novel.id)
      expect(result).toBeDefined()
      expect(result.id).toBe(novel.id)
      expect(result.title).toBe('Get Novel')
      expect(result.author).toBe('Author')
    })

    it('should return null for non-existent ID', async () => {
      const handler = getRegisteredHandler('novel:get')
      const result = await handler(null, '00000000-0000-0000-0000-000000000001')
      expect(result).toBeNull()
    })
  })

  describe('novel:get-by-project', () => {
    it('should get novel by project ID', async () => {
      const projectHandler = getRegisteredHandler('project:create')
      const project = await projectHandler(null, { name: 'Novel By Project', description: '', genre: 'fantasy' })

      const createHandler = getRegisteredHandler('novel:create')
      const novel = await createHandler(null, { projectId: project.id, title: 'Project Novel' })

      const handler = getRegisteredHandler('novel:get-by-project')
      const result = await handler(null, project.id)
      expect(result).toBeDefined()
      expect(result.id).toBe(novel.id)
      expect(result.projectId).toBe(project.id)
    })
  })

  describe('chapter:list', () => {
    it('should list chapters for a novel', async () => {
      const novelHandler = getRegisteredHandler('novel:create')
      const novel = await novelHandler(null, {
        projectId: '00000000-0000-0000-0000-000000000001',
        title: 'List Test Novel'
      })

      const chapterHandler = getRegisteredHandler('chapter:create')
      await chapterHandler(null, { novelId: novel.id, title: 'Chapter 1', content: '' })
      await chapterHandler(null, { novelId: novel.id, title: 'Chapter 2', content: '' })

      const handler = getRegisteredHandler('chapter:list')
      const result = await handler(null, novel.id)
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(2)
      expect(result[0].novelId).toBe(novel.id)
    })
  })

  describe('chapter:get', () => {
    it('should get a chapter by ID', async () => {
      const novelHandler = getRegisteredHandler('novel:create')
      const novel = await novelHandler(null, {
        projectId: '00000000-0000-0000-0000-000000000001',
        title: 'Chapter Get Novel'
      })

      const createHandler = getRegisteredHandler('chapter:create')
      const chapter = await createHandler(null, { novelId: novel.id, title: 'Test Chapter', content: 'Content' })

      const handler = getRegisteredHandler('chapter:get')
      const result = await handler(null, chapter.id)
      expect(result).toBeDefined()
      expect(result.id).toBe(chapter.id)
      expect(result.title).toBe('Test Chapter')
    })

    it('should return null for non-existent ID', async () => {
      const handler = getRegisteredHandler('chapter:get')
      const result = await handler(null, '00000000-0000-0000-0000-000000000001')
      expect(result).toBeNull()
    })
  })

  describe('chapter:update', () => {
    it('should update a chapter title', async () => {
      const novelHandler = getRegisteredHandler('novel:create')
      const novel = await novelHandler(null, {
        projectId: '00000000-0000-0000-0000-000000000001',
        title: 'Chapter Update Novel'
      })

      const createHandler = getRegisteredHandler('chapter:create')
      const chapter = await createHandler(null, { novelId: novel.id, title: 'Original Title', content: '' })

      const handler = getRegisteredHandler('chapter:update')
      const result = await handler(null, chapter.id, { title: 'Updated Title' })
      expect(result).toBe(true)

      const getHandler = getRegisteredHandler('chapter:get')
      const updated = await getHandler(null, chapter.id)
      expect(updated.title).toBe('Updated Title')
    })

    it('should reject empty chapter title', async () => {
      const handler = getRegisteredHandler('chapter:update')
      await expect(handler(null, '00000000-0000-0000-0000-000000000001', { title: '' })).rejects.toThrow(
        '章节标题 不能为空'
      )
    })

    it('should reject non-object update data', async () => {
      const handler = getRegisteredHandler('chapter:update')
      await expect(handler(null, '00000000-0000-0000-0000-000000000001', null)).rejects.toThrow('章节更新数据 格式无效')
    })

    it('should reject invalid chapter ID', async () => {
      const handler = getRegisteredHandler('chapter:update')
      await expect(handler(null, 'invalid-id', { title: 'Title' })).rejects.toThrow('章节ID 格式无效')
    })
  })

  describe('chapter:counts', () => {
    it('should return chapter counts for novel IDs', async () => {
      const novelHandler = getRegisteredHandler('novel:create')
      const novel1 = await novelHandler(null, {
        projectId: '00000000-0000-0000-0000-000000000001',
        title: 'Counts Novel 1'
      })
      const novel2 = await novelHandler(null, {
        projectId: '00000000-0000-0000-0000-000000000001',
        title: 'Counts Novel 2'
      })

      const chapterHandler = getRegisteredHandler('chapter:create')
      await chapterHandler(null, { novelId: novel1.id, title: 'Ch1', content: '' })
      await chapterHandler(null, { novelId: novel1.id, title: 'Ch2', content: '' })
      await chapterHandler(null, { novelId: novel2.id, title: 'Ch1', content: '' })

      const handler = getRegisteredHandler('chapter:counts')
      const result = await handler(null, [novel1.id, novel2.id])
      expect(result).toBeDefined()
      expect(result[novel1.id]).toBe(2)
      expect(result[novel2.id]).toBe(1)
    })

    it('should return empty object for empty array', async () => {
      const handler = getRegisteredHandler('chapter:counts')
      const result = await handler(null, [])
      expect(result).toEqual({})
    })

    it('should reject non-array input', async () => {
      const handler = getRegisteredHandler('chapter:counts')
      await expect(handler(null, 'not-array')).rejects.toThrow('novelIds 必须为数组')
    })

    it('should reject invalid novel IDs in array', async () => {
      const handler = getRegisteredHandler('chapter:counts')
      await expect(handler(null, ['invalid-id'])).rejects.toThrow('小说ID 格式无效')
    })
  })
})
