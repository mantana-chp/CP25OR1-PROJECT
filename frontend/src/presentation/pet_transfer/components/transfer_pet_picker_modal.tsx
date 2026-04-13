import {
  borderRadius,
  colors,
  iconSizes,
  spacing,
  typography,
} from '@/constants/design-system'
import { IPetProfile } from '@/src/domain/pet.domain'
import { Check, Lock, ShieldAlert, X } from 'lucide-react-native'
import React, { useMemo } from 'react'
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import Button from '../../components/button'
import Modal from '../../components/modal'

interface TransferPetPickerModalProps {
  visible: boolean
  pets: IPetProfile[]
  selectedPetIds: string[]
  pendingPetIds: string[]
  loading: boolean
  onTogglePet: (petId: string) => void
  onToggleSelectAll: (selectAll: boolean) => void
  onClose: () => void
  onConfirm: () => void
}

export default function TransferPetPickerModal({
  visible,
  pets,
  selectedPetIds,
  pendingPetIds,
  loading,
  onTogglePet,
  onToggleSelectAll,
  onClose,
  onConfirm,
}: TransferPetPickerModalProps) {
  const pendingSet = useMemo(() => new Set(pendingPetIds), [pendingPetIds])

  const selectablePets = useMemo(
    () => pets.filter((pet) => !pendingSet.has(pet.id)),
    [pets, pendingSet],
  )

  const isAllSelectableSelected =
    selectablePets.length > 0 &&
    selectablePets.every((pet) => selectedPetIds.includes(pet.id))

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      maxWidth={460}
      containerStyle={styles.modalContainer}
    >
      <View style={styles.modalHeaderRow}>
        <Text style={styles.modalTitle}>
          เลือกสัตว์เลี้ยงที่ต้องการโอนสิทธิ์
        </Text>
        <TouchableOpacity onPress={onClose} disabled={loading}>
          <X size={iconSizes.lg} color={colors.gray[500]} />
        </TouchableOpacity>
      </View>

      <Text style={styles.modalDescription}>
        คุณสามารถเลือกหลายตัวได้ในคำขอโอนเดียวกัน 
      </Text>

      <View style={styles.warningBox}>
        <ShieldAlert size={16} color={colors.warning.dark} />
        <Text style={styles.warningText}>
          สำคัญ: เมื่อผู้รับโอนกดยืนยันสำเร็จ
          เจ้าของเดิม หรือ คุณ จะถูกตัดสิทธิ์ทั้งหมดของสัตว์เลี้ยงที่เลือกทันที
          และไม่สามารถเข้าถึงข้อมูลของสัตว์เลี้ยงเหล่านี้ได้อีก
        </Text>
      </View>

      <View style={styles.selectorHeaderRow}>
        <Text style={styles.selectorHeaderTitle}>รายการสัตว์เลี้ยงของคุณ</Text>
        <TouchableOpacity
          onPress={() => onToggleSelectAll(!isAllSelectableSelected)}
          disabled={loading || selectablePets.length === 0}
        >
          <Text style={styles.selectAllText}>
            {isAllSelectableSelected ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.listContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.listContent}>
          {pets.map((pet) => {
            const isSelected = selectedPetIds.includes(pet.id)
            const isPending = pendingSet.has(pet.id)

            return (
              <TouchableOpacity
                key={pet.id}
                style={[
                  styles.petItem,
                  isSelected && styles.petItemSelected,
                  isPending && styles.petItemDisabled,
                ]}
                onPress={() => onTogglePet(pet.id)}
                disabled={loading || isPending}
                activeOpacity={0.85}
              >
                <View style={styles.petItemContent}>
                  {pet.profile_image_url ? (
                    <Image
                      source={{ uri: pet.profile_image_url }}
                      style={styles.petImage}
                    />
                  ) : (
                    <View style={styles.petImagePlaceholder}>
                      <Text style={styles.petImagePlaceholderText}>
                        {pet.pet_name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}

                  <View style={styles.petInfo}>
                    <Text style={styles.petName}>{pet.pet_name}</Text>
                    <Text style={styles.petMeta}>
                      {pet.species || '-'} • {pet.breed || '-'}
                    </Text>
                    {isPending ? (
                      <View style={styles.pendingBadgeRow}>
                        <Lock size={12} color={colors.warning.dark} />
                        <Text style={styles.pendingBadgeText}>
                          มีคำขอโอนค้างอยู่
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {isSelected && !isPending ? (
                  <View style={styles.checkIcon}>
                    <Check
                      size={iconSizes.md}
                      color={colors.background.secondary}
                    />
                  </View>
                ) : null}
              </TouchableOpacity>
            )
          })}
        </View>
      </ScrollView>

      <Text style={styles.selectionText}>
        เลือกแล้ว {selectedPetIds.length} จาก {selectablePets.length} ตัว
        (ตัวที่โอนได้)
      </Text>

      <View style={styles.buttonsRow}>
        <Button
          title='ยกเลิก'
          onPress={onClose}
          variant='ghost'
          style={styles.buttonHalf}
          disabled={loading}
        />
        <Button
          title='สร้างรหัสโอนสิทธิ์'
          onPress={onConfirm}
          loading={loading}
          disabled={loading || selectedPetIds.length === 0}
          style={styles.buttonHalf}
        />
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalContainer: {
    padding: spacing[4],
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    flex: 1,
    marginRight: spacing[2],
    fontSize: typography.fontSize.lg,
    color: colors.primary.DEFAULT,
    fontFamily: typography.fontFamily.bold,
  },
  modalDescription: {
    marginTop: spacing[1],
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    fontFamily: typography.fontFamily.regular,
    lineHeight: typography.lineHeight.relaxed,
  },
  warningBox: {
    marginTop: spacing[2],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.warning.DEFAULT,
    backgroundColor: colors.warning.light,
    padding: spacing[2],
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[1],
  },
  warningText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.warning.dark,
    fontFamily: typography.fontFamily.medium,
    lineHeight: typography.lineHeight.relaxed,
  },
  selectorHeaderRow: {
    marginTop: spacing[2],
    marginBottom: spacing[1],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectorHeaderTitle: {
    fontSize: typography.fontSize.sm,
    color: colors.primary.DEFAULT,
    fontFamily: typography.fontFamily.bold,
  },
  selectAllText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary.light,
    fontFamily: typography.fontFamily.medium,
  },
  listContainer: {
    maxHeight: 340,
  },
  listContent: {
    gap: spacing[2],
    paddingBottom: spacing[1],
  },
  petItem: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.background.secondary,
    padding: spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  petItemSelected: {
    borderColor: colors.primary.light,
    backgroundColor: colors.primary.light + '15',
  },
  petItemDisabled: {
    opacity: 0.72,
    borderColor: colors.warning.DEFAULT,
    backgroundColor: colors.warning.light,
  },
  petItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flex: 1,
  },
  petImage: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  petImagePlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primary.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  petImagePlaceholderText: {
    fontSize: typography.fontSize.lg,
    color: colors.background.secondary,
    fontFamily: typography.fontFamily.bold,
  },
  petInfo: {
    flex: 1,
  },
  petName: {
    fontSize: typography.fontSize.md,
    color: colors.primary.DEFAULT,
    fontFamily: typography.fontFamily.bold,
  },
  petMeta: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    fontFamily: typography.fontFamily.regular,
  },
  pendingBadgeRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  pendingBadgeText: {
    fontSize: typography.fontSize.xs,
    color: colors.warning.dark,
    fontFamily: typography.fontFamily.medium,
  },
  checkIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionText: {
    marginTop: spacing[2],
    textAlign: 'center',
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    fontFamily: typography.fontFamily.regular,
  },
  buttonsRow: {
    marginTop: spacing[2],
    flexDirection: 'row',
    gap: spacing[2],
  },
  buttonHalf: {
    flex: 1,
  },
})
