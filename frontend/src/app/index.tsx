import { useAuth } from '@/src/context/AuthContext'
import { usePets } from '@/src/context/PetContext'
import { Redirect, useRootNavigationState } from 'expo-router'
import LoadingComponent from '../presentation/components/loading_component'

export default function StartPage() {
  const navigationState = useRootNavigationState()
  const { hasCompletedOnboarding, isLoading } = useAuth()
  const { pets, loading: petsLoading } = usePets()

  if (!navigationState?.key) {
    return <LoadingComponent />
  }

  if (isLoading) {
    return <LoadingComponent />
  }

  if (!hasCompletedOnboarding) {
    return <Redirect href="/onboarding" />
  }

  if (petsLoading) {
    return <LoadingComponent />
  }

  if (hasCompletedOnboarding && pets.length === 0) {
    return <Redirect href="/onboarding/pet-options?isPostOnboarding=true" />
  }

  return <Redirect href="/(tabs)" />
}
