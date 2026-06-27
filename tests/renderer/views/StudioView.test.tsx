import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { StudioView } from '@renderer/views/StudioView'
import { characterService, novelService, plotStructureService, worldService } from '@renderer/services'
import type { Novel } from '@shared/types'

vi.mock('@renderer/services', () => ({
  novelService: {
    get: vi.fn()
  },
  plotStructureService: {
    getByNovel: vi.fn()
  },
  characterService: {
    list: vi.fn()
  },
  worldService: {
    getByNovel: vi.fn()
  }
}))

vi.mock('@renderer/components/studio/PlotTimeline', () => ({
  PlotTimeline: ({ beats }: any) => <div data-testid="plot-timeline">{beats?.length} beats</div>
}))

vi.mock('@renderer/components/studio/CharacterNetwork', () => ({
  CharacterNetwork: ({ characters }: any) => <div data-testid="char-network">{characters?.length} chars</div>
}))

vi.mock('@renderer/components/studio/WorldConsistency', () => ({
  WorldConsistency: ({ items, worldName }: any) => (
    <div data-testid="world-consistency">
      {worldName}: {items?.length} items
    </div>
  )
}))

const mockedNovelService = vi.mocked(novelService)
const mockedPlotStructureService = vi.mocked(plotStructureService)
const mockedCharacterService = vi.mocked(characterService)
const mockedWorldService = vi.mocked(worldService)

describe('StudioView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedNovelService.get.mockResolvedValue({ id: 'novel-1' } as Novel)
    mockedPlotStructureService.getByNovel.mockResolvedValue(null)
    mockedCharacterService.list.mockResolvedValue([])
    mockedWorldService.getByNovel.mockResolvedValue(null)
  })

  it('should show empty state when no projectId', () => {
    render(<StudioView projectId={null} />)
    expect(screen.getByText('请选择一个项目开始创作')).toBeInTheDocument()
  })

  it('should show loading state initially', () => {
    mockedNovelService.get.mockReturnValue(new Promise(() => {}))
    render(<StudioView projectId="proj-1" />)
    expect(screen.getByText('加载中...')).toBeInTheDocument()
  })

  it('should load data and render PlotTimeline on structure tab', async () => {
    mockedPlotStructureService.getByNovel.mockResolvedValue({ beats: [{ id: 'b1' }] } as any)
    render(<StudioView projectId="proj-1" />)
    await waitFor(() => {
      expect(screen.getByTestId('plot-timeline')).toBeInTheDocument()
    })
  })

  it('should switch tabs and show empty state for characters', async () => {
    render(<StudioView projectId="proj-1" />)
    await waitFor(() => {
      expect(screen.queryByText('加载中...')).not.toBeInTheDocument()
    })
    fireEvent.click(screen.getByText(c => c.includes('角色设计')))
    expect(screen.getByText('暂无角色数据')).toBeInTheDocument()
    fireEvent.click(screen.getByText(c => c.includes('世界观')))
    expect(screen.getByText('暂无世界观数据')).toBeInTheDocument()
  })

  it('should render CharacterNetwork when characters exist', async () => {
    mockedCharacterService.list.mockResolvedValue([{ id: 'c1', name: '张三' }] as any)
    render(<StudioView projectId="proj-1" />)
    await waitFor(() => {
      expect(screen.queryByText('加载中...')).not.toBeInTheDocument()
    })
    fireEvent.click(screen.getByText(c => c.includes('角色设计')))
    await waitFor(() => {
      expect(screen.getByTestId('char-network')).toBeInTheDocument()
    })
  })

  it('should render WorldConsistency with mapped data', async () => {
    const mockWorld = {
      name: '中土世界',
      consistency: [
        { category: '地理', status: 'fail', description: '山脉位置冲突' },
        { category: '历史', status: 'warning', description: '时间线模糊' }
      ]
    }
    mockedWorldService.getByNovel.mockResolvedValue(mockWorld as any)
    render(<StudioView projectId="proj-1" />)
    await waitFor(() => {
      expect(screen.queryByText('加载中...')).not.toBeInTheDocument()
    })
    fireEvent.click(screen.getByText(c => c.includes('世界观')))
    await waitFor(() => {
      expect(screen.getByTestId('world-consistency')).toBeInTheDocument()
    })
  })
})
