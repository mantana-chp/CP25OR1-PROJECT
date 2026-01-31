import { IPetProfile } from '@/src/domain/pet.domain'
import React, { useState } from 'react'
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'

interface PetSelectorProps {
  pets: IPetProfile[]
  selectedPetId: string
  onSelectPet: (petId: string) => void
  label?: string
  required?: boolean
  error?: string
  disabled?: boolean
}

export default function PetSelector({
  pets,
  selectedPetId,
  onSelectPet,
  label = 'เลือกสัตว์เลี้ยง',
  required = false,
  error,
  disabled = false
}: PetSelectorProps) {
  const [isModalVisible, setIsModalVisible] = useState(false)

  const selectedPet = pets.find((p) => p.id === selectedPetId)

  const handleSelectPet = (petId: string) => {
    onSelectPet(petId)
    setIsModalVisible(false)
  }

  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}

      <TouchableOpacity
        style={[
          styles.selector,
          error && styles.selectorError,
          disabled && styles.selectorDisabled
        ]}
        onPress={() => !disabled && setIsModalVisible(true)}
        disabled={disabled}
      >
        <Text
          style={[
            styles.selectorText,
            !selectedPet && styles.placeholderText,
            disabled && styles.disabledText
          ]}
        >
          {selectedPet ? selectedPet.name : 'เลือกสัตว์เลี้ยง'}
        </Text>
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Pet Selection Modal */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setIsModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>เลือกสัตว์เลี้ยง</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.petList}>
              {pets.map((pet) => (
                <TouchableOpacity
                  key={pet.id}
                  style={[
                    styles.petItem,
                    selectedPetId === pet.id && styles.petItemSelected
                  ]}
                  onPress={() => handleSelectPet(pet.id)}
                >
                  <View>
                    <Text
                      style={[
                        styles.petName,
                        selectedPetId === pet.id && styles.petNameSelected
                      ]}
                    >
                      {pet.name}
                    </Text>
                    <Text style={styles.petInfo}>
                      {pet.species} • {pet.breed}
                    </Text>
                  </View>
                  {selectedPetId === pet.id && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16
  },
  label: {
    fontSize: 14,
    fontFamily: 'Prompt_400Regular',
    color: '#225877',
    marginBottom: 8
  },
  required: {
    color: '#dc2626'
  },
  selector: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff'
  },
  selectorError: {
    borderColor: '#ef4444'
  },
  selectorDisabled: {
    backgroundColor: '#f3f4f6',
    opacity: 0.6
  },
  selectorText: {
    fontSize: 16,
    fontFamily: 'Prompt_400Regular',
    color: '#225877'
  },
  placeholderText: {
    color: '#9ca3af'
  },
  disabledText: {
    color: '#6b7280'
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    fontFamily: 'Prompt_400Regular',
    marginTop: 4,
    marginLeft: 4
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
    overflow: 'hidden'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb'
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Prompt_500Medium',
    color: '#225877'
  },
  closeButton: {
    fontSize: 24,
    color: '#6b7280',
    fontFamily: 'Prompt_400Regular'
  },
  petList: {
    maxHeight: 400
  },
  petItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  petItemSelected: {
    backgroundColor: '#E8F4F8'
  },
  petName: {
    fontSize: 16,
    fontFamily: 'Prompt_500Medium',
    color: '#225877',
    marginBottom: 4
  },
  petNameSelected: {
    color: '#5FA7D1',
    fontFamily: 'Prompt_500Medium'
  },
  petInfo: {
    fontSize: 14,
    fontFamily: 'Prompt_400Regular',
    color: '#6b7280'
  },
  checkmark: {
    fontSize: 20,
    color: '#5FA7D1',
    fontFamily: 'Prompt_700Bold'
  }
})
