import { useCallback, useRef, useState } from 'react'

export const usePullToRefresh = (
  refreshFn: () => Promise<unknown> | unknown
) => {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const isRefreshingRef = useRef(false)

  const onRefresh = useCallback(async () => {
    if (isRefreshingRef.current) {
      return
    }

    isRefreshingRef.current = true
    setIsRefreshing(true)

    try {
      await Promise.resolve(refreshFn())
    } finally {
      isRefreshingRef.current = false
      setIsRefreshing(false)
    }
  }, [refreshFn])

  return {
    isRefreshing,
    onRefresh
  }
}
