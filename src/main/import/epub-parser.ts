import type { X2jOptions } from 'fast-xml-parser'
import { XMLParser } from 'fast-xml-parser'
import JSZip from 'jszip'
import { findChapterBoundaries, type StyleInfo } from './chapter-heuristic'
import type { ParsedChapter, ParsedNovel } from './parser-types'
import { NovelParseError } from './parser-types'
import { countWords, textToTipTapDoc } from './text-to-tiptap'

interface EpubFile {
  path: string
  content: string
}

interface EpubSpineItem {
  idref: string
  href: string
  title?: string
}

interface StyledParagraph {
  text: string
  style?: StyleInfo
}

const XML_OPTIONS: X2jOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseAttributeValue: false,
  trimValues: true,
  removeNSPrefix: true
}

function createParser(): XMLParser {
  return new XMLParser(XML_OPTIONS)
}

function decodeArrayBuffer(buffer: ArrayBuffer | Uint8Array): string {
  const arr = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  // Try UTF-8 first; fallback to latin1 to preserve bytes for iconv if needed.
  const decoder = new TextDecoder('utf-8', { fatal: false })
  return decoder.decode(arr)
}

function resolveHref(base: string, href: string): string {
  if (!base || base === '/') return href
  const parts = base.split('/')
  parts.pop()
  const pathParts = href.split('/')
  for (const part of pathParts) {
    if (part === '..') {
      parts.pop()
    } else if (part !== '.') {
      parts.push(part)
    }
  }
  return parts.join('/')
}

function parseStyleFromTag(tag: string): StyleInfo | undefined {
  const lower = tag.toLowerCase()
  const style: StyleInfo = {}

  const headingMatch = lower.match(/^<h([1-6])\b/)
  if (headingMatch) {
    style.tagName = `h${headingMatch[1]}`
  }

  const fontSizeMatch = tag.match(/font-size\s*:\s*([0-9]+)\s*pt/i)
  if (fontSizeMatch) {
    style.fontSize = parseInt(fontSizeMatch[1], 10)
  }

  if (/font-weight\s*:\s*bold/i.test(tag) || /font-weight\s*:\s*700/i.test(tag)) {
    style.fontWeight = 'bold'
    style.isBold = true
  }

  if (/<b\b|<strong\b/i.test(tag)) {
    style.isBold = true
  }

  return Object.keys(style).length > 0 ? style : undefined
}

function splitHtmlByBlockTags(html: string): Array<{ text: string; tag?: string }> {
  // Remove script/style tags and their contents.
  let cleaned = html.replace(/<script[\s\S]*?<\/script>/gi, '')
  cleaned = cleaned.replace(/<style[\s\S]*?<\/style>/gi, '')

  // Temporarily wrap bare text nodes so they can be split uniformly.
  cleaned = cleaned.replace(/<(br\s*\/?|hr\s*\/?)>/gi, '\n')

  const segments: Array<{ text: string; tag?: string }> = []
  const blockTagPattern = /<(\/?)(p|div|h[1-6]|li|tr|dd)(\b[^>]*)?>/gi
  let lastIndex = 0
  let currentTag: string | undefined

  for (const match of cleaned.matchAll(blockTagPattern)) {
    const [fullMatch, slash, tagName, attrs = ''] = match
    const start = match.index ?? 0
    const textBefore = cleaned.slice(lastIndex, start)
    if (textBefore.trim().length > 0) {
      segments.push({ text: textBefore, tag: currentTag })
    }

    if (!slash) {
      currentTag = `<${tagName}${attrs}>`
    } else {
      currentTag = undefined
    }
    lastIndex = start + fullMatch.length
  }

  const trailing = cleaned.slice(lastIndex)
  if (trailing.trim().length > 0) {
    segments.push({ text: trailing, tag: currentTag })
  }

  return segments
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&hellip;/g, '…')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
}

function extractTextFromHtml(html: string): StyledParagraph[] {
  const segments = splitHtmlByBlockTags(html)
  const paragraphs: StyledParagraph[] = []

  for (const segment of segments) {
    // 先剥离真实 HTML 标签，再解码实体，避免 &lt;p&gt; 这类文本实体被当成标签误删。
    const text = decodeHtmlEntities(segment.text.replace(/<[^>]+>/g, '')).trim()
    if (text.length === 0) continue

    paragraphs.push({
      text,
      style: segment.tag ? parseStyleFromTag(segment.tag) : undefined
    })
  }

  return paragraphs
}

async function findOpfPath(zip: JSZip): Promise<string | null> {
  const container = zip.file('META-INF/container.xml')
  if (!container) return null

  try {
    const parser = createParser()
    const parsed = parser.parse(decodeArrayBuffer(await container.async('arraybuffer')))
    const rootfile = parsed?.container?.rootfiles?.rootfile
    if (!rootfile) return null

    const rootfiles = Array.isArray(rootfile) ? rootfile : [rootfile]
    const first = rootfiles.find((r: { '@_media-type'?: string; '@_full-path'?: string }) =>
      r['@_media-type']?.includes('application/oebps-package+xml')
    )
    return first?.['@_full-path'] ?? null
  } catch {
    return null
  }
}

async function readSpineAndMetadata(
  zip: JSZip,
  opfPath: string
): Promise<{
  title: string
  author: string
  description: string
  manifest: Record<string, { href: string; mediaType: string }>
  spine: EpubSpineItem[]
}> {
  const opfFile = zip.file(opfPath)
  if (!opfFile) throw new NovelParseError('无法读取 content.opf', 'parse_failed')

  let opf: Record<string, unknown>
  try {
    const parser = createParser()
    opf = parser.parse(decodeArrayBuffer(await opfFile.async('arraybuffer'))) as Record<string, unknown>
  } catch (e) {
    throw new NovelParseError('OPF XML 文件解析失败', 'parse_failed', e)
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- XML parser returns dynamic structure
  const pkg = (opf as Record<string, any>)?.package

  const metadata = pkg?.metadata ?? {}
  const title = extractMetadataValue(metadata, ['title', 'dc:title']) || '未命名小说'
  const author = extractMetadataValue(metadata, ['creator', 'dc:creator']) || ''
  const description = extractMetadataValue(metadata, ['description', 'dc:description']) || ''

  const manifest: Record<string, { href: string; mediaType: string }> = {}
  const manifestItems = pkg?.manifest?.item
  if (manifestItems) {
    const items = Array.isArray(manifestItems) ? manifestItems : [manifestItems]
    for (const item of items) {
      const id = item['@_id']
      const href = item['@_href']
      const mediaType = item['@_media-type']
      if (id && href) {
        manifest[id] = { href, mediaType }
      }
    }
  }

  const spine: EpubSpineItem[] = []
  const spineItems = pkg?.spine?.itemref
  if (spineItems) {
    const items = Array.isArray(spineItems) ? spineItems : [spineItems]
    for (const item of items) {
      const idref = item['@_idref']
      const manifestItem = idref ? manifest[idref] : null
      if (manifestItem) {
        spine.push({
          idref,
          href: resolveHref(opfPath, manifestItem.href),
          title: manifestItem.href
        })
      }
    }
  }

  return { title, author, description, manifest, spine }
}

function extractMetadataValue(metadata: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = metadata[key]
    if (typeof value === 'string') return value
    if (Array.isArray(value) && value.length > 0) {
      const first = value[0]
      if (typeof first === 'string') return first
      if (first && typeof first === 'object' && '#text' in first) {
        return String((first as Record<string, unknown>)['#text'])
      }
    }
    if (value && typeof value === 'object' && '#text' in value) {
      return String((value as Record<string, unknown>)['#text'])
    }
  }
  return ''
}

async function readHtmlFiles(zip: JSZip, spine: EpubSpineItem[]): Promise<EpubFile[]> {
  const files: EpubFile[] = []
  for (const item of spine) {
    const file = zip.file(item.href)
    if (!file) continue
    const content = decodeArrayBuffer(await file.async('arraybuffer'))
    files.push({ path: item.href, content })
  }
  return files
}

async function fallbackHtmlFiles(zip: JSZip): Promise<EpubFile[]> {
  const files: EpubFile[] = []
  zip.forEach((relativePath, _file) => {
    if (/\.(x?html|htm)$/i.test(relativePath) && !relativePath.startsWith('__MACOSX/')) {
      files.push({ path: relativePath, content: '' })
    }
  })

  for (const f of files) {
    const file = zip.file(f.path)
    if (file) {
      f.content = decodeArrayBuffer(await file.async('arraybuffer'))
    }
  }
  return files
}

function splitHtmlIntoChapters(file: EpubFile): { title: string; paragraphs: string[] }[] {
  const styledParagraphs = extractTextFromHtml(file.content)
  const boundaries = findChapterBoundaries(styledParagraphs, {
    threshold: 25,
    leadingParagraphsToDownweight: 2
  })

  if (boundaries.length === 0) {
    const plain = styledParagraphs.map(p => p.text)
    return plain.length > 0 ? [{ title: file.path, paragraphs: plain }] : []
  }

  const chapters: { title: string; paragraphs: string[] }[] = []
  for (let i = 0; i < boundaries.length; i++) {
    const start = boundaries[i]
    const end = i + 1 < boundaries.length ? boundaries[i + 1] : styledParagraphs.length
    const title = styledParagraphs[start].text.trim()
    const body = styledParagraphs.slice(start + 1, end).map(p => p.text)
    if (body.length > 0) {
      chapters.push({ title, paragraphs: body })
    }
  }

  return chapters
}

export async function parseEpubBuffer(buffer: Buffer): Promise<ParsedNovel> {
  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(buffer)
  } catch (e) {
    throw new NovelParseError('EPUB 文件解压失败', 'parse_failed', e)
  }

  if (Object.keys(zip.files).length === 0) {
    throw new NovelParseError('EPUB 文件为空', 'empty_content')
  }

  const opfPath = await findOpfPath(zip)
  let htmlFiles: EpubFile[] = []
  let title = '未命名小说'
  let author = ''
  let description = ''

  if (opfPath) {
    const metadata = await readSpineAndMetadata(zip, opfPath)
    title = metadata.title
    author = metadata.author
    description = metadata.description
    htmlFiles = await readHtmlFiles(zip, metadata.spine)
  }

  if (htmlFiles.length === 0) {
    htmlFiles = await fallbackHtmlFiles(zip)
  }

  if (htmlFiles.length === 0) {
    throw new NovelParseError('EPUB 中未找到可读取的章节内容', 'empty_content')
  }

  const parsedChapters: ParsedChapter[] = []
  for (const file of htmlFiles) {
    const chapters = splitHtmlIntoChapters(file)
    for (const ch of chapters) {
      const body = ch.paragraphs.join('\n')
      parsedChapters.push({
        title: ch.title,
        content: textToTipTapDoc(ch.paragraphs),
        wordCount: countWords(body)
      })
    }
  }

  return {
    title,
    author,
    synopsis: description || undefined,
    chapters: parsedChapters
  }
}
