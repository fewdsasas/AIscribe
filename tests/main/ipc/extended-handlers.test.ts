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

import { registerCharacterHandlers } from '../../../src/main/ipc/character.ipc'
import { registerWorldHandlers } from '../../../src/main/ipc/world.ipc'
import { registerCheckpointHandlers } from '../../../src/main/ipc/checkpoint.ipc'
import { registerWriterHandlers } from '../../../src/main/ipc/writer.ipc'
import { registerStorageHandlers } from '../../../src/main/ipc/storage.ipc'
import { registerExportHandlers } from '../../../src/main/ipc/export.ipc'

describe('Extended IPC Handlers', () => {
  const testDir = path.join(__dirname, '../../temp')
  const testDbPath = path.join(testDir, `extended-ipc-${testId()}.db`)
  let db: Database
  let registry: ReturnType<typeof createMockRegistry>

  beforeAll(async () => {
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true })
    db = await Database.create(testDbPath)
    registry = createMockRegistry({ database: db as IDatabase })

    registerCharacterHandlers(mockIpcMain as any, registry)
    registerWorldHandlers(mockIpcMain as any, registry)
    registerCheckpointHandlers(mockIpcMain as any, registry)
    registerWriterHandlers(mockIpcMain as any, registry)
    registerStorageHandlers(mockIpcMain as any, registry)
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

  describe('character:create', () => {
    it('should create a character via IPC', async () => {
      const handler = getRegisteredHandler('character:create')
      const project = await db.createProject({ name: 'Char Test', genre: 'fantasy', status: 'planning' })
      const novel = await db.createNovel({
        projectId: project.id,
        title: 'Char Novel',
        author: '',
        synopsis: '',
        genre: 'fantasy',
        tags: [],
        targetAudience: ''
      })

      const result = await handler(null, {
        novelId: novel.id,
        name: 'Test Character',
        role: 'protagonist'
      })
      expect(result).toBeDefined()
      expect(result.name).toBe('Test Character')
    })
  })

  describe('character:list', () => {
    it('should list characters via IPC', async () => {
      const handler = getRegisteredHandler('character:list')
      const project = await db.createProject({ name: 'Char List', genre: 'fantasy', status: 'planning' })
      const novel = await db.createNovel({
        projectId: project.id,
        title: 'List Novel',
        author: '',
        synopsis: '',
        genre: 'fantasy',
        tags: [],
        targetAudience: ''
      })

      const result = await handler(null, novel.id)
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('world:save', () => {
    it('should save world data via IPC', async () => {
      const handler = getRegisteredHandler('world:save')
      const project = await db.createProject({ name: 'World Test', genre: 'fantasy', status: 'planning' })
      const novel = await db.createNovel({
        projectId: project.id,
        title: 'World Novel',
        author: '',
        synopsis: '',
        genre: 'fantasy',
        tags: [],
        targetAudience: ''
      })

      const result = await handler(null, {
        novelId: novel.id,
        name: 'Test World',
        type: 'fantasy'
      })
      expect(result).toBeDefined()
      expect(result.name).toBe('Test World')
    })
  })

  describe('world:get-by-novel', () => {
    it('should get world by novel ID', async () => {
      const handler = getRegisteredHandler('world:get-by-novel')
      const saveHandler = getRegisteredHandler('world:save')
      const project = await db.createProject({ name: 'World Get', genre: 'fantasy', status: 'planning' })
      const novel = await db.createNovel({
        projectId: project.id,
        title: 'Get Novel',
        author: '',
        synopsis: '',
        genre: 'fantasy',
        tags: [],
        targetAudience: ''
      })

      await saveHandler(null, { novelId: novel.id, name: 'Get World', type: 'sci_fi' })

      const result = await handler(null, novel.id)
      expect(result).toBeDefined()
      expect(result.name).toBe('Get World')
    })
  })

  describe('checkpoint:create', () => {
    it('should create a checkpoint via IPC', async () => {
      const handler = getRegisteredHandler('checkpoint:create')
      const project = await db.createProject({ name: 'CP Test', genre: 'fantasy', status: 'planning' })

      const result = await handler(null, {
        projectId: project.id,
        label: 'v1',
        description: 'First checkpoint',
        snapshot: { novel: '{}', characters: '[]', worlds: '[]', plots: '[]', outline: '{}' }
      })
      expect(result).toBeDefined()
      expect(result.label).toBe('v1')
    })
  })

  describe('checkpoint:list', () => {
    it('should list checkpoints via IPC', async () => {
      const handler = getRegisteredHandler('checkpoint:list')
      const project = await db.createProject({ name: 'CP List', genre: 'fantasy', status: 'planning' })

      const result = await handler(null, project.id)
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('writer-model:get', () => {
    it('should get writer model', async () => {
      const handler = getRegisteredHandler('writer-model:get')
      const saveHandler = getRegisteredHandler('writer-model:save')
      const writerId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

      await saveHandler(null, {
        writerId,
        frequentSkills: [],
        stylePreferences: { preferredSkills: [], averageSessionDuration: 0, typicalQueryLength: 0 },
        timeDistribution: { totalSessions: 0, totalDuration: 0, averagePerSession: 0, skillsUsed: [] },
        lastUpdated: new Date().toISOString()
      })

      const result = await handler(null, writerId)
      expect(result).toBeDefined()
      expect(result.writerId).toBe(writerId)
    })
  })

  describe('storage:encryptSet / encryptGet', () => {
    it('should store and retrieve encrypted data', async () => {
      const setHandler = getRegisteredHandler('storage:encryptSet')
      const getHandler = getRegisteredHandler('storage:encryptGet')

      await setHandler(null, 'test-key', 'test-value')
      const result = await getHandler(null, 'test-key')
      expect(result).toBe('test-value')
    })

    it('should return null for missing key', async () => {
      const getHandler = getRegisteredHandler('storage:encryptGet')
      const result = await getHandler(null, 'non-existent-key')
      expect(result).toBeNull()
    })
  })

  describe('plot-structure:save', () => {
    it('should save plot structure via IPC', async () => {
      const handler = getRegisteredHandler('plot-structure:save')
      const project = await db.createProject({ name: 'Plot Save', genre: 'fantasy', status: 'planning' })
      const novel = await db.createNovel({
        projectId: project.id,
        title: 'Plot Novel',
        author: '',
        synopsis: '',
        genre: 'fantasy',
        tags: [],
        targetAudience: ''
      })

      const result = await handler(null, {
        novelId: novel.id,
        framework: 'three_act',
        beats: [
          {
            id: 'beat-1',
            name: 'Setup',
            description: 'Opening scene',
            sortOrder: 0,
            chapterIds: [],
            emotionalIntensity: 3,
            status: 'planned'
          }
        ],
        notes: 'Initial plot notes'
      })
      expect(result).toBeDefined()
      expect(result.novelId).toBe(novel.id)
      expect(result.framework).toBe('three_act')
      expect(Array.isArray(result.beats)).toBe(true)
      expect(result.beats).toHaveLength(1)
      expect(result.beats[0].name).toBe('Setup')
      expect(result.notes).toBe('Initial plot notes')
    })

    it('should update plot structure on re-save', async () => {
      const handler = getRegisteredHandler('plot-structure:save')
      const project = await db.createProject({ name: 'Plot Update', genre: 'fantasy', status: 'planning' })
      const novel = await db.createNovel({
        projectId: project.id,
        title: 'Plot Update Novel',
        author: '',
        synopsis: '',
        genre: 'fantasy',
        tags: [],
        targetAudience: ''
      })

      await handler(null, {
        novelId: novel.id,
        framework: 'three_act',
        beats: [],
        notes: 'First version'
      })

      const updated = await handler(null, {
        novelId: novel.id,
        framework: 'hero_journey',
        beats: [
          {
            id: 'beat-2',
            name: 'Call to Adventure',
            description: 'Hero receives the call',
            sortOrder: 1,
            chapterIds: [],
            emotionalIntensity: 5,
            status: 'planned'
          }
        ],
        notes: 'Second version'
      })
      expect(updated).toBeDefined()
      expect(updated.novelId).toBe(novel.id)
      expect(updated.framework).toBe('hero_journey')
      expect(updated.beats).toHaveLength(1)
      expect(updated.beats[0].name).toBe('Call to Adventure')
      expect(updated.notes).toBe('Second version')
    })

    it('should reject invalid data (empty object)', async () => {
      const handler = getRegisteredHandler('plot-structure:save')
      await expect(handler(null, {})).rejects.toThrow()
    })
  })

  describe('plot-structure:get-by-novel', () => {
    it('should get plot structure by novel ID', async () => {
      const handler = getRegisteredHandler('plot-structure:get-by-novel')
      const saveHandler = getRegisteredHandler('plot-structure:save')
      const project = await db.createProject({ name: 'Plot Get', genre: 'fantasy', status: 'planning' })
      const novel = await db.createNovel({
        projectId: project.id,
        title: 'Plot Get Novel',
        author: '',
        synopsis: '',
        genre: 'fantasy',
        tags: [],
        targetAudience: ''
      })

      await saveHandler(null, {
        novelId: novel.id,
        framework: 'three_act',
        beats: [
          {
            id: 'beat-1',
            name: 'Setup',
            description: 'Opening',
            sortOrder: 0,
            chapterIds: [],
            emotionalIntensity: 2,
            status: 'planned'
          }
        ],
        notes: 'Plot notes'
      })

      const result = await handler(null, novel.id)
      expect(result).toBeDefined()
      expect(result.novelId).toBe(novel.id)
      expect(result.framework).toBe('three_act')
      expect(result.beats).toHaveLength(1)
      expect(result.beats[0].name).toBe('Setup')
      expect(result.notes).toBe('Plot notes')
    })

    it('should return null for non-existent novelId', async () => {
      const handler = getRegisteredHandler('plot-structure:get-by-novel')
      const result = await handler(null, '00000000-0000-0000-0000-000000000000')
      expect(result).toBeNull()
    })

    it('should reject invalid novelId (empty string)', async () => {
      const handler = getRegisteredHandler('plot-structure:get-by-novel')
      await expect(handler(null, '')).rejects.toThrow()
    })
  })

  describe('outline:save', () => {
    it('should save outline via IPC', async () => {
      const handler = getRegisteredHandler('outline:save')
      const project = await db.createProject({ name: 'Outline Save', genre: 'fantasy', status: 'planning' })
      const novel = await db.createNovel({
        projectId: project.id,
        title: 'Outline Novel',
        author: '',
        synopsis: '',
        genre: 'fantasy',
        tags: [],
        targetAudience: ''
      })

      const result = await handler(null, {
        novelId: novel.id,
        type: 'brief',
        content: 'A brief outline content',
        structure: [
          {
            id: 'sec-1',
            title: 'Beginning',
            content: 'Opening section',
            sortOrder: 0,
            wordCount: 1000,
            phase: 'beginning',
            keyPoints: ['point1', 'point2']
          }
        ]
      })
      expect(result).toBeDefined()
      expect(result.novelId).toBe(novel.id)
      expect(result.type).toBe('brief')
      expect(result.content).toBe('A brief outline content')
      expect(Array.isArray(result.structure)).toBe(true)
      expect(result.structure).toHaveLength(1)
      expect(result.structure[0].title).toBe('Beginning')
      expect(result.version).toBe(1)
    })

    it('should update outline on re-save', async () => {
      const handler = getRegisteredHandler('outline:save')
      const project = await db.createProject({ name: 'Outline Update', genre: 'fantasy', status: 'planning' })
      const novel = await db.createNovel({
        projectId: project.id,
        title: 'Outline Update Novel',
        author: '',
        synopsis: '',
        genre: 'fantasy',
        tags: [],
        targetAudience: ''
      })

      await handler(null, {
        novelId: novel.id,
        type: 'brief',
        content: 'First content',
        structure: []
      })

      const updated = await handler(null, {
        novelId: novel.id,
        type: 'detailed',
        content: 'Updated content',
        structure: [
          {
            id: 'sec-2',
            title: 'Middle',
            content: 'Middle section',
            sortOrder: 1,
            wordCount: 2000,
            phase: 'middle',
            keyPoints: ['point3']
          }
        ]
      })
      expect(updated).toBeDefined()
      expect(updated.novelId).toBe(novel.id)
      expect(updated.type).toBe('detailed')
      expect(updated.content).toBe('Updated content')
      expect(updated.structure).toHaveLength(1)
      expect(updated.structure[0].title).toBe('Middle')
      expect(typeof updated.version).toBe('number')
    })

    it('should reject invalid data (empty object)', async () => {
      const handler = getRegisteredHandler('outline:save')
      await expect(handler(null, {})).rejects.toThrow()
    })
  })

  describe('outline:get', () => {
    it('should get outline by novel ID', async () => {
      const handler = getRegisteredHandler('outline:get')
      const saveHandler = getRegisteredHandler('outline:save')
      const project = await db.createProject({ name: 'Outline Get', genre: 'fantasy', status: 'planning' })
      const novel = await db.createNovel({
        projectId: project.id,
        title: 'Outline Get Novel',
        author: '',
        synopsis: '',
        genre: 'fantasy',
        tags: [],
        targetAudience: ''
      })

      await saveHandler(null, {
        novelId: novel.id,
        type: 'brief',
        content: 'Outline content',
        structure: [
          {
            id: 'sec-1',
            title: 'Beginning',
            content: 'Opening',
            sortOrder: 0,
            wordCount: 500,
            phase: 'beginning',
            keyPoints: ['point1']
          }
        ]
      })

      const result = await handler(null, novel.id)
      expect(result).toBeDefined()
      expect(result.novelId).toBe(novel.id)
      expect(result.type).toBe('brief')
      expect(result.content).toBe('Outline content')
      expect(Array.isArray(result.structure)).toBe(true)
      expect(result.structure).toHaveLength(1)
      expect(result.version).toBe(1)
    })

    it('should return null for non-existent novelId', async () => {
      const handler = getRegisteredHandler('outline:get')
      const result = await handler(null, '00000000-0000-0000-0000-000000000000')
      expect(result).toBeNull()
    })

    it('should reject invalid novelId', async () => {
      const handler = getRegisteredHandler('outline:get')
      await expect(handler(null, '')).rejects.toThrow()
    })
  })

  describe('export:project', () => {
    it('should reject invalid project ID', async () => {
      const handler = getRegisteredHandler('export:project')
      await expect(handler(null, { projectId: 'invalid-id', format: 'markdown' })).rejects.toThrow('项目ID 格式无效')
    })

    it('should reject unsupported export format', async () => {
      const handler = getRegisteredHandler('export:project')
      await expect(handler(null, { projectId: '00000000-0000-0000-0000-000000000001', format: 'pdf' })).rejects.toThrow(
        '导出格式 必须是以下值之一: txt, markdown, html'
      )
    })

    it('should reject non-object options', async () => {
      const handler = getRegisteredHandler('export:project')
      await expect(handler(null, null)).rejects.toThrow('导出选项 格式无效')
    })

    it('should export project in markdown format', async () => {
      const handler = getRegisteredHandler('export:project')
      const project = await db.createProject({ name: 'Export Test', genre: 'fantasy', status: 'planning' })
      const novel = await db.createNovel({
        projectId: project.id,
        title: 'Export Novel',
        author: 'Test Author',
        synopsis: '',
        genre: 'fantasy',
        tags: [],
        targetAudience: ''
      })
      await db.createChapter({ novelId: novel.id, title: 'Chapter 1', content: '' })

      const result = await handler(null, { projectId: project.id, format: 'markdown' })
      expect(result).toBeDefined()
      expect(result.content).toContain('# Export Novel')
      expect(result.content).toContain('## Chapter 1')
      expect(result.filename).toMatch(/\.md$/)
    })
  })
})
