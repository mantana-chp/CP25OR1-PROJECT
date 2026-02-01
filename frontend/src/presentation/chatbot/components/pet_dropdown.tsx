import { IPetProfile } from '@/src/domain/pet.domain'
import { Ionicons } from '@expo/vector-icons'
import _ from 'lodash'
import { ChevronDown, Dog } from 'lucide-react-native'
import React, { useState } from 'react'

import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'

interface PetDropdownProps {
  pets: IPetProfile[]
  selectedPet: IPetProfile | null
  onSelectPet: (pet: IPetProfile) => void
}

export default function PetDropdown({
  pets,
  selectedPet,
  onSelectPet
}: PetDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [rotateAnim] = useState(new Animated.Value(0))

  const toggleDropdown = () => {
    const toValue = isOpen ? 0 : 1
    Animated.timing(rotateAnim, {
      toValue,
      duration: 200,
      useNativeDriver: true
    }).start()
    setIsOpen(!isOpen)
  }

  const handleSelectPet = (pet: IPetProfile) => {
    onSelectPet(pet)
    toggleDropdown()
  }

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg']
  })

  return (
    <View style={styles.container}>
      {/* Dropdown Toggle Button */}
      <TouchableOpacity
        style={styles.toggleButton}
        onPress={toggleDropdown}
        activeOpacity={0.8}
      >
        <Animated.View style={[{ transform: [{ rotate: rotation }] }]}>
          <ChevronDown size={18} color="#2E759E" />
        </Animated.View>
        <View style={styles.petIconContainer}>
          <Dog size={28} color="#2E759E" />
        </View>
      </TouchableOpacity>

      {/* Dropdown Modal */}
      <Modal
        visible={isOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={toggleDropdown}
      >
        <Pressable style={styles.modalOverlay} onPress={toggleDropdown}>
          <View style={styles.dropdownContainer}>
            {pets.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>ไม่พบข้อมูลสัตว์เลี้ยง</Text>
              </View>
            ) : (
              _.map(pets, (pet, index) => (
                <TouchableOpacity
                  key={pet.id}
                  style={[
                    styles.dropdownItem,
                    selectedPet?.id === pet.id && styles.selectedItem,
                    index === pets.length - 1 && styles.lastItem
                  ]}
                  onPress={() => handleSelectPet(pet)}
                  activeOpacity={0.7}
                >
                  <View style={styles.itemIconContainer}>
                    <Ionicons name="paw" size={16} color="#fff" />
                  </View>
                  <Text
                    style={[
                      styles.itemText,
                      selectedPet?.id === pet.id && styles.selectedItemText
                    ]}
                  >
                    {pet.pet_name}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#D7E9F4',
    borderRadius: 35,
    paddingLeft: 8,
    height: 36,
    width: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4
  },
  petIconContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 27,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalOverlay: {
    flex: 1
  },
  dropdownContainer: {
    position: 'absolute',
    top: 95,
    right: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
    minWidth: 130,
    maxWidth: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8
  },
  lastItem: {
    borderBottomWidth: 0
  },
  selectedItem: {
    backgroundColor: '#E6F4FF'
  },
  itemIconContainer: {
    backgroundColor: '#5FA7D1',
    borderRadius: 20,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  itemText: {
    fontSize: 16,
    color: '#225877',
    fontFamily: 'Prompt_400Regular'
  },
  selectedItemText: {
    fontFamily: 'Prompt_500Medium'
  },
  emptyContainer: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    fontFamily: 'Prompt_400Regular'
  }
})
