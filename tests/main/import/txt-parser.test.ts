import { describe, expect, it } from 'vitest'
import iconv from 'iconv-lite'
import { parseTxtBuffer } from '../../../src/main/import/txt-parser'
import { NovelParseError } from '../../../src/main/import/parser-types'

describe('parseTxtBuffer', () => {
  it('should parse UTF-8 TXT with Chinese chapter titles', async () => {
    const text = '星辰变\n' + '第一章 秦羽\n' + '天空一声巨响。\n' + '第二章 修炼\n' + '开始修炼之路。'
    const buffer = Buffer.from(text, 'utf-8')
    const novel = parseTxtBuffer(buffer)

    expect(novel.title).toBe('星辰变')
    expect(novel.author).toBe('')
    expect(novel.chapters).toHaveLength(2)
    expect(novel.chapters[0].title).toBe('第一章 秦羽')
    expect(novel.chapters[1].title).toBe('第二章 修炼')
    expect(novel.chapters[0].wordCount).toBeGreaterThan(0)
  })

  it('should parse GBK encoded TXT', async () => {
    const text = '第一章 测试\n这是正文内容。'
    const buffer = iconv.encode(text, 'gbk')
    const novel = parseTxtBuffer(buffer)

    expect(novel.chapters).toHaveLength(1)
    expect(novel.chapters[0].title).toBe('第一章 测试')
  })

  it('should fallback to fixed-size chunks when no chapter markers', async () => {
    const paragraph = '这是一段没有章节标记的正文内容。'.repeat(100)
    const buffer = Buffer.from(paragraph, 'utf-8')
    const novel = parseTxtBuffer(buffer)

    expect(novel.chapters.length).toBeGreaterThan(0)
    expect(novel.chapters[0].title).toMatch(/^第 \d+ 部分$/)
  })

  it('should strip BOM and normalize line endings', async () => {
    const text = '\uFEFF第一章 开始\r\n正文内容。\r\n第二章 结束\r正文。'
    const buffer = Buffer.from(text, 'utf-8')
    const novel = parseTxtBuffer(buffer)

    expect(novel.chapters).toHaveLength(2)
    expect(novel.chapters[0].title).toBe('第一章 开始')
  })

  it('should throw empty_content for empty buffer', async () => {
    const buffer = Buffer.from('')
    expect(() => parseTxtBuffer(buffer)).toThrow(NovelParseError)
    try {
      parseTxtBuffer(buffer)
    } catch (e) {
      expect(e).toBeInstanceOf(NovelParseError)
      expect((e as NovelParseError).code).toBe('empty_content')
    }
  })

  it('should produce TipTap JSON content', async () => {
    const text = '第一章 测试\n这是第一段。\n这是第二段。'
    const buffer = Buffer.from(text, 'utf-8')
    const novel = parseTxtBuffer(buffer)

    const doc = JSON.parse(novel.chapters[0].content)
    expect(doc.type).toBe('doc')
    expect(doc.content).toHaveLength(2)
    expect(doc.content[0].type).toBe('paragraph')
    expect(doc.content[0].content[0].text).toBe('这是第一段。')
  })
})
