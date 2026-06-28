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

describe('WorldRepository shape fallback', () => {
  const testDir = path.join(__dirname, '../../../temp')
  const testDbPath = path.join(testDir, `world-repo-${testId()}.db`)
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

  it('should fill missing powerSystem fields when stored as empty object', async () => {
    const project = await db.projects.create({ name: 'Shape Project', genre: 'fantasy', status: 'planning' })
    const novel = await db.novels.create({
      projectId: project.id,
      title: 'Shape Novel',
      author: 'Test',
      synopsis: '',
      genre: 'fantasy',
      tags: [],
      targetAudience: ''
    })

    // Directly insert a world with empty power_system JSON
    const sqlDb = (db as any).sqlDb
    sqlDb.run(
      `INSERT INTO worlds (id, novel_id, name, type, geography, history, society, power_system, technology, economy, consistency, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        '12345678-1234-1234-1234-123456789abc',
        novel.id,
        'Shape World',
        'fantasy',
        '{}',
        '[]',
        '{}',
        '{}',
        'medieval',
        '{}',
        '[]',
        new Date().toISOString(),
        new Date().toISOString()
      ]
    )

    const world = db.worlds.getByNovel(novel.id)
    expect(world).not.toBeNull()
    if (!world) throw new Error('world not set')
    expect(world.powerSystem).toBeDefined()
    if (!world.powerSystem) throw new Error('powerSystem expected')
    expect(world.powerSystem.name).toBe('')
    expect(world.powerSystem.rules).toEqual([])
    expect(world.powerSystem.limitations).toEqual([])
    expect(world.powerSystem.costs).toEqual([])
    expect(world.powerSystem.source).toBe('')
  })

  it('should treat null power_system as undefined', async () => {
    const project = await db.projects.create({ name: 'Null Power Project', genre: 'fantasy', status: 'planning' })
    const novel = await db.novels.create({
      projectId: project.id,
      title: 'Null Power Novel',
      author: 'Test',
      synopsis: '',
      genre: 'fantasy',
      tags: [],
      targetAudience: ''
    })

    const sqlDb = (db as any).sqlDb
    sqlDb.run(
      `INSERT INTO worlds (id, novel_id, name, type, geography, history, society, power_system, technology, economy, consistency, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        '12345678-1234-1234-1234-123456789abd',
        novel.id,
        'Null Power World',
        'fantasy',
        '{}',
        '[]',
        '{}',
        null,
        'medieval',
        '{}',
        '[]',
        new Date().toISOString(),
        new Date().toISOString()
      ]
    )

    const world = db.worlds.getByNovel(novel.id)
    expect(world).not.toBeNull()
    if (!world) throw new Error('world not set')
    expect(world.powerSystem).toBeUndefined()
  })

  describe('write entrypoint', () => {
    it('should save world and read back updated value', async () => {
      const project = await db.projects.create({ name: 'Cache Project', genre: 'fantasy', status: 'planning' })
      const novel = await db.novels.create({
        projectId: project.id,
        title: 'Cache Novel',
        author: 'Test',
        synopsis: '',
        genre: 'fantasy',
        tags: [],
        targetAudience: ''
      })

      const saved = db.worlds.save({ novelId: novel.id, name: 'Old World', type: 'fantasy' })
      expect(saved.name).toBe('Old World')

      db.worlds.save({ id: saved.id, novelId: novel.id, name: 'New World', type: 'sci_fi' })
      const updated = db.worlds.getByNovel(novel.id)
      expect(updated).not.toBeNull()
      if (!updated) throw new Error('updated expected')
      expect(updated.name).toBe('New World')
      expect(updated.type).toBe('sci_fi')
    })
  })
})
