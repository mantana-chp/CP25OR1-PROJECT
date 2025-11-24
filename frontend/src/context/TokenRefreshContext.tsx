import { tokenRefreshEmitter } from '@/src/utils/api/token_refresh_emitter'
import React, { createContext, useContext, useEffect, useState } from 'react'
import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native'

interface TokenRefreshContextType {
  isRefreshing: boolean
}

const TokenRefreshContext = createContext<TokenRefreshContextType | undefined>(
  undefined
)

export const useTokenRefresh = () => {
  const context = useContext(TokenRefreshContext)
  if (!context) {
    throw new Error('useTokenRefresh must be used within TokenRefreshProvider')
  }
  return context
}

export function TokenRefreshProvider({
  children
}: {
  children: React.ReactNode
}) {
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    const unsubscribe = tokenRefreshEmitter.subscribe((refreshing) => {
      setIsRefreshing(refreshing)
    })

    return unsubscribe
  }, [])

  return (
    <TokenRefreshContext.Provider value={{ isRefreshing }}>
      {children}

      <Modal
        visible={isRefreshing}
        transparent={true}
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.overlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#5FA7D1" />
            <Text style={styles.loadingText}>กำลังโหลด...</Text>
            <Text style={styles.loadingSubtext}>โปรดรอสักครู่</Text>
          </View>
        </View>
      </Modal>
    </TokenRefreshContext.Provider>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 200
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Prompt_400Regular',
    color: '#374151',
    textAlign: 'center'
  },
  loadingSubtext: {
    marginTop: 4,
    fontSize: 14,
    fontFamily: 'Prompt_400Regular',
    color: '#6b7280',
    textAlign: 'center'
  }
})
