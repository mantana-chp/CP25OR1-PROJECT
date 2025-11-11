import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert } from 'react-native' 
import { ApiError } from './api_client'

export interface ApiState<T> {
  data: T | null
  loading: boolean
  error: ApiError | null
}

export interface ApiOptions {
  showErrorAlert?: boolean
  onSuccess?: (data: any) => void
  onError?: (error: ApiError) => void
  successMessage?: string
}

export function useApi<T, Args extends any[] = any[]>(
  apiFunction: (...args: Args) => Promise<T>,
  options: ApiOptions = {}
) {
  const { showErrorAlert = true, onSuccess, onError, successMessage } = options

  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null
  })

  const isMountedRef = useRef(true)

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const execute = useCallback(
    async (...args: Args) => {
      if (!isMountedRef.current) return { data: null, error: null }

      setState((prev) => ({ ...prev, loading: true, error: null }))

      try {
        const data = await apiFunction(...args)

        if (!isMountedRef.current) return { data, error: null }

        setState({ data, loading: false, error: null })

        if (successMessage) {
          Alert.alert('Success', successMessage)
        }

        if (onSuccess) {
          onSuccess(data)
        }

        return { data, error: null }
      } catch (err) {
        if (!isMountedRef.current) return { data: null, error: null }

        const error =
          err instanceof ApiError
            ? err
            : new ApiError(0, 'An unexpected error occurred')

        setState({ data: null, loading: false, error })

        if (showErrorAlert) {
          Alert.alert('Error', error.message)
        }

        if (onError) {
          onError(error)
        }

        return { data: null, error }
      }
    },
    [apiFunction, showErrorAlert, onSuccess, onError, successMessage]
  )

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null })
  }, [])

  return {
    ...state,
    execute,
    reset
  }
}

export function useApiQuery<T, Args extends any[] = any[]>(
  apiFunction: (...args: Args) => Promise<T>,
  args: Args,
  options: ApiOptions & { enabled?: boolean } = {}
) {
  console.warn(
    '⚠️ useApiQuery is deprecated and may cause Suspense errors. Use useApi with manual execute() instead.'
  )

  const { enabled = true, ...apiOptions } = options
  const api = useApi(apiFunction, apiOptions)

  const refetch = useCallback(() => {
    return api.execute(...args)
  }, [api.execute, JSON.stringify(args)])

  return {
    ...api,
    refetch
  }
}
