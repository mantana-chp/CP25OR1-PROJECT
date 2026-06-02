import {
  borderRadius,
  colors,
  iconSizes,
  spacing,
  typography
} from '@/constants/design-system'
import { IPetProfile } from '@/src/domain/pet.domain'
import {
  getDefaultAvatarBackgroundColorBySpecies,
  getPetPlaceholderIcon
} from '@/src/utils/pet_avatar'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Cake, CheckCircle2, PawPrint, X } from 'lucide-react-native'
import React from 'react'
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'
import Button from '../../components/button'
import Modal from '../../components/modal'

interface ClaimedPetsModalProps {
  visible: boolean
  addedPets: IPetProfile[]
  alreadySharedPets: IPetProfile[]
  onClose: () => void
}

const calculateAge = (ageInDays: number | undefined): string => {
  if (ageInDays === undefined || ageInDays === null) return 'ไม่ระบุ'
  if (!Number.isFinite(ageInDays) || ageInDays < 0) return 'ไม่ระบุ'

  const totalDays = Math.floor(ageInDays)
  if (totalDays < 1) return 'น้อยกว่า 1 วัน'

  const years = Math.floor(totalDays / 365)
  const remainingDaysAfterYears = totalDays % 365
  const months = Math.floor(remainingDaysAfterYears / 30)
  const days = remainingDaysAfterYears % 30

  if (years === 0 && months === 0) {
    return `${totalDays} วัน`
  }

  if (years === 0) {
    return days > 0 ? `${months} เดือน ${days} วัน` : `${months} เดือน`
  }

  if (months === 0) {
    return days > 0 ? `${years} ปี ${days} วัน` : `${years} ปี`
  }

  return `${years} ปี ${months} เดือน`
}

export default function ClaimedPetsModal({
  visible,
  addedPets,
  alreadySharedPets,
  onClose
}: ClaimedPetsModalProps) {
  const addedCount = addedPets.length
  const alreadySharedCount = alreadySharedPets.length

  const subtitle =
    addedCount > 0 && alreadySharedCount > 0
      ? `เพิ่มสิทธิ์ใหม่ ${addedCount} ตัว และมีสิทธิ์อยู่แล้ว ${alreadySharedCount} ตัว`
      : addedCount > 0
        ? `คุณได้รับสิทธิ์ดูแลสัตว์เลี้ยง ${addedCount} ตัว`
        : `บัญชีนี้มีสิทธิ์ดูแลสัตว์เลี้ยง ${alreadySharedCount} ตัวอยู่แล้ว`

  const renderPetItem = ({ item }: { item: IPetProfile }) => {
    const age = calculateAge(item.age)
    const breed = item.breed || 'ไม่ระบุสายพันธุ์'
    const petName = item.pet_name || 'ไม่ระบุชื่อ'
    const imageUri = item.profile_image_url || item.imageUrl

    return (
      <View style={styles.petCard}>
        <View style={styles.petImageContainer}>
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.petImage}
              resizeMode="cover"
            />
          ) : (
            <View
              style={[
                styles.petImagePlaceholder,
                {
                  backgroundColor:
                    item.avatar_background_color ||
                    getDefaultAvatarBackgroundColorBySpecies(item.species)
                }
              ]}
            >
              <MaterialCommunityIcons
                name={getPetPlaceholderIcon(item.species)}
                size={30}
                color={colors.background.secondary}
              />
            </View>
          )}
        </View>
        <View style={styles.petInfo}>
          <Text style={styles.petName} numberOfLines={1}>
            {petName}
          </Text>
          <View style={styles.infoRow}>
            <PawPrint size={iconSizes.xs} color={colors.gray[500]} />
            <Text style={styles.petBreed} numberOfLines={1}>
              {breed}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Cake size={iconSizes.xs} color={colors.gray[500]} />
            <Text style={styles.petAge}>{age}</Text>
          </View>
        </View>
      </View>
    )
  }

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      maxWidth={460}
      containerStyle={styles.modalContainer}
    >
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <CheckCircle2
            size={iconSizes['2xl']}
            color={colors.success.DEFAULT}
          />
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <X size={iconSizes.lg} color={colors.gray[500]} />
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>{'รับคำเชิญสำเร็จ!'}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {addedCount > 0 ? (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>
              เพิ่มสิทธิ์ดูแลใหม่ ({addedCount})
            </Text>
            <View style={styles.petListContent}>
              {addedPets.map((pet) => (
                <View key={`added-${pet.id}`}>
                  {renderPetItem({ item: pet })}
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {alreadySharedCount > 0 ? (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitleWarning}>
              มีสิทธิ์ดูแลอยู่แล้ว ({alreadySharedCount})
            </Text>
            <View style={styles.petListContent}>
              {alreadySharedPets.map((pet) => (
                <View key={`shared-${pet.id}`}>
                  {renderPetItem({ item: pet })}
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      <Button title="ปิด" onPress={onClose} style={styles.closeButtonFull} />
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalContainer: {
    maxHeight: '80%'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3]
  },
  iconContainer: {
    flex: 1,
    alignItems: 'center'
  },
  closeButton: {
    position: 'absolute',
    right: 0,
    padding: spacing[1]
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontFamily: typography.fontFamily.bold,
    color: colors.primary.DEFAULT,
    textAlign: 'center',
    marginBottom: spacing[1]
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.gray[600],
    textAlign: 'center',
    marginBottom: spacing[3]
  },
  scrollArea: {
    maxHeight: 380
  },
  scrollContent: {
    paddingBottom: spacing[2]
  },
  sectionContainer: {
    marginBottom: spacing[3]
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.success.DEFAULT,
    marginBottom: spacing[2]
  },
  sectionTitleWarning: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.warning.DEFAULT,
    marginBottom: spacing[2]
  },
  petListContent: {
    gap: spacing[2]
  },
  petCard: {
    flexDirection: 'row',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    padding: spacing[2],
    gap: spacing[3],
    alignItems: 'center'
  },
  petImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 80,
    overflow: 'hidden'
  },
  petImage: {
    width: '100%',
    height: '100%'
  },
  petImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.primary.light,
    alignItems: 'center',
    justifyContent: 'center'
  },
  petImagePlaceholderText: {
    fontSize: typography.fontSize['2xl'],
    fontFamily: typography.fontFamily.bold,
    color: colors.background.secondary
  },
  petInfo: {
    flex: 1
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1]
  },
  petName: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary.DEFAULT
  },
  petBreed: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.gray[600]
  },
  petAge: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.gray[500]
  },
  closeButtonFull: {
    marginTop: spacing[4],
    backgroundColor: colors.primary.light
  }
})
