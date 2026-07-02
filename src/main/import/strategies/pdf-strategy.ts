import { PDFParse } from 'pdf-parse'
import { findChapterBoundaries } from '../chapter-heuristic'
import type { ImportFormat, ParsedChapter, ParsedNovel, ParserStrategy } from '../parser-types'
import { NovelParseError } from '../parser-types'
import { countWords, textToTipTapDoc } from '../text-to-tiptap'

export class PdfParserStrategy implements ParserStrategy {
  readonly format: ImportFormat = 'pdf'
  readonly supportedExtensions = ['.pdf'] as const

  async parse(buffer: Buffer): Promise<ParsedNovel> {
    let parser: PDFParse
    try {
      parser = new PDFParse({ data: buffer })
    } catch (e) {
      throw new NovelParseError('PDF 文件初始化失败', 'parse_failed', e)
    }

    let textResult: Awaited<ReturnType<typeof parser.getText>>
    let infoResult: Awaited<ReturnType<typeof parser.getInfo>> | undefined

    try {
      textResult = await parser.getText()
      infoResult = await parser.getInfo()
    } catch (e) {
      throw new NovelParseError('PDF 文件解析失败', 'parse_failed', e)
    } finally {
      await parser.destroy().catch(() => {
        // ignore cleanup errors
      })
    }

    const pages = textResult.pages
    if (!pages || pages.length === 0) {
      throw new NovelParseError('PDF 文件内容为空', 'empty_content')
    }

    const paragraphs: { text: string }[] = []
    for (const page of pages) {
      const pageParagraphs = page.text
        .split(/\n\s*\n/)
        .map(p => p.replace(/\s+/g, ' ').trim())
        .filter(p => p.length > 0)
      paragraphs.push(...pageParagraphs.map(text => ({ text })))
    }

    if (paragraphs.length === 0) {
      throw new NovelParseError('PDF 文件内容为空', 'empty_content')
    }

    const boundaries = findChapterBoundaries(paragraphs, {
      threshold: 30,
      leadingParagraphsToDownweight: 3
    })

    const chapters: ParsedChapter[] =
      boundaries.length > 0 ? this.buildChapters(paragraphs, boundaries) : this.fallbackChapter(paragraphs)

    return {
      title: this.extractTitle(infoResult, paragraphs),
      author: this.extractAuthor(infoResult),
      synopsis: undefined,
      chapters
    }
  }

  private buildChapters(paragraphs: Array<{ text: string }>, boundaries: number[]): ParsedChapter[] {
    const chapters: ParsedChapter[] = []
    for (let i = 0; i < boundaries.length; i++) {
      const start = boundaries[i]
      const end = i + 1 < boundaries.length ? boundaries[i + 1] : paragraphs.length
      const title = paragraphs[start].text
      const body = paragraphs.slice(start + 1, end).map(p => p.text)
      if (body.length === 0) continue
      chapters.push({
        title,
        content: textToTipTapDoc(body),
        wordCount: countWords(body.join('\n'))
      })
    }
    return chapters
  }

  private fallbackChapter(paragraphs: Array<{ text: string }>): ParsedChapter[] {
    const body = paragraphs.slice(1).map(p => p.text)
    if (body.length === 0) {
      throw new NovelParseError('PDF 中未找到有效章节内容', 'empty_content')
    }
    return [
      {
        title: paragraphs[0]?.text || '导入章节',
        content: textToTipTapDoc(body),
        wordCount: countWords(body.join('\n'))
      }
    ]
  }

  private extractTitle(
    info: Awaited<ReturnType<PDFParse['getInfo']>> | undefined,
    paragraphs: Array<{ text: string }>
  ): string {
    const infoTitle = info?.info?.Title
    if (typeof infoTitle === 'string' && infoTitle.trim().length > 0) {
      return infoTitle.trim()
    }
    for (const p of paragraphs.slice(0, 3)) {
      const text = p.text.trim()
      if (text.length > 0 && text.length < 80) return text
    }
    return '未命名小说'
  }

  private extractAuthor(info: Awaited<ReturnType<PDFParse['getInfo']>> | undefined): string {
    const author = info?.info?.Author
    return typeof author === 'string' ? author.trim() : ''
  }
}
