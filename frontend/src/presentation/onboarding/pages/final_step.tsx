import { useAuth } from '@/src/context/AuthContext'
import { usePets } from '@/src/context/PetContext'
import { useRouter } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import PrimaryButton from '../../components/primary_button'

export default function FinalStep() {
  const { completeOnboarding } = useAuth()
  const { pets } = usePets()
  const router = useRouter()

  const handleFinish = async () => {
    if (!pets || pets.length === 0) {
      router.replace('/onboarding/pet-profile')
    } else {
      await completeOnboarding()
      router.replace('/(tabs)')
    }
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <ChevronLeft size={24} color="#5FA7D1" />
        <Text style={styles.backButtonText}>ย้อนกลับ</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Image
          source={require('@/assets/images/onboard-3.png')}
          style={styles.image}
          resizeMode="contain"
        />
        <Text style={styles.title}>รู้จักกับผู้ช่วย AI ของคุณ!</Text>
        <Text style={styles.subTitle}>
          พูดคุยกับผู้ช่วยอัจฉริยะ{'\n'}
          เพื่อรับคำแนะนำการดูแลสัตว์เลี้ยง{'\n'}
          และการแจ้งเตือนเฉพาะตัวของสัตว์เลี้ยง
        </Text>

        <View style={styles.dotsContainer}>
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={[styles.dot, styles.activeDot]} />
        </View>

        <PrimaryButton
          title="เริ่มต้นใช้งาน"
          onPress={handleFinish}
          style={{ width: '100%' }}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F1',
    padding: 20
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  backButtonText: {
    fontSize: 16,
    color: '#5FA7D1',
    fontFamily: 'Prompt_400Regular'
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  image: {
    width: 300,
    height: 300,
    marginBottom: 40
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'Prompt_700Bold',
    marginBottom: 16,
    color: '#225877',
    textAlign: 'center'
  },
  subTitle: {
    fontSize: 16,
    fontFamily: 'Prompt_400Regular',
    marginBottom: 40,
    color: '#225877',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB'
  },
  activeDot: {
    backgroundColor: '#5FA7D1',
    width: 24
  }
})
