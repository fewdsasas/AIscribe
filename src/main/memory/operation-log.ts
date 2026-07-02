import crypto from 'crypto'
import fs from 'fs'
import readline from 'readline'
import type { Database as SqlJsDatabase } from 'sql.js'
import { logger } from '../utils/logger'
import { deriveKeys } from '../secure-store'

// pending 数组内存风险：无上限增长可能导致 OOM。
// 优化思路：通过 MAX_PENDING 限制条目数，达到上限时同步 flush 落盘后再追加。
// 资源生命周期：pending 在 flush 后清空，日志文件持久化到磁盘。
const MAX_PENDING = 1000

// 操作日志使用 AES-256-GCM 加密，密钥由机器标识派生。
// 这同时解决两个问题：
// 1. 防止攻击者篡改日志注入任意 SQL（完整性）。
// 2. 防止敏感业务数据（章节正文、角色秘密等）以明文落盘（机密性）。
const LOG_ENTRY_VERSION = 2
const SALT_LENGTH = 16
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16
const ALGORITHM = 'aes-256-gcm'

interface LogPayload {
  sql: string
  params: unknown[]
}

// 缓存由 salt 派生的密钥，避免每个条目重复执行 PBKDF2。
const keyCache = new Map<string, Buffer[]>()

function getKeysForSalt(salt: Buffer): Buffer[] {
  const key = salt.toString('base64')
  const cached = keyCache.get(key)
  if (cached) return cached
  const derived = deriveKeys(salt)
  keyCache.set(key, derived)
  return derived
}

function encryptEntry(payload: LogPayload, salt: Buffer, key: Buffer): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const plaintext = JSON.stringify(payload)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  const packed = Buffer.concat([Buffer.from([LOG_ENTRY_VERSION]), salt, iv, authTag, encrypted])
  return packed.toString('base64')
}

function decryptEntry(line: string): LogPayload | null {
  try {
    const packed = Buffer.from(line, 'base64')
    if (packed.length < 1 + SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH + 1) return null
    if (packed[0] !== LOG_ENTRY_VERSION) return null

    const salt = packed.subarray(1, 1 + SALT_LENGTH)
    const iv = packed.subarray(1 + SALT_LENGTH, 1 + SALT_LENGTH + IV_LENGTH)
    const authTag = packed.subarray(1 + SALT_LENGTH + IV_LENGTH, 1 + SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH)
    const encrypted = packed.subarray(1 + SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH)
    const keys = getKeysForSalt(salt)
    for (const key of keys) {
      try {
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
        decipher.setAuthTag(authTag)
        const plaintext = decipher.update(encrypted) + decipher.final('utf8')
        return JSON.parse(plaintext) as LogPayload
      } catch {
        continue
      }
    }
    return null
  } catch {
    return null
  }
}

export class OperationLog {
  private logPath: string
  // 内存缓冲区：累计的待落盘操作条目。flush() 后会被清空，避免长期驻留内存。
  private pending: string[] = []
  private flushTimer: ReturnType<typeof setTimeout> | null = null
  private readonly FLUSH_INTERVAL_MS = 5000
  private readonly salt: Buffer
  private readonly key: Buffer

  constructor(dbPath: string) {
    this.logPath = dbPath + '.log'
    this.salt = crypto.randomBytes(SALT_LENGTH)
    this.key = getKeysForSalt(this.salt)[0]
    this.startAutoFlush()
  }

  append(sql: string, params?: unknown[]): void {
    // 达到上限时先同步落盘，防止 pending 数组无限增长导致 OOM
    if (this.pending.length >= MAX_PENDING) {
      this.flush()
    }
    const encrypted = encryptEntry({ sql, params: params ?? [] }, this.salt, this.key)
    this.pending.push(encrypted)
  }

  // 逐行读取日志文件，避免一次性读入整个文件导致内存峰值过高。
  // 改为 async 以使用 readline 的流式异步迭代；调用方需 await。
  async replay(db: SqlJsDatabase): Promise<void> {
    if (!fs.existsSync(this.logPath)) return
    let legacyDetected = false
    try {
      const rl = readline.createInterface({
        input: fs.createReadStream(this.logPath, { encoding: 'utf-8' }),
        crlfDelay: Infinity
      })
      for await (const line of rl) {
        if (!line.trim()) continue
        // 旧版明文格式（以 { 开头）存在任意 SQL 执行风险，不再回放。
        // 检测到旧格式时跳过并清空日志，避免历史明文条目被注入恶意 SQL。
        if (line.trimStart().startsWith('{')) {
          legacyDetected = true
          logger.warn(
            '[OperationLog] Legacy plaintext entry detected; skipping replay for security. Save your work to persist changes.'
          )
          continue
        }
        try {
          const entry = decryptEntry(line)
          if (!entry) {
            logger.warn('[OperationLog] Entry decryption failed, skipping.')
            continue
          }
          db.run(entry.sql, entry.params)
        } catch (e) {
          logger.warn('Failed to replay operation log entry:', e)
        }
      }
      if (legacyDetected) {
        this.clear()
      }
    } catch (e) {
      logger.warn('Failed to replay operation log:', e)
    }
  }

  flush(): void {
    if (this.pending.length === 0) return
    const lines = this.pending.join('\n') + '\n'
    fs.appendFileSync(this.logPath, lines)
    this.pending = []
  }

  clear(): void {
    this.pending = []
    try {
      if (fs.existsSync(this.logPath)) {
        fs.unlinkSync(this.logPath)
      }
    } catch (e) {
      logger.warn('Failed to clear operation log:', e)
    }
  }

  private startAutoFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flush()
    }, this.FLUSH_INTERVAL_MS)
  }

  stopAutoFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }
  }
}
