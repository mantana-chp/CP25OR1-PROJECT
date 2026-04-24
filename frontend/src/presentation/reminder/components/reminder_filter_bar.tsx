import { MaterialCommunityIcons } from '@expo/vector-icons'
import { LayoutGrid } from 'lucide-react-native'
import React from 'react'
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'

import { IPetProfile } from '@/src/domain/pet.domain'
import { CATEGORY_MAP } from '@/src/domain/reminder.domain'
import {
  getDefaultAvatarBackgroundColorBySpecies,
  getPetPlaceholderIcon
} from '@/src/utils/pet_avatar'
import {
  Bone,
  Pill,
  Pipette,
  Scissors,
  Stethoscope,
  Syringe,
  Tag
} from 'lucide-react-native'

const ICON_MAP: Record<string, any> = {
  Tag,
  Syringe,
  Stethoscope,
  Pill,
  Pipette,
  Scissors,
  Bone
}

interface ReminderFilterBarProps {
  pets: IPetProfile[]
  selectedPetId: string | null
  selectedCategory: string | null
  onOpenPetModal: () => void
  onSelectedCategoryChange?: (category: string | null) => void
}

export default function ReminderFilterBar({
  pets,
  selectedPetId,
  selectedCategory,
  onOpenPetModal,
  onSelectedCategoryChange
}: ReminderFilterBarProps) {
  const selectedPet = selectedPetId
    ? pets.find((p) => p.id === selectedPetId) || null
    : null

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.categoryFilterContainer}
      contentContainerStyle={styles.categoryFilterContent}
    >
      <TouchableOpacity
        onPress={onOpenPetModal}
        style={[styles.categoryTab, selectedPetId && styles.activeCategoryTab]}
      >
        {selectedPet?.profile_image_url || selectedPet?.imageUrl ? (
          <Image
            source={{
              uri: selectedPet.profile_image_url || selectedPet.imageUrl || ''
            }}
            style={styles.petAvatarImage}
          />
        ) : (
          <View
            style={[
              styles.petAvatarPlaceholder,
              selectedPet && {
                backgroundColor:
                  selectedPet.avatar_background_color ||
                  getDefaultAvatarBackgroundColorBySpecies(selectedPet.species)
              }
            ]}
          >
            <MaterialCommunityIcons
              name={getPetPlaceholderIcon(selectedPet?.species)}
              size={14}
              color={selectedPetId ? '#fff' : '#6B7280'}
            />
          </View>
        )}
        <Text
          style={[
            styles.categoryTabText,
            selectedPetId && styles.activeCategoryTabText
          ]}
        >
          {selectedPetId
            ? selectedPet?.pet_name || 'สัตว์เลี้ยง'
            : 'สัตว์เลี้ยง'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => onSelectedCategoryChange?.(null)}
        style={[
          styles.categoryTab,
          selectedCategory === null && styles.activeCategoryTab
        ]}
      >
        <LayoutGrid
          size={18}
          color={selectedCategory === null ? '#fff' : '#6B7280'}
        />
        <Text
          style={[
            styles.categoryTabText,
            selectedCategory === null && styles.activeCategoryTabText
          ]}
        >
          ทั้งหมด
        </Text>
      </TouchableOpacity>

      {Object.entries(CATEGORY_MAP).map(([categoryKey, categoryInfo]) => {
        const Icon = ICON_MAP[categoryInfo.icon]
        return (
          <TouchableOpacity
            key={categoryKey}
            onPress={() => onSelectedCategoryChange?.(categoryKey)}
            style={[
              styles.categoryTab,
              selectedCategory === categoryKey && styles.activeCategoryTab
            ]}
          >
            {Icon && (
              <Icon
                size={18}
                color={
                  selectedCategory === categoryKey ? '#fff' : categoryInfo.color
                }
              />
            )}
            <Text
              style={[
                styles.categoryTabText,
                selectedCategory === categoryKey && styles.activeCategoryTabText
              ]}
            >
              {categoryInfo.label}
            </Text>
          </TouchableOpacity>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  categoryFilterContainer: {
    backgroundColor: '#fff9f1',
    paddingVertical: 4,
    maxHeight: 50
  },
  categoryFilterContent: {
    paddingHorizontal: 16,
    gap: 8
  },
  categoryTab: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 28
  },
  activeCategoryTab: {
    backgroundColor: '#5FA7D1',
    borderColor: '#5FA7D1'
  },
  categoryTabText: {
    fontSize: 11,
    color: '#6B7280',
    fontFamily: 'Prompt_400Regular',
    textAlign: 'center'
  },
  activeCategoryTabText: {
    color: '#fff',
    fontFamily: 'Prompt_500Medium'
  },
  petAvatarImage: {
    width: 18,
    height: 18,
    borderRadius: 9
  },
  petAvatarPlaceholder: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6'
  }
})
