import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ForceDirectedLayout, type ForceEdge, type ForceNode } from './force-directed'
import type { Character } from '@shared/types'

interface CharacterNetworkProps {
  characters: Character[]
}

const ROLE_COLORS: Record<string, string> = {
  protagonist: 'var(--accent)',
  antagonist: 'var(--danger)',
  love_interest: 'var(--amber-400)',
  mentor: 'var(--amber-600)',
  sidekick: 'var(--success)',
  foil: 'var(--amber-300)',
  confidant: 'var(--amber-700)',
  villain: 'var(--danger)',
  supporting: 'var(--text-secondary)',
  minor: 'var(--text-secondary)'
}

export const CharacterNetwork: React.FC<CharacterNetworkProps> = ({ characters }) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 })

  // Build graph data
  const { nodes, edges } = useMemo(() => {
    const fnodes: ForceNode[] = characters.map(c => ({
      id: c.id,
      label: c.name,
      color: ROLE_COLORS[c.role] ?? 'var(--text-secondary)',
      data: { role: c.role, connections: c.relationships.length }
    }))

    const fedges: ForceEdge[] = []
    const addedEdges = new Set<string>()

    for (const char of characters) {
      for (const rel of char.relationships) {
        const key = [char.id, rel.targetId].sort().join('-')
        if (!addedEdges.has(key)) {
          addedEdges.add(key)
          fedges.push({
            source: char.id,
            target: rel.targetId,
            label: rel.type,
            weight: rel.intensity / 10,
            color: ROLE_COLORS[char.role] ?? 'var(--text-secondary)'
          })
        }
      }
    }

    return { nodes: fnodes, edges: fedges }
  }, [characters])

  // Run force-directed layout
  const layout = useMemo(() => {
    const l = new ForceDirectedLayout(dimensions.width, dimensions.height)
    l.init(nodes, edges)
    l.tick(80)
    return l
  }, [nodes, edges, dimensions])

  // Resize observer
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) {
          setDimensions({ width: Math.floor(width), height: Math.floor(height) })
        }
      }
    })
    const parent = svgRef.current?.parentElement
    if (parent) observer.observe(parent)
    return () => observer.disconnect()
  }, [])

  const positionedNodes = layout.getNodes()
  const positionedEdges = layout.getEdges()
  const nodeMap = new Map(positionedNodes.map(n => [n.id, n]))

  if (characters.length === 0) {
    return (
      <div className="text-center py-12 text-[--color-text-secondary]">
        <div className="text-3xl mb-3">👥</div>
        <p>暂无角色</p>
        <p className="text-xs mt-1">在「技能工坊」中使用角色创建技能设计角色</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-[--color-text]">角色关系网络</h3>
          <p className="text-xs text-[--color-text-secondary]">
            {characters.length} 个角色 · {edges.length} 条关系
          </p>
        </div>
        {/* Legend */}
        <div className="flex flex-wrap gap-2 text-xs">
          {Object.entries(ROLE_COLORS)
            .slice(0, 6)
            .map(([role, color]) => (
              <span key={role} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                {role}
              </span>
            ))}
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-[--color-border] p-4">
        <svg
          ref={svgRef}
          width="100%"
          height="400"
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          className="overflow-visible"
        >
          {/* Edges */}
          {positionedEdges.map((edge, i) => {
            const source = nodeMap.get(edge.source)
            const target = nodeMap.get(edge.target)
            if (
              source?.x === undefined ||
              source?.y === undefined ||
              target?.x === undefined ||
              target?.y === undefined
            )
              return null

            const isHighlighted = hoveredId === edge.source || hoveredId === edge.target

            return (
              <g key={`edge-${i}`}>
                <line
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={edge.color ?? 'var(--color-border)'}
                  strokeWidth={Math.max(1, (edge.weight ?? 1) * 3)}
                  opacity={isHighlighted ? 0.8 : 0.3}
                  className="transition-opacity"
                />
                {hoveredId && isHighlighted && edge.label && (
                  <text
                    x={(source.x + target.x) / 2}
                    y={(source.y + target.y) / 2 - 8}
                    fill="var(--text-secondary)"
                    fontSize={10}
                    textAnchor="middle"
                  >
                    {edge.label}
                  </text>
                )}
              </g>
            )
          })}

          {/* Nodes */}
          {positionedNodes.map(node => {
            const r = node.radius ?? 20
            const isHovered = hoveredId === node.id

            return (
              <g
                key={node.id}
                onMouseEnter={() => setHoveredId(node.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Shadow */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={r + 1}
                  fill="none"
                  stroke={isHovered ? node.color : 'transparent'}
                  strokeWidth={3}
                  className="transition-all"
                />
                {/* Main circle */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={r}
                  fill={node.color ?? 'var(--text-secondary)'}
                  opacity={isHovered ? 1 : 0.85}
                  className="transition-opacity"
                />
                {/* Label */}
                <text
                  x={node.x ?? 0}
                  y={(node.y ?? 0) + 4}
                  fill="white"
                  fontSize={11}
                  fontWeight={600}
                  textAnchor="middle"
                  className="select-none pointer-events-none"
                >
                  {node.label.slice(0, 4)}
                </text>
                {/* Tooltip */}
                {isHovered && (
                  <g>
                    <rect
                      x={(node.x ?? 0) - 60}
                      y={(node.y ?? 0) - r - 30}
                      width={120}
                      height={22}
                      rx={4}
                      fill="var(--ink-800)"
                      opacity={0.9}
                    />
                    <text x={node.x} y={(node.y ?? 0) - r - 14} fill="white" fontSize={11} textAnchor="middle">
                      {node.label} · {(node.data as { connections?: number })?.connections ?? 0} 条关系
                    </text>
                  </g>
                )}
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
