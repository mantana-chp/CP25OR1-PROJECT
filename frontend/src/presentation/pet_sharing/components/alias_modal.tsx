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
import { Check, Clock, X } from 'lucide-react-native'
import React, { useEffect, useState } from 'react'
import {
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'
import Button from '../../components/button'
import Modal from '../../components/modal'
import {
  CaregiverSuggestion,
  filterSuggestions,
  getCaregiverSuggestions
} from '../../../utils/caregiver_suggestions_storage'

interface AliasModalProps {
  visible: boolean
  aliasInput: string
  onChangeAlias: (value: string) => void
  onClose: () => void
  onConfirm: () => void
  pets?: IPetProfile[]
  selectedPetIds?: string[]
  onTogglePet?: (petId: string) => void
  onToggleSelectAllPets?: (selectAll: boolean) => void
  currentPetId?: string
}

export default function AliasModal({
  visible,
  aliasInput,
  onChangeAlias,
  onClose,
  onConfirm,
  pets = [],
  selectedPetIds = [],
  onTogglePet,
  onToggleSelectAllPets,
  currentPetId
}: AliasModalProps) {
  const showPetSelector = pets && pets.length > 0 && onTogglePet
  const [suggestions, setSuggestions] = useState<CaregiverSuggestion[]>([])
  const [filteredSuggestions, setFilteredSuggestions] = useState<
    CaregiverSuggestion[]
  >([])

  // Load suggestions when modal opens
  useEffect(() => {
    if (visible) {
      loadSuggestions()
    }
  }, [visible])

  // Filter suggestions based on input
  useEffect(() => {
    setFilteredSuggestions(filterSuggestions(suggestions, aliasInput))
  }, [aliasInput, suggestions])

  const loadSuggestions = async () => {
    const loaded = await getCaregiverSuggestions()
    setSuggestions(loaded)
  }

  const handleSelectSuggestion = (alias: string) => {
    onChangeAlias(alias)
  }

  const renderPetItem = ({ item }: { item: IPetProfile }) => {
    const isSelected = selectedPetIds.includes(item.id)
    const isCurrentPet = item.id === currentPetId

    return (
      <TouchableOpacity
        style={[styles.petItem, isSelected && styles.petItemSelected]}
        onPress={() => onTogglePet?.(item.id)}
        disabled={!onTogglePet}
      >
        <View style={styles.petItemContent}>
          {item.profile_image_url ? (
            <Image
              source={{ uri: item.profile_image_url }}
              style={styles.petImage}
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
                size={22}
                color={colors.background.secondary}
              />
            </View>
          )}
          <View style={styles.petInfo}>
            <Text style={styles.petName}>{item.pet_name}</Text>
            {isCurrentPet && (
              <Text style={styles.currentPetLabel}>หน้านี้</Text>
            )}
          </View>
        </View>
        {isSelected && (
          <View style={styles.checkIcon}>
            <Check size={iconSizes.md} color={colors.background.secondary} />
          </View>
        )}
      </TouchableOpacity>
    )
  }

  const showSuggestions =
    filteredSuggestions.length > 0 && aliasInput.length < 50
  const isAllPetsSelected =
    pets.length > 0 && pets.every((pet) => selectedPetIds.includes(pet.id))

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      maxWidth={420}
      containerStyle={styles.modalContainer}
    >
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalTitle}>สร้างรหัสเชิญใหม่</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={iconSizes.lg} color={colors.gray[500]} />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalDescription}>
            ระบุชื่อสำหรับผู้ดูแลที่กำลังจะเชิญ เช่น พี่สาว หรือ เพื่อนบ้าน
          </Text>

          <TextInput
            style={styles.aliasInput}
            placeholder="ชื่อผู้ดูแล"
            placeholderTextColor={colors.gray[400]}
            value={aliasInput}
            onChangeText={onChangeAlias}
            maxLength={100}
            autoFocus
          />

          {showSuggestions && (
            <View style={styles.suggestionsContainer}>
              <View style={styles.suggestionsHeader}>
                <Clock size={iconSizes.sm} color={colors.gray[500]} />
                <Text style={styles.suggestionsTitle}>ผู้ดูแลที่เคยเพิ่ม</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.suggestionsRow}>
                  {filteredSuggestions.slice(0, 6).map((suggestion, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.suggestionChip}
                      onPress={() => handleSelectSuggestion(suggestion.alias)}
                    >
                      <Text style={styles.suggestionText}>
                        {suggestion.alias}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {showPetSelector && (
            <View style={styles.petSelectorSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>
                  เลือกสัตว์เลี้ยงที่ต้องการแชร์
                </Text>
                <TouchableOpacity
                  onPress={() => onToggleSelectAllPets?.(!isAllPetsSelected)}
                  disabled={!onToggleSelectAllPets}
                >
                  <Text style={styles.selectAllText}>
                    {isAllPetsSelected ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
                  </Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={pets}
                renderItem={renderPetItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                ItemSeparatorComponent={() => (
                  <View style={styles.petItemSeparator} />
                )}
              />
              <Text style={styles.petCountText}>
                เลือกแล้ว {selectedPetIds.length} จาก {pets.length} ตัว
              </Text>
            </View>
          )}

          <View style={styles.buttons}>
            <Button
              title="ยกเลิก"
              onPress={onClose}
              variant="ghost"
              style={styles.buttonHalf}
            />
            <Button
              title="สร้างรหัส"
              onPress={onConfirm}
              variant="base"
              style={styles.buttonHalf}
              disabled={selectedPetIds.length === 0}
            />
          </View>
        </View>
      </ScrollView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalContainer: {
    padding: spacing[4]
  },
  scrollView: {
    maxHeight: 600
  },
  modalContent: {
    gap: spacing[2]
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    color: colors.primary.DEFAULT,
    fontFamily: typography.fontFamily.bold
  },
  modalDescription: {
    fontSize: typography.fontSize.base,
    color: colors.gray[500],
    lineHeight: typography.lineHeight.relaxed,
    fontFamily: typography.fontFamily.regular
  },
  aliasInput: {
    height: 46,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    paddingHorizontal: spacing[3],
    fontSize: typography.fontSize.md,
    color: colors.gray[800],
    fontFamily: typography.fontFamily.regular
  },
  suggestionsContainer: {
    gap: spacing[2]
  },
  suggestionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1]
  },
  suggestionsTitle: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    fontFamily: typography.fontFamily.medium
  },
  suggestionsRow: {
    flexDirection: 'row',
    gap: spacing[2]
  },
  suggestionChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT
  },
  suggestionText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[700],
    fontFamily: typography.fontFamily.regular
  },
  petSelectorSection: {
    marginTop: spacing[2],
    gap: spacing[2]
  },
  sectionTitle: {
    fontSize: typography.fontSize.md,
    color: colors.primary.DEFAULT,
    fontFamily: typography.fontFamily.bold
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2]
  },
  selectAllText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary.light,
    fontFamily: typography.fontFamily.medium
  },
  petItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[3],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.background.secondary
  },
  petItemSelected: {
    borderColor: colors.primary.light,
    backgroundColor: colors.primary.light + '15'
  },
  petItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flex: 1
  },
  petImage: {
    width: 40,
    height: 40,
    borderRadius: 20
  },
  petImagePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary.light,
    alignItems: 'center',
    justifyContent: 'center'
  },
  petImagePlaceholderText: {
    fontSize: typography.fontSize.lg,
    color: colors.background.secondary,
    fontFamily: typography.fontFamily.bold
  },
  petInfo: {
    flex: 1
  },
  petName: {
    fontSize: typography.fontSize.md,
    color: colors.gray[800],
    fontFamily: typography.fontFamily.medium
  },
  currentPetLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.primary.light,
    fontFamily: typography.fontFamily.regular
  },
  checkIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary.light,
    alignItems: 'center',
    justifyContent: 'center'
  },
  petItemSeparator: {
    height: spacing[2]
  },
  petCountText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    fontFamily: typography.fontFamily.regular,
    textAlign: 'center'
  },
  buttons: {
    marginTop: spacing[2],
    flexDirection: 'row',
    gap: 12,
    width: '100%'
  },
  buttonHalf: {
    flex: 1
  }
})
