import mammoth from 'mammoth'
import { findChapterBoundaries } from '../chapter-heuristic'
import type { ImportFormat, ParsedChapter, ParsedNovel, ParserStrategy } from '../parser-types'
import { NovelParseError } from '../parser-types'
import { countWords, textToTipTapDoc } from '../text-to-tiptap'

export class DocxParserStrategy implements ParserStrategy {
  readonly format: ImportFormat = 'docx'
  readonly supportedExtensions = ['.docx'] as const

  async parse(buffer: Buffer): Promise<ParsedNovel> {
    let html: string
    try {
      const result = await mammoth.convertToHtml({ buffer })
      html = result.value
    } catch (e) {
      throw new NovelParseError('DOCX 文件解析失败', 'parse_failed', e)
    }

    if (!html || html.trim().length === 0) {
      throw new NovelParseError('DOCX 文件内容为空', 'empty_content')
    }

    const paragraphs = this.extractParagraphs(html)
    const boundaries = findChapterBoundaries(paragraphs, {
      threshold: 25,
      leadingParagraphsToDownweight: 2
    })

    const chapters: ParsedChapter[] =
      boundaries.length > 0 ? this.buildChapters(paragraphs, boundaries) : this.fallbackChapter(paragraphs)

    return {
      title: this.extractTitle(paragraphs),
      author: '',
      chapters
    }
  }

  private extractParagraphs(html: string): Array<{ text: string; style?: { tagName?: string; isBold?: boolean } }> {
    const result: Array<{ text: string; style?: { tagName?: string; isBold?: boolean } }> = []
    const tagPattern = /<(\/?)(p|h[1-6])(\b[^>]*)?>/gi
    let lastIndex = 0
    let currentTag: string | undefined

    for (const match of html.matchAll(tagPattern)) {
      const [fullMatch, slash, tagName] = match
      const start = match.index ?? 0
      const textBefore = html.slice(lastIndex, start)
      if (textBefore.trim().length > 0) {
        const text = this.cleanHtml(textBefore)
        if (text.length > 0) {
          result.push({
            text,
            style: currentTag ? this.parseTagStyle(currentTag) : undefined
          })
        }
      }
      currentTag = slash ? undefined : tagName
      lastIndex = start + fullMatch.length
    }

    const trailing = html.slice(lastIndex)
    if (trailing.trim().length > 0) {
      const text = this.cleanHtml(trailing)
      if (text.length > 0) {
        result.push({ text, style: currentTag ? this.parseTagStyle(currentTag) : undefined })
      }
    }

    return result
  }

  private parseTagStyle(tagName: string): { tagName: string; isBold?: boolean } {
    return {
      tagName: tagName.toLowerCase(),
      isBold: /^h[1-6]$/i.test(tagName)
    }
  }

  private cleanHtml(raw: string): string {
    return raw
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim()
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
      throw new NovelParseError('DOCX 中未找到有效章节内容', 'empty_content')
    }
    return [
      {
        title: paragraphs[0]?.text || '导入章节',
        content: textToTipTapDoc(body),
        wordCount: countWords(body.join('\n'))
      }
    ]
  }

  private extractTitle(paragraphs: Array<{ text: string }>): string {
    for (const p of paragraphs.slice(0, 3)) {
      const text = p.text.trim()
      if (text.length > 0 && text.length < 80) return text
    }
    return '未命名小说'
  }
}
