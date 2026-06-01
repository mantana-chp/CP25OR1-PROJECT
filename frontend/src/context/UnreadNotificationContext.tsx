import { notificationService } from '@/src/utils/api/services/notification_service'
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState
} from 'react'
import { useAuth } from './AuthContext'

interface UnreadNotificationContextType {
  unreadCount: number
  refreshUnreadCount: () => Promise<void>
  decrementUnreadCount: () => void
}

const UnreadNotificationContext = createContext<
  UnreadNotificationContextType | undefined
>(undefined)

export const useUnreadNotifications = () => {
  const context = useContext(UnreadNotificationContext)
  if (context === undefined) {
    throw new Error(
      'useUnreadNotifications must be used within an UnreadNotificationProvider'
    )
  }
  return context
}

interface UnreadNotificationProviderProps {
  children: ReactNode
}

export const UnreadNotificationProvider: React.FC<
  UnreadNotificationProviderProps
> = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0)
  const {
    isAuthenticated,
    isLoading: authLoading,
    hasCompletedOnboarding
  } = useAuth()

  const refreshUnreadCount = useCallback(async () => {
    try {
      const response = await notificationService.getNotifications()
      const notifications = response?.data || []
      const unread = notifications.filter((n: any) => !n.readAt).length
      setUnreadCount(unread)
    } catch (error) {
    }
  }, [])

  const decrementUnreadCount = useCallback(() => {
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }, [])

  useEffect(() => {
    if (!authLoading && isAuthenticated && hasCompletedOnboarding) {
      refreshUnreadCount()
      return
    }

    setUnreadCount(0)
  }, [authLoading, isAuthenticated, hasCompletedOnboarding, refreshUnreadCount])

  return (
    <UnreadNotificationContext.Provider
      value={{ unreadCount, refreshUnreadCount, decrementUnreadCount }}
    >
      {children}
    </UnreadNotificationContext.Provider>
  )
}
