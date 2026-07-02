import { describe, expect, it, vi } from 'vitest'
import { aiStructureRepair, analyseConfidence } from '../../../src/main/import/ai-structure-repair'
import type { ParsedNovel } from '../../../src/main/import/parser-types'
import type { ILLMProvider } from '../../../src/main/di/service-interfaces'
import { textToTipTapDoc } from '../../../src/main/import/text-to-tiptap'

function makeParsedNovel(overrides?: Partial<ParsedNovel>): ParsedNovel {
  return {
    title: '测试小说',
    author: '作者',
    chapters: [
      { title: '第一章 开始', content: textToTipTapDoc(['这是正文内容。', '第二段。']), wordCount: 20 },
      { title: '第二章 发展', content: textToTipTapDoc(['更多内容。']), wordCount: 10 }
    ],
    ...overrides
  }
}

function makeMockLLM(options?: { fail?: boolean; jsonResponse?: string }): ILLMProvider {
  const mockResponse =
    options?.jsonResponse ??
    JSON.stringify({
      actions: [{ type: 'no_change', description: '结构正常' }],
      chapters: [
        { title: '第一章 开始', content: '这是正文内容。\n第二段。' },
        { title: '第二章 发展', content: '更多内容。' }
      ]
    })

  return {
    configure: vi.fn(),
    resetConfig: vi.fn(),
    chat: vi
      .fn()
      .mockImplementation(
        options?.fail
          ? () => Promise.reject(new Error('LLM 调用失败'))
          : () => Promise.resolve({ content: mockResponse, usage: undefined })
      ),
    testConnection: vi.fn(),
    chatStream: vi.fn(),
    cancelStream: vi.fn()
  }
}

describe('analyseConfidence', () => {
  it('should return high confidence for well-structured novel', () => {
    const parsed = makeParsedNovel()
    const result = analyseConfidence(parsed)
    expect(result.level).toBe('high')
  })

  it('should return low confidence when only 1 chapter', () => {
    const parsed = makeParsedNovel({
      chapters: [{ title: '第一章', content: textToTipTapDoc(['全部内容。']), wordCount: 50 }]
    })
    const result = analyseConfidence(parsed)
    expect(result.level).toBe('low')
    expect(result.reasons.length).toBeGreaterThan(0)
  })

  it('should return low confidence when fallback title exists', () => {
    const parsed = makeParsedNovel({
      chapters: [
        { title: '第 1 部分', content: textToTipTapDoc(['内容一。']), wordCount: 10 },
        { title: '第 2 部分', content: textToTipTapDoc(['内容二。']), wordCount: 10 }
      ]
    })
    const result = analyseConfidence(parsed)
    expect(result.level).toBe('low')
    expect(result.reasons.some(r => r.includes('fallback'))).toBe(true)
  })

  it('should return low confidence when oversized chapter exists', () => {
    const bigContent = textToTipTapDoc(Array.from({ length: 500 }, (_, i) => `这是第 ${i + 1} 段的详细正文内容。`))
    const parsed = makeParsedNovel({ chapters: [{ title: '第一章 唯一大章', content: bigContent, wordCount: 5000 }] })
    const result = analyseConfidence(parsed)
    expect(result.level).toBe('low')
  })
})

describe('aiStructureRepair', () => {
  it('should skip repair when confidence is high', async () => {
    const parsed = makeParsedNovel()
    const llm = makeMockLLM()
    const result = await aiStructureRepair(parsed, { llm })
    expect(result.applied).toBe(false)
    expect(result.actions[0].type).toBe('no_change')
  })

  it('should force repair when force=true', async () => {
    const parsed = makeParsedNovel()
    const llm = makeMockLLM()
    const result = await aiStructureRepair(parsed, { llm, force: true })
    expect(result.applied).toBe(false) // no actual changes
    expect(result.novel.chapters.length).toBe(2)
  })

  it('should fallback to original when LLM call fails', async () => {
    const parsed = makeParsedNovel({
      chapters: [{ title: '第 1 部分', content: textToTipTapDoc(['内容一。']), wordCount: 10 }]
    })
    const llm = makeMockLLM({ fail: true })
    const result = await aiStructureRepair(parsed, { llm, force: true })
    expect(result.applied).toBe(false)
    expect(result.actions[0].type).toBe('no_change')
    expect(result.actions[0].description).toContain('调用失败')
  })

  it('should parse LLM JSON response and reconstruct chapters', async () => {
    const parsed = makeParsedNovel({
      chapters: [
        { title: '第 1 部分', content: textToTipTapDoc(['第一章内容。']), wordCount: 10 },
        { title: '第 2 部分', content: textToTipTapDoc(['第二章内容。']), wordCount: 10 }
      ]
    })

    const llm = makeMockLLM({
      jsonResponse: JSON.stringify({
        actions: [{ type: 'title_normalized', description: '修复标题格式', oldTitle: '第 1 部分', newTitle: '第一章' }],
        chapters: [
          { title: '第一章', content: '第一章内容。' },
          { title: '第二章', content: '第二章内容。' }
        ]
      })
    })

    const result = await aiStructureRepair(parsed, { llm, force: true })
    expect(result.applied).toBe(true)
    expect(result.novel.chapters[0].title).toBe('第一章')
    expect(result.actions[0].type).toBe('title_normalized')
  })

  it('should call onProgress callback', async () => {
    const parsed = makeParsedNovel({
      chapters: [{ title: '第 1 部分', content: textToTipTapDoc(['内容。']), wordCount: 10 }]
    })
    const llm = makeMockLLM()
    const onProgress = vi.fn()
    await aiStructureRepair(parsed, { llm, force: true, onProgress })
    expect(onProgress).toHaveBeenCalled()
  })

  it('should handle invalid JSON from LLM gracefully', async () => {
    const parsed = makeParsedNovel({
      chapters: [{ title: '第 1 部分', content: textToTipTapDoc(['内容。']), wordCount: 10 }]
    })
    const llm = makeMockLLM({ jsonResponse: '这不是 JSON' })
    const result = await aiStructureRepair(parsed, { llm, force: true })
    expect(result.applied).toBe(false)
    expect(result.actions[0].description).toContain('解析失败')
  })
})
