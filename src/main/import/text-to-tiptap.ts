export function textToTipTapDoc(paragraphs: string[]): string {
  if (!Array.isArray(paragraphs)) {
    paragraphs = []
  }
  const content = paragraphs
    .filter(p => p.length > 0)
    .map(p => ({
      type: 'paragraph',
      content: [{ type: 'text', text: p }]
    }))

  return JSON.stringify({ type: 'doc', content })
}

export function countWords(text: string): number {
  // Count CJK characters (URO block + extensions) and Latin word groups as words.
  const cjk = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g) ?? []).length
  const latin = (text.match(/[a-zA-Z0-9_]+/g) ?? []).length
  return cjk + latin
}
