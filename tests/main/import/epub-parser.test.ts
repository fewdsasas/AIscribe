import { describe, expect, it } from 'vitest'
import JSZip from 'jszip'
import { parseEpubBuffer } from '../../../src/main/import/epub-parser'
import { NovelParseError } from '../../../src/main/import/parser-types'

async function buildEpub(options: {
  title?: string
  author?: string
  description?: string
  chapters?: { title: string; paragraphs: string[] }[]
  skipOpf?: boolean
}): Promise<Buffer> {
  const zip = new JSZip()
  zip.file('mimetype', 'application/epub+zip')

  const title = options.title ?? 'Test Novel'
  const author = options.author ?? 'Test Author'
  const description = options.description ?? ''
  const chapters = options.chapters ?? [{ title: '第一章 测试', paragraphs: ['正文内容。'] }]

  if (!options.skipOpf) {
    zip.file(
      'META-INF/container.xml',
      '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">' +
        '<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>' +
        '</container>'
    )

    const manifestItems = chapters
      .map((_, i) => `<item id="chap${i}" href="chapter${i}.xhtml" media-type="application/xhtml+xml"/>`)
      .join('')
    const spineItems = chapters.map((_, i) => `<itemref idref="chap${i}"/>`).join('')

    zip.file(
      'OEBPS/content.opf',
      '<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0">' +
        `<metadata><dc:title>${title}</dc:title><dc:creator>${author}</dc:creator>` +
        `<dc:description>${description}</dc:description></metadata>` +
        `<manifest>${manifestItems}</manifest>` +
        `<spine>${spineItems}</spine>` +
        '</package>'
    )

    for (let i = 0; i < chapters.length; i++) {
      const ch = chapters[i]
      const paragraphs = ch.paragraphs.map(p => `<p>${p}</p>`).join('')
      zip.file(
        `OEBPS/chapter${i}.xhtml`,
        '<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml"><body>' +
          `<h1>${ch.title}</h1>${paragraphs}</body></html>`
      )
    }
  }

  const array = await zip.generateAsync({ type: 'arraybuffer' })
  return Buffer.from(array)
}

describe('parseEpubBuffer', () => {
  it('should parse metadata and chapters from a standard EPUB', async () => {
    const buffer = await buildEpub({
      title: '斗破苍穹',
      author: '天蚕土豆',
      description: '一段传奇。',
      chapters: [
        { title: '第一章 陨落的天才', paragraphs: ['这里是第一章内容。', '第二段。'] },
        { title: '第二章 斗之气', paragraphs: ['第二章内容。'] }
      ]
    })

    const novel = await parseEpubBuffer(buffer)
    expect(novel.title).toBe('斗破苍穹')
    expect(novel.author).toBe('天蚕土豆')
    expect(novel.synopsis).toBe('一段传奇。')
    expect(novel.chapters).toHaveLength(2)
    expect(novel.chapters[0].title).toBe('第一章 陨落的天才')
    expect(novel.chapters[0].wordCount).toBeGreaterThan(0)
  })

  it('should fallback to scanning HTML files when OPF is missing', async () => {
    const zip = new JSZip()
    zip.file('chapter1.xhtml', '<html><body><p>第一章 测试</p><p>正文。</p></body></html>')
    const array = await zip.generateAsync({ type: 'arraybuffer' })
    const novel = await parseEpubBuffer(Buffer.from(array))

    expect(novel.chapters.length).toBeGreaterThan(0)
    expect(novel.chapters[0].title).toBe('第一章 测试')
  })

  it('should throw parse_failed for invalid zip', async () => {
    const buffer = Buffer.from('not a zip file')
    await expect(parseEpubBuffer(buffer)).rejects.toThrow(NovelParseError)
    await expect(parseEpubBuffer(buffer)).rejects.toMatchObject({ code: 'parse_failed' })
  })

  it('should throw empty_content for empty EPUB', async () => {
    const zip = new JSZip()
    zip.file('mimetype', 'application/epub+zip')
    const array = await zip.generateAsync({ type: 'arraybuffer' })
    await expect(parseEpubBuffer(Buffer.from(array))).rejects.toThrow(NovelParseError)
  })

  it('should strip HTML tags and entities', async () => {
    const buffer = await buildEpub({
      chapters: [{ title: '第一章', paragraphs: ['&lt;p&gt;Hello&nbsp;world&lt;/p&gt;'] }]
    })

    const novel = await parseEpubBuffer(buffer)
    const doc = JSON.parse(novel.chapters[0].content)
    expect(doc.content[0].content[0].text).toBe('<p>Hello world</p>')
  })
})
