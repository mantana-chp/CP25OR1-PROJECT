import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import _ from 'lodash'
import React, { useEffect, useState } from 'react'
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
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
  maxPets: number
  onEditPet?: (petId: string) => void
  onDeletePet?: (petId: string) => void
}

export default function PetSelector({
  pets,
  selectedIndex,
  onSelect,
  maxPets,
  onEditPet,
  onDeletePet
}: PetSelectorProps) {
  const router = useRouter()
  const [actionMenuVisible, setActionMenuVisible] = useState(false)
  const [selectedPetForAction, setSelectedPetForAction] = useState<Pet | null>(
    null
  )

  // Debug: Log pets with image URLs
  useEffect(() => {
    if (pets && pets.length > 0) {
      console.log(
        '🐕 PetSelector received pets:',
        pets.map((p) => ({
          name: p.pet_name,
          profile_image_url: p.profile_image_url
        }))
      )
    }
  }, [pets])

  const handleLongPress = (pet: Pet) => {
    setSelectedPetForAction(pet)
    setActionMenuVisible(true)
  }

  const handleEdit = () => {
    setActionMenuVisible(false)
    if (selectedPetForAction && onEditPet) {
      onEditPet(selectedPetForAction.id)
    }
  }

  const handleDelete = () => {
    setActionMenuVisible(false)
    if (selectedPetForAction && onDeletePet) {
      onDeletePet(selectedPetForAction.id)
    }
  }

  const handleCloseMenu = () => {
    setActionMenuVisible(false)
    setSelectedPetForAction(null)
  }

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {_.map(pets, (pet, index) => (
          <TouchableOpacity
            key={pet.id}
            onPress={() => onSelect(index)}
            onLongPress={() => handleLongPress(pet)}
            delayLongPress={500}
            style={styles.petItem}
          >
            <View
              style={[
                styles.imageWrapper,
                selectedIndex === index && styles.selectedImageWrapper
              ]}
            >
              {pet.profile_image_url ? (
                <Image
                  source={{ uri: pet.profile_image_url }}
                  style={styles.image}
                />
              ) : (
                <View style={[styles.image, styles.placeholderImage]}>
                  <MaterialCommunityIcons name="dog" size={36} color="white" />
                </View>
              )}
            </View>
            <Text
              style={[
                styles.petName,
                selectedIndex === index && styles.selectedPetName
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

      {/* Action Menu Modal */}
      <Modal
        visible={actionMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseMenu}
      >
        <Pressable style={styles.modalOverlay} onPress={handleCloseMenu}>
          <View style={styles.actionMenuContainer}>
            <Text style={styles.actionMenuTitle}>
              {selectedPetForAction?.pet_name}
            </Text>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleEdit}
              disabled={!onEditPet}
            >
              <MaterialCommunityIcons name="pencil" size={24} color="#225877" />
              <Text style={styles.actionButtonText}>แก้ไขข้อมูล</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={handleDelete}
              disabled={!onDeletePet}
            >
              <MaterialCommunityIcons
                name="delete-outline"
                size={24}
                color="#E53935"
              />
              <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
                ลบสัตว์เลี้ยง
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={handleCloseMenu}
            >
              <Text style={styles.cancelButtonText}>ยกเลิก</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingBottom: 16,
    gap: 12
  },
  petItem: {
    alignItems: 'center',
    width: 80
  },
  imageWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: 'transparent',
    padding: 2,
    marginBottom: 8
  },
  selectedImageWrapper: {
    borderColor: '#5FA7D1'
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 33,
    backgroundColor: '#5FA7D1'
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  petName: {
    fontSize: 13,
    fontFamily: 'Prompt_400Regular',
    color: '#666',
    textAlign: 'center'
  },
  selectedPetName: {
    color: '#225877',
    fontFamily: 'Prompt_500Medium'
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
    marginBottom: 8
  },
  addPetIcon: {
    fontSize: 32,
    color: '#5FA7D1',
    fontWeight: '300'
  },
  // Action Menu Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  actionMenuContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5
  },
  actionMenuTitle: {
    fontSize: 18,
    fontFamily: 'Prompt_500Medium',
    color: '#225877',
    textAlign: 'center',
    marginBottom: 20
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    marginBottom: 12,
    gap: 12
  },
  actionButtonText: {
    fontSize: 16,
    fontFamily: 'Prompt_400Regular',
    color: '#225877'
  },
  deleteButton: {
    backgroundColor: '#FFEBEE'
  },
  deleteButtonText: {
    color: '#E53935'
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    justifyContent: 'center'
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Prompt_400Regular',
    color: '#666',
    textAlign: 'center'
  }
})
