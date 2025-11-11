type Listener = (isRefreshing: boolean) => void

class TokenRefreshEmitter {
  private listeners: Listener[] = []

  subscribe(listener: Listener) {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  emit(isRefreshing: boolean) {
    this.listeners.forEach((listener) => listener(isRefreshing))
  }
}

export const tokenRefreshEmitter = new TokenRefreshEmitter()
