import { Link } from 'expo-router'
import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import { IPetProfile } from '@/src/domain/pet.domain'
import {
  FontAwesome6,
  Ionicons,
  MaterialCommunityIcons
} from '@expo/vector-icons'
import { Cake, Edit2, Ribbon, Trash2, VenusAndMars } from 'lucide-react-native'

interface PetInfoCardProps {
  data: IPetProfile
  canDelete?: boolean
  onDelete?: () => void
  onMarkDeceased?: () => void
  isDeceased?: boolean
}

export default function PetInfoCard({
  data,
  canDelete = false,
  onDelete,
  onMarkDeceased,
  isDeceased = false
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

  return (
    <View style={[styles.card, isDeceased && styles.deceasedCard]}>
      <View style={styles.cardHeader}>
        <View
          style={[styles.petAvatar, isDeceased && styles.deceasedPetAvatar]}
        >
          <MaterialCommunityIcons name="dog" size={28} color="white" />
        </View>
        <View style={styles.cardHeaderText}>
          <View style={styles.nameRow}>
            <View style={styles.nameAndBadge}>
              <Text style={styles.petName} numberOfLines={1}>
                {data.pet_name}
              </Text>
              {isDeceased && (
                <View style={styles.deceasedBadge}>
                  <Text style={styles.deceasedBadgeText}>🕊️ เสียชีวิต</Text>
                </View>
              )}
            </View>
            {!isDeceased && (
          
              <View style={styles.actionButtons}>
                {onMarkDeceased && (
                  <TouchableOpacity
                    style={styles.deceasedButton}
                    onPress={onMarkDeceased}
                  >
                    <Ribbon size={16} color="#6b7280" />
                  </TouchableOpacity>
                )}
                <Link
                  href={`/(tabs)/add_pet_form?petId=${data.id}`}
                  push
                  asChild
                >
                  <TouchableOpacity style={styles.editButton}>
                    <Edit2 size={16} color="#5FA7D1" />
                  </TouchableOpacity>
                </Link>
                {canDelete && onDelete && (
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={onDelete}
                  >
                    <Trash2 size={16} color="#BF1737" />
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
            {data.weight ? `${formatWeight(parseFloat(data.weight))} กก.` : '-'}
          </Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#5FA7D1'
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
    borderRadius: 28,
    backgroundColor: '#5BA3D0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
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
    gap: 8
  },
  editButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#E8F4F8'
  },
  deceasedButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#f3f4f6'
  },
  deleteButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#FEF2F2'
  }
})
