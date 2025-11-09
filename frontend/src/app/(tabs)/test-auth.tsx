import { deviceIdService } from '@/src/utils/devices/deviceIdService'
import axios from 'axios'
import { useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native'

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.182.150:3000'

export default function TestAuthScreen() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [deviceIds, setDeviceIds] = useState<any>(null)

  const testGetDeviceIds = async () => {
    try {
      setLoading(true)
      setError(null)
      setResult(null)

      console.log('🔍 Getting device identifiers...')
      const ids = await deviceIdService.getDeviceIdentifiers()

      console.log('✅ Device IDs obtained:', ids)
      setDeviceIds(ids)
      setResult({ type: 'deviceIds', data: ids })
    } catch (err: any) {
      console.error('❌ Error getting device IDs:', err)
      setError(err.message || 'Failed to get device IDs')
    } finally {
      setLoading(false)
    }
  }

  const testDeviceLogin = async () => {
    try {
      setLoading(true)
      setError(null)
      setResult(null)

      console.log('🔍 Step 1: Getting device identifiers...')
      const ids = await deviceIdService.getDeviceIdentifiers()
      console.log('✅ Device IDs:', ids)
      setDeviceIds(ids)

      const payload = {
        installationId: ids.installationId,
        platform: ids.platform,
        platformDeviceId: ids.platformDeviceId,
        platformIdSource: ids.platformIdSource
      }

      console.log('📤 Step 2: Sending device-login request...')
      console.log('📤 URL:', `${API_BASE_URL}/v1/auth/device-login`)
      console.log('📤 Payload:', payload)

      const response = await axios.post(
        `${API_BASE_URL}/v1/auth/device-login`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      )

      console.log('✅ Response status:', response.status)
      console.log('✅ Response data:', response.data)

      console.log(response.data.data.accessToken)

      setResult({
        type: 'deviceLogin',
        status: response.status,
        data: {
          user: response.data.user,
          accessToken: response.data.data.accessToken?.substring(0, 50) + '...',
          refreshToken:
            response.data.data.refreshToken?.substring(0, 50) + '...',
          fullAccessToken: response.data.data.accessToken,
          fullRefreshToken: response.data.data.refreshToken
        }
      })
    } catch (err: any) {
      console.error('❌ Error during device login:', err)

      if (axios.isAxiosError(err)) {
        if (err.response) {
          console.error(
            '❌ Response error:',
            err.response.status,
            err.response.data
          )
          setError(
            `Server error: ${err.response.status} - ${JSON.stringify(
              err.response.data
            )}`
          )
        } else if (err.request) {
          console.error('❌ Network error:', err.message)
          setError(
            `Network error: ${err.message}. Cannot reach ${API_BASE_URL}`
          )
        } else {
          console.error('❌ Error:', err.message)
          setError(err.message)
        }
      } else {
        setError(err.message || 'Unknown error')
      }
    } finally {
      setLoading(false)
    }
  }

  const testRefresh = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!result?.data?.fullRefreshToken || !deviceIds?.installationId) {
        setError('Please run Device Login test first to get a refresh token')
        return
      }

      console.log('🔄 Testing refresh endpoint...')
      console.log('📤 URL:', `${API_BASE_URL}/v1/auth/refresh`)
      console.log(
        '📤 Refresh Token:',
        result.data.fullRefreshToken.substring(0, 50) + '...'
      )
      console.log('📤 Installation ID:', deviceIds.installationId)

      const response = await axios.post(
        `${API_BASE_URL}/v1/auth/refresh`,
        { refreshToken: result.data.fullRefreshToken },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Installation-Id': deviceIds.installationId
          },
          timeout: 15000
        }
      )

      console.log('✅ Refresh response:', response.status)
      console.log('✅ Refresh data:', response.data)

      setResult({
        type: 'refresh',
        status: response.status,
        data: {
          user: response.data.data.user,
          accessToken: response.data.data.accessToken?.substring(0, 50) + '...',
          refreshToken:
            response.data.data.refreshToken?.substring(0, 50) + '...'
        }
      })
    } catch (err: any) {
      console.error('❌ Refresh error:', err)
      if (axios.isAxiosError(err) && err.response) {
        setError(
          `Server error: ${err.response.status} - ${JSON.stringify(
            err.response.data
          )}`
        )
      } else {
        setError(err.message || 'Unknown error')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔐 Auth Endpoint Tester</Text>
        <Text style={styles.subtitle}>Backend: {API_BASE_URL}</Text>
      </View>

      <View style={styles.buttonContainer}>
        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={testGetDeviceIds}
          disabled={loading}
        >
          <Text style={styles.buttonText}>1. Get Device IDs</Text>
        </Pressable>

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={testDeviceLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>2. Test Device Login</Text>
        </Pressable>

        <Pressable
          style={[
            styles.button,
            styles.buttonSecondary,
            loading && styles.buttonDisabled
          ]}
          onPress={testRefresh}
          disabled={loading || !result?.data?.fullRefreshToken}
        >
          <Text style={styles.buttonText}>3. Test Refresh Token</Text>
        </Pressable>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Testing...</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>❌ Error</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {deviceIds && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>📱 Device IDs</Text>
          <Text style={styles.resultText}>
            Installation ID: {deviceIds.installationId}
          </Text>
          <Text style={styles.resultText}>Platform: {deviceIds.platform}</Text>
          <Text style={styles.resultText}>
            Device ID: {deviceIds.platformDeviceId}
          </Text>
          <Text style={styles.resultText}>
            Source: {deviceIds.platformIdSource}
          </Text>
        </View>
      )}

      {result && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>
            ✅{' '}
            {result.type === 'deviceLogin'
              ? 'Device Login'
              : result.type === 'refresh'
              ? 'Refresh'
              : 'Device IDs'}{' '}
            Success
          </Text>

          {result.status && (
            <Text style={styles.resultText}>Status: {result.status}</Text>
          )}

          {result.data && (
            <>
              {result.data.user && (
                <>
                  <Text style={styles.sectionTitle}>User:</Text>
                  <Text style={styles.resultText}>
                    ID: {result.data.user.id}
                  </Text>
                  <Text style={styles.resultText}>
                    Installation ID: {result.data.user.current_installation_id}
                  </Text>
                  <Text style={styles.resultText}>
                    Platform: {result.data.user.current_platform}
                  </Text>
                </>
              )}

              {result.data.accessToken && (
                <>
                  <Text style={styles.sectionTitle}>Access Token:</Text>
                  <Text style={styles.tokenText}>
                    {result.data.accessToken}
                  </Text>
                </>
              )}

              {result.data.refreshToken && (
                <>
                  <Text style={styles.sectionTitle}>Refresh Token:</Text>
                  <Text style={styles.tokenText}>
                    {result.data.refreshToken}
                  </Text>
                </>
              )}
            </>
          )}
        </View>
      )}

      <View style={styles.instructions}>
        <Text style={styles.instructionsTitle}>📝 Instructions:</Text>
        <Text style={styles.instructionsText}>
          1. Click "Get Device IDs" to see device identifiers
        </Text>
        <Text style={styles.instructionsText}>
          2. Click "Test Device Login" to call /v1/auth/device-login
        </Text>
        <Text style={styles.instructionsText}>
          3. Click "Test Refresh Token" to call /v1/auth/refresh
        </Text>
        <Text style={styles.instructionsText}></Text>
        <Text style={styles.instructionsText}>
          ✅ Check console logs for detailed output
        </Text>
        <Text style={styles.instructionsText}>
          ✅ Make sure backend is running and accessible
        </Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 20,
    paddingTop: 60
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)'
  },
  buttonContainer: {
    padding: 20,
    gap: 12
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center'
  },
  buttonSecondary: {
    backgroundColor: '#34C759'
  },
  buttonDisabled: {
    opacity: 0.5
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666'
  },
  errorContainer: {
    margin: 20,
    padding: 16,
    backgroundColor: '#FFE5E5',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30'
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginBottom: 8
  },
  errorText: {
    fontSize: 14,
    color: '#C00'
  },
  resultContainer: {
    margin: 20,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#34C759'
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#34C759',
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
    marginBottom: 4
  },
  resultText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  tokenText: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'monospace'
  },
  instructions: {
    margin: 20,
    padding: 16,
    backgroundColor: '#FFF9E6',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FFB800'
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#996600',
    marginBottom: 8
  },
  instructionsText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  }
})
