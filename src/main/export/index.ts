import type { IDatabase } from '../di'
import type { Chapter, Novel } from '../../shared/types'
import { logger } from '../utils/logger'

export type ExportFormat = 'txt' | 'markdown' | 'html'

export interface ExportOptions {
  projectId: string
  format: ExportFormat
  includeSynopsis?: boolean
  selectedChapters?: string[] // chapter IDs, omit for all
}

function getNovelAndChapters(db: IDatabase, projectId: string): { novel: Novel | null; chapters: Chapter[] } {
  const novel = db.getNovelByProject(projectId) ?? null
  // 导出需要章节正文，使用 listChaptersWithContent 获取完整内容
  const chapters = novel ? db.listChaptersWithContent(novel.id) : []
  return { novel, chapters }
}

function filterChapters(chapters: Chapter[], selectedChapters?: string[]): Chapter[] {
  if (!selectedChapters || selectedChapters.length === 0) return chapters
  return chapters.filter(c => selectedChapters.includes(c.id))
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function tryExtractTextFromCorrupted(content: string): string {
  const texts: string[] = []
  // Only extract text from TipTap text nodes ({"type":"text","text":"..."})
  // to avoid leaking metadata/comment nodes that also contain a "text" field.
  const regex = /\{\s*"type"\s*:\s*"text"(?:[^{}]|\{[^{}]*\})*"text"\s*:\s*"((?:\\.|[^"\\])*)"/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(content)) !== null) {
    texts.push(match[1].replace(/\\"/g, '"').replace(/\\n/g, '\n'))
  }
  return texts.join('')
}

function extractTextFromContent(content: string): string {
  if (!content) return ''
  try {
    const parsed = JSON.parse(content)
    if (typeof parsed === 'string') return parsed
    return extractTipTapText(parsed)
  } catch {
    const extracted = tryExtractTextFromCorrupted(content)
    if (extracted) return extracted
    logger.warn('[export] Failed to parse chapter content as JSON, returning empty text')
    return ''
  }
}

function extractTipTapText(node: Record<string, unknown>): string {
  if (node.text && typeof node.text === 'string') return node.text
  const children = node.content
  if (Array.isArray(children)) {
    const isParagraph = node.type === 'paragraph'
    const texts = children.map(child => extractTipTapText(child as Record<string, unknown>))
    return isParagraph ? texts.join('') + '\n' : texts.join('')
  }
  return ''
}

function generateTxt(novel: Novel | null, chapters: Chapter[], options: ExportOptions): string {
  const lines: string[] = []

  if (novel) {
    lines.push(novel.title)
    lines.push('='.repeat(novel.title.length))
    lines.push('')
    lines.push(`作者: ${novel.author || '佚名'}`)
    lines.push(`类型: ${novel.genre}`)
    if (options.includeSynopsis && novel.synopsis) {
      lines.push('')
      lines.push(novel.synopsis)
    }
    lines.push('')
    lines.push('---')
    lines.push('')
  }

  const filtered = filterChapters(chapters, options.selectedChapters)

  for (const chapter of filtered) {
    lines.push(chapter.title)
    lines.push('-'.repeat(chapter.title.length))
    lines.push('')
    const text = extractTextFromContent(chapter.content)
    lines.push(text)
    lines.push('')
  }

  return lines.join('\n')
}

function generateMarkdown(novel: Novel | null, chapters: Chapter[], options: ExportOptions): string {
  const lines: string[] = []

  if (novel) {
    lines.push(`# ${novel.title}`)
    lines.push('')
    lines.push(`> **作者**: ${novel.author || '佚名'}  ·  **类型**: ${novel.genre}`)
    if (options.includeSynopsis && novel.synopsis) {
      lines.push('')
      lines.push(novel.synopsis)
    }
    lines.push('')
  }

  const filtered = filterChapters(chapters, options.selectedChapters)

  for (const chapter of filtered) {
    lines.push(`## ${chapter.title}`)
    lines.push('')
    const text = extractTextFromContent(chapter.content)
    lines.push(text)
    lines.push('')
  }

  return lines.join('\n')
}

function generateHtml(novel: Novel | null, chapters: Chapter[], options: ExportOptions): string {
  const parts: string[] = [
    '<!DOCTYPE html>',
    '<html lang="zh-CN"><head><meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    novel ? `<title>${escapeHtml(novel.title)}</title>` : '<title>导出作品</title>',
    '<style>',
    'body { max-width: 720px; margin: 0 auto; padding: 2em; font-family: "Noto Serif SC", Georgia, serif; font-size: 16px; line-height: 1.9; color: #2c2c2c; background: #fcfaf7; }',
    'h1 { text-align: center; font-size: 1.8em; margin-bottom: 0.5em; color: #1a1a1a; }',
    'h2 { font-size: 1.3em; margin-top: 2em; border-bottom: 1px solid #e0ddd7; padding-bottom: 0.3em; color: #2c2c2c; }',
    '.meta { text-align: center; color: #888; font-size: 0.9em; margin-bottom: 2em; }',
    '.synopsis { background: #f5f2ed; padding: 1em; border-radius: 6px; margin-bottom: 2em; font-size: 0.9em; color: #555; }',
    'p { text-indent: 2em; margin: 0.5em 0; }',
    '</style></head><body>'
  ]

  if (novel) {
    parts.push(`<h1>${escapeHtml(novel.title)}</h1>`)
    parts.push(`<p class="meta">${escapeHtml(novel.author || '佚名')} · ${escapeHtml(novel.genre)}</p>`)
    if (options.includeSynopsis && novel.synopsis) {
      parts.push(`<div class="synopsis">${escapeHtml(novel.synopsis)}</div>`)
    }
  }

  const filtered = filterChapters(chapters, options.selectedChapters)

  for (const chapter of filtered) {
    parts.push(`<h2>${escapeHtml(chapter.title)}</h2>`)
    const text = extractTextFromContent(chapter.content)
    const paragraphs = text.split('\n').filter(p => p.trim())
    for (const p of paragraphs) {
      if (p.trim()) parts.push(`<p>${escapeHtml(p.trim())}</p>`)
    }
  }

  parts.push('</body></html>')
  return parts.join('\n')
}

export class ExportEngine {
  private db: IDatabase

  constructor(db: IDatabase) {
    this.db = db
  }

  async exportProject(options: ExportOptions): Promise<{ content: string; filename: string }> {
    const { novel, chapters } = getNovelAndChapters(this.db, options.projectId)

    let content: string
    let extension: string

    switch (options.format) {
      case 'txt':
        content = generateTxt(novel, chapters, options)
        extension = 'txt'
        break
      case 'markdown':
        content = generateMarkdown(novel, chapters, options)
        extension = 'md'
        break
      case 'html':
        content = generateHtml(novel, chapters, options)
        extension = 'html'
        break
      default:
        throw new Error(`不支持的导出格式: ${options.format}`)
    }

    // Sanitize filename: remove path separators, control chars, and non-filename characters
    const safeTitle =
      (novel?.title ?? '未命名作品')
        .replace(/[\x00-\x1f\x7f]/g, '') // Remove control characters
        .replace(/[/\\:*?"<>|]/g, '_') // Replace path separators and special chars
        .replace(/^\.+/, '') // Prevent hidden filenames
        .replace(/\.+$/, '') // Remove trailing dots
        .replace(/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\..*)?$/i, '_$1$2') // Windows reserved names
        .substring(0, 100) || '未命名作品'
    const filename = `${safeTitle}.${extension}`
    return { content, filename }
  }
}
