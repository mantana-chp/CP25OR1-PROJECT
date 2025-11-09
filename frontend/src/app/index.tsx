import { Redirect, useRootNavigationState } from 'expo-router'
import LoadingComponent from '../presentation/components/loading_component'

export default function StartPage() {
  const navigationState = useRootNavigationState()

  // Wait for navigation to be ready
  if (!navigationState?.key) {
    return <LoadingComponent />
  }

  // Check if user has seen onboarding
  const hasSeenOnboarding = false // TODO: Get from AsyncStorage/Zustand

  // Use Redirect component instead of router.replace()
  if (hasSeenOnboarding) {
    return <Redirect href="/(tabs)" />
  } else {
    return <Redirect href="/onboarding" />
  }
}
