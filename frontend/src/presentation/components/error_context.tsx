import React, { createContext, ReactNode, useContext, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'

// Define the shape of the context
interface ErrorContextType {
  showError: (message: string) => void
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined)

// Define the provider component
interface ErrorProviderProps {
  children: ReactNode
}

export const ErrorProvider: React.FC<ErrorProviderProps> = ({ children }) => {
  const [error, setError] = useState<string | null>(null)

  // Function to show an error for 5 seconds
  const showError = (message: string) => {
    setError(message)
    setTimeout(() => {
      setError(null)
    }, 5000)
  }

  return (
    <ErrorContext.Provider value={{ showError }}>
      {children}
      {error && (
        <GlobalErrorToast message={error} onClose={() => setError(null)} />
      )}
    </ErrorContext.Provider>
  )
}

// Custom hook to easily use the context
export const useError = () => {
  const context = useContext(ErrorContext)
  if (!context) {
    throw new Error('useError must be used within an ErrorProvider')
  }
  return context
}

// --- The Toast Component ---
interface GlobalErrorToastProps {
  message: string
  onClose: () => void
}

const GlobalErrorToast: React.FC<GlobalErrorToastProps> = ({
  message,
  onClose,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
      <TouchableOpacity onPress={onClose} style={styles.closeButton}>
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#FF4136',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
    zIndex: 9999,
  },
  message: {
    color: 'white',
    fontSize: 14,
    flex: 1,
    marginRight: 12,
    fontFamily: 'Prompt_400Regular',
  },
  closeButton: {
    padding: 4,
  },
  closeText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
})
