import type { AiRepairConfidenceLevel, RepairAction } from '../../shared/types/ipc'
import type { ILLMProvider } from '../di/service-interfaces'
import type { ParsedChapter, ParsedNovel } from './parser-types'
import { countWords, textToTipTapDoc } from './text-to-tiptap'

export interface AiRepairOptions {
  /** LLM 调用接口 */
  llm: ILLMProvider
  /** 是否强制修复（忽略置信度检查） */
  force?: boolean
  /** 进度回调（用于 IPC 推送） */
  onProgress?: (chapterIndex: number, totalChapters: number, action: string) => void
}

export interface RepairResult {
  /** 是否实际执行了修复 */
  applied: boolean
  /** 修复后的 Novel */
  novel: ParsedNovel
  /** 修复动作列表 */
  actions: RepairAction[]
}

/**
 * 置信度分析结果
 */
export function analyseConfidence(parsed: ParsedNovel): {
  level: AiRepairConfidenceLevel
  reasons: string[]
} {
  const reasons: string[] = []

  // 高权重：章节数为 1（可能未正确切分）
  if (parsed.chapters.length <= 1) {
    reasons.push(`章节数仅 ${parsed.chapters.length} 个，可能未正确切分`)
    return { level: 'low', reasons }
  }

  // 高权重：存在 fallback 标题
  const fallbackPattern = /^第\s*\d+\s*部分$|^导入章节$/
  const hasFallback = parsed.chapters.some(ch => fallbackPattern.test(ch.title))
  if (hasFallback) {
    reasons.push('存在 fallback 分块标题')
    return { level: 'low', reasons }
  }

  let midWeightCount = 0

  // 中权重：章节标题数量异常（大部分小说至少 2 章）
  if (parsed.chapters.length < 2) {
    midWeightCount++
    reasons.push('章节数小于 2')
  }

  // 中权重：某章节长度 > 总内容 80%（可能漏分章）
  const totalChars = parsed.chapters.reduce((s, ch) => {
    try {
      const doc = JSON.parse(ch.content) as { content?: Array<{ content?: Array<{ text?: string }> }> }
      const text = doc?.content?.map(p => p.content?.map(t => t.text ?? '').join('') ?? '').join('\n') ?? ''
      return s + text.length
    } catch {
      return s + ch.wordCount
    }
  }, 0)
  const hasOversized = parsed.chapters.some(ch => {
    const chChars = (() => {
      try {
        const doc = JSON.parse(ch.content) as { content?: Array<{ content?: Array<{ text?: string }> }> }
        return doc?.content?.map(p => p.content?.map(t => t.text ?? '').join('') ?? '').join('\n')?.length ?? 0
      } catch {
        return ch.wordCount
      }
    })()
    return totalChars > 0 && chChars / totalChars > 0.8
  })
  if (hasOversized) {
    midWeightCount++
    reasons.push('存在单章内容占比超过 80%，可能漏分章')
  }

  // 低权重：段落数量与章节数反差大
  if (parsed.chapters.length > 0 && parsed.chapters.length < 3 && totalChars > 5000) {
    reasons.push('内容较多但章节数较少，可能需要进一步切分')
  }

  // 判定
  const level: AiRepairConfidenceLevel = midWeightCount >= 2 ? 'low' : 'high'

  return { level, reasons }
}

/**
 * 将章节内容序列化为 LLM 可处理的文本格式
 * 提取每章标题 + 前 200 字 + 后 200 字作为上下文
 */
function serializeNovelForLLM(novel: ParsedNovel): string {
  const chapters = novel.chapters.map(ch => {
    let text = ''
    try {
      const doc = JSON.parse(ch.content) as { content?: Array<{ content?: Array<{ text?: string }> }> }
      text = doc?.content?.map(p => p.content?.map(t => t.text ?? '').join('') ?? '').join('\n') ?? ''
    } catch {
      text = ''
    }

    const preview = text.length > 200 ? text.slice(0, 200) + '...' : text
    const suffix = text.length > 400 ? '...' + text.slice(-200) : ''

    return JSON.stringify({ title: ch.title, preview, suffix, wordCount: ch.wordCount })
  })

  return JSON.stringify(
    {
      title: novel.title,
      author: novel.author,
      chapters,
      totalChapters: novel.chapters.length
    },
    null,
    2
  )
}

/**
 * 解析 LLM 返回的 JSON，提取修复后的章节和动作列表
 */
function parseLLMResponse(
  llmJson: string,
  originalChapters: ParsedChapter[]
): { chapters: ParsedChapter[]; actions: RepairAction[] } {
  let parsed: {
    actions?: RepairAction[]
    chapters?: Array<{ title: string; content: string }>
  }

  try {
    // 尝试从 markdown 代码块中提取 JSON
    const jsonMatch = llmJson.match(/```(?:json)?\s*([\s\S]*?)```/)
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : llmJson.trim()
    parsed = JSON.parse(jsonStr)
  } catch {
    // JSON 解析失败，返回原始章节和 no_change 动作
    return {
      chapters: originalChapters,
      actions: [{ type: 'no_change', description: 'AI 返回格式解析失败，保留原始章节结构' }]
    }
  }

  const actions: RepairAction[] = []
  if (parsed.actions && Array.isArray(parsed.actions)) {
    for (const a of parsed.actions) {
      actions.push({
        type: a.type || 'no_change',
        description: a.description || '',
        chapterIndex: a.chapterIndex,
        chapterIndices: a.chapterIndices,
        oldTitle: a.oldTitle,
        newTitle: a.newTitle
      })
    }
  }

  // 如果没有返回修复后的章节列表，保留原始数据
  if (!parsed.chapters || !Array.isArray(parsed.chapters) || parsed.chapters.length === 0) {
    return { chapters: originalChapters, actions }
  }

  // 将修复后的章节数据转换回 ParsedChapter
  const chapters: ParsedChapter[] = []
  for (const ch of parsed.chapters) {
    const title = ch.title || '未命名章节'
    // 用原标题的 TipTap content 作为 base
    const paragraphs = ch.content ? ch.content.split('\n').filter(p => p.trim().length > 0) : ['']
    const content = textToTipTapDoc(paragraphs)
    const body = paragraphs.join('\n')
    chapters.push({
      title,
      content,
      wordCount: countWords(body)
    })
  }

  return { chapters, actions }
}

/**
 * AI 结构修复主函数
 */
export async function aiStructureRepair(parsed: ParsedNovel, options: AiRepairOptions): Promise<RepairResult> {
  const { llm, force = false, onProgress } = options

  // 置信度分析
  if (!force) {
    const confidence = analyseConfidence(parsed)
    if (confidence.level === 'high') {
      return {
        applied: false,
        novel: parsed,
        actions: [{ type: 'no_change', description: `章节结构置信度高，跳过: ${confidence.reasons.join('; ')}` }]
      }
    }
  }

  // 序列化为 LLM 上下文
  const serialized = serializeNovelForLLM(parsed)

  const systemPrompt =
    '你是一个小说结构分析助手。分析以下小说的章节列表，识别并修复结构问题。\n\n' +
    '请检查以下问题：\n' +
    '1. 是否有章节标题实际是正文段落？如果有，将该章节内容合并到上一章。\n' +
    '2. 是否有正文段落实际上应该是新章节标题？如果有，需要拆分出一个新章节。\n' +
    '3. 是否有明显的非正文内容（广告、乱码、作者感言等）？需要删除。\n' +
    '4. 段落是否被错误分割（例如一行一个短句的排版问题）？需要合并。\n' +
    '5. 章节标题是否需要统一命名风格（如"第一章"、"第1章"、"Chapter 1"混用）？\n\n' +
    '返回格式必须是以下 JSON（不要包含 markdown 代码块标记之外的文字）：\n' +
    '{\n' +
    '  "actions": [\n' +
    '    { "type": "chapter_split|chapter_merge|paragraph_rejoin|impurity_removed|title_normalized|no_change",\n' +
    '      "description": "...",\n' +
    '      "chapterIndex": 0,\n' +
    '      "chapterIndices": [0, 1],\n' +
    '      "oldTitle": "...",\n' +
    '      "newTitle": "..." }\n' +
    '  ],\n' +
    '  "chapters": [\n' +
    '    { "title": "第一章 新标题", "content": "完整的正文内容（多个段落用换行分隔）" }\n' +
    '  ]\n' +
    '}\n\n' +
    '注意：content 字段必须包含该章节的完整正文，用换行分隔段落。不要包含标题本身。'

  onProgress?.(0, parsed.chapters.length, '正在分析章节结构...')

  let llmResponse: string
  try {
    const response = await llm.chat({
      messages: [{ role: 'user', content: `原始章节列表：\n${serialized}` }],
      system: systemPrompt,
      stream: false
    })
    llmResponse = response.content
  } catch (e) {
    // LLM 调用失败，降级使用原始数据
    return {
      applied: false,
      novel: parsed,
      actions: [
        {
          type: 'no_change',
          description: `AI 修复调用失败，已降级使用原始结果: ${(e as Error).message}`
        }
      ]
    }
  }

  onProgress?.(1, parsed.chapters.length, '正在解析修复结果...')

  // 解析 LLM 响应
  const { chapters, actions } = parseLLMResponse(llmResponse, parsed.chapters)

  const hasChanges = actions.some(a => a.type !== 'no_change')

  return {
    applied: hasChanges,
    novel: { ...parsed, chapters },
    actions
  }
}
