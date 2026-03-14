import {
  borderRadius,
  colors,
  iconSizes,
  spacing,
  typography
} from '@/constants/design-system'
import { X } from 'lucide-react-native'
import React from 'react'
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'
import Button from '../../components/button'

interface AliasModalProps {
  visible: boolean
  aliasInput: string
  onChangeAlias: (value: string) => void
  onClose: () => void
  onConfirm: () => void
}

export default function AliasModal({
  visible,
  aliasInput,
  onChangeAlias,
  onClose,
  onConfirm
}: AliasModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />

        <View style={styles.modalCard}>
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

          <View style={styles.buttons}>
            <Button
              title="ยกเลิก"
              onPress={onClose}
              variant="ghost"
              style={styles.buttonHalf}
            />
            <Button
              title={'สร้างรหัส'}
              onPress={onConfirm}
              variant="base"
              style={styles.buttonHalf}
            />
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[5]
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    backgroundColor: colors.background.secondary,
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
