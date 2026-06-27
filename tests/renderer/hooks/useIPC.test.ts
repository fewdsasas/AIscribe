// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useIPCMutation, useIPCQuery } from '@renderer/hooks/useIPC'

describe('useIPCQuery', () => {
  it('should load data on mount', async () => {
    const fetcher = vi.fn().mockResolvedValue('result')
    const { result } = renderHook(() => useIPCQuery(fetcher, []))

    expect(result.current.loading).toBe(true)
    expect(result.current.data).toBeUndefined()

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toBe('result')
    expect(result.current.error).toBeNull()
  })

  it('should handle fetch errors', async () => {
    const error = new Error('fetch failed')
    const fetcher = vi.fn().mockRejectedValue(error)
    const { result } = renderHook(() => useIPCQuery(fetcher, []))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toEqual(error)
    expect(result.current.data).toBeUndefined()
  })

  it('should refetch data', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce('first').mockResolvedValueOnce('second')
    const { result } = renderHook(() => useIPCQuery(fetcher, []))

    await waitFor(() => {
      expect(result.current.data).toBe('first')
    })

    result.current.refetch()

    await waitFor(() => {
      expect(result.current.data).toBe('second')
    })

    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})

describe('useIPCMutation', () => {
  it('should call mutator and return result', async () => {
    const mutator = vi.fn().mockResolvedValue('created')
    const { result } = renderHook(() => useIPCMutation<string, { name: string }>(mutator))

    let mutateResult: string | undefined
    await waitFor(async () => {
      mutateResult = await result.current.mutate({ name: 'test' })
    })

    expect(mutator).toHaveBeenCalledWith({ name: 'test' })
    expect(mutateResult).toBe('created')
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('should set error on mutation failure', async () => {
    const error = new Error('mutation failed')
    const mutator = vi.fn().mockRejectedValue(error)
    const { result } = renderHook(() => useIPCMutation<string, { name: string }>(mutator))

    await expect(result.current.mutate({ name: 'test' })).rejects.toThrow('mutation failed')

    await waitFor(() => {
      expect(result.current.error).toEqual(error)
    })
    expect(result.current.loading).toBe(false)
  })
})
