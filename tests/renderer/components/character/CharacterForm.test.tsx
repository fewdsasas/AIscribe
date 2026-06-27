import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CharacterForm } from '@renderer/components/character/CharacterForm'
import { characterService } from '@renderer/services'

vi.mock('@renderer/components/shared/Toast', () => ({
  useToast: () => ({ showToast: vi.fn() })
}))

vi.mock('@renderer/services', () => ({
  characterService: {
    create: vi.fn()
  }
}))

const mockedCharacterService = vi.mocked(characterService)

describe('CharacterForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedCharacterService.create.mockResolvedValue({ id: 'char-1' } as any)
  })

  it('should render form fields', () => {
    render(<CharacterForm novelId="novel-1" onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(screen.getByText('新建角色')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('输入角色名')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/逗号分隔/)).toBeInTheDocument()
  })

  it('should disable save when name is empty', () => {
    render(<CharacterForm novelId="novel-1" onClose={vi.fn()} onSaved={vi.fn()} />)
    const saveBtn = screen.getByText('保存角色')
    expect(saveBtn).toBeDisabled()
  })

  it('should enable save when name is filled', () => {
    render(<CharacterForm novelId="novel-1" onClose={vi.fn()} onSaved={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText('输入角色名'), { target: { value: '张三' } })
    expect(screen.getByText('保存角色')).not.toBeDisabled()
  })

  it('should call characterService.create on save', async () => {
    const onSaved = vi.fn()
    const onClose = vi.fn()
    render(<CharacterForm novelId="novel-1" onClose={onClose} onSaved={onSaved} />)
    fireEvent.change(screen.getByPlaceholderText('输入角色名'), { target: { value: '张三' } })
    fireEvent.click(screen.getByText('保存角色'))
    await waitFor(() => {
      expect(mockedCharacterService.create).toHaveBeenCalled()
      expect(onSaved).toHaveBeenCalled()
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('should close on backdrop click', () => {
    const onClose = vi.fn()
    render(<CharacterForm novelId="novel-1" onClose={onClose} onSaved={vi.fn()} />)
    const backdrop = screen.getByText('新建角色').closest('.fixed')
    expect(backdrop).toBeDefined()
    if (!backdrop) throw new Error('backdrop not found')
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalled()
  })
})
