import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { OperationLog } from '../../../src/main/memory/operation-log'
import { logger } from '../../../src/main/utils/logger'

vi.mock('electron', () => ({
  app: { getPath: () => '/mock/userData', on: () => {} }
}))

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

  it('should append entries and flush to disk in encrypted format', () => {
    opLog.append('INSERT INTO test VALUES (?)', [1])
    opLog.flush()

    const content = fs.readFileSync(logPath + '.log', 'utf-8')
    expect(content.trim()).not.toHaveLength(0)
    // Encrypted entries are base64 strings, not plaintext JSON
    const line = content.trim()
    expect(line).not.toContain('INSERT INTO test')
    expect(Buffer.from(line, 'base64').length).toBeGreaterThan(0)
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

  it('should skip entries with tampered ciphertext', async () => {
    opLog.append('CREATE TABLE t (id INTEGER)')
    opLog.flush()

    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})
    const initSqlJs = (await import('sql.js')).default
    const SQL = await initSqlJs()
    const db = new SQL.Database()

    // Tamper the ciphertext: flip a byte in the encrypted portion and re-encode.
    // Layout: [version:1][salt:16][iv:16][authTag:16][encrypted...]
    const original = fs.readFileSync(logPath + '.log', 'utf-8').trim()
    const packed = Buffer.from(original, 'base64')
    const encryptedOffset = 1 + 16 + 16 + 16
    if (packed.length > encryptedOffset) {
      packed[packed.length - 1] ^= 0xff
    }
    fs.writeFileSync(logPath + '.log', packed.toString('base64') + '\n')

    await opLog.replay(db)

    expect(warnSpy).toHaveBeenCalledWith('[OperationLog] Entry decryption failed, skipping.')
    const result = db.exec('SELECT name FROM sqlite_master WHERE type="table" AND name="t"')
    expect(result.length).toBe(0) // tampered entry was skipped

    warnSpy.mockRestore()
    db.close()
  })

  it('should skip legacy plaintext entries and clear the log', async () => {
    fs.writeFileSync(logPath + '.log', '{"sql":"CREATE TABLE legacy (id INTEGER)","params":[],"checksum":"bad"}\n')

    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})
    const initSqlJs = (await import('sql.js')).default
    const SQL = await initSqlJs()
    const db = new SQL.Database()

    await opLog.replay(db)

    expect(warnSpy).toHaveBeenCalledWith(
      '[OperationLog] Legacy plaintext entry detected; skipping replay for security. Save your work to persist changes.'
    )
    const result = db.exec('SELECT name FROM sqlite_master WHERE type="table" AND name="legacy"')
    expect(result.length).toBe(0)
    expect(fs.existsSync(logPath + '.log')).toBe(false)

    warnSpy.mockRestore()
    db.close()
  })

  it('should skip corrupt log lines', async () => {
    fs.writeFileSync(logPath + '.log', 'this-is-not-valid-base64!!!\n')

    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})
    const initSqlJs = (await import('sql.js')).default
    const SQL = await initSqlJs()
    const db = new SQL.Database()

    await opLog.replay(db)

    expect(warnSpy).toHaveBeenCalledWith('[OperationLog] Entry decryption failed, skipping.')
    warnSpy.mockRestore()
    db.close()
  })
})
