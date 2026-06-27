import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Database } from '../../../../src/main/memory/database'
import { BaseRepository } from '../../../../src/main/memory/repositories/base-repository'
import path from 'path'
import fs from 'fs'

class TestRepository extends BaseRepository {
  private _db: any
  constructor(db: any) {
    super()
    this._db = db
  }
  protected get db(): any {
    return this._db
  }
  // Expose protected members for testing
  public exposeTransaction<T>(fn: () => T): T {
    return this.transaction(fn)
  }
  public exposeRun(sql: string, params?: unknown[]): void {
    this.run(sql, params)
  }
  public exposeQueryOne(sql: string, params?: unknown[]): { columns: string[]; values: unknown[][] } | null {
    return this.queryOne(sql, params)
  }
  public exposeScheduleSave(): void {
    this.scheduleSave()
  }
}

describe('BaseRepository', () => {
  const testDir = path.join(__dirname, '../../temp')
  const testDbPath = path.join(testDir, 'base-repo-test.db')
  let db: Database
  let repo: TestRepository

  beforeAll(async () => {
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true })
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath)
      } catch {
        /* ignore */
      }
    }
    db = await Database.create(testDbPath)
    repo = new TestRepository((db as any).sqlDb)
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

  describe('transaction', () => {
    it('should commit successful transaction', () => {
      const result = repo.exposeTransaction(() => {
        repo.exposeRun('CREATE TABLE IF NOT EXISTS test_txn (id INTEGER PRIMARY KEY, val TEXT)')
        repo.exposeRun('INSERT INTO test_txn (id, val) VALUES (1, "committed")')
        return 'success'
      })
      expect(result).toBe('success')

      const rows = repo.exposeQueryOne('SELECT val FROM test_txn WHERE id = 1')
      expect(rows).not.toBeNull()
      if (!rows) throw new Error('rows not set')
      expect(rows.values[0][0]).toBe('committed')
    })

    it('should rollback on error inside transaction', () => {
      repo.exposeRun('CREATE TABLE IF NOT EXISTS test_txn_rb (id INTEGER PRIMARY KEY, val TEXT NOT NULL)')

      try {
        repo.exposeTransaction(() => {
          repo.exposeRun('INSERT INTO test_txn_rb (id, val) VALUES (1, "before-error")')
          throw new Error('intentional error')
        })
      } catch (e) {
        expect((e as Error).message).toBe('intentional error')
      }

      const rows = repo.exposeQueryOne('SELECT * FROM test_txn_rb WHERE id = 1')
      expect(rows).toBeNull()
    })

    it('should return computed value from transaction', () => {
      const result = repo.exposeTransaction(() => {
        return 42
      })
      expect(result).toBe(42)
    })
  })

  describe('setSaveCallback + scheduleSave', () => {
    it('should invoke save callback when scheduleSave is called', () => {
      let called = false
      repo.setSaveCallback(() => {
        called = true
      })
      repo.exposeScheduleSave()
      expect(called).toBe(true)
    })

    it('should not crash when no save callback is set', () => {
      const freshRepo = new TestRepository((db as any).sqlDb)
      freshRepo.exposeScheduleSave()
    })
  })

  describe('queryOne', () => {
    it('should return null for empty result', () => {
      const result = repo.exposeQueryOne('SELECT * FROM test_txn WHERE id = 9999')
      expect(result).toBeNull()
    })

    it('should return first result set row', () => {
      const result = repo.exposeQueryOne('SELECT val FROM test_txn WHERE id = 1')
      expect(result).not.toBeNull()
      if (!result) throw new Error('result not set')
      expect(result.columns).toContain('val')
      expect(result.values.length).toBe(1)
    })
  })

  describe('run', () => {
    it('should execute SQL without error', () => {
      repo.exposeRun('CREATE TABLE IF NOT EXISTS test_run (id INTEGER PRIMARY KEY)')
      repo.exposeRun('INSERT INTO test_run (id) VALUES (100)')
      const rows = repo.exposeQueryOne('SELECT id FROM test_run WHERE id = 100')
      expect(rows).not.toBeNull()
      if (!rows) throw new Error('rows not set')
      expect(rows.values[0][0]).toBe(100)
    })
  })
})
