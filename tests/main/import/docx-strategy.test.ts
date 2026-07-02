import { afterEach, describe, expect, it, vi } from 'vitest'
import mammoth from 'mammoth'
import { DocxParserStrategy } from '../../../src/main/import/strategies/docx-strategy'
import { NovelParseError } from '../../../src/main/import/parser-types'

describe('DocxParserStrategy', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should parse DOCX with chapter headings', async () => {
    vi.spyOn(mammoth, 'convertToHtml').mockResolvedValue({
      value: '<h1>第一章 测试</h1><p>正文第一段。</p><p>正文第二段。</p><h1>第二章 测试二</h1><p>更多正文。</p>',
      messages: []
    } as never)

    const strategy = new DocxParserStrategy()
    const novel = await strategy.parse(Buffer.from('fake-docx'))

    expect(novel.chapters).toHaveLength(2)
    expect(novel.chapters[0].title).toBe('第一章 测试')
    expect(novel.chapters[0].wordCount).toBeGreaterThan(0)
  })

  it('should fallback to single chapter when no headings', async () => {
    vi.spyOn(mammoth, 'convertToHtml').mockResolvedValue({
      value: '<p>正文第一段。</p><p>正文第二段。</p>',
      messages: []
    } as never)

    const strategy = new DocxParserStrategy()
    const novel = await strategy.parse(Buffer.from('fake-docx'))

    expect(novel.chapters).toHaveLength(1)
    expect(novel.chapters[0].title).toBe('正文第一段。')
  })

  it('should throw empty_content for empty document', async () => {
    vi.spyOn(mammoth, 'convertToHtml').mockResolvedValue({ value: '', messages: [] } as never)

    const strategy = new DocxParserStrategy()

    await expect(strategy.parse(Buffer.from('fake-docx'))).rejects.toThrow(NovelParseError)
    await expect(strategy.parse(Buffer.from('fake-docx'))).rejects.toMatchObject({ code: 'empty_content' })
  })

  it('should throw parse_failed when mammoth throws', async () => {
    vi.spyOn(mammoth, 'convertToHtml').mockRejectedValue(new Error('docx error'))

    const strategy = new DocxParserStrategy()

    await expect(strategy.parse(Buffer.from('fake-docx'))).rejects.toThrow(NovelParseError)
    await expect(strategy.parse(Buffer.from('fake-docx'))).rejects.toMatchObject({ code: 'parse_failed' })
  })
})
