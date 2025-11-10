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
      <Text style={styles.title}>รู้จักกับผู้ช่วย AI ของคุณ!</Text>
      <Text style={styles.subTitle}>
        พูดคุยกับผู้ช่วยอัจฉริยะ เพื่อรับคำแนะนำการดูแลสัตว์เลี้ยง
        และการแจ้งเตือนเฉพาะตัวของสัตว์เลี้ยง
      </Text>
      <Button title="เริ่มต้นใช้งาน" onPress={handleFinish} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF9F1',
    padding: 20
  },
  title: {
    fontSize: 21,
    fontWeight: 'bold',
    fontFamily: 'Prompt_700Bold',
    marginBottom: 32,
    color: '#225877'
  },
  subTitle: {
    fontSize: 17,
    fontWeight: 'normal',
    fontFamily: 'Prompt_400Regular',
    marginBottom: 32,
    color: '#225877'
  },
  image: {
    width: 200,
    height: 200
  }
})
