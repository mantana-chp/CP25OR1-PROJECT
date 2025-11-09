import { Link } from 'expo-router'
import { Button, Image, StyleSheet, Text, View } from 'react-native'

export default function FirstStep() {
  return (
    <View style={styles.container}>
      <Image
        source={require('@/assets/images/onboard-1.png')}
        style={styles.image}
        resizeMode="contain"
      />
      <Text style={styles.title}>Onboarding Screen 1</Text>

      <Link href="/onboarding/second" push asChild>
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
