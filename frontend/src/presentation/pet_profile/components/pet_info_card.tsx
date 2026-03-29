import { Link } from 'expo-router'
import React, { useEffect } from 'react'
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import { IPetProfile } from '@/src/domain/pet.domain'
import {
  FontAwesome6,
  Ionicons,
  MaterialCommunityIcons
} from '@expo/vector-icons'
import { Cake, Edit2, Ribbon, Trash2, VenusAndMars } from 'lucide-react-native'
import { colors } from '@/constants/design-system'
import {
  getDefaultAvatarBackgroundColorBySpecies,
  getPetPlaceholderIcon,
  PET_AVATAR_COLOR_OPTIONS
} from '@/src/utils/pet_avatar'

interface PetInfoCardProps {
  data: IPetProfile
  canDelete?: boolean
  onDelete?: () => void
  onMarkDeceased?: () => void
  isDeceased?: boolean
  readOnly?: boolean
  avatarBackgroundColor?: string
  onAvatarBackgroundColorChange?: (color: string) => void
}

export default function PetInfoCard({
  data,
  canDelete = false,
  onDelete,
  onMarkDeceased,
  isDeceased = false,
  readOnly = false,
  avatarBackgroundColor,
  onAvatarBackgroundColorChange
}: PetInfoCardProps) {
  const convertDaysToThaiAge = (days: number): string => {
    if (!days) return '-'

    if (days < 7) return `${days} วัน`

    if (days < 30) {
      const weeks = Math.floor(days / 7)
      return `${weeks} สัปดาห์`
    }

    if (days < 365) {
      const months = Math.floor(days / 30)
      const remainingDays = days % 30

      if (remainingDays === 0) {
        return `${months} เดือน`
      }
      return `${months} เดือน ${remainingDays} วัน`
    }

    const years = Math.floor(days / 365)
    const remainingDays = days % 365
    const months = Math.floor(remainingDays / 30)

    if (months === 0) {
      return `${years} ปี`
    }
    return `${years} ปี ${months} เดือน`
  }

  const getThaiGender = (gender: string): string => {
    const genderMap: { [key: string]: string } = {
      male: 'ผู้',
      female: 'เมีย'
    }

    return genderMap[gender.toLowerCase()] || gender
  }

  const formatWeight = (weight: number | null | undefined): string => {
    if (!weight) return '-'
    return parseFloat(weight.toString()).toFixed(2)
  }

  const resolvedAvatarBackgroundColor =
    avatarBackgroundColor || getDefaultAvatarBackgroundColorBySpecies(data.species)

  return (
    <View>
      <Text style={styles.sectionTitle}>ข้อมูลสัตว์เลี้ยง</Text>
      <View style={[styles.card, isDeceased && styles.deceasedCard]}>
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.petAvatar,
              { backgroundColor: resolvedAvatarBackgroundColor },
              isDeceased && styles.deceasedPetAvatar
            ]}
          >
            {data.profile_image_url ? (
              <Image
                source={{ uri: data.profile_image_url }}
                style={styles.avatarImage}
              />
            ) : (
              <MaterialCommunityIcons
                name={getPetPlaceholderIcon(data.species)}
                size={28}
                color="white"
              />
            )}
          </View>
          <View style={styles.cardHeaderText}>
            <View style={styles.nameRow}>
              <View style={styles.nameAndBadge}>
                <Text style={styles.petName} numberOfLines={1}>
                  {data.pet_name}
                </Text>
                {data.petRole === 'CAREGIVER' && !isDeceased && (
                  <View style={styles.caregiverBadge}>
                    <Text style={styles.caregiverBadgeText}>ผู้ดูแลร่วม</Text>
                  </View>
                )}
                {!isDeceased && !readOnly && (
                  <Link
                    href={`/(tabs)/add_pet_form?petId=${data.id}`}
                    push
                    asChild
                  >
                    <TouchableOpacity
                      style={styles.editButton}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Edit2 size={18} color="#5FA7D1" />
                    </TouchableOpacity>
                  </Link>
                )}
                {isDeceased && (
                  <View style={styles.deceasedBadge}>
                    <Text style={styles.deceasedBadgeText}>🕊️ เสียชีวิต</Text>
                  </View>
                )}
              </View>
              {!isDeceased && !readOnly && (
                <View style={styles.actionButtons}>
                  {onMarkDeceased && (
                    <TouchableOpacity
                      style={styles.deceasedButton}
                      onPress={onMarkDeceased}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ribbon size={18} color="#6b7280" />
                    </TouchableOpacity>
                  )}
                  {canDelete && onDelete && (
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={onDelete}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Trash2 size={18} color="#BF1737" />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </View>
        </View>

        <View
          style={[
            styles.infoGrid,
            { flexDirection: 'row', justifyContent: 'space-between' }
          ]}
        >
          <View style={styles.infoItem}>
            <Ionicons name="paw-outline" size={12} color="#5BA3D0" />
            <Text style={styles.infoText} numberOfLines={1}>
              {data.species} {data.breed}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Cake size={12} color="#5BA3D0" />
            <Text style={styles.infoText} numberOfLines={1}>
              {convertDaysToThaiAge(data.age)}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <VenusAndMars size={12} color="#5BA3D0" />
            <Text style={styles.infoText} numberOfLines={1}>
              เพศ {getThaiGender(data.gender)}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <FontAwesome6 name="weight-scale" size={12} color="#5BA3D0" />
            <Text style={styles.infoText} numberOfLines={1}>
              {data.weight
                ? `${formatWeight(parseFloat(data.weight))} กก.`
                : '-'}
            </Text>
          </View>
        </View>

      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#225877',
    fontFamily: 'Prompt_500Medium',
    marginBottom: 4
  },
  card: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: colors.background.secondary
  },
  deceasedCard: {
    borderColor: '#9ca3af',
    backgroundColor: '#f9fafb'
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  petAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden'
  },
  avatarImage: {
    width: '100%',
    height: '100%'
  },
  deceasedPetAvatar: {
    backgroundColor: '#9ca3af'
  },
  cardHeaderText: {
    flex: 1,
    minWidth: 0
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  nameAndBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
    gap: 6
  },
  petName: {
    fontSize: 17,
    color: '#225877',
    marginBottom: 2,
    fontFamily: 'Prompt_500Medium',
    flexShrink: 1
  },
  deceasedBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db'
  },
  deceasedBadgeText: {
    fontSize: 10,
    fontFamily: 'Prompt_400Regular',
    color: '#6b7280'
  },
  caregiverBadge: {
    backgroundColor: '#E8F4F8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#5FA7D1'
  },
  caregiverBadgeText: {
    fontSize: 10,
    fontFamily: 'Prompt_500Medium',
    color: '#225877'
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E8F4F8'
  },
  infoGridItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: 4
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  infoText: {
    fontSize: 12,
    color: '#225877',
    marginLeft: 4,
    fontFamily: 'Prompt_400Regular'
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 2
  },
  avatarColorPickerRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  avatarColorPickerLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'Prompt_400Regular'
  },
  avatarColorOptions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  avatarColorOption: {
    width: 18,
    height: 18,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  avatarColorOptionActive: {
    borderWidth: 2,
    borderColor: '#111827'
  },
  editButton: {
    padding: 4
    // borderRadius: 6
    // backgroundColor: '#E8F4F8'
  },
  deceasedButton: {
    padding: 4
    // borderRadius: 6
    // backgroundColor: '#f3f4f6'
  },
  deleteButton: {
    padding: 4
    // borderRadius: 6
    // backgroundColor: '#FEF2F2'
  }
})
