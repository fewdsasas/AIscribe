import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import path from 'path'
import fs from 'fs'

vi.mock('electron', () => ({
  app: {
    getPath: () => path.join(__dirname, '../../../temp'),
    on: () => {}
  }
}))

import { Database } from '../../../../src/main/memory/database'
import { testId } from '../../../setup'

describe('ChapterRepository pagination', () => {
  const testDir = path.join(__dirname, '../../../temp')
  const testDbPath = path.join(testDir, `chapter-repo-${testId()}.db`)
  let db: Database

  beforeAll(async () => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true })
    }
    db = await Database.create(testDbPath)
  })

  afterAll(() => {
    try {
      db.close()
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

  async function setupNovel(): Promise<{ projectId: string; novelId: string }> {
    const project = db.createProject({ name: 'Paginate Project', genre: 'fantasy', status: 'planning' })
    const novel = db.createNovel({
      projectId: project.id,
      title: 'Paginate Novel',
      author: 'Test',
      synopsis: '',
      genre: 'fantasy',
      tags: [],
      targetAudience: ''
    })
    return { projectId: project.id, novelId: novel.id }
  }

  it('should return empty page when novel has no chapters', async () => {
    const { novelId } = await setupNovel()
    const page = db.listChaptersPaginated(novelId, 0, 10)
    expect(page.items).toEqual([])
    expect(page.total).toBe(0)
    expect(page.offset).toBe(0)
    expect(page.limit).toBe(10)
  })

  it('should paginate chapters by sort order', async () => {
    const { novelId } = await setupNovel()
    for (let i = 0; i < 25; i++) {
      db.createChapter({ novelId, title: `Chapter ${i + 1}`, sortOrder: i, status: 'draft' })
    }

    const firstPage = db.listChaptersPaginated(novelId, 0, 10)
    expect(firstPage.total).toBe(25)
    expect(firstPage.items.length).toBe(10)
    expect(firstPage.items[0].title).toBe('Chapter 1')
    expect(firstPage.items[9].title).toBe('Chapter 10')

    const secondPage = db.listChaptersPaginated(novelId, 10, 10)
    expect(secondPage.items.length).toBe(10)
    expect(secondPage.items[0].title).toBe('Chapter 11')
    expect(secondPage.items[9].title).toBe('Chapter 20')

    const thirdPage = db.listChaptersPaginated(novelId, 20, 10)
    expect(thirdPage.items.length).toBe(5)
    expect(thirdPage.items[4].title).toBe('Chapter 25')
  })

  it('should clamp negative offset and limit', async () => {
    const { novelId } = await setupNovel()
    db.createChapter({ novelId, title: 'Only Chapter', sortOrder: 0, status: 'draft' })

    const page = db.listChaptersPaginated(novelId, -5, -1)
    expect(page.offset).toBe(0)
    expect(page.limit).toBe(1)
    expect(page.items.length).toBe(1)
  })

  it('should count chapters by novel', async () => {
    const { novelId } = await setupNovel()
    expect(db.countChapters(novelId)).toBe(0)
    db.createChapter({ novelId, title: 'One', sortOrder: 0, status: 'draft' })
    db.createChapter({ novelId, title: 'Two', sortOrder: 1, status: 'draft' })
    expect(db.countChapters(novelId)).toBe(2)
  })

  it('should invalidate paginated cache on write', async () => {
    const { novelId } = await setupNovel()
    db.createChapter({ novelId, title: 'Original', sortOrder: 0, status: 'draft' })

    const page1 = db.listChaptersPaginated(novelId, 0, 10)
    expect(page1.items[0].title).toBe('Original')

    db.updateChapter(page1.items[0].id, { title: 'Updated' })
    const page2 = db.listChaptersPaginated(novelId, 0, 10)
    expect(page2.items[0].title).toBe('Updated')
  })
})
