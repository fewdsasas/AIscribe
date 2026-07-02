import { afterEach, describe, expect, it, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import { validateImportPath } from '../../../src/main/import/path-validator'

describe('validateImportPath', () => {
  let realpathSpy: ReturnType<typeof vi.spyOn>
  let statSpy: ReturnType<typeof vi.spyOn>

  afterEach(() => {
    realpathSpy?.mockRestore()
    statSpy?.mockRestore()
  })

  function mockValidFile(sizeBytes = 1024): void {
    realpathSpy = vi.spyOn(fs.promises, 'realpath').mockImplementation(async p => String(p))
    statSpy = vi.spyOn(fs.promises, 'stat').mockImplementation(async () => {
      const stats = {
        isFile: () => true,
        size: sizeBytes
      } as unknown as fs.Stats
      return stats
    })
  }

  it('should accept absolute path with allowed extension and valid size', async () => {
    mockValidFile()
    const filePath = path.join(process.cwd(), 'novel.txt')
    await expect(validateImportPath(filePath)).resolves.toBeUndefined()
  })

  it('should reject empty path', async () => {
    await expect(validateImportPath('')).rejects.toMatchObject({ code: 'path_forbidden' })
  })

  it('should reject relative path', async () => {
    await expect(validateImportPath('novels/novel.txt')).rejects.toMatchObject({ code: 'path_forbidden' })
  })

  it('should reject path with traversal segment', async () => {
    mockValidFile()
    // path.join 会提前解析 ..，因此手动构造仍包含 .. 的路径以真正测试遍历检测
    const filePath = process.cwd() + path.sep + '..' + path.sep + 'novel.txt'
    await expect(validateImportPath(filePath)).rejects.toMatchObject({ code: 'path_forbidden' })
  })

  it('should reject disallowed extension', async () => {
    mockValidFile()
    const filePath = path.join(process.cwd(), 'novel.exe')
    await expect(validateImportPath(filePath)).rejects.toMatchObject({ code: 'path_forbidden' })
  })

  it('should reject oversized file', async () => {
    mockValidFile(60 * 1024 * 1024)
    const filePath = path.join(process.cwd(), 'novel.txt')
    await expect(validateImportPath(filePath)).rejects.toMatchObject({ code: 'file_too_large' })
  })

  it('should reject non-file path', async () => {
    realpathSpy = vi.spyOn(fs.promises, 'realpath').mockImplementation(async p => String(p))
    statSpy = vi.spyOn(fs.promises, 'stat').mockImplementation(async () => {
      const stats = {
        isFile: () => false,
        size: 1024
      } as unknown as fs.Stats
      return stats
    })
    const filePath = path.join(process.cwd(), 'novel.txt')
    await expect(validateImportPath(filePath)).rejects.toMatchObject({ code: 'path_forbidden' })
  })

  it('should reject inaccessible file', async () => {
    realpathSpy = vi.spyOn(fs.promises, 'realpath').mockRejectedValue(new Error('ENOENT'))
    const filePath = path.join(process.cwd(), 'novel.txt')
    await expect(validateImportPath(filePath)).rejects.toMatchObject({ code: 'path_forbidden' })
  })

  it('should reject symlink resolved to different path', async () => {
    realpathSpy = vi.spyOn(fs.promises, 'realpath').mockResolvedValue('/resolved/elsewhere.txt')
    const filePath = path.join(process.cwd(), 'novel.txt')
    await expect(validateImportPath(filePath)).rejects.toMatchObject({ code: 'path_forbidden' })
  })

  it('should allow custom max size', async () => {
    mockValidFile(60 * 1024 * 1024)
    const filePath = path.join(process.cwd(), 'novel.txt')
    await expect(validateImportPath(filePath, { maxSizeBytes: 100 * 1024 * 1024 })).resolves.toBeUndefined()
  })
})
