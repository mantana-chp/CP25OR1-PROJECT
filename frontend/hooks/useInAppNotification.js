import { useState } from 'react'

export function useInAppNotification() {
  const [notification, setNotification] = useState(null)

  const showNotification = (message) => {
    setNotification({ message })
  }

  const hideNotification = () => {
    setNotification(null)
  }

  return { notification, showNotification, hideNotification }
}
