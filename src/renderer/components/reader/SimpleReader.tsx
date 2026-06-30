import React, { useMemo } from 'react'

interface TipTapNode {
  type: string
  attrs?: Record<string, unknown>
  content?: TipTapNode[]
  text?: string
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
}

interface SimpleReaderProps {
  content: Record<string, unknown>
  className?: string
}

const MARK_TAG: Record<string, keyof JSX.IntrinsicElements> = {
  bold: 'strong',
  italic: 'em',
  strike: 's',
  underline: 'u',
  code: 'code'
}

function renderMarks(marks: TipTapNode['marks'], children: React.ReactNode): React.ReactNode {
  if (!marks || marks.length === 0) return children
  return marks.reduce<React.ReactNode>((acc, mark) => {
    const tag = MARK_TAG[mark.type]
    if (!tag) return acc
    const Tag = tag
    return <Tag key={mark.type}>{acc}</Tag>
  }, children)
}

function renderNode(node: TipTapNode, index: number): React.ReactNode {
  const key = `${node.type}-${index}`

  if (node.type === 'text') {
    return <React.Fragment key={key}>{renderMarks(node.marks, node.text ?? '')}</React.Fragment>
  }

  const children = node.content?.map((child, i) => renderNode(child, i))

  switch (node.type) {
    case 'paragraph':
      return <p key={key}>{children}</p>
    case 'heading': {
      const level = Math.min(Math.max(Number(node.attrs?.level ?? 1), 1), 3) as 1 | 2 | 3
      const Tag = `h${level}` as const
      return <Tag key={key}>{children}</Tag>
    }
    case 'bulletList':
      return <ul key={key}>{children}</ul>
    case 'orderedList':
      return <ol key={key}>{children}</ol>
    case 'listItem':
      return <li key={key}>{children}</li>
    case 'blockquote':
      return <blockquote key={key}>{children}</blockquote>
    case 'codeBlock':
      return (
        <pre key={key}>
          <code>{children}</code>
        </pre>
      )
    case 'hardBreak':
      return <br key={key} />
    case 'sceneBlock': {
      const sceneNumber = node.attrs?.sceneNumber as number | undefined
      return (
        <div
          key={key}
          data-scene-block="true"
          data-scene-number={sceneNumber}
          className="scene-block my-6 p-4 rounded-lg border-l-4 border-[--color-primary] bg-[--color-bg]"
        >
          {sceneNumber !== undefined && (
            <div className="text-xs text-[--color-text-secondary] mb-2">场景 {sceneNumber}</div>
          )}
          {children}
        </div>
      )
    }
    case 'doc':
      return <React.Fragment key={key}>{children}</React.Fragment>
    default:
      return <div key={key}>{children}</div>
  }
}

export const SimpleReader: React.FC<SimpleReaderProps> = ({ content, className }) => {
  const rendered = useMemo(() => {
    if (!content || content.type !== 'doc') return null
    const doc = content as unknown as TipTapNode
    return renderNode(doc, 0)
  }, [content])

  return <div className={`prose prose-sm max-w-none ${className ?? ''}`}>{rendered}</div>
}
