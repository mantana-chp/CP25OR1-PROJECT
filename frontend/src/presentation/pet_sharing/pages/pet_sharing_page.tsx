import React from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import Header from '../../components/header_component'
import { useRouter } from 'expo-router'

export default function PetSharingPage() {
  // -------------
  // Const
  // -------------
  const router = useRouter()

  // -------------
  // Mock Data
  // -------------
  const getCaregivers = [
    { id: 1, name: 'John Doe', role: 'Owner' },
    { id: 2, name: 'Jane Smith', role: 'Caregiver' }
  ]

  // -------------
  // Handlers
  // -------------
  const handleBackPress = () => {
    router.push('/(tabs)/pet_profile')
  }

  // -------------
  // Render
  // -------------
  return (
    <>
      <Header
        title={'จัดการผู้ดูแลร่วม'}
        goBack
        onBackPress={handleBackPress}
      />
      <ScrollView>
        {getCaregivers.length === 0 ? (
          <View style={styles.container}>
            <Text>ยังไม่มีผู้ดูแลร่วม</Text>
          </View>
        ) : (
          getCaregivers.map((caregiver) => (
            <View key={caregiver.id} style={styles.caregiverItem}>
              <Text>{caregiver.name}</Text>
              <Text>{caregiver.role}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  caregiverItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc'
  }
})
