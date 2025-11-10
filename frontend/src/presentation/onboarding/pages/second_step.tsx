import { Link } from 'expo-router'
import { Button, Image, StyleSheet, Text, View } from 'react-native'

export default function SecondStep() {
  return (
    <View style={styles.container}>
      <Image
        source={require('@/assets/images/onboard-2.png')}
        style={styles.image}
        resizeMode="contain"
      />
      <Text style={styles.title}>ไม่พลาดทุกการเตือนสำคัญ</Text>
      <Text style={styles.subTitle}>
        รับการแจ้งเตือนเรื่องวัคซีน การหาหมอ
        และกิจวัตรการดูแลสัตว์เลี้ยงตรงเวลาเสมอ
      </Text>
      <Link href="/onboarding/final" push asChild>
        <Button title="Next" />
      </Link>
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
