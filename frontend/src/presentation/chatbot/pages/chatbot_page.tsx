import { usePets } from '@/src/context/PetContext'
import { IPetProfile } from '@/src/domain/pet.domain'
import React, { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import Header from '../../components/header_component'
import PetDropdown from '../components/PetDropdown'

export default function ChatbotPage() {
  const { pets, loading } = usePets()
  const [selectedPet, setSelectedPet] = useState<IPetProfile | null>(
    pets.length > 0 ? pets[0] : null
  )

  useEffect(() => {
    if (pets.length > 0 && !selectedPet) {
      setSelectedPet(pets[0])
    }
  }, [pets])

  const handleSelectPet = (pet: IPetProfile) => {
    setSelectedPet(pet)
  }

  return (
    <View style={styles.container}>
      <Header
        title="แชท"
        rightChildren={
          <PetDropdown
            pets={pets}
            selectedPet={selectedPet}
            onSelectPet={handleSelectPet}
          />
        }
      />

      {/* Content Area */}
      <View style={styles.content}>{/* Chat content will go here */}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F1'
  },
  infoButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  content: {
    flex: 1
  }
})
