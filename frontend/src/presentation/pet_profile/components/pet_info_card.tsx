import { IPetProfile } from '@/src/domain/pet.domain'
import {
  FontAwesome6,
  Ionicons,
  MaterialCommunityIcons
} from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { Cake, Edit2, VenusAndMars } from 'lucide-react-native'
import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

interface PetInfoCardProps {
  data: IPetProfile
}

export default function PetInfoCard(props: PetInfoCardProps) {
  const router = useRouter()

  const handleEdit = () => {
    router.push(`/(tabs)/add_pet_form?petId=${props.data.id}`)
  }

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

  //
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.petAvatar}>
          <MaterialCommunityIcons name="dog" size={42} color="white" />
        </View>
        <View style={styles.cardHeaderText}>
          <Text style={styles.petName}>{props.data.name}</Text>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="paw-outline" size={14} color="#5BA3D0" />
              <Text style={styles.infoText}>
                {props.data.species} {props.data.breed}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Cake size={14} color="#5BA3D0" />
              <Text style={styles.infoText}>
                {convertDaysToThaiAge(props.data.age)}
              </Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <VenusAndMars size={14} color="#5BA3D0" />
              <Text style={styles.infoText}>
                เพศ {getThaiGender(props.data.gender)}
              </Text>
            </View>
            <View style={styles.infoItem}>
              {/* <Weight size={14} color="#5BA3D0" /> */}
              <FontAwesome6 name="weight-scale" size={14} color="#5BA3D0" />
              <Text style={styles.infoText}>
                {props.data.weight ? `${props.data.weight} กิโลกรัม` : '-'}
              </Text>
            </View>
          </View>
        </View>
        <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
          <Edit2 size={18} color="#5FA7D1" />
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#5FA7D1'
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  petAvatar: {
    width: 70,
    height: 70,
    borderRadius: 80,
    backgroundColor: '#5BA3D0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  cardHeaderText: {
    flex: 1
  },
  petName: {
    fontSize: 17,
    color: '#225877',
    marginBottom: 4,
    fontFamily: 'Prompt_500Medium'
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 4
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    flex: 1
  },
  infoText: {
    fontSize: 14,
    color: '#225877',
    marginLeft: 4,
    fontFamily: 'Prompt_400Regular'
  },
  editButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#E8F4F8',
    alignSelf: 'flex-start'
  }
})
