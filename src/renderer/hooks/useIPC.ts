import { useCallback, useEffect, useRef, useState } from 'react'
import { getUserFriendlyMessage, parseIPCError } from '../utils/ipc-error'

export interface UseIPCQueryResult<T> {
  data: T | undefined
  loading: boolean
  error: Error | null
  friendlyError: string | null
  refetch: () => void
}

export function useIPCQuery<T>(fetcher: () => Promise<T>, deps: unknown[] = []): UseIPCQueryResult<T> {
  const [data, setData] = useState<T | undefined>(undefined)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const [friendlyError, setFriendlyError] = useState<string | null>(null)
  const isMountedRef = useRef(true)

  const refetch = useCallback(() => {
    setLoading(true)
    setError(null)
    setFriendlyError(null)
    fetcher()
      .then(result => {
        if (isMountedRef.current) {
          setData(result)
          setLoading(false)
        }
      })
      .catch(err => {
        const wrapped = err instanceof Error ? err : new Error(String(err))
        if (isMountedRef.current) {
          setError(wrapped)
          setFriendlyError(getUserFriendlyMessage(parseIPCError(wrapped).code, wrapped.message))
          setLoading(false)
        }
      })
  }, deps)

  useEffect(() => {
    isMountedRef.current = true
    refetch()
    return () => {
      isMountedRef.current = false
    }
  }, [refetch])

  return { data, loading, error, friendlyError, refetch }
}

export interface UseIPCMutationResult<T, A> {
  mutate: (args: A) => Promise<T | undefined>
  loading: boolean
  error: Error | null
  friendlyError: string | null
}

export function useIPCMutation<T, A>(mutator: (args: A) => Promise<T>): UseIPCMutationResult<T, A> {
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)
  const [friendlyError, setFriendlyError] = useState<string | null>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const mutate = useCallback(
    async (args: A): Promise<T | undefined> => {
      setLoading(true)
      setError(null)
      setFriendlyError(null)
      try {
        const result = await mutator(args)
        if (isMountedRef.current) {
          setLoading(false)
        }
        return result
      } catch (err) {
        const wrapped = err instanceof Error ? err : new Error(String(err))
        if (isMountedRef.current) {
          setError(wrapped)
          setFriendlyError(getUserFriendlyMessage(parseIPCError(wrapped).code, wrapped.message))
          setLoading(false)
        }
        throw wrapped
      }
    },
    [mutator]
  )

  return { mutate, loading, error, friendlyError }
}
