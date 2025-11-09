import { useAuth } from '@/src/context/AuthContext'
import { Redirect, useRootNavigationState } from 'expo-router'
import LoadingComponent from '../presentation/components/loading_component'

export default function StartPage() {
  const navigationState = useRootNavigationState()
  const { hasCompletedOnboarding, isLoading } = useAuth()

  // Wait for navigation to be ready
  if (!navigationState?.key) {
    return <LoadingComponent />
  }

  // Wait for auth context to load
  if (isLoading) {
    return <LoadingComponent />
  }

  // Redirect based on onboarding status
  if (hasCompletedOnboarding) {
    return <Redirect href="/(tabs)" />
  } else {
    return <Redirect href="/onboarding" />
  }
}
