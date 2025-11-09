import { useAuth } from '@/src/context/AuthContext'
import { useRouter } from 'expo-router'
import { Button, Image, StyleSheet, Text, View } from 'react-native'

export default function FinalStep() {
  const { completeOnboarding } = useAuth()
  const router = useRouter()

  const handleFinish = async () => {
    await completeOnboarding()
    router.replace('/(tabs)')
  }

  return (
    <View style={styles.container}>
      <Image
        source={require('@/assets/images/onboard-3.png')}
        style={styles.image}
        resizeMode="contain"
      />
      <Text style={styles.title}>Onboarding Screen 3</Text>
      <Button title="เริ่มใช้งาน" onPress={handleFinish} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'Prompt_700Bold',
    marginBottom: 32,
    color: '#333'
  },
  image: {
    width: 200,
    height: 200
  }
})
