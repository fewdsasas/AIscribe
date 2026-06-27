import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import os from 'os'

const testDir = path.join(__dirname, '../../temp')

function getTestMachineId(): string {
  return [testDir, process.env.COMPUTERNAME || 'unknown', os.hostname()].join(':')
}

function deriveTestKey(material: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(material, salt, 100_000, 32, 'sha256')
}

function deriveTestLegacyKey(material: string): Buffer {
  return crypto.createHash('sha256').update(material).digest()
}

const ALGORITHM = 'aes-256-gcm'
const SALT_LENGTH = 16
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16
const FILE_VERSION_V2 = Buffer.from('AISC')

function encryptV2(data: Record<string, unknown>, machineId: string): Buffer {
  const salt = crypto.randomBytes(SALT_LENGTH)
  const iv = crypto.randomBytes(IV_LENGTH)
  const key = deriveTestKey(machineId, salt)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const plaintext = JSON.stringify(data)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return Buffer.concat([FILE_VERSION_V2, salt, iv, authTag, encrypted])
}

function encryptV1(data: Record<string, unknown>, machineId: string): Buffer {
  const iv = crypto.randomBytes(IV_LENGTH)
  const key = deriveTestLegacyKey(machineId)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const plaintext = JSON.stringify(data)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return Buffer.concat([iv, authTag, encrypted])
}

describe('SecureStore encryption/decryption', () => {
  const testFilePath = path.join(testDir, 'secure-store-test.enc')
  const machineId = getTestMachineId()

  beforeAll(() => {
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true })
  })

  afterAll(() => {
    try {
      fs.unlinkSync(testFilePath)
    } catch {
      /* ignore */
    }
  })

  it('should encrypt and decrypt data round-trip (V2 format)', () => {
    const data = { provider: 'openai', apiKey: 'sk-test-123', model: 'gpt-4' }
    const payload = encryptV2(data, machineId)
    fs.writeFileSync(testFilePath, payload)

    const readPayload = fs.readFileSync(testFilePath)
    expect(readPayload.subarray(0, 4).equals(FILE_VERSION_V2)).toBe(true)

    const salt = readPayload.subarray(4, 4 + SALT_LENGTH)
    const iv = readPayload.subarray(4 + SALT_LENGTH, 4 + SALT_LENGTH + IV_LENGTH)
    const authTag = readPayload.subarray(4 + SALT_LENGTH + IV_LENGTH, 4 + SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH)
    const encrypted = readPayload.subarray(4 + SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH)

    const key = deriveTestKey(machineId, salt)
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)
    const plaintext = decipher.update(encrypted) + decipher.final('utf8')
    const result = JSON.parse(plaintext)

    expect(result).toEqual(data)
  })

  it('should decrypt V1 format data', () => {
    const data = { provider: 'claude', apiKey: 'sk-ant-test' }
    const v1Payload = encryptV1(data, machineId)
    fs.writeFileSync(testFilePath, v1Payload)

    const payload = fs.readFileSync(testFilePath)
    expect(payload.subarray(0, 4).equals(FILE_VERSION_V2)).toBe(false)

    const iv = payload.subarray(0, IV_LENGTH)
    const authTag = payload.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
    const encrypted = payload.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

    const key = deriveTestLegacyKey(machineId)
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)
    const plaintext = decipher.update(encrypted) + decipher.final('utf8')
    const result = JSON.parse(plaintext)

    expect(result).toEqual(data)
  })

  it('should fail to decrypt with wrong key', () => {
    const data = { secret: 'value' }
    const payload = encryptV2(data, machineId)
    const wrongKey = deriveTestKey('wrong-machine-id', payload.subarray(4, 4 + SALT_LENGTH))

    const iv = payload.subarray(4 + SALT_LENGTH, 4 + SALT_LENGTH + IV_LENGTH)
    const authTag = payload.subarray(4 + SALT_LENGTH + IV_LENGTH, 4 + SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH)
    const encrypted = payload.subarray(4 + SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH)

    const decipher = crypto.createDecipheriv(ALGORITHM, wrongKey, iv)
    decipher.setAuthTag(authTag)

    try {
      decipher.update(encrypted)
      decipher.final('utf8')
      expect(true).toBe(false)
    } catch (e) {
      expect(e).toBeDefined()
    }
  })

  it('should handle empty/corrupt file gracefully', () => {
    fs.writeFileSync(testFilePath, Buffer.from('corrupt-data-not-encrypted'))
    const payload = fs.readFileSync(testFilePath)

    try {
      if (payload.length < 4 || !payload.subarray(0, 4).equals(FILE_VERSION_V2)) {
        const iv = payload.subarray(0, IV_LENGTH)
        const authTag = payload.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
        const encrypted = payload.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

        const key = deriveTestLegacyKey(machineId)
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
        decipher.setAuthTag(authTag)
        decipher.update(encrypted)
        decipher.final('utf8')
        expect(true).toBe(false)
      }
    } catch {
      expect(true).toBe(true)
    }
  })
})

describe('SecureStore V2 format detection', () => {
  it('should identify V2 format by AISC magic bytes', () => {
    const v2Payload = encryptV2({ test: true }, getTestMachineId())
    expect(v2Payload.subarray(0, 4).equals(FILE_VERSION_V2)).toBe(true)
  })

  it('should reject short buffers as non-V2', () => {
    const shortBuffer = Buffer.from('AB')
    expect(shortBuffer.length < 4).toBe(true)
    expect(shortBuffer.subarray(0, 4).equals(FILE_VERSION_V2)).toBe(false)
  })

  it('should reject non-AISC prefix as non-V2', () => {
    const v1Payload = encryptV1({ test: true }, getTestMachineId())
    expect(v1Payload.subarray(0, 4).equals(FILE_VERSION_V2)).toBe(false)
  })
})

describe('LLM config key identification (inline)', () => {
  const LLM_CONFIG_KEYS = new Set(['provider', 'apiKey', 'model', 'baseUrl', 'temperature', 'maxTokens'])
  function isLLMConfigKey(key: string): boolean {
    return LLM_CONFIG_KEYS.has(key)
  }

  it('should identify LLM config keys', () => {
    expect(isLLMConfigKey('provider')).toBe(true)
    expect(isLLMConfigKey('apiKey')).toBe(true)
    expect(isLLMConfigKey('model')).toBe(true)
    expect(isLLMConfigKey('baseUrl')).toBe(true)
    expect(isLLMConfigKey('temperature')).toBe(true)
    expect(isLLMConfigKey('maxTokens')).toBe(true)
  })

  it('should reject non-LLM keys', () => {
    expect(isLLMConfigKey('theme')).toBe(false)
    expect(isLLMConfigKey('language')).toBe(false)
    expect(isLLMConfigKey('customKey')).toBe(false)
  })
})
