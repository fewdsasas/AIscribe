import { beforeEach, describe, expect, it, vi } from 'vitest'
import path from 'path'

vi.mock('electron', () => ({
  app: {
    getPath: () => path.join(__dirname, '../../temp/validation-test'),
    on: () => {}
  }
}))

vi.mock('../../../src/main/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() }
}))

import {
  requireEnum,
  requireId,
  requireNonEmptyString,
  requireNonNegativeNumber,
  requireNumber,
  requireObject,
  sanitizeError,
  wrap
} from '../../../src/main/ipc/index'
import { MAX_STRING_LENGTH } from '../../../src/shared/constants'
import { logger } from '../../../src/main/utils/logger'

describe('sanitizeError', () => {
  it('should sanitize api_key_xxxxxxxxxxxx format', () => {
    expect(sanitizeError('api_key_abcdefghijklmnop')).toBe('api_***key-***')
  })

  it('should sanitize openai-key-xxxxxxxxxxxx format', () => {
    expect(sanitizeError('openai-key-abcdefghijklmnop')).toBe('openai-***key-***')
  })

  it('should sanitize pattern within longer message', () => {
    const result = sanitizeError('Error: Invalid key api_key_abcdefghijklmnop provided')
    expect(result).toBe('Error: Invalid key api_***key-*** provided')
  })

  it('should sanitize key_ prefix with exactly 8 alphanumeric chars', () => {
    expect(sanitizeError('key_12345678')).toBe('***key-***')
  })

  it('should not sanitize normal strings without API key patterns', () => {
    expect(sanitizeError('hello world')).toBe('hello world')
  })

  it('should not sanitize short strings', () => {
    expect(sanitizeError('abc')).toBe('abc')
  })

  it('should sanitize sk- prefix patterns', () => {
    expect(sanitizeError('sk-xxxxxxxxxxxxxxxxxx')).toBe('***sk-***')
  })

  it('should handle empty string', () => {
    expect(sanitizeError('')).toBe('')
  })
})

describe('handleIPCError (via wrap)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should call sanitizeError and throw sanitized Error', async () => {
    const wrapped = wrap(() => {
      throw new Error('api_key_abcdefghijklmnop')
    })
    await expect(wrapped({} as any)).rejects.toThrow('***key-***')
  })

  it('should use logger.error to record errors', async () => {
    const wrapped = wrap(() => {
      throw new Error('test error')
    })
    await expect(wrapped({} as any)).rejects.toThrow('test error')
    expect(logger.error).toHaveBeenCalled()
  })

  it('should preserve the original error name', async () => {
    class CustomError extends Error {
      name = 'CustomError'
    }
    const wrapped = wrap(() => {
      throw new CustomError('custom error')
    })
    try {
      await wrapped({} as any)
    } catch (e) {
      expect((e as Error).name).toBe('CustomError')
      expect((e as Error).message).toBe('custom error')
    }
  })

  it('should handle non-Error exceptions like strings', async () => {
    const wrapped = wrap(() => {
      // eslint-disable-next-line no-throw-literal
      throw 'something broke'
    })
    await expect(wrapped({} as any)).rejects.toThrow('something broke')
  })

  it('should handle non-Error exceptions like plain objects', async () => {
    const wrapped = wrap(() => {
      // eslint-disable-next-line no-throw-literal
      throw { code: 500, text: 'server error' }
    })
    await expect(wrapped({} as any)).rejects.toThrow('[object Object]')
  })
})

describe('requireNonEmptyString', () => {
  it('should reject empty string', () => {
    expect(() => requireNonEmptyString('', '标题')).toThrow('标题 不能为空')
  })

  it('should reject whitespace-only string', () => {
    expect(() => requireNonEmptyString('   ', '标题')).toThrow('标题 不能为空')
  })

  it('should reject null', () => {
    expect(() => requireNonEmptyString(null, '标题')).toThrow('标题 不能为空')
  })

  it('should reject undefined', () => {
    expect(() => requireNonEmptyString(undefined, '标题')).toThrow('标题 不能为空')
  })

  it('should reject number', () => {
    expect(() => requireNonEmptyString(123, '标题')).toThrow('标题 不能为空')
  })

  it('should reject strings exceeding MAX_STRING_LENGTH', () => {
    const tooLong = 'a'.repeat(MAX_STRING_LENGTH + 1)
    expect(() => requireNonEmptyString(tooLong, '内容')).toThrow('内容 过长')
  })

  it('should accept strings at MAX_STRING_LENGTH boundary', () => {
    const boundary = 'a'.repeat(MAX_STRING_LENGTH)
    expect(() => requireNonEmptyString(boundary, '内容')).not.toThrow()
  })

  it('should accept a valid non-empty string', () => {
    expect(() => requireNonEmptyString('hello', '标题')).not.toThrow()
  })

  it('should accept a string with leading/trailing whitespace', () => {
    expect(() => requireNonEmptyString('  hello  ', '标题')).not.toThrow()
  })
})

describe('requireId', () => {
  it('should reject empty string', () => {
    expect(() => requireId('', '章节 ID')).toThrow('章节 ID 不能为空')
  })

  it('should reject non-string values', () => {
    expect(() => requireId(null, 'ID')).toThrow('ID 不能为空')
    expect(() => requireId(undefined, 'ID')).toThrow('ID 不能为空')
    expect(() => requireId(123, 'ID')).toThrow('ID 不能为空')
  })

  it('should reject invalid UUID format', () => {
    expect(() => requireId('not-a-uuid', 'ID')).toThrow('ID 格式无效')
  })

  it('should reject UUID with wrong segment lengths', () => {
    expect(() => requireId('550e8400-e29b-41d4-a716-446655440', 'ID')).toThrow('ID 格式无效')
  })

  it('should reject UUID with non-hex characters', () => {
    expect(() => requireId('zzzzzzzz-e29b-41d4-a716-446655440000', 'ID')).toThrow('ID 格式无效')
  })

  it('should accept a valid lowercase UUID', () => {
    expect(() => requireId('550e8400-e29b-41d4-a716-446655440000', 'ID')).not.toThrow()
  })

  it('should accept a valid uppercase UUID', () => {
    expect(() => requireId('550E8400-E29B-41D4-A716-446655440000', 'ID')).not.toThrow()
  })
})

describe('requireObject', () => {
  it('should reject null', () => {
    expect(() => requireObject(null, '数据')).toThrow('数据 格式无效')
  })

  it('should reject undefined', () => {
    expect(() => requireObject(undefined, '数据')).toThrow('数据 格式无效')
  })

  it('should reject arrays', () => {
    expect(() => requireObject([], '数据')).toThrow('数据 格式无效')
    expect(() => requireObject([1, 2, 3], '数据')).toThrow('数据 格式无效')
  })

  it('should reject strings', () => {
    expect(() => requireObject('hello', '数据')).toThrow('数据 格式无效')
  })

  it('should reject numbers', () => {
    expect(() => requireObject(42, '数据')).toThrow('数据 格式无效')
  })

  it('should reject booleans', () => {
    expect(() => requireObject(true, '数据')).toThrow('数据 格式无效')
  })

  it('should accept a plain object', () => {
    expect(() => requireObject({}, '数据')).not.toThrow()
  })

  it('should accept an object with properties', () => {
    expect(() => requireObject({ name: 'test', value: 123 }, '数据')).not.toThrow()
  })
})

describe('requireEnum', () => {
  const allowed = ['a', 'b', 'c'] as const

  it('should reject values not in allowed list', () => {
    expect(() => requireEnum('d', allowed, '类型')).toThrow('类型 必须是以下值之一: a, b, c')
  })

  it('should reject non-string values', () => {
    expect(() => requireEnum(123, allowed, '类型')).toThrow('类型 必须是以下值之一: a, b, c')
    expect(() => requireEnum(null, allowed, '类型')).toThrow('类型 必须是以下值之一: a, b, c')
  })

  it('should accept a value in allowed list', () => {
    expect(() => requireEnum('b', allowed, '类型')).not.toThrow()
  })
})

describe('requireNumber', () => {
  it('should reject non-number values', () => {
    expect(() => requireNumber('123', '时长')).toThrow('时长 必须为数字')
    expect(() => requireNumber(null, '时长')).toThrow('时长 必须为数字')
  })

  it('should reject NaN', () => {
    expect(() => requireNumber(NaN, '时长')).toThrow('时长 必须为数字')
  })

  it('should accept a valid number', () => {
    expect(() => requireNumber(123, '时长')).not.toThrow()
    expect(() => requireNumber(0, '时长')).not.toThrow()
  })
})

describe('requireNonNegativeNumber', () => {
  it('should reject negative numbers', () => {
    expect(() => requireNonNegativeNumber(-1, '时长')).toThrow('时长 不能为负数')
  })

  it('should accept zero', () => {
    expect(() => requireNonNegativeNumber(0, '时长')).not.toThrow()
  })

  it('should accept positive numbers', () => {
    expect(() => requireNonNegativeNumber(100, '时长')).not.toThrow()
  })
})
