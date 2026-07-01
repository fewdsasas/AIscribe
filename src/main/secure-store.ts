import { app } from 'electron'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { logger } from './utils/logger'

const ALGORITHM = 'aes-256-gcm'
const SALT_LENGTH = 16
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16
const PBKDF2_ITERATIONS = 100_000
const PBKDF2_KEYLEN = 32
const PBKDF2_DIGEST = 'sha256'
const FILE_VERSION_V2 = Buffer.from('AISC')

function getMachineId(): string {
  return [app.getPath('userData'), process.env.COMPUTERNAME || 'unknown', os.hostname()].join(':')
}

function deriveLegacyKey(material: string): Buffer {
  return crypto.createHash('sha256').update(material).digest()
}

function deriveKey(material: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(material, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST)
}

function isV2Format(payload: Buffer): boolean {
  if (payload.length < 4) return false
  return payload.subarray(0, 4).equals(FILE_VERSION_V2)
}

function deriveKeys(salt: Buffer): Buffer[] {
  const primaryMaterial = getMachineId()
  const fallbackMaterial = [process.env.COMPUTERNAME || 'unknown', os.hostname()].join(':')
  return [deriveKey(primaryMaterial, salt), deriveKey(fallbackMaterial, salt)]
}

function deriveLegacyKeys(): Buffer[] {
  return [
    deriveLegacyKey(getMachineId()),
    deriveLegacyKey([process.env.COMPUTERNAME || 'unknown', os.hostname()].join(':'))
  ]
}

export class SecureStore {
  private filePath: string
  /** Set to true when decryption fails due to bad auth tag (likely machine identity change). */
  readonly loadError: string | null = null

  constructor(fileName: string) {
    this.filePath = path.join(app.getPath('userData'), fileName)
  }

  save(data: Record<string, unknown>): void {
    const salt = crypto.randomBytes(SALT_LENGTH)
    const iv = crypto.randomBytes(IV_LENGTH)
    const key = deriveKeys(salt)[0]
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
    const plaintext = JSON.stringify(data)
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
    const authTag = cipher.getAuthTag()

    const payload = Buffer.concat([FILE_VERSION_V2, salt, iv, authTag, encrypted])
    const tmpPath = this.filePath + '.tmp'
    fs.writeFileSync(tmpPath, payload)
    fs.renameSync(tmpPath, this.filePath)
    ;(this as { loadError: string | null }).loadError = null
  }

  load(): Record<string, unknown> | null {
    if (!fs.existsSync(this.filePath)) return null
    try {
      const payload = fs.readFileSync(this.filePath)

      if (isV2Format(payload)) {
        const salt = payload.subarray(4, 4 + SALT_LENGTH)
        const iv = payload.subarray(4 + SALT_LENGTH, 4 + SALT_LENGTH + IV_LENGTH)
        const authTag = payload.subarray(4 + SALT_LENGTH + IV_LENGTH, 4 + SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH)
        const encrypted = payload.subarray(4 + SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH)

        const keys = deriveKeys(salt)
        for (const key of keys) {
          try {
            const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
            decipher.setAuthTag(authTag)
            const plaintext = decipher.update(encrypted) + decipher.final('utf8')
            return JSON.parse(plaintext)
          } catch {
            continue
          }
        }
      } else {
        const iv = payload.subarray(0, IV_LENGTH)
        const authTag = payload.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
        const encrypted = payload.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

        const keys = deriveLegacyKeys()
        for (const key of keys) {
          try {
            const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
            decipher.setAuthTag(authTag)
            const plaintext = decipher.update(encrypted) + decipher.final('utf8')
            try {
              const parsed = JSON.parse(plaintext)
              this.save(parsed)
              logger.info(`SecureStore(${path.basename(this.filePath)}): migrated from V1 to V2 format`)
            } catch (migrateErr) {
              logger.warn(`SecureStore(${path.basename(this.filePath)}): V1 to V2 migration failed:`, migrateErr)
            }
            return JSON.parse(plaintext)
          } catch {
            continue
          }
        }
      }

      const errorMsg = '配置文件无法解密（可能因设备变更导致密钥不匹配，请重新配置 LLM 提供商）'
      logger.warn(`SecureStore(${path.basename(this.filePath)}): ${errorMsg}`)
      ;(this as { loadError: string | null }).loadError = errorMsg
      return null
    } catch (e) {
      const errorMsg =
        e instanceof Error && e.message.includes('auth')
          ? '配置文件已损坏（认证标签校验失败，请重新配置 LLM 提供商）'
          : `配置文件读取失败: ${(e as Error).message}`
      logger.warn(`SecureStore(${path.basename(this.filePath)}): ${errorMsg}`)
      ;(this as { loadError: string | null }).loadError = errorMsg
      return null
    }
  }

  exists(): boolean {
    return fs.existsSync(this.filePath)
  }

  clear(): void {
    try {
      fs.unlinkSync(this.filePath)
    } catch {
      /* ignore */
    }
  }

  getFilePath(): string {
    return this.filePath
  }
}
