import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import _ from 'lodash'
import React, { useEffect } from 'react'
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

interface Pet {
  id: string
  pet_name: string
  imageUrl?: string
  profile_image_url?: string | null
}

interface PetSelectorProps {
  pets: Pet[]
  selectedIndex: number
  onSelect: (index: number) => void
  maxPets?: number
}

export default function PetSelector({
  pets,
  selectedIndex,
  onSelect,
  maxPets = 10,
}: PetSelectorProps) {
  const router = useRouter()

  // Debug: Log pets with image URLs
  useEffect(() => {
    if (pets && pets.length > 0) {
      console.log(
        '🐕 PetSelector received pets:',
        pets.map((p) => ({
          name: p.pet_name,
          profile_image_url: p.profile_image_url,
        })),
      )
    }
  }, [pets])

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {_.map(pets, (pet, index) => (
        <TouchableOpacity
          key={pet.id}
          onPress={() => onSelect(index)}
          style={styles.petItem}
        >
          <View
            style={[
              styles.imageWrapper,
              selectedIndex === index && styles.selectedImageWrapper,
            ]}
          >
            {pet.profile_image_url ? (
              <Image
                source={{ uri: pet.profile_image_url }}
                style={styles.image}
              />
            ) : (
              <View style={[styles.image, styles.placeholderImage]}>
                <MaterialCommunityIcons name='dog' size={36} color='white' />
              </View>
            )}
          </View>
          <Text
            style={[
              styles.petName,
              selectedIndex === index && styles.selectedPetName,
            ]}
          >
            {pet.pet_name}
          </Text>
        </TouchableOpacity>
      ))}

      {/* Add Pet Button */}
      {pets.length < maxPets && (
        <TouchableOpacity
          style={styles.petItem}
          onPress={() => router.push('/(tabs)/add_pet_form')}
        >
          <View style={styles.addPetWrapper}>
            <Text style={styles.addPetIcon}>+</Text>
          </View>
          <Text style={styles.petName}>เพิ่มสัตว์เลี้ยง</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingBottom: 16,
    gap: 12,
  },
  petItem: {
    alignItems: 'center',
    width: 80,
  },
  imageWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: 'transparent',
    padding: 2,
    marginBottom: 8,
  },
  selectedImageWrapper: {
    borderColor: '#5FA7D1',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 33,
    backgroundColor: '#5FA7D1',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  petName: {
    fontSize: 13,
    fontFamily: 'Prompt_400Regular',
    color: '#666',
    textAlign: 'center',
  },
  selectedPetName: {
    color: '#225877',
    fontFamily: 'Prompt_500Medium',
  },
  addPetWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: '#5FA7D1',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    marginBottom: 8,
  },
  addPetIcon: {
    fontSize: 32,
    color: '#5FA7D1',
    fontWeight: '300',
  },
})
