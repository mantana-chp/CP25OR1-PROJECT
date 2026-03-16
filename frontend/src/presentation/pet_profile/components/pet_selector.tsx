import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useChevronAnimation } from '@/src/hooks/useChevronAnimation'
import { ChevronUp } from 'lucide-react-native'
import _ from 'lodash'
import React, { useEffect, useRef, useState } from 'react'
import {
  Animated,
  Image,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View
} from 'react-native'
import ActionSheet from '../../components/action-sheet'

const PET_ITEM_WIDTH = 72
const PET_ITEM_GAP = 6
const PET_ITEM_SPAN = PET_ITEM_WIDTH + PET_ITEM_GAP
const EXPAND_THRESHOLD = 6

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

interface Pet {
  id: string
  pet_name: string
  petRole?: 'OWNER' | 'CAREGIVER'
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
  isViewingDeceased?: boolean
}

export default function PetSelector({
  pets,
  selectedIndex,
  onSelect,
  maxPets,
  onEditPet,
  onDeletePet,
  isViewingDeceased
}: PetSelectorProps) {
  const router = useRouter()
  const horizontalScrollRef = useRef<ScrollView>(null)
  const [actionMenuVisible, setActionMenuVisible] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedPetForAction, setSelectedPetForAction] = useState<Pet | null>(
    null
  )
  const chevronRotation = useChevronAnimation(isExpanded)
  const showAddButton = pets.length < maxPets && !isViewingDeceased
  const shouldShowExpandToggle = pets.length > EXPAND_THRESHOLD

  useEffect(() => {
    if (!shouldShowExpandToggle && isExpanded) {
      setIsExpanded(false)
    }
  }, [shouldShowExpandToggle, isExpanded])

  useEffect(() => {
    if (isExpanded || selectedIndex < 0) return

    const offset = Math.max(0, selectedIndex * PET_ITEM_SPAN - PET_ITEM_SPAN)
    horizontalScrollRef.current?.scrollTo({ x: offset, animated: true })
  }, [selectedIndex, isExpanded])

  const handleLongPress = (pet: Pet) => {
    if (pet.petRole === 'CAREGIVER') {
      return
    }

    setSelectedPetForAction(pet)
    setActionMenuVisible(true)
  }

  const handleCloseMenu = () => {
    setActionMenuVisible(false)
    setSelectedPetForAction(null)
  }

  const handleToggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setIsExpanded((prev) => !prev)
  }

  const actions = [
    {
      icon: 'pencil' as const,
      label: 'แก้ไขข้อมูล',
      onPress: () => {
        if (selectedPetForAction && onEditPet) {
          onEditPet(selectedPetForAction.id)
        }
      },
      disabled: !onEditPet || selectedPetForAction?.petRole === 'CAREGIVER'
    },
    {
      icon: 'delete-outline' as const,
      label: 'ลบสัตว์เลี้ยง',
      onPress: () => {
        if (selectedPetForAction && onDeletePet) {
          onDeletePet(selectedPetForAction.id)
        }
      },
      variant: 'error' as const,
      disabled: !onDeletePet || selectedPetForAction?.petRole === 'CAREGIVER'
    }
  ]

  const renderPetItem = (pet: Pet, index: number) => (
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
          <Image source={{ uri: pet.profile_image_url }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.placeholderImage]}>
            <MaterialCommunityIcons name="dog" size={36} color="white" />
          </View>
        )}
      </View>
      <Text
        numberOfLines={1}
        style={[
          styles.petName,
          selectedIndex === index && styles.selectedPetName
        ]}
      >
        {pet.pet_name}
      </Text>
    </TouchableOpacity>
  )

  return (
    <>
      <ScrollView
        ref={horizontalScrollRef}
        horizontal={!isExpanded}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={isExpanded}
        nestedScrollEnabled={isExpanded}
        style={isExpanded ? styles.expandedScrollView : undefined}
        contentContainerStyle={[
          styles.container,
          isExpanded ? styles.expandedContainer : styles.collapsedContainer
        ]}
      >
        {_.map(pets, renderPetItem)}

        {/* Add Pet Button */}
        {showAddButton && (
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

      {shouldShowExpandToggle && (
        <TouchableOpacity
          style={[
            styles.expandButton,
            isExpanded && styles.expandButtonExpanded
          ]}
          onPress={handleToggleExpand}
          activeOpacity={0.7}
        >
          <Text style={styles.expandButtonText}>
            {isExpanded
              ? 'ย่อรายการสัตว์เลี้ยง'
              : `แสดงทั้งหมด ${pets.length} ตัว`}
          </Text>
          <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
            <ChevronUp size={20} color="#225877" />
          </Animated.View>
        </TouchableOpacity>
      )}

      {/* Action Menu */}
      <ActionSheet
        visible={actionMenuVisible}
        onClose={handleCloseMenu}
        title={selectedPetForAction?.pet_name}
        actions={actions}
      />
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    gap: 8
  },
  collapsedContainer: {
    flexDirection: 'row'
  },
  expandedContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingBottom: 4
  },
  expandedScrollView: {
    maxHeight: 240
  },
  petItem: {
    alignItems: 'center',
    width: PET_ITEM_WIDTH
  },
  imageWrapper: {
    width: 60,
    height: 60,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: 'transparent',
    padding: 2,
    marginBottom: 2
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
    width: 60,
    height: 60,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: '#5FA7D1',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    marginBottom: 2
  },
  addPetIcon: {
    fontSize: 32,
    color: '#5FA7D1',
    fontWeight: '300'
  },
  expandButton: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 12,
    paddingVertical: 2,
    marginTop: 2
  },
  expandButtonExpanded: {
    marginTop: 6
  },
  expandButtonText: {
    fontSize: 12,
    color: '#225877',
    fontFamily: 'Prompt_500Medium'
  }
})
