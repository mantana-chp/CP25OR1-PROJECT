import { useAuth } from '@/src/context/AuthContext'
import { Redirect, useRootNavigationState } from 'expo-router'
import LoadingComponent from '../presentation/components/loading_component'

export default function StartPage() {
  const navigationState = useRootNavigationState()
  const { hasCompletedOnboarding, hasPetProfile, isLoading } = useAuth()

  // Wait for navigation to be ready
  if (!navigationState?.key) {
    return <LoadingComponent />
  }

  // Wait for auth context to load
  if (isLoading) {
    return <LoadingComponent />
  }

  // Redirect based on onboarding and pet profile status
  if (!hasCompletedOnboarding) {
    return <Redirect href="/onboarding" />
  }

  if (!hasPetProfile) {
    return <Redirect href="/(tabs)/add_pet_form" />
  }

  return <Redirect href="/(tabs)" />
}
