import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { WorldConsistency } from '../../../../src/renderer/components/studio/WorldConsistency'

const sampleItems = [
  {
    category: '地理',
    severity: 'error' as const,
    message: '城市位置矛盾',
    suggestion: '统一地图坐标'
  },
  {
    category: '势力',
    severity: 'warning' as const,
    message: '门派关系未说明',
    suggestion: '补充背景故事'
  },
  {
    category: '时间线',
    severity: 'info' as const,
    message: '节日日期可细化',
    suggestion: '添加历法说明'
  }
]

describe('WorldConsistency', () => {
  it('renders empty state when no items', () => {
    render(<WorldConsistency items={[]} />)
    expect(screen.getByText('暂无一致性检查项')).toBeInTheDocument()
  })

  it('renders header with world name and counts', () => {
    render(<WorldConsistency items={sampleItems} worldName="九州" />)
    expect(screen.getByText('世界观一致性检查')).toBeInTheDocument()
    expect(screen.getByText('九州 · 3 项检查 · 0 项已解决')).toBeInTheDocument()
    expect(screen.getByText('● 1 错误')).toBeInTheDocument()
    expect(screen.getByText('● 1 警告')).toBeInTheDocument()
    expect(screen.getByText('● 1 建议')).toBeInTheDocument()
  })

  it('filters items by severity', () => {
    render(<WorldConsistency items={sampleItems} />)

    fireEvent.click(screen.getByText('错误 (1)'))
    expect(screen.getByText('城市位置矛盾')).toBeInTheDocument()
    expect(screen.queryByText('门派关系未说明')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('警告 (1)'))
    expect(screen.getByText('门派关系未说明')).toBeInTheDocument()

    fireEvent.click(screen.getByText('建议 (1)'))
    expect(screen.getByText('节日日期可细化')).toBeInTheDocument()

    fireEvent.click(screen.getByText('全部 (3)'))
    expect(screen.getByText('城市位置矛盾')).toBeInTheDocument()
    expect(screen.getByText('门派关系未说明')).toBeInTheDocument()
    expect(screen.getByText('节日日期可细化')).toBeInTheDocument()
  })

  it('expands and collapses item details', () => {
    render(<WorldConsistency items={sampleItems} />)
    expect(screen.queryByText('💡 统一地图坐标')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('城市位置矛盾'))
    expect(screen.getByText('💡 统一地图坐标')).toBeInTheDocument()

    fireEvent.click(screen.getByText('城市位置矛盾'))
    expect(screen.queryByText('💡 统一地图坐标')).not.toBeInTheDocument()
  })

  it('does not expand details when clicking resolve button', () => {
    render(<WorldConsistency items={sampleItems} />)
    const resolveBtn = screen.getAllByText('标记解决')[0]
    fireEvent.click(resolveBtn)
    expect(screen.queryByText('💡 统一地图坐标')).not.toBeInTheDocument()
  })

  it('toggles resolved state and updates progress', () => {
    render(<WorldConsistency items={sampleItems} />)
    const buttons = screen.getAllByText('标记解决')
    fireEvent.click(buttons[0])
    expect(screen.getByText('✓ 已解决')).toBeInTheDocument()
    expect(screen.getByText(/1 项已解决/)).toBeInTheDocument()

    fireEvent.click(screen.getByText('✓ 已解决'))
    expect(screen.getAllByText('标记解决')).toHaveLength(3)
  })

  it('shows success color when all items resolved', () => {
    render(<WorldConsistency items={sampleItems} />)
    screen.getAllByText('标记解决').forEach(btn => fireEvent.click(btn))

    expect(screen.getByText(/3 项已解决/)).toBeInTheDocument()
    const progress = screen.getByTestId('progress-bar')
    expect(progress).toHaveStyle({ backgroundColor: 'var(--success)' })
  })
})
