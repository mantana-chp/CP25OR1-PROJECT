import { Link } from 'expo-router'
import React, { useEffect } from 'react'
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import { IPetProfile } from '@/src/domain/pet.domain'
import {
  FontAwesome6,
  Ionicons,
  MaterialCommunityIcons,
} from '@expo/vector-icons'
import { Cake, Edit2, VenusAndMars } from 'lucide-react-native'

interface PetInfoCardProps {
  data: IPetProfile
}

export default function PetInfoCard(props: PetInfoCardProps) {
  // Debug: Log pet data when received
  useEffect(() => {
    console.log('🎯 PetInfoCard received pet:', {
      name: props.data.pet_name,
      profile_image_url: props.data.profile_image_url,
    })
  }, [props.data.id])

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
      female: 'เมีย',
    }

    return genderMap[gender.toLowerCase()] || gender
  }

  const formatWeight = (weight: number | null | undefined): string => {
    if (!weight) return '-'
    return parseFloat(weight.toString()).toFixed(2)
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.petAvatar}>
          {props.data.profile_image_url ? (
            <Image
              source={{ uri: props.data.profile_image_url }}
              style={styles.avatarImage}
            />
          ) : (
            <MaterialCommunityIcons name='dog' size={28} color='white' />
          )}
        </View>
        <View style={styles.cardHeaderText}>
          <View style={styles.nameRow}>
            <Text style={styles.petName} numberOfLines={1}>
              {props.data.pet_name}
            </Text>
            <Link
              href={`/(tabs)/add_pet_form?petId=${props.data.id}`}
              push
              asChild
            >
              <TouchableOpacity style={styles.editButton}>
                <Edit2 size={16} color='#5FA7D1' />
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </View>

      <View
        style={[
          styles.infoGrid,
          { flexDirection: 'row', justifyContent: 'space-between' },
        ]}
      >
        <View style={styles.infoItem}>
          <Ionicons name='paw-outline' size={12} color='#5BA3D0' />
          <Text style={styles.infoText} numberOfLines={1}>
            {props.data.species} {props.data.breed}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Cake size={12} color='#5BA3D0' />
          <Text style={styles.infoText} numberOfLines={1}>
            {convertDaysToThaiAge(props.data.age)}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <VenusAndMars size={12} color='#5BA3D0' />
          <Text style={styles.infoText} numberOfLines={1}>
            เพศ {getThaiGender(props.data.gender)}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <FontAwesome6 name='weight-scale' size={12} color='#5BA3D0' />
          <Text style={styles.infoText} numberOfLines={1}>
            {props.data.weight
              ? `${formatWeight(parseFloat(props.data.weight))} กก.`
              : '-'}
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
    borderColor: '#5FA7D1',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  petAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#5BA3D0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  cardHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  petName: {
    fontSize: 17,
    color: '#225877',
    marginBottom: 2,
    fontFamily: 'Prompt_500Medium',
    flex: 1,
    marginRight: 8,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E8F4F8',
  },
  infoGridItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: 4,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 12,
    color: '#225877',
    marginLeft: 4,
    fontFamily: 'Prompt_400Regular',
  },
  editButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#E8F4F8',
  },
})
