import React, { createContext, ReactNode, useContext, useState } from 'react'

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
      {/* This is your "core component" for displaying the error */}
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
  onClose
}) => {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        backgroundColor: '#FF4136', // Red
        color: 'white',
        padding: '16px 24px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontFamily: 'sans-serif',
        maxWidth: '350px'
      }}
    >
      <span>{message}</span>
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          color: 'white',
          fontSize: '20px',
          marginLeft: '16px',
          cursor: 'pointer',
          lineHeight: '1'
        }}
      >
        &times;
      </button>
    </div>
  )
}
