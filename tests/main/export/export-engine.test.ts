import { describe, expect, it, vi } from 'vitest'
import { ExportEngine } from '../../../src/main/export'
import type { IDatabase } from '../../../src/main/di'
import type { Chapter, Novel } from '../../../src/shared/types'

describe('ExportEngine', () => {
  const mockNovel: Novel = {
    id: 'novel-1',
    projectId: 'project-1',
    title: 'Test Novel',
    author: 'Test Author',
    synopsis: 'Test synopsis',
    genre: 'fantasy',
    tags: [],
    targetAudience: 'general',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  const mockChapters: Chapter[] = [
    {
      id: 'ch-1',
      novelId: 'novel-1',
      title: 'Chapter 1',
      content: JSON.stringify({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'This is chapter 1 content.' }] }]
      }),
      sortOrder: 0,
      wordCount: 100,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'ch-2',
      novelId: 'novel-1',
      title: 'Chapter 2',
      content: JSON.stringify({
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'This is chapter 2 content.' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'With multiple paragraphs.' }] }
        ]
      }),
      sortOrder: 1,
      wordCount: 200,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ]

  const createMockDb = (): IDatabase =>
    ({
      getNovelByProject: vi.fn().mockReturnValue(mockNovel),
      listChapters: vi.fn().mockReturnValue(mockChapters),
      listChaptersWithContent: vi.fn().mockReturnValue(mockChapters)
    }) as unknown as IDatabase

  describe('txt format', () => {
    it('should export project as txt', async () => {
      const db = createMockDb()
      const engine = new ExportEngine(db)

      const result = await engine.exportProject({
        projectId: 'project-1',
        format: 'txt'
      })

      expect(result.content).toContain('Test Novel')
      expect(result.content).toContain('Test Author')
      expect(result.content).toContain('Chapter 1')
      expect(result.content).toContain('This is chapter 1 content.')
      expect(result.filename).toBe('Test Novel.txt')
    })

    it('should include synopsis when requested', async () => {
      const db = createMockDb()
      const engine = new ExportEngine(db)

      const result = await engine.exportProject({
        projectId: 'project-1',
        format: 'txt',
        includeSynopsis: true
      })

      expect(result.content).toContain('Test synopsis')
    })

    it('should extract plain text from TipTap JSON content', async () => {
      const db = createMockDb()
      const engine = new ExportEngine(db)

      const result = await engine.exportProject({
        projectId: 'project-1',
        format: 'txt'
      })

      expect(result.content).not.toContain('"type":"doc"')
      expect(result.content).not.toContain('"type":"paragraph"')
      expect(result.content).toContain('This is chapter 1 content.')
      expect(result.content).toContain('This is chapter 2 content.')
    })
  })

  describe('markdown format', () => {
    it('should export project as markdown', async () => {
      const db = createMockDb()
      const engine = new ExportEngine(db)

      const result = await engine.exportProject({
        projectId: 'project-1',
        format: 'markdown'
      })

      expect(result.content).toContain('# Test Novel')
      expect(result.content).toContain('## Chapter 1')
      expect(result.filename).toBe('Test Novel.md')
    })

    it('should include synopsis in markdown', async () => {
      const db = createMockDb()
      const engine = new ExportEngine(db)

      const result = await engine.exportProject({
        projectId: 'project-1',
        format: 'markdown',
        includeSynopsis: true
      })

      expect(result.content).toContain('Test synopsis')
    })
  })

  describe('html format', () => {
    it('should export project as html', async () => {
      const db = createMockDb()
      const engine = new ExportEngine(db)

      const result = await engine.exportProject({
        projectId: 'project-1',
        format: 'html'
      })

      expect(result.content).toContain('<!DOCTYPE html>')
      expect(result.content).toContain('Test Novel')
      expect(result.content).toContain('<h2>Chapter 1</h2>')
      expect(result.filename).toBe('Test Novel.html')
    })

    it('should escape HTML special characters', async () => {
      const db = createMockDb()
      const novelWithHtml: Novel = {
        ...mockNovel,
        title: 'Test <script>alert("xss")</script> Novel'
      }
      db.getNovelByProject = vi.fn().mockReturnValue(novelWithHtml)

      const engine = new ExportEngine(db)
      const result = await engine.exportProject({
        projectId: 'project-1',
        format: 'html'
      })

      expect(result.content).toContain('&lt;script&gt;')
      expect(result.content).not.toContain('<script>')
    })

    it('should include synopsis in html', async () => {
      const db = createMockDb()
      const engine = new ExportEngine(db)

      const result = await engine.exportProject({
        projectId: 'project-1',
        format: 'html',
        includeSynopsis: true
      })

      expect(result.content).toContain('Test synopsis')
    })
  })

  describe('filter chapters', () => {
    it('should export only selected chapters', async () => {
      const db = createMockDb()
      const engine = new ExportEngine(db)

      const result = await engine.exportProject({
        projectId: 'project-1',
        format: 'txt',
        selectedChapters: ['ch-1']
      })

      expect(result.content).toContain('Chapter 1')
      expect(result.content).not.toContain('Chapter 2')
    })
  })

  describe('corrupted content fallback', () => {
    it('should not leak JSON metadata when content is corrupted', async () => {
      const db = createMockDb()
      const corruptedChapters: Chapter[] = [
        {
          ...mockChapters[0],
          content: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Readable text."}]}]' // missing closing brace
        }
      ]
      db.listChaptersWithContent = vi.fn().mockReturnValue(corruptedChapters)

      const engine = new ExportEngine(db)
      const result = await engine.exportProject({
        projectId: 'project-1',
        format: 'txt'
      })

      expect(result.content).toContain('Readable text.')
      expect(result.content).not.toContain('"type":"doc"')
      expect(result.content).not.toContain('"type":"paragraph"')
    })
  })

  describe('html paragraph structure', () => {
    it('should wrap each paragraph in separate <p> tags', async () => {
      const db = createMockDb()
      const engine = new ExportEngine(db)

      const result = await engine.exportProject({
        projectId: 'project-1',
        format: 'html'
      })

      const paragraphMatches = result.content.match(/<p>[^<]*<\/p>/g)
      expect(paragraphMatches?.length).toBeGreaterThanOrEqual(2)
      expect(result.content).toContain('<p>This is chapter 2 content.</p>')
      expect(result.content).toContain('<p>With multiple paragraphs.</p>')
    })
  })

  describe('error handling', () => {
    it('should throw for unsupported format', async () => {
      const db = createMockDb()
      const engine = new ExportEngine(db)

      await expect(
        engine.exportProject({
          projectId: 'project-1',
          format: 'pdf' as any
        })
      ).rejects.toThrow('不支持的导出格式')
    })
  })

  describe('filename sanitization', () => {
    it('should sanitize filename with special characters', async () => {
      const db = createMockDb()
      const novelWithSpecialChars: Novel = {
        ...mockNovel,
        title: 'Test/Novel: Special*Name?'
      }
      db.getNovelByProject = vi.fn().mockReturnValue(novelWithSpecialChars)

      const engine = new ExportEngine(db)
      const result = await engine.exportProject({
        projectId: 'project-1',
        format: 'txt'
      })

      expect(result.filename).toBe('Test_Novel_ Special_Name_.txt')
    })

    it('should use default name for empty title', async () => {
      const db = createMockDb()
      const novelWithEmptyTitle: Novel = {
        ...mockNovel,
        title: ''
      }
      db.getNovelByProject = vi.fn().mockReturnValue(novelWithEmptyTitle)

      const engine = new ExportEngine(db)
      const result = await engine.exportProject({
        projectId: 'project-1',
        format: 'txt'
      })

      expect(result.filename).toBe('未命名作品.txt')
    })
  })

  describe('novel with null data', () => {
    it('should handle null novel gracefully', async () => {
      const db = createMockDb()
      db.getNovelByProject = vi.fn().mockReturnValue(null)

      const engine = new ExportEngine(db)
      const result = await engine.exportProject({
        projectId: 'project-1',
        format: 'txt'
      })

      expect(result.content).toBeDefined()
      expect(result.filename).toBeDefined()
    })
  })
})
