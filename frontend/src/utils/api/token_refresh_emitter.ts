type Listener = (isRefreshing: boolean) => void
type SessionExpiredListener = () => void

class TokenRefreshEmitter {
  private listeners: Listener[] = []
  private sessionExpiredListeners: SessionExpiredListener[] = []

  subscribe(listener: Listener) {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  emit(isRefreshing: boolean) {
    this.listeners.forEach((listener) => listener(isRefreshing))
  }

  onSessionExpired(listener: SessionExpiredListener) {
    this.sessionExpiredListeners.push(listener)
    return () => {
      this.sessionExpiredListeners = this.sessionExpiredListeners.filter(
        (l) => l !== listener
      )
    }
  }

  emitSessionExpired() {
    this.sessionExpiredListeners.forEach((listener) => listener())
  }
}

export const tokenRefreshEmitter = new TokenRefreshEmitter()
