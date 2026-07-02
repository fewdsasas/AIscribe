import iconv from 'iconv-lite'
import * as jschardet from 'jschardet'
import { findChapterBoundaries } from './chapter-heuristic'
import type { ParsedChapter, ParsedNovel } from './parser-types'
import { NovelParseError } from './parser-types'
import { countWords, textToTipTapDoc } from './text-to-tiptap'

const FALLBACK_CHUNK_SIZE = 3000

function detectEncoding(buffer: Buffer): string {
  const result = jschardet.detect(buffer)
  if (!result || result.confidence < 0.5 || !result.encoding) {
    return 'utf-8'
  }
  const normalized = result.encoding.toLowerCase().replace(/[_-]/g, '')
  if (normalized === 'ascii') return 'utf-8'
  // Map common aliases to iconv-lite supported names.
  if (normalized === 'gb2312' || normalized === 'gbk') return 'gbk'
  if (normalized === 'big5') return 'big5'
  if (normalized === 'shiftjis') return 'shift_jis'
  if (normalized === 'eucjp') return 'euc-jp'
  if (normalized === 'euckr') return 'euc-kr'
  return result.encoding
}

function decodeBuffer(buffer: Buffer): string {
  const encoding = detectEncoding(buffer)
  try {
    return iconv.decode(buffer, encoding)
  } catch (e) {
    throw new NovelParseError(`文本解码失败（编码: ${encoding}）`, 'decode_failed', e)
  }
}

function normalizeText(text: string): string {
  return text
    .replace(/^\uFEFF/, '') // Remove BOM
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim()
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0)
}

function isTitleCandidate(p: string): boolean {
  return p.length > 0 && p.length < 80
}

function tryExtractTitle(paragraphs: string[]): string {
  for (const p of paragraphs.slice(0, 5)) {
    if (isTitleCandidate(p)) {
      return p.trim()
    }
  }
  return '未命名小说'
}

function splitIntoChapters(paragraphs: string[]): { title: string; paragraphs: string[] }[] {
  const boundaries = findChapterBoundaries(
    paragraphs.map(text => ({ text })),
    { threshold: 30, leadingParagraphsToDownweight: 3 }
  )

  if (boundaries.length === 0) {
    return []
  }

  const chapters: { title: string; paragraphs: string[] }[] = []
  for (let i = 0; i < boundaries.length; i++) {
    const start = boundaries[i]
    const end = i + 1 < boundaries.length ? boundaries[i + 1] : paragraphs.length
    const title = paragraphs[start]
    const body = paragraphs.slice(start + 1, end)
    if (body.length > 0) {
      chapters.push({ title, paragraphs: body })
    }
  }

  return chapters
}

function fallbackChunkChapters(paragraphs: string[]): { title: string; paragraphs: string[] }[] {
  const chapters: { title: string; paragraphs: string[] }[] = []
  let current: string[] = []
  let currentLength = 0
  let index = 1

  for (const p of paragraphs) {
    if (currentLength + p.length > FALLBACK_CHUNK_SIZE && current.length > 0) {
      chapters.push({ title: `第 ${index} 部分`, paragraphs: current })
      current = []
      currentLength = 0
      index++
    }
    current.push(p)
    currentLength += p.length
  }

  if (current.length > 0) {
    chapters.push({ title: `第 ${index} 部分`, paragraphs: current })
  }

  return chapters
}

export function parseTxtBuffer(buffer: Buffer): ParsedNovel {
  const raw = decodeBuffer(buffer)
  const text = normalizeText(raw)

  if (text.length === 0) {
    throw new NovelParseError('TXT 文件内容为空', 'empty_content')
  }

  const paragraphs = splitParagraphs(text)
  let chapters = splitIntoChapters(paragraphs)

  if (chapters.length === 0) {
    chapters = fallbackChunkChapters(paragraphs)
  }

  const title = tryExtractTitle(paragraphs)
  const parsedChapters: ParsedChapter[] = chapters.map(ch => {
    const body = ch.paragraphs.join('\n')
    return {
      title: ch.title,
      content: textToTipTapDoc(ch.paragraphs),
      wordCount: countWords(body)
    }
  })

  return {
    title,
    author: '',
    chapters: parsedChapters
  }
}
