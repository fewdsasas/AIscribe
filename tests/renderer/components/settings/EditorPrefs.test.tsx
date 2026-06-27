import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { EditorPrefs } from '../../../../src/renderer/components/settings/EditorPrefs'

describe('EditorPrefs', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should render with default prefs', () => {
    render(<EditorPrefs />)
    expect(screen.getByText(/自动保存间隔/)).toBeInTheDocument()
    expect(screen.getByText(/每日写作目标/)).toBeInTheDocument()
    expect(screen.getByText(/正文字号/)).toBeInTheDocument()
  })

  it('should load prefs from localStorage on mount', () => {
    localStorage.setItem(
      'aiscribe-editor-prefs',
      JSON.stringify({
        autoSaveInterval: 10,
        dailyGoal: 5000,
        fontSize: 18,
        fontFamily: 'sans'
      })
    )
    render(<EditorPrefs />)
    expect(screen.getByText(/10 秒/)).toBeInTheDocument()
  })

  it('should handle invalid localStorage data gracefully', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    localStorage.setItem('aiscribe-editor-prefs', 'invalid-json{{{')
    render(<EditorPrefs />)
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('编辑器偏好解析失败'), expect.anything())
    warnSpy.mockRestore()
  })

  it('should save prefs to localStorage and show saved indicator', () => {
    vi.useFakeTimers()
    render(<EditorPrefs />)
    fireEvent.click(screen.getByText('保存偏好'))
    const stored = localStorage.getItem('aiscribe-editor-prefs')
    expect(stored).toBeTruthy()
    expect(screen.getByText('✓ 已保存')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(screen.getByText('保存偏好')).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('should update font size when size button clicked', () => {
    render(<EditorPrefs />)
    fireEvent.click(screen.getByText('18'))
    expect(screen.getByText(/18px/)).toBeInTheDocument()
  })

  it('should update font family when family button clicked', () => {
    render(<EditorPrefs />)
    const sansBtn = screen.getByText('Sans（无衬线）')
    fireEvent.click(sansBtn)
    expect(sansBtn.className).toContain('--color-primary')
  })

  it('should update autoSaveInterval via range input', () => {
    render(<EditorPrefs />)
    const inputs = screen.getAllByRole('slider')
    const intervalInput = inputs[0]
    fireEvent.change(intervalInput, { target: { value: '30' } })
    const matches = screen.getAllByText(/30 秒/)
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })
})
