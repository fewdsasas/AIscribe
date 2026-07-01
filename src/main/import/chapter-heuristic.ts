export interface StyleInfo {
  tagName?: string
  fontSize?: number
  fontWeight?: number | string
  isBold?: boolean
}

export interface ScoredParagraph {
  text: string
  index: number
  style?: StyleInfo
  score: number
}

export interface HeuristicOptions {
  /** 前几行会被认为是书名/简介区域，降低非强模式得分 */
  leadingParagraphsToDownweight?: number
  /** 认定为章节标题的最低分数 */
  threshold?: number
  /** 章节标题建议长度范围 */
  idealLength?: { min: number; max: number }
}

const STRONG_PATTERNS = [
  /^\s*第\s*[0-9一二三四五六七八九十百千万]+\s*[章回卷集部]/,
  /^\s*Chapter\s+\d+/i,
  /^\s*Part\s+\d+/i
]

const WEAK_PATTERNS = [/^\s*\d+[.．]\s*\S/, /^\s*[一二三四五六七八九十]+[、.．]\s*\S/, /^\s*[★☆◆◇■□▲△]/]

const CHAPTER_KEYWORDS = /章|回|卷|集|部|Chapter|Part|节|话|篇/i

function scorePattern(text: string): number {
  if (STRONG_PATTERNS.some(p => p.test(text))) return 50
  if (WEAK_PATTERNS.some(p => p.test(text))) return 20
  if (CHAPTER_KEYWORDS.test(text)) return 10
  return 0
}

function scoreNumeric(text: string): number {
  if (/[0-9]+/.test(text)) return 8
  if (/[一二三四五六七八九十百千万]+/.test(text)) return 8
  return 0
}

function scoreLength(text: string, ideal: { min: number; max: number }): number {
  const len = text.length
  if (len >= ideal.min && len <= ideal.max) return 15
  if (len < 3) return -30
  if (len > 80) return -20
  if (len < ideal.min) return -10
  return -20
}

function scorePosition(index: number, total: number, leadingToDownweight: number): number {
  if (index < leadingToDownweight) return -15
  if (index > total * 0.95) return -10
  return 0
}

function scoreStyle(style?: StyleInfo): number {
  if (!style) return 0
  let score = 0

  const tag = style.tagName?.toLowerCase()
  if (tag) {
    const headingMatch = tag.match(/^h([1-6])$/)
    if (headingMatch) {
      const level = parseInt(headingMatch[1], 10)
      score += 45 - (level - 1) * 6
    }
  }

  if (style.isBold || style.fontWeight === 'bold' || style.fontWeight === 700) {
    score += 10
  }

  if (style.fontSize && style.fontSize >= 18) {
    score += 12
  }

  return score
}

function scoreContext(paragraphs: Array<{ text: string }>, index: number): number {
  let score = 0
  const prev = paragraphs[index - 1]?.text ?? ''
  const next = paragraphs[index + 1]?.text ?? ''
  if (prev.length === 0) score += 5
  if (next.length === 0) score += 5
  return score
}

export function scoreParagraph(
  text: string,
  index: number,
  paragraphs: Array<{ text: string }>,
  style?: StyleInfo,
  options: HeuristicOptions = {}
): number {
  const { leadingParagraphsToDownweight = 3, idealLength = { min: 4, max: 40 } } = options

  const trimmed = text.trim()
  if (trimmed.length === 0) return 0

  let score = 0
  score += scorePattern(trimmed)
  score += scoreNumeric(trimmed)
  score += scoreLength(trimmed, idealLength)
  score += scorePosition(index, paragraphs.length, leadingParagraphsToDownweight)
  score += scoreStyle(style)
  score += scoreContext(paragraphs, index)

  // 前导区域只有强模式才允许高分
  if (index < leadingParagraphsToDownweight && score < 50) {
    score -= 20
  }

  return Math.max(0, score)
}

export function findChapterBoundaries(
  paragraphs: Array<{ text: string; style?: StyleInfo }>,
  options: HeuristicOptions = {}
): number[] {
  const threshold = options.threshold ?? 30
  const scored: ScoredParagraph[] = paragraphs.map((p, index) => ({
    text: p.text,
    index,
    style: p.style,
    score: scoreParagraph(p.text, index, paragraphs, p.style, options)
  }))

  const candidates = scored.filter(s => s.score >= threshold)

  // 非极大值抑制：相邻段落只保留分数最高的
  const boundaries: number[] = []
  for (let i = 0; i < candidates.length; i++) {
    const current = candidates[i]
    const prev = candidates[i - 1]
    // 仅抑制真正相邻的候选（如标题行与紧跟的副标题行），
    // 避免“标题-正文-标题”这种间隔一个段落的排版被错误合并。
    if (prev && current.index - prev.index <= 1) {
      if (current.score > prev.score) {
        boundaries[boundaries.length - 1] = current.index
      }
      continue
    }
    boundaries.push(current.index)
  }

  return boundaries
}
