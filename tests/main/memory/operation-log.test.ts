import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { OperationLog } from '../../../src/main/memory/operation-log'
import { logger } from '../../../src/main/utils/logger'

describe('OperationLog', () => {
  let tempDir: string
  let logPath: string
  let opLog: OperationLog

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oplog-'))
    logPath = path.join(tempDir, 'test.db')
    opLog = new OperationLog(logPath)
  })

  afterEach(() => {
    opLog.stopAutoFlush()
    opLog.flush()
    if (fs.existsSync(logPath + '.log')) {
      fs.unlinkSync(logPath + '.log')
    }
  })

  it('should append entries and flush to disk', () => {
    opLog.append('INSERT INTO test VALUES (?)', [1])
    opLog.flush()

    const content = fs.readFileSync(logPath + '.log', 'utf-8')
    expect(content.trim()).not.toHaveLength(0)
    const parsed = JSON.parse(content.trim())
    expect(parsed.sql).toBe('INSERT INTO test VALUES (?)')
    expect(parsed.params).toEqual([1])
    expect(parsed.checksum).toBeDefined()
  })

  it('should not flush when pending is empty', () => {
    opLog.flush()
    expect(fs.existsSync(logPath + '.log')).toBe(false)
  })

  it('should clear pending and log file', () => {
    opLog.append('INSERT INTO test VALUES (?)', [1])
    opLog.flush()
    expect(fs.existsSync(logPath + '.log')).toBe(true)

    opLog.clear()
    expect(fs.existsSync(logPath + '.log')).toBe(false)
  })

  it('should sync flush when pending exceeds MAX_PENDING', () => {
    const flushSpy = vi.spyOn(opLog, 'flush')
    for (let i = 0; i < 1001; i++) {
      opLog.append('INSERT INTO test VALUES (?)', [i])
    }
    expect(flushSpy).toHaveBeenCalled()
    flushSpy.mockRestore()
  })

  it('should replay valid entries into a sql.js db', async () => {
    opLog.append('CREATE TABLE replay_test (id INTEGER)')
    opLog.flush()

    const initSqlJs = (await import('sql.js')).default
    const SQL = await initSqlJs()
    const db = new SQL.Database()

    await opLog.replay(db)

    const result = db.exec('SELECT name FROM sqlite_master WHERE type="table" AND name="replay_test"')
    expect(result.length).toBe(1)
    db.close()
  })

  it('should skip replay when log file does not exist', async () => {
    const initSqlJs = (await import('sql.js')).default
    const SQL = await initSqlJs()
    const db = new SQL.Database()

    await opLog.clear()
    await expect(opLog.replay(db)).resolves.toBeUndefined()
    db.close()
  })

  it('should skip entries with checksum mismatch', async () => {
    fs.writeFileSync(logPath + '.log', '{"sql":"CREATE TABLE t (id INTEGER)","params":[],"checksum":"bad"}\n')

    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})
    const initSqlJs = (await import('sql.js')).default
    const SQL = await initSqlJs()
    const db = new SQL.Database()

    await opLog.replay(db)

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('checksum mismatch'), expect.any(String))
    const result = db.exec('SELECT name FROM sqlite_master WHERE type="table" AND name="t"')
    expect(result.length).toBe(0)

    warnSpy.mockRestore()
    db.close()
  })

  it('should skip corrupt log lines', async () => {
    fs.writeFileSync(logPath + '.log', 'this is not json\n')

    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})
    const initSqlJs = (await import('sql.js')).default
    const SQL = await initSqlJs()
    const db = new SQL.Database()

    await opLog.replay(db)

    expect(warnSpy).toHaveBeenCalled()
    warnSpy.mockRestore()
    db.close()
  })
})
