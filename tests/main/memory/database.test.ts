import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Database } from '../../../src/main/memory/database'
import { testId } from '../../setup'
import path from 'path'
import fs from 'fs'

describe('Database', () => {
  const testDir = path.join(__dirname, '../../temp')
  const testDbPath = path.join(testDir, `test-${testId()}.db`)
  let db: Database

  beforeAll(async () => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true })
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

  describe('initialization', () => {
    it('should create database file on disk', () => {
      expect(fs.existsSync(testDbPath)).toBe(true)
    })

    it('should have all required tables', () => {
      const tables = db.getTableNames()
      expect(tables).toContain('projects')
      expect(tables).toContain('novels')
      expect(tables).toContain('chapters')
      expect(tables).toContain('characters')
      expect(tables).toContain('worlds')
      expect(tables).toContain('plot_structures')
      expect(tables).toContain('outlines')
      expect(tables).toContain('checkpoints')
      expect(tables).toContain('session_memories')
      expect(tables).toContain('writer_models')
    })
  })

  describe('Project CRUD', () => {
    const testProject = {
      id: testId(),
      name: '测试小说项目',
      description: '一个用于测试的小说项目',
      genre: 'fantasy',
      status: 'planning' as const,
      wordCount: 0
    }

    it('should create a project', () => {
      db.createProject(testProject)
      const project = db.getProject(testProject.id)
      expect(project).toBeDefined()
      if (!project) throw new Error('project not set')
      expect(project.name).toBe('测试小说项目')
      expect(project.genre).toBe('fantasy')
    })

    it('should list all projects', () => {
      const projects = db.listProjects()
      expect(projects.length).toBeGreaterThanOrEqual(1)
      expect(projects.some(p => p.id === testProject.id)).toBe(true)
    })

    it('should update a project', () => {
      db.updateProject(testProject.id, { name: '更新后的项目名', status: 'writing' })
      const project = db.getProject(testProject.id)
      expect(project).toBeDefined()
      if (!project) throw new Error('project not set')
      expect(project.name).toBe('更新后的项目名')
      expect(project.status).toBe('writing')
    })

    it('should delete a project', () => {
      const tempId = testId()
      db.createProject({
        id: tempId,
        name: '临时项目',
        description: '',
        genre: 'sci_fi',
        status: 'planning',
        wordCount: 0
      })
      db.deleteProject(tempId)
      expect(db.getProject(tempId)).toBeNull()
    })

    it('should invalidate novel and chapter caches after project deletion', () => {
      const projectId = testId()
      const novelId = testId()
      const chapterId = testId()

      db.createProject({
        id: projectId,
        name: '缓存测试项目',
        description: '',
        genre: 'fantasy',
        status: 'planning',
        wordCount: 0
      })
      db.createNovel({
        id: novelId,
        projectId,
        title: '缓存测试小说',
        author: '',
        synopsis: '',
        genre: 'fantasy',
        tags: [],
        targetAudience: ''
      })
      db.createChapter({
        id: chapterId,
        novelId,
        title: '缓存测试章节',
        content: '内容',
        sortOrder: 1,
        wordCount: 10,
        status: 'draft'
      })

      // Populate caches
      expect(db.getNovel(novelId)).not.toBeNull()
      expect(db.getChapter(chapterId)).not.toBeNull()

      // Cascade delete should invalidate caches
      db.deleteProject(projectId)

      expect(db.getProject(projectId)).toBeNull()
      expect(db.getNovel(novelId)).toBeNull()
      expect(db.getChapter(chapterId)).toBeNull()
    })
  })

  describe('Novel CRUD', () => {
    const projectId = testId()
    const novelId = testId()

    beforeAll(() => {
      db.createProject({
        id: projectId,
        name: '小说测试项目',
        description: '',
        genre: 'fantasy',
        status: 'planning',
        wordCount: 0
      })
    })

    it('should create a novel within a project', () => {
      db.createNovel({
        id: novelId,
        projectId,
        title: '龙与魔法',
        author: '测试作者',
        synopsis: '一个关于龙与魔法的故事',
        genre: 'fantasy',
        tags: ['魔法', '龙'],
        targetAudience: 'young_adult'
      })
      const novel = db.getNovel(novelId)
      expect(novel).toBeDefined()
      if (!novel) throw new Error('novel not set')
      expect(novel.title).toBe('龙与魔法')
    })

    it('should get novel by project', () => {
      const novel = db.getNovelByProject(projectId)
      expect(novel).toBeDefined()
      if (!novel) throw new Error('novel not set')
      expect(novel.id).toBe(novelId)
    })

    it('should add chapters to a novel', () => {
      db.createChapter({
        id: testId(),
        novelId,
        title: '第一章 开端',
        content: '在很久很久以前...',
        sortOrder: 1,
        wordCount: 100,
        status: 'draft'
      })
      db.createChapter({
        id: testId(),
        novelId,
        title: '第二章 冒险',
        content: '他们踏上了旅程...',
        sortOrder: 2,
        wordCount: 200,
        status: 'draft'
      })
      const chapters = db.listChapters(novelId)
      expect(chapters.length).toBe(2)
      expect(chapters[0].sortOrder).toBeLessThan(chapters[1].sortOrder)
    })
  })

  describe('Character CRUD', () => {
    const novelId = testId()

    beforeAll(() => {
      const pid = testId()
      db.createProject({
        id: pid,
        name: '角色测试',
        description: '',
        genre: 'fantasy',
        status: 'planning',
        wordCount: 0
      })
      db.createNovel({
        id: novelId,
        projectId: pid,
        title: '角色测试',
        author: '',
        synopsis: '',
        genre: 'fantasy',
        tags: [],
        targetAudience: ''
      })
    })

    it('should create a character with personality profile', () => {
      db.createCharacter({
        id: testId(),
        novelId,
        name: '林夜',
        aliases: ['夜'],
        role: 'protagonist',
        personality: {
          mbti: 'INTJ',
          enneagram: '5w4',
          traits: ['冷静', '睿智', '孤独'],
          virtues: ['忠诚', '勇敢'],
          flaws: ['固执', '多疑'],
          motivations: ['寻找真相'],
          coreBelief: '知识就是力量'
        },
        background: '出身于学者世家',
        appearance: '黑发黑眸，身形修长',
        abilities: ['剑术', '魔法'],
        goals: ['解开 ancient 谜团'],
        fears: ['失去亲人'],
        secrets: ['身世之谜'],
        arc: { type: 'positive' as const, startingState: '', endingState: '', catalyst: '', keyMoments: [] },
        relationships: []
      })
      const chars = db.listCharacters(novelId)
      expect(chars.length).toBe(1)
      expect(chars[0].name).toBe('林夜')
      expect(chars[0].personality.mbti).toBe('INTJ')
    })
  })

  describe('Checkpoint System', () => {
    const projectId = testId()

    beforeAll(() => {
      db.createProject({
        id: projectId,
        name: '检查点测试',
        description: '',
        genre: 'fantasy',
        status: 'writing',
        wordCount: 5000
      })
    })

    it('should create and restore checkpoints', () => {
      db.createCheckpoint({
        id: testId(),
        projectId,
        label: 'v0.1-初稿完成',
        description: '第一章初稿完成时的快照',
        snapshot: {
          novel: JSON.stringify({ title: '旧版本' }),
          characters: '[]',
          worlds: '[]',
          plots: '[]',
          outline: '{}'
        },
        tags: ['初稿', 'milestone']
      })

      const checkpoints = db.listCheckpoints(projectId)
      expect(checkpoints.length).toBe(1)
      expect(checkpoints[0].label).toBe('v0.1-初稿完成')

      const snapshot = db.getCheckpointSnapshot(checkpoints[0].id)
      expect(snapshot).toBeDefined()
      if (!snapshot) throw new Error('snapshot not set')
      const restoredNovel = JSON.parse(snapshot.novel)
      expect(restoredNovel.title).toBe('旧版本')
    })
  })

  describe('Session Memory', () => {
    it('should store and retrieve AI conversation sessions', () => {
      const projectId = testId()
      db.createProject({
        id: projectId,
        name: '会话测试',
        description: '',
        genre: 'fantasy',
        status: 'planning',
        wordCount: 0
      })

      db.createSessionMemory({
        id: testId(),
        projectId,
        sessionId: 'session-1',
        queries: [
          { role: 'user' as const, content: '帮我设计一个角色', timestamp: new Date().toISOString() },
          {
            role: 'assistant' as const,
            content: '好的，我们来设计...',
            skillId: 'character-creation',
            timestamp: new Date().toISOString()
          }
        ],
        summary: '用户请求角色设计，AI提供了角色创建建议'
      })

      const sessions = db.listSessionMemories(projectId)
      expect(sessions.length).toBe(1)
      expect(sessions[0].queries.length).toBe(2)
      expect(sessions[0].summary).toContain('角色设计')
    })
  })

  describe('Database migrations', () => {
    it('should track schema version', () => {
      const version = db.getSchemaVersion()
      expect(version).toBeGreaterThanOrEqual(1)
    })
  })
})
