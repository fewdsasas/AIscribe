import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Database } from '../../src/main/memory/database'
import path from 'path'
import fs from 'fs'
import { v4 as uuid } from 'uuid'

describe('Workflow Integration', () => {
  const testDir = path.join(__dirname, '../temp')
  const dbPath = path.join(testDir, `workflow-${uuid()}.db`)
  let db: Database

  beforeAll(async () => {
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true })
    db = await Database.create(dbPath)
  })

  afterAll(() => {
    db.close()
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
  })

  it('should create a project', () => {
    db.createProject({
      id: 'proj-1',
      name: '测试小说',
      description: '一个测试项目',
      genre: '玄幻',
      status: 'planning',
      wordCount: 0,
      targetWordCount: 100000
    })
    const project = db.getProject('proj-1')
    expect(project).toBeDefined()
    if (!project) throw new Error('project not set')
    expect(project.name).toBe('测试小说')
  })

  it('should create a novel within the project', () => {
    db.createNovel({
      id: 'novel-1',
      projectId: 'proj-1',
      title: '测试小说',
      author: '作者',
      synopsis: '简介',
      genre: '玄幻',
      tags: [],
      targetAudience: ''
    })
    const novel = db.getNovelByProject('proj-1')
    expect(novel).toBeDefined()
    if (!novel) throw new Error('novel not set')
    expect(novel.title).toBe('测试小说')
  })

  it('should add chapters and update content', () => {
    db.createChapter({
      id: 'ch-1',
      novelId: 'novel-1',
      title: '第一章',
      content: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"开头"}]}]}',
      sortOrder: 1,
      wordCount: 2,
      status: 'draft'
    })
    db.updateChapter('ch-1', {
      content: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"修改后"}]}]}',
      wordCount: 3
    })
    const chapter = db.getChapter('ch-1')
    expect(chapter).toBeDefined()
    if (!chapter) throw new Error('chapter not set')
    expect(chapter.wordCount).toBe(3)
    expect(chapter.content).toContain('修改后')
  })

  it('should create a checkpoint', () => {
    db.createCheckpoint({
      id: 'cp-1',
      projectId: 'proj-1',
      label: 'v1',
      description: '首个版本',
      tags: ['初稿'],
      snapshot: { novel: '{}', characters: '[]', worlds: '[]', plots: '[]', outline: '{}' }
    })
    const checkpoints = db.listCheckpoints('proj-1')
    expect(checkpoints.length).toBe(1)
    expect(checkpoints[0].label).toBe('v1')
  })

  it('should restore a checkpoint', () => {
    const snapshot = db.getCheckpointSnapshot('cp-1')
    expect(snapshot).toBeDefined()
    if (!snapshot) throw new Error('snapshot not set')
    expect(snapshot.novel).toBe('{}')
  })

  it('should delete project', () => {
    db.deleteProject('proj-1')
    expect(db.getProject('proj-1')).toBeNull()
  })
})
