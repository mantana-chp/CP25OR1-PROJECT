import {
  borderRadius,
  colors,
  iconSizes,
  spacing,
  typography,
} from '@/constants/design-system'
import { IPendingTransfer } from '@/src/domain/pet_transfer.domain'
import { formatTransferExpiresIn } from '@/src/utils/pet_transfer_utils'
import { X } from 'lucide-react-native'
import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import Modal from '../../components/modal'

interface TransferQrModalProps {
  visible: boolean
  pendingTransfer: IPendingTransfer | null
  claimLink: string
  onClose: () => void
}

export default function TransferQrModal({
  visible,
  pendingTransfer,
  claimLink,
  onClose,
}: TransferQrModalProps) {
  return (
    <Modal
      visible={visible}
      onClose={onClose}
      maxWidth={420}
      containerStyle={styles.modalContainer}
    >
      <View style={styles.modalContent}>
        <View style={styles.modalHeaderRow}>
          <Text style={styles.modalTitle}>QR Code โอนสิทธิ์เจ้าของ</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={iconSizes.lg} color={colors.gray[500]} />
          </TouchableOpacity>
        </View>

        {pendingTransfer ? (
          <>
            <View style={styles.qrContainer}>
              <QRCode value={claimLink} size={220} />
            </View>

            <Text style={styles.subtitle}>
              ให้ผู้รับโอนสแกน QR นี้เพื่อดูข้อมูลก่อนยืนยันรับสิทธิ์
            </Text>

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                โค้ดนี้ใช้ได้ครั้งเดียว และจะหมดอายุอัตโนมัติภายใน 1 ชั่วโมง
              </Text>
            </View>

            <Text style={styles.expiryText}>
              {formatTransferExpiresIn(pendingTransfer.expiresAt)}
            </Text>
          </>
        ) : null}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalContainer: {
    padding: spacing[4],
  },
  modalContent: {
    gap: spacing[2],
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    color: colors.primary.DEFAULT,
    fontFamily: typography.fontFamily.bold,
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[2],
  },
  subtitle: {
    fontSize: typography.fontSize.md,
    color: colors.gray[700],
    textAlign: 'center',
    fontFamily: typography.fontFamily.regular,
  },
  infoBox: {
    backgroundColor: colors.info.light || '#E0F2FE',
    borderRadius: borderRadius.md,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: colors.info.DEFAULT || '#0EA5E9',
  },
  infoText: {
    fontSize: typography.fontSize.sm,
    color: colors.info.dark || '#075985',
    fontFamily: typography.fontFamily.regular,
    textAlign: 'center',
    lineHeight: typography.lineHeight.relaxed,
  },
  expiryText: {
    fontSize: typography.fontSize.base,
    color: colors.warning.dark,
    textAlign: 'center',
    fontFamily: typography.fontFamily.medium,
  },
})
