import {
  borderRadius,
  colors,
  iconSizes,
  spacing,
  typography
} from '@/constants/design-system'
import { X } from 'lucide-react-native'
import React, { useEffect, useState } from 'react'
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Modal from '../../components/modal'
import QRCode from 'react-native-qrcode-svg'
import { formatExpiresIn } from '../../../utils/pet_sharing_utils'
import { IPendingInvite } from '@/src/domain/pet_sharing.domain'

interface QrModalProps {
  visible: boolean
  pendingInvite: IPendingInvite | null
  claimLink: string
  onClose: () => void
  onShare: () => void
}

export default function QrModal({
  visible,
  pendingInvite,
  claimLink,
  onClose,
  onShare
}: QrModalProps) {
  const [isExpired, setIsExpired] = useState(false)

  // Check if the invite is expired
  useEffect(() => {
    if (!pendingInvite || !pendingInvite.expiresAt) {
      setIsExpired(false)
      return
    }

    const checkExpiry = () => {
      const now = new Date()
      const expiresAt = new Date(pendingInvite.expiresAt)
      const expired = now >= expiresAt

      if (expired && !isExpired) {
        setIsExpired(true)
        Alert.alert(
          'QR Code หมดอายุ',
          'QR Code นี้หมดอายุแล้ว กรุณาสร้างรหัสเชิญใหม่',
          [
            {
              text: 'ตกลง',
              onPress: onClose
            }
          ]
        )
      }
    }

    // Check immediately
    checkExpiry()

    // Check every 5 seconds while modal is visible
    const interval = setInterval(checkExpiry, 5000)

    return () => clearInterval(interval)
  }, [pendingInvite, visible, isExpired, onClose])

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      maxWidth={420}
      containerStyle={styles.modalContainer}
    >
      <View style={styles.modalContent}>
        <View style={styles.modalHeaderRow}>
          <Text style={styles.modalTitle}>QR Code คำเชิญ</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={iconSizes.lg} color={colors.gray[500]} />
          </TouchableOpacity>
        </View>

        {pendingInvite ? (
          <>
            <View style={styles.qrFullscreenContainer}>
              <QRCode value={claimLink} size={220} />
            </View>

            <Text style={styles.qrFullscreenSubtitle}>
              ให้ผู้ดูแลสแกน QR Code นี้เพื่อรับสิทธิ์การดูแล
            </Text>

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                QR Code นี้สามารถใช้ได้เพียงครั้งเดียวต่อผู้ใช้งาน {'\n'}
                หลังจากใช้แล้วจะไม่สามารถใช้ซ้ำได้
              </Text>
            </View>

            <Text style={styles.qrFullscreenExpiry}>
              {formatExpiresIn(pendingInvite.expiresAt)}
            </Text>
          </>
        ) : null}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalContainer: {
    padding: spacing[4]
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
  qrFullscreenContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[2]
  },
  qrFullscreenSubtitle: {
    fontSize: typography.fontSize.md,
    color: colors.gray[700],
    textAlign: 'center',
    fontFamily: typography.fontFamily.regular
  },
  infoBox: {
    backgroundColor: colors.info.light || '#E0F2FE',
    borderRadius: borderRadius.md,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: colors.info.DEFAULT || '#0EA5E9'
  },
  infoText: {
    fontSize: typography.fontSize.sm,
    color: colors.info.dark || '#075985',
    fontFamily: typography.fontFamily.regular,
    textAlign: 'center',
    lineHeight: typography.lineHeight.relaxed
  },
  qrFullscreenExpiry: {
    fontSize: typography.fontSize.base,
    color: colors.warning.dark,
    textAlign: 'center',
    fontFamily: typography.fontFamily.medium
  }
})
