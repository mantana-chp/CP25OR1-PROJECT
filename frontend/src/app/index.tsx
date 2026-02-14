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

  // Redirect to add pet form if onboarding completed but no pets exist
  if (hasCompletedOnboarding && pets.length === 0) {
    return <Redirect href="/(tabs)/add_pet_form" />
  }

  return <Redirect href="/(tabs)" />
}
