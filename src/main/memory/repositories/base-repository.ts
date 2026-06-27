import type { Database as SqlJsDatabase } from 'sql.js'
import { LRUCache } from '../lru-cache'
import type { OperationLog } from '../operation-log'

export abstract class BaseRepository {
  protected abstract get db(): SqlJsDatabase

  /**
   * 查询结果缓存。子类按约定 key 存取（如 `byId:${id}`），
   * 写操作后应调用 clearCache() 失效，避免脏读。
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected cache: LRUCache<string, any> = new LRUCache<string, any>(100, 60_000)

  private _operationLog: OperationLog | null = null
  private _saveCallback: (() => void) | null = null

  setOperationLog(log: OperationLog): void {
    this._operationLog = log
  }

  setSaveCallback(cb: () => void): void {
    this._saveCallback = cb
  }

  protected scheduleSave(): void {
    this._saveCallback?.()
  }

  /** 清空本仓库的全部缓存条目（写操作后调用以失效脏数据） */
  protected clearCache(): void {
    this.cache.clear()
  }

  protected transaction<T>(fn: () => T): T {
    this.db.run('BEGIN TRANSACTION')
    try {
      const result = fn()
      this.db.run('COMMIT')
      // 防御性失效：事务中可能包含写操作，避免子类缓存脏读
      this.clearCache()
      return result
    } catch (e) {
      try {
        this.db.run('ROLLBACK')
      } catch {
        /* ignore rollback errors */
      }
      throw e
    }
  }

  protected run(sql: string, params?: unknown[]): void {
    this._operationLog?.append(sql, params)
    this.db.run(sql, params)
    // 通用写入入口：保守失效本仓库全部缓存，避免脏读
    this.clearCache()
  }

  protected query(sql: string, params?: unknown[]): { columns: string[]; values: unknown[][] }[] {
    return this.db.exec(sql, params)
  }

  protected queryOne(sql: string, params?: unknown[]): { columns: string[]; values: unknown[][] } | null {
    const result = this.db.exec(sql, params)
    if (result.length === 0 || result[0].values.length === 0) return null
    return result[0]
  }
}
