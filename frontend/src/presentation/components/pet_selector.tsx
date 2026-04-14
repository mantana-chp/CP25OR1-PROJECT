import { IPetProfile } from '@/src/domain/pet.domain'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Check, X, Users } from 'lucide-react-native'
import React, { useState } from 'react'
import {
  getDefaultAvatarBackgroundColorBySpecies,
  getPetPlaceholderIcon,
} from '@/src/utils/pet_avatar'
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

interface PetSelectorProps {
  pets: IPetProfile[]
  selectedPetIds?: string[]
  onSelectPets?: (petIds: string[]) => void
  label?: string
  required?: boolean
  error?: string
  disabled?: boolean
}

export default function PetSelector({
  pets,
  selectedPetIds = [],
  onSelectPets,
  label = 'เลือกสัตว์เลี้ยง',
  required = false,
  error,
  disabled = false,
}: PetSelectorProps) {
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [tempSelectedIds, setTempSelectedIds] =
    useState<string[]>(selectedPetIds)

  const selectedPets = pets.filter((p) => selectedPetIds.includes(p.id))

  const handleSelectPet = (petId: string) => {
    // Toggle selection
    const isSelected = tempSelectedIds.includes(petId)
    if (isSelected) {
      setTempSelectedIds(tempSelectedIds.filter((id) => id !== petId))
    } else {
      setTempSelectedIds([...tempSelectedIds, petId])
    }
  }

  const handleConfirmSelection = () => {
    if (onSelectPets) {
      onSelectPets(tempSelectedIds)
    }
    setIsModalVisible(false)
  }

  const handleOpenModal = () => {
    if (!disabled) {
      setTempSelectedIds(selectedPetIds)
      setIsModalVisible(true)
    }
  }

  const handleRemovePet = (petId: string) => {
    if (!disabled && onSelectPets) {
      onSelectPets(selectedPetIds.filter((id) => id !== petId))
    }
  }

  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.petListContainer}
      >
        {/* Selected Pets */}
        {selectedPets.map((pet) => (
          <View key={pet.id} style={styles.selectedPetItem}>
            <View style={styles.petAvatarWrapper}>
              {pet.profile_image_url ? (
                <Image
                  source={{ uri: pet.profile_image_url }}
                  style={styles.petAvatar}
                />
              ) : (
                <View
                  style={[
                    styles.petAvatar,
                    styles.placeholderAvatar,
                    {
                      backgroundColor:
                        pet.avatar_background_color ||
                        getDefaultAvatarBackgroundColorBySpecies(pet.species),
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={getPetPlaceholderIcon(pet.species)}
                    size={32}
                    color='white'
                  />
                </View>
              )}
              {!disabled && (
                <TouchableOpacity
                  style={styles.removePetButton}
                  onPress={() => handleRemovePet(pet.id)}
                >
                  <MaterialCommunityIcons
                    name='close'
                    size={14}
                    color='white'
                  />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.selectedPetNameRow}>
              <Text style={styles.selectedPetName} numberOfLines={1}>
                {pet.pet_name}
              </Text>
              {pet.petRole === 'CAREGIVER' && (
                <Users size={12} color='#5FA7D1' style={{ marginLeft: 4 }} />
              )}
            </View>
          </View>
        ))}

        {/* Add Pet Button */}
        {!disabled && (
          <TouchableOpacity
            style={styles.selectedPetItem}
            onPress={handleOpenModal}
          >
            <View style={styles.addPetWrapper}>
              <Text style={styles.addPetIcon}>+</Text>
            </View>
            <Text style={styles.addPetText}>เพิ่มสัตว์เลี้ยง</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Pet Selection Modal */}
      <Modal visible={isModalVisible} transparent={true} animationType='fade'>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setIsModalVisible(false)}
        >
          <View
            style={styles.modalContent}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <X size={20} color='#9ca3af' />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.petList}>
              {pets.map((pet) => {
                const isSelected = tempSelectedIds.includes(pet.id)

                return (
                  <TouchableOpacity
                    key={pet.id}
                    style={[
                      styles.petItem,
                      isSelected && styles.petItemSelected,
                    ]}
                    onPress={() => handleSelectPet(pet.id)}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={styles.petNameContainer}>
                        <Text
                          style={[
                            styles.petName,
                            isSelected && styles.petNameSelected,
                          ]}
                        >
                          {pet.pet_name}
                        </Text>
                        {pet.petRole === 'CAREGIVER' && (
                          <Users size={14} color='#5FA7D1' />
                        )}
                      </View>
                      <Text style={styles.petInfo}>
                        {pet.species} • {pet.breed}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.checkbox,
                        isSelected && styles.checkboxSelected,
                      ]}
                    >
                      {isSelected && (
                        <Check size={16} color='white' strokeWidth={2} />
                      )}
                    </View>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>ยกเลิก</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleConfirmSelection}
              >
                <Text style={styles.confirmButtonText}>
                  ยืนยัน ({tempSelectedIds.length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Prompt_400Regular',
    color: '#225877',
    marginBottom: 8,
  },
  required: {
    color: '#dc2626',
  },
  petListContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  selectedPetItem: {
    alignItems: 'center',
    width: 72,
  },
  petAvatarWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 6,
    position: 'relative',
  },
  petAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    backgroundColor: '#5FA7D1',
  },
  placeholderAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  removePetButton: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  selectedPetName: {
    fontSize: 12,
    fontFamily: 'Prompt_400Regular',
    color: '#225877',
    textAlign: 'center',
  },
  selectedPetNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  addPetWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#5FA7D1',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    marginBottom: 6,
  },
  addPetIcon: {
    fontSize: 28,
    color: '#5FA7D1',
    fontWeight: '300',
  },
  addPetText: {
    fontSize: 11,
    fontFamily: 'Prompt_400Regular',
    color: '#5FA7D1',
    textAlign: 'center',
  },
  errorText: {
    color: '#BF1737',
    fontSize: 12,
    fontFamily: 'Prompt_400Regular',
    marginTop: 4,
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Prompt_500Medium',
    color: '#225877',
  },
  closeButton: {
    fontSize: 24,
    color: '#6b7280',
    fontFamily: 'Prompt_400Regular',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  checkboxSelected: {
    backgroundColor: '#5FA7D1',
    borderColor: '#5FA7D1',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Prompt_400Regular',
    color: '#6b7280',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#5FA7D1',
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontFamily: 'Prompt_500Medium',
    color: '#fff',
  },
  petList: {
    maxHeight: 400,
  },
  petItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  petItemSelected: {
    backgroundColor: '#E8F4F8',
  },
  petName: {
    fontSize: 16,
    fontFamily: 'Prompt_500Medium',
    color: '#225877',
    marginBottom: 4,
  },
  petNameSelected: {
    color: '#5FA7D1',
    fontFamily: 'Prompt_500Medium',
  },
  petNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  petInfo: {
    fontSize: 14,
    fontFamily: 'Prompt_400Regular',
    color: '#6b7280',
  },
  checkmark: {
    fontSize: 20,
    color: '#5FA7D1',
    fontFamily: 'Prompt_700Bold',
  },
})
