import {
  borderRadius,
  colors,
  iconSizes,
  spacing,
  typography
} from '@/constants/design-system'
import { IPendingInvite } from '@/src/utils/api/services/pet_sharing_service'
import { Share2, X } from 'lucide-react-native'
import React from 'react'
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'
import Button from '../../components/button'
import QRCode from 'react-native-qrcode-svg'
import { formatExpiresIn } from '../../../utils/pet_sharing_utils'

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

              <Text style={styles.qrFullscreenExpiry}>
                {formatExpiresIn(pendingInvite.expiresAt)}
              </Text>

              <Button
                title="แชร์รหัสเชิญ"
                onPress={onShare}
                icon={
                  <Share2
                    size={iconSizes.md}
                    color={colors.background.secondary}
                  />
                }
                style={[styles.createInviteButton, styles.qrShareButton]}
                textStyle={styles.createInviteButtonText}
              />
            </>
          ) : null}
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
  qrFullscreenExpiry: {
    fontSize: typography.fontSize.base,
    color: colors.warning.dark,
    textAlign: 'center',
    fontFamily: typography.fontFamily.medium
  },
  createInviteButton: {
    minHeight: spacing[12],
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing[2],
    backgroundColor: colors.primary.light
  },
  createInviteButtonText: {
    fontSize: typography.fontSize.md,
    color: colors.background.secondary,
    fontFamily: typography.fontFamily.bold
  },
  qrShareButton: {
    marginTop: 2
  }
})
