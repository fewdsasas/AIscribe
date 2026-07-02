import { afterEach, describe, expect, it, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import { NovelParser } from '../../../src/main/import/novel-parser'
import { NovelParseError } from '../../../src/main/import/parser-types'
import type { ImportFormat, ParsedNovel, ParserStrategy } from '../../../src/main/import/parser-types'

class FakeTxtStrategy implements ParserStrategy {
  readonly format: ImportFormat = 'txt'
  readonly supportedExtensions = ['.txt'] as const
  parse(): ParsedNovel {
    return { title: 'fake-txt', author: '', chapters: [] }
  }
}

class FakePdfStrategy implements ParserStrategy {
  readonly format: ImportFormat = 'pdf'
  readonly supportedExtensions = ['.pdf'] as const
  parse(): ParsedNovel {
    return { title: 'fake-pdf', author: '', chapters: [] }
  }
}

describe('NovelParser', () => {
  let readFileSyncSpy: ReturnType<typeof vi.spyOn>
  let realpathSpy: ReturnType<typeof vi.spyOn>
  let statSpy: ReturnType<typeof vi.spyOn>

  afterEach(() => {
    readFileSyncSpy?.mockRestore()
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

  it('should parse TXT buffer', async () => {
    const parser = new NovelParser([new FakeTxtStrategy()])
    const novel = await parser.parseBuffer(Buffer.from('第一章 测试\n正文内容。', 'utf-8'), 'txt')
    expect(novel.title).toBe('fake-txt')
  })

  it('should infer format from file extension for parseFile', async () => {
    const parser = new NovelParser([new FakeTxtStrategy()])
    mockValidFile()
    readFileSyncSpy = vi.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from('data'))

    const filePath = path.join(process.cwd(), 'novel.txt')
    const novel = await parser.parseFile(filePath)
    expect(novel.title).toBe('fake-txt')
    expect(readFileSyncSpy).toHaveBeenCalledWith(filePath)
  })

  it('should parse PDF buffer', async () => {
    const parser = new NovelParser([new FakePdfStrategy()])
    const novel = await parser.parseBuffer(Buffer.from('data'), 'pdf')
    expect(novel.title).toBe('fake-pdf')
  })

  it('should throw unsupported_format for unknown extension', async () => {
    const parser = new NovelParser([new FakeTxtStrategy()])
    await expect(parser.parseFile('/tmp/novel.pdf')).rejects.toMatchObject({ code: 'path_forbidden' })
  })

  it('should throw unsupported_format for unknown buffer format', async () => {
    const parser = new NovelParser([new FakeTxtStrategy()])
    await expect(parser.parseBuffer(Buffer.from('data'), 'pdf')).rejects.toMatchObject({ code: 'unsupported_format' })
  })

  it('should throw read_failed when fs.readFileSync fails', async () => {
    const parser = new NovelParser([new FakeTxtStrategy()])
    mockValidFile()
    readFileSyncSpy = vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
      throw new Error('ENOENT')
    })

    const filePath = path.join(process.cwd(), 'missing.txt')
    await expect(parser.parseFile(filePath)).rejects.toThrow(NovelParseError)
    await expect(parser.parseFile(filePath)).rejects.toMatchObject({ code: 'read_failed' })
  })

  it('should throw file_too_large for oversized file', async () => {
    const parser = new NovelParser([new FakeTxtStrategy()])
    mockValidFile(60 * 1024 * 1024)

    const filePath = path.join(process.cwd(), 'novel.txt')
    await expect(parser.parseFile(filePath)).rejects.toMatchObject({ code: 'file_too_large' })
  })

  it('should reject relative path', async () => {
    const parser = new NovelParser([new FakeTxtStrategy()])
    await expect(parser.parseFile('novels/novel.txt')).rejects.toMatchObject({ code: 'path_forbidden' })
  })
})
