import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { WorkshopView } from '@renderer/views/WorkshopView'
import { skillService } from '@renderer/services'

vi.mock('@renderer/services', () => ({
  skillService: {
    list: vi.fn(),
    invoke: vi.fn()
  }
}))

const mockedSkillService = vi.mocked(skillService)

describe('WorkshopView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedSkillService.list.mockResolvedValue([
      { name: 'story-structure', description: '故事结构' },
      { name: 'character-creation', description: '人物塑造' }
    ])
    mockedSkillService.invoke.mockResolvedValue({ output: 'Generated outline' } as any)
  })

  it('should show "请先选择一个项目" when no projectId', () => {
    render(<WorkshopView projectId={null} />)
    expect(screen.getByText('请先选择一个项目')).toBeInTheDocument()
  })

  it('should load skills from service', async () => {
    render(<WorkshopView projectId="proj-1" />)
    await waitFor(() => {
      expect(screen.getByText('story-structure')).toBeInTheDocument()
    })
  })

  it('should show fallback skills when service fails', async () => {
    mockedSkillService.list.mockRejectedValue(new Error('Service error'))
    render(<WorkshopView projectId="proj-1" />)
    await waitFor(() => {
      expect(screen.getByText('story-structure')).toBeInTheDocument()
    })
  })

  it('should invoke skill and display result', async () => {
    mockedSkillService.list.mockResolvedValue([{ name: 'outline', description: '大纲' }])
    render(<WorkshopView projectId="proj-1" />)
    await waitFor(() => {
      expect(screen.getByText('outline')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('outline'))
    const input = screen.getByPlaceholderText(/outline/)
    fireEvent.change(input, { target: { value: 'Create outline' } })
    fireEvent.click(screen.getByText('发送'))
    await waitFor(() => {
      expect(screen.getByText('Generated outline')).toBeInTheDocument()
    })
  })

  it('should show error when skill invocation fails', async () => {
    mockedSkillService.list.mockResolvedValue([{ name: 'outline', description: '大纲' }])
    mockedSkillService.invoke.mockRejectedValue(new Error('Invoke failed'))
    render(<WorkshopView projectId="proj-1" />)
    await waitFor(() => {
      expect(screen.getByText('outline')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('outline'))
    const input = screen.getByPlaceholderText(/outline/)
    fireEvent.change(input, { target: { value: 'Test' } })
    fireEvent.click(screen.getByText('发送'))
    await waitFor(() => {
      expect(screen.getByText(/错误/)).toBeInTheDocument()
    })
  })

  it('should extract result from metadata when no output', async () => {
    mockedSkillService.list.mockResolvedValue([{ name: 'outline', description: '大纲' }])
    mockedSkillService.invoke.mockResolvedValue({ metadata: { description: 'Outline done' } } as any)
    render(<WorkshopView projectId="proj-1" />)
    await waitFor(() => {
      expect(screen.getByText('outline')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('outline'))
    const input = screen.getByPlaceholderText(/outline/)
    fireEvent.change(input, { target: { value: 'Test' } })
    fireEvent.click(screen.getByText('发送'))
    await waitFor(() => {
      expect(screen.getByText('Outline done')).toBeInTheDocument()
    })
  })
})
