import { MaterialCommunityIcons } from '@expo/vector-icons'
import React from 'react'
import {
  Image,
  Modal as RNModal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'

import { IPetProfile } from '@/src/domain/pet.domain'
import {
  getDefaultAvatarBackgroundColorBySpecies,
  getPetPlaceholderIcon
} from '@/src/utils/pet_avatar'

interface PetSelectionModalProps {
  visible: boolean
  pets: IPetProfile[]
  selectedPetId: string | null
  onClose: () => void
  onSelectPet?: (petId: string | null) => void
}

export default function PetSelectionModal({
  visible,
  pets,
  selectedPetId,
  onClose,
  onSelectPet
}: PetSelectionModalProps) {
  const renderPetAvatar = (pet?: IPetProfile, isActive?: boolean) => {
    if (pet?.profile_image_url || pet?.imageUrl) {
      return (
        <Image
          source={{ uri: pet.profile_image_url || pet.imageUrl || '' }}
          style={styles.petAvatarImage}
        />
      )
    }

    return (
      <View
        style={[
          styles.petAvatarPlaceholder,
          {
            backgroundColor:
              pet?.avatar_background_color ||
              getDefaultAvatarBackgroundColorBySpecies(pet?.species)
          }
        ]}
      >
        <MaterialCommunityIcons
          name={getPetPlaceholderIcon(pet?.species)}
          size={16}
          color={isActive ? '#fff' : '#fff'}
        />
      </View>
    )
  }

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.petModalContent}>
          <View style={styles.petModalHeader}>
            <Text style={styles.petModalTitle}>เลือกสัตว์เลี้ยง</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.petModalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.petModalCountText}>
            สัตว์เลี้ยงทั้งหมด {pets.length} ตัว
          </Text>

          <ScrollView style={styles.petModalList}>
            <TouchableOpacity
              onPress={() => {
                onSelectPet?.(null)
                onClose()
              }}
              style={[
                styles.petModalItem,
                !selectedPetId && styles.petModalItemActive
              ]}
            >
              <View style={styles.petAvatarPlaceholder}>
                <MaterialCommunityIcons name="dog" size={16} color="#fff" />
              </View>
              <Text
                style={[
                  styles.petModalItemText,
                  !selectedPetId && styles.petModalItemTextActive
                ]}
              >
                สัตว์เลี้ยงทั้งหมด
              </Text>
              {!selectedPetId && <View style={styles.petModalCheckmark} />}
            </TouchableOpacity>

            {pets.map((pet) => (
              <TouchableOpacity
                key={pet.id}
                activeOpacity={0.85}
                onPress={() => {
                  onSelectPet?.(pet.id)
                  onClose()
                }}
                style={[
                  styles.petModalItem,
                  selectedPetId === pet.id && styles.petModalItemActive
                ]}
              >
                {renderPetAvatar(pet, selectedPetId === pet.id)}
                <Text
                  style={[
                    styles.petModalItemText,
                    selectedPetId === pet.id && styles.petModalItemTextActive
                  ]}
                >
                  {pet.pet_name}
                </Text>
                {selectedPetId === pet.id && (
                  <View style={styles.petModalCheckmark} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </RNModal>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  petModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    maxHeight: '80%'
  },
  petModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  petModalTitle: {
    fontSize: 18,
    fontFamily: 'Prompt_500Medium',
    color: '#225877'
  },
  petModalClose: {
    fontSize: 24,
    color: '#6B7280',
    fontWeight: 'bold'
  },
  petModalCountText: {
    fontSize: 13,
    fontFamily: 'Prompt_400Regular',
    color: '#6B7280',
    marginBottom: 14
  },
  petModalList: {
    marginBottom: 10
  },
  petModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    marginBottom: 10,
    gap: 12
  },
  petModalItemActive: {
    backgroundColor: '#5FA7D1'
  },
  petModalItemText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Prompt_400Regular',
    color: '#6B7280'
  },
  petModalItemTextActive: {
    color: '#fff',
    fontFamily: 'Prompt_500Medium'
  },
  petModalCheckmark: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff'
  },
  petAvatarImage: {
    width: 28,
    height: 28,
    borderRadius: 14
  },
  petAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5FA7D1'
  }
})
