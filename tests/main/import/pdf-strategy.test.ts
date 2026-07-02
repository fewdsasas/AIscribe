import { describe, expect, it, vi } from 'vitest'
import { PdfParserStrategy } from '../../../src/main/import/strategies/pdf-strategy'

const { createMockPDFParse } = vi.hoisted(() => {
  const factory = (pages: Array<{ text: string }>, info?: Record<string, unknown>) => {
    return class {
      async getText() {
        return {
          pages,
          text: pages.map(p => p.text).join('\n'),
          total: pages.length
        }
      }

      async getInfo() {
        return {
          info: info ?? {},
          total: pages.length
        }
      }

      async destroy() {
        // no-op
      }
    }
  }
  return { createMockPDFParse: factory }
})

vi.mock('pdf-parse', () => {
  return {
    PDFParse: createMockPDFParse([
      { text: '第一章 测试\n\n这是正文内容。' },
      { text: '第二章 测试二\n\n更多正文内容。' }
    ])
  }
})

describe('PdfParserStrategy', () => {
  it('should parse PDF and split chapters by heuristic', async () => {
    const strategy = new PdfParserStrategy()
    const novel = await strategy.parse(Buffer.from('fake-pdf'))

    expect(novel.title).toBe('第一章 测试')
    expect(novel.chapters.length).toBeGreaterThan(0)
    expect(novel.chapters[0].title).toBe('第一章 测试')
  })

  it('should use PDF metadata title when available', async () => {
    vi.doMock('pdf-parse', () => {
      return {
        PDFParse: createMockPDFParse([{ text: '正文内容\n\n更多正文内容。' }], { Title: 'PDF 标题' })
      }
    })

    vi.resetModules()
    const { PdfParserStrategy: Strategy } = await import('../../../src/main/import/strategies/pdf-strategy')
    const strategy = new Strategy()
    const novel = await strategy.parse(Buffer.from('fake-pdf'))

    expect(novel.title).toBe('PDF 标题')
  })

  it('should throw empty_content when no text extracted', async () => {
    vi.doMock('pdf-parse', () => {
      return {
        PDFParse: createMockPDFParse([])
      }
    })

    vi.resetModules()
    const { PdfParserStrategy: Strategy } = await import('../../../src/main/import/strategies/pdf-strategy')
    const strategy = new Strategy()
    await expect(strategy.parse(Buffer.from('fake-pdf'))).rejects.toThrow()
    await expect(strategy.parse(Buffer.from('fake-pdf'))).rejects.toMatchObject({ code: 'empty_content' })
  })

  it('should throw parse_failed when PDF parse throws', async () => {
    vi.doMock('pdf-parse', () => {
      return {
        PDFParse: class {
          async getText() {
            throw new Error('parse error')
          }
          async destroy() {
            // no-op
          }
        }
      }
    })

    vi.resetModules()
    const { PdfParserStrategy: Strategy } = await import('../../../src/main/import/strategies/pdf-strategy')
    const strategy = new Strategy()
    await expect(strategy.parse(Buffer.from('fake-pdf'))).rejects.toThrow()
    await expect(strategy.parse(Buffer.from('fake-pdf'))).rejects.toMatchObject({ code: 'parse_failed' })
  })
})
