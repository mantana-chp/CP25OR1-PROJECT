import { useRouter, useLocalSearchParams } from 'expo-router'
import { Image, StyleSheet, Text, View } from 'react-native'
import PrimaryButton from '../../components/primary_button'
import Button from '../../components/button'

export default function PetOptionsStep() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const isPostOnboarding = params?.isPostOnboarding === 'true'

  const handleCreatePet = () => {
    if (isPostOnboarding) {
      router.push(
        '/(tabs)/add_pet_form?isFromPetOptions=true&isPostOnboarding=true',
      )
    } else {
      router.push('/onboarding/pet-profile?isFromPetOptions=true')
    }
  }

  const handleAcceptInvitation = () => {
    if (isPostOnboarding) {
      router.push(
        '/(tabs)/scan_pet_share?isFromPetOptions=true&isPostOnboarding=true',
      )
    } else {
      router.push(
        '/(tabs)/scan_pet_share?fromOnboarding=true&isFromPetOptions=true',
      )
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Image
          source={require('@/assets/images/pet-options.png')}
          style={styles.image}
          resizeMode='contain'
        />
        <Text style={styles.title}>เลือกสิ่งที่คุณต้องการทำ</Text>
        <Text style={styles.subTitle}>
          คุณยังไม่มีสัตว์เลี้ยงในระบบ
          {'\n'}
          กรุณาเลือกตัวเลือกต่อไปนี้{'\n'}เพื่อเริ่มต้นใช้งาน
        </Text>

        <View style={styles.buttonsContainer}>
          <PrimaryButton
            title='สร้างโปรไฟล์สัตว์เลี้ยง'
            onPress={handleCreatePet}
            style={styles.button}
          />

          <Button
            title='รับคำเชิญเป็นผู้ดูแลร่วม'
            onPress={handleAcceptInvitation}
            variant='ghost'
            style={styles.button}
          />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F1',
    padding: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: 340,
    height: 340,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'Prompt_700Bold',
    marginBottom: 16,
    color: '#225877',
    textAlign: 'center',
  },
  subTitle: {
    fontSize: 16,
    fontFamily: 'Prompt_400Regular',
    marginBottom: 40,
    color: '#225877',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 40,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
  },
  buttonsContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    width: '100%',
  },
})
