import { useAuth } from '@/src/context/AuthContext'
import { usePets } from '@/src/context/PetContext'
import { Redirect, useRootNavigationState } from 'expo-router'
import LoadingComponent from '../presentation/components/loading_component'

export default function StartPage() {
  const navigationState = useRootNavigationState()
  const { hasCompletedOnboarding, isLoading } = useAuth()
  const { pets, loading: petsLoading } = usePets()

  // Wait for navigation to be ready
  if (!navigationState?.key) {
    return <LoadingComponent />
  }

  // Wait for auth context to load
  if (isLoading) {
    return <LoadingComponent />
  }

  // Redirect to onboarding if not completed
  if (!hasCompletedOnboarding) {
    return <Redirect href="/onboarding" />
  }

  // Wait for pets to load before checking
  if (petsLoading) {
    return <LoadingComponent />
  }

  // Redirect to pet option selection if onboarding completed but no pets exist
  // This allows user to choose between creating a pet or accepting an invitation
  // isPostOnboarding=true indicates this is the edge case after onboarding was completed
  if (hasCompletedOnboarding && pets.length === 0) {
    console.log(
      '📍 User completed onboarding with NO pets - Showing pet option selection'
    )
    return <Redirect href="/onboarding/pet-options?isPostOnboarding=true" />
  }

  return <Redirect href="/(tabs)" />
}
