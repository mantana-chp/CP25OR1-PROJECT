import { Redirect, useRootNavigationState } from 'expo-router'
import LoadingComponent from '../presentation/components/loading_component'

export default function StartPage() {
  const navigationState = useRootNavigationState()

  if (!navigationState?.key) {
    return <LoadingComponent />
  }

  const hasSeenOnboarding = false

  if (hasSeenOnboarding) {
    return <Redirect href="/(tabs)" />
  } else {
    return <Redirect href="/onboarding" />
  }
}
