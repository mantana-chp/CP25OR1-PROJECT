// lib/api/useApi.ts
import { useCallback, useState } from 'react'
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

/**
 * Generic hook for API calls with automatic state management and error handling
 * @param apiFunction - The API function to call
 * @param options - Configuration options
 */
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

  const execute = useCallback(
    async (...args: Args) => {
      setState({ data: null, loading: true, error: null })

      try {
        const data = await apiFunction(...args)
        setState({ data, loading: false, error: null })

        if (successMessage) {
          Alert.alert('Success', successMessage)
        }

        if (onSuccess) {
          onSuccess(data)
        }

        return { data, error: null }
      } catch (err) {
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

/**
 * Hook for API calls that auto-execute on mount
 * @param apiFunction - The API function to call
 * @param args - Arguments to pass to the API function
 * @param options - Configuration options
 */
export function useApiQuery<T, Args extends any[] = any[]>(
  apiFunction: (...args: Args) => Promise<T>,
  args: Args,
  options: ApiOptions & { enabled?: boolean } = {}
) {
  const { enabled = true, ...apiOptions } = options
  const api = useApi(apiFunction, apiOptions)

  // Auto-execute on mount
  useState(() => {
    if (enabled) {
      api.execute(...args)
    }
  })

  const refetch = useCallback(() => {
    return api.execute(...args)
  }, [api, args])

  return {
    ...api,
    refetch
  }
}
