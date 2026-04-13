import {
  borderRadius,
  colors,
  iconSizes,
  spacing,
  typography,
} from '@/constants/design-system'
import { X } from 'lucide-react-native'
import React, { useEffect, useState } from 'react'
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Modal from '../../components/modal'
import QRCode from 'react-native-qrcode-svg'
import { formatExpiresIn } from '../../../utils/pet_sharing_utils'
import { formatTransferExpiresIn } from '@/src/utils/pet_transfer_utils'

interface QrModalProps {
  visible: boolean
  claimLink: string
  expiresAt?: string | null
  mode?: 'share' | 'transfer'
  onClose: () => void
}

export default function QrModal({
  visible,
  claimLink,
  expiresAt,
  mode = 'share',
  onClose,
}: QrModalProps) {
  const [isExpired, setIsExpired] = useState(false)

  const isTransferMode = mode === 'transfer'

  const modalTitle = isTransferMode
    ? 'QR Code โอนสิทธิ์เจ้าของ'
    : 'QR Code คำเชิญ'

  const subtitle = isTransferMode
    ? 'ให้ผู้รับโอนสแกน QR นี้เพื่อดูข้อมูลก่อนยืนยันรับสิทธิ์'
    : 'ให้ผู้ดูแลสแกน QR Code นี้เพื่อรับสิทธิ์การดูแล'

  const infoText = isTransferMode
    ? 'โค้ดนี้ใช้ได้ครั้งเดียว และจะหมดอายุอัตโนมัติภายใน 1 ชั่วโมง'
    : 'QR Code นี้สามารถใช้ได้เพียงครั้งเดียวต่อผู้ใช้งาน\nหลังจากใช้แล้วจะไม่สามารถใช้ซ้ำได้'

  const expiredTitle = isTransferMode
    ? 'QR โอนสิทธิ์หมดอายุ'
    : 'QR Code หมดอายุ'

  const expiredMessage = isTransferMode
    ? 'QR โอนสิทธิ์นี้หมดอายุแล้ว กรุณาสร้างรหัสโอนสิทธิ์ใหม่'
    : 'QR Code นี้หมดอายุแล้ว กรุณาสร้างรหัสเชิญใหม่'

  // Check if the invite is expired
  useEffect(() => {
    if (!expiresAt) {
      setIsExpired(false)
      return
    }

    const checkExpiry = () => {
      const now = new Date()
      const expiresDate = new Date(expiresAt)
      const expired = now >= expiresDate

      if (expired && !isExpired) {
        setIsExpired(true)
        Alert.alert(expiredTitle, expiredMessage, [
          {
            text: 'ตกลง',
            onPress: onClose,
          },
        ])
      }
    }

    // Check immediately
    checkExpiry()

    // Check every 5 seconds while modal is visible
    const interval = setInterval(checkExpiry, 5000)

    return () => clearInterval(interval)
  }, [expiresAt, visible, isExpired, expiredTitle, expiredMessage, onClose])

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      maxWidth={420}
      containerStyle={styles.modalContainer}
    >
      <View style={styles.modalContent}>
        <View style={styles.modalHeaderRow}>
          <Text style={styles.modalTitle}>{modalTitle}</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={iconSizes.lg} color={colors.gray[500]} />
          </TouchableOpacity>
        </View>

        {expiresAt ? (
          <>
            <View style={styles.qrFullscreenContainer}>
              <QRCode value={claimLink} size={220} />
            </View>

            <Text style={styles.qrFullscreenSubtitle}>{subtitle}</Text>

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>{infoText}</Text>
            </View>

            <Text style={styles.qrFullscreenExpiry}>
              {isTransferMode
                ? formatTransferExpiresIn(expiresAt)
                : formatExpiresIn(expiresAt)}
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
  qrFullscreenContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[2],
  },
  qrFullscreenSubtitle: {
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
  qrFullscreenExpiry: {
    fontSize: typography.fontSize.base,
    color: colors.warning.dark,
    textAlign: 'center',
    fontFamily: typography.fontFamily.medium,
  },
})
