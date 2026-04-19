import {
  borderRadius,
  colors,
  spacing,
  typography,
} from '@/constants/design-system'
import {
  ITransferPreviewPet,
  ITransferPreviewResponse,
} from '@/src/domain/pet_transfer.domain'
import { PawPrint, TriangleAlert } from 'lucide-react-native'
import React from 'react'
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native'
import Button from '../../components/button'
import Modal from '../../components/modal'

interface TransferPreviewModalProps {
  visible: boolean
  preview: ITransferPreviewResponse | null
  loading: boolean
  onClose: () => void
  onConfirm: () => void
}

function PreviewPetItem({ pet }: { pet: ITransferPreviewPet }) {
  const imageUri = pet.profileImageUrl

  return (
    <View style={styles.petCard}>
      <View style={styles.petImageContainer}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.petImage} />
        ) : (
          <View style={styles.petImagePlaceholder}>
            <Text style={styles.petImagePlaceholderText}>
              {pet.petName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.petInfo}>
        <Text style={styles.petName} numberOfLines={1}>
          {pet.petName}
        </Text>
        <Text style={styles.petSubInfo} numberOfLines={1}>
          {pet.species ?? '-'} • {pet.breed ?? '-'}
        </Text>
        <Text style={styles.petSubInfo}>
          เพศ {pet.gender} • อายุ {pet.age ?? '-'}
        </Text>
      </View>
    </View>
  )
}

export default function TransferPreviewModal({
  visible,
  preview,
  loading,
  onClose,
  onConfirm,
}: TransferPreviewModalProps) {
  const wouldExceed = Boolean(preview?.wouldExceedLimit)

  return (
    <Modal visible={visible} onClose={onClose} maxWidth={460}>
      <Text style={styles.title}>ยืนยันรับโอนสิทธิ์เจ้าของ</Text>

      {preview ? (
        <>
          <View
            style={[
              styles.countBox,
              wouldExceed ? styles.countBoxWarning : styles.countBoxNormal,
            ]}
          >
            <Text style={styles.countText}>
              คุณมีสัตว์เลี้ยง {preview.receiverCurrentPetCount} ตัว
              และกำลังรับเพิ่ม {preview.incomingPetCount} ตัว
            </Text>
            <Text style={styles.countSubText}>
              เพดานสูงสุด {preview.maxPetLimit} ตัว
            </Text>
          </View>

          {wouldExceed && (
            <View style={styles.warningRow}>
              <TriangleAlert size={16} color={colors.warning.dark} />
              <Text style={styles.warningText}>
                การรับโอนครั้งนี้จะเกินเพดานจำนวนสัตว์เลี้ยง
                ระบบจะไม่อนุญาตให้ยืนยัน
              </Text>
            </View>
          )}

          <View style={styles.listHeader}>
            <PawPrint size={16} color={colors.primary.DEFAULT} />
            <Text style={styles.listHeaderText}>
              สัตว์เลี้ยงที่จะถูกโอน ({preview.pets.length})
            </Text>
          </View>

          <ScrollView
            style={styles.listContainer}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            keyboardShouldPersistTaps='handled'
          >
            {preview.pets.map((pet) => (
              <PreviewPetItem key={pet.id} pet={pet} />
            ))}
          </ScrollView>

          <View style={styles.footerButtons}>
            <Button
              title='ยกเลิก'
              onPress={onClose}
              variant='ghost'
              style={styles.buttonHalf}
              disabled={loading}
            />
            <Button
              title='ยืนยันรับโอน'
              onPress={onConfirm}
              style={styles.buttonHalf}
              loading={loading}
              disabled={loading || wouldExceed}
            />
          </View>
        </>
      ) : null}
    </Modal>
  )
}

const styles = StyleSheet.create({
  title: {
    fontSize: typography.fontSize.lg,
    color: colors.primary.DEFAULT,
    fontFamily: typography.fontFamily.bold,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  countBox: {
    borderRadius: borderRadius.md,
    padding: spacing[3],
    borderWidth: 1,
    marginBottom: spacing[2],
  },
  countBoxNormal: {
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.gray[50],
  },
  countBoxWarning: {
    borderColor: colors.warning.DEFAULT,
    backgroundColor: colors.warning.light,
  },
  countText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[700],
    fontFamily: typography.fontFamily.medium,
  },
  countSubText: {
    marginTop: spacing[1],
    fontSize: typography.fontSize.xs,
    color: colors.gray[600],
    fontFamily: typography.fontFamily.regular,
  },
  warningRow: {
    marginBottom: spacing[2],
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
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginBottom: spacing[1],
  },
  listHeaderText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary.DEFAULT,
    fontFamily: typography.fontFamily.bold,
  },
  listContainer: {
    maxHeight: 260,
    flexGrow: 0,
  },
  listContent: {
    gap: spacing[2],
    paddingBottom: spacing[1],
  },
  petCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.background.secondary,
    padding: spacing[2],
  },
  petImageContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
  },
  petImage: {
    width: '100%',
    height: '100%',
  },
  petImagePlaceholder: {
    width: '100%',
    height: '100%',
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
  petSubInfo: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    fontFamily: typography.fontFamily.regular,
  },
  footerButtons: {
    marginTop: spacing[3],
    flexDirection: 'row',
    gap: spacing[2],
  },
  buttonHalf: {
    flex: 1,
  },
})
