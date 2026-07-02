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
    expect(result.current.friendlyError).toBe('fetch failed')
    expect(result.current.data).toBeUndefined()
  })

  it('should provide friendly error for known error types', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('项目ID 格式无效'))
    const { result } = renderHook(() => useIPCQuery(fetcher, []))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.friendlyError).toBe('ID 格式不正确，请检查输入')
  })

  it('should wrap non-Error fetch rejection', async () => {
    const fetcher = vi.fn().mockRejectedValue('string error')
    const { result } = renderHook(() => useIPCQuery(fetcher, []))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error?.message).toBe('string error')
  })

  it('should ignore fetch result after unmount', async () => {
    let resolveFetcher: (value: string) => void = () => {}
    const fetcher = vi.fn().mockImplementation(
      () =>
        new Promise<string>(resolve => {
          resolveFetcher = resolve
        })
    )
    const { result, unmount } = renderHook(() => useIPCQuery(fetcher, []))

    expect(result.current.loading).toBe(true)
    unmount()
    resolveFetcher('late result')

    await waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(1)
    })
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
    expect(result.current.friendlyError).toBe('mutation failed')
    expect(result.current.loading).toBe(false)
  })

  it('should wrap non-Error mutation rejection', async () => {
    const mutator = vi.fn().mockRejectedValue('string error')
    const { result } = renderHook(() => useIPCMutation<string, { name: string }>(mutator))

    await expect(result.current.mutate({ name: 'test' })).rejects.toThrow('string error')

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error)
      expect(result.current.error?.message).toBe('string error')
    })
  })

  it('should ignore mutation result after unmount', async () => {
    let resolveMutator: (value: string) => void = () => {}
    const mutator = vi.fn().mockImplementation(
      () =>
        new Promise<string>(resolve => {
          resolveMutator = resolve
        })
    )
    const { result, unmount } = renderHook(() => useIPCMutation<string, { name: string }>(mutator))

    const mutatePromise = result.current.mutate({ name: 'test' })
    unmount()
    resolveMutator('late result')

    await expect(mutatePromise).resolves.toBe('late result')
  })
})
