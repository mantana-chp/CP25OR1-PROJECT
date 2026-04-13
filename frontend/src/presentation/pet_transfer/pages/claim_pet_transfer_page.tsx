import {
  colors,
  iconSizes,
  spacing,
  typography,
} from '@/constants/design-system'
import {
  ITransferAcceptResponse,
  ITransferPreviewPet,
  ITransferPreviewResponse,
} from '@/src/domain/pet_transfer.domain'
import { useAuth } from '@/src/context/AuthContext'
import { usePets } from '@/src/context/PetContext'
import { ApiError } from '@/src/utils/api/api_client'
import { petTransferService } from '@/src/utils/api/services/pet_transfer_service'
import { useApi } from '@/src/utils/api/use_api'
import { unwrapData } from '@/src/utils/pet_sharing_utils'
import { extractTransferToken } from '@/src/utils/pet_transfer_utils'
import { useRouter } from 'expo-router'
import {
  BarcodeScanningResult,
  CameraType,
  CameraView,
  useCameraPermissions,
} from 'expo-camera'
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import {
  Keyboard as KeyboardIcon,
  ScanLine,
  ShieldCheck,
} from 'lucide-react-native'
import React, { useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Alert } from 'react-native'

import Button from '../../components/button'
import Header from '../../components/header_component'
import TransferPreviewModal from '../components/transfer_preview_modal'
import TransferResultModal from '../components/transfer_result_modal'

const DUPLICATE_SCAN_WINDOW_MS = 2000

const getPreviewErrorMessage = (error: ApiError) => {
  const message = error.message?.toLowerCase() ?? ''
  const backendMessage =
    typeof error.errors?.[0]?.message === 'string'
      ? error.errors[0].message.toLowerCase()
      : ''
  const mergedMessage = `${message} ${backendMessage}`

  if (error.statusCode === 401) {
    return 'กรุณาเข้าสู่ระบบก่อนรับโอนสิทธิ์'
  }

  if (
    error.statusCode === 404 ||
    mergedMessage.includes('invalid transfer token')
  ) {
    return 'ไม่พบรหัสโอนสิทธิ์นี้ หรือรหัสไม่ถูกต้อง'
  }

  if (mergedMessage.includes('expired')) {
    return 'รหัสโอนสิทธิ์หมดอายุแล้ว กรุณาขอรหัสใหม่จากเจ้าของเดิม'
  }

  if (mergedMessage.includes('already been used')) {
    return 'รหัสโอนสิทธิ์นี้ถูกใช้งานไปแล้ว'
  }

  if (mergedMessage.includes('cancelled')) {
    return 'รหัสโอนสิทธิ์นี้ถูกยกเลิกแล้ว'
  }

  if (mergedMessage.includes('you cannot accept your own transfer')) {
    return 'คุณไม่สามารถรับโอนสิทธิ์จากคำเชิญที่คุณสร้างเองได้'
  }

  return (
    error.message || 'ไม่สามารถตรวจสอบคำขอโอนสิทธิ์ได้ กรุณาลองใหม่อีกครั้ง'
  )
}

const getAcceptErrorMessage = (error: ApiError) => {
  const message = error.message?.toLowerCase() ?? ''
  const backendMessage =
    typeof error.errors?.[0]?.message === 'string'
      ? error.errors[0].message.toLowerCase()
      : ''
  const mergedMessage = `${message} ${backendMessage}`

  if (error.statusCode === 401) {
    return 'กรุณาเข้าสู่ระบบก่อนรับโอนสิทธิ์'
  }

  if (error.statusCode === 409 || mergedMessage.includes('exceed')) {
    return 'ไม่สามารถรับโอนได้ เพราะจำนวนสัตว์เลี้ยงจะเกินเพดานที่ระบบกำหนด'
  }

  if (mergedMessage.includes('no longer valid')) {
    return 'คำขอโอนสิทธิ์นี้ไม่สามารถใช้งานต่อได้แล้ว อาจถูกใช้หรือหมดอายุไปแล้ว'
  }

  if (
    mergedMessage.includes(
      'none of the pets in this transfer could be transferred',
    )
  ) {
    return 'ไม่สามารถโอนสัตว์เลี้ยงในคำขอนี้ได้แล้ว เนื่องจากสถานะมีการเปลี่ยนแปลง'
  }

  return getPreviewErrorMessage(error)
}

export default function ClaimPetTransferPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { refreshPets, setSelectedPetId } = usePets()

  const [permission, requestPermission] = useCameraPermissions()
  const [showManualInput, setShowManualInput] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [previewTransfer, setPreviewTransfer] =
    useState<ITransferPreviewResponse | null>(null)
  const [activeTransferId, setActiveTransferId] = useState<string | null>(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [showResultModal, setShowResultModal] = useState(false)
  const [resultMessage, setResultMessage] = useState('')
  const [transferredPets, setTransferredPets] = useState<ITransferPreviewPet[]>(
    [],
  )

  const facing: CameraType = 'back'
  const isHandlingScanRef = useRef(false)
  const lastScannedPayloadRef = useRef<{
    value: string
    scannedAt: number
  } | null>(null)

  const previewTransferApi = useApi(petTransferService.previewTransfer, {
    showErrorAlert: false,
  })
  const acceptTransferApi = useApi(petTransferService.acceptTransfer, {
    showErrorAlert: false,
  })

  const isBusy =
    previewTransferApi.loading || acceptTransferApi.loading || authLoading

  const permissionDenied = useMemo(() => {
    if (!permission) return false
    return !permission.granted
  }, [permission])

  const onRequestPermission = async () => {
    const nextPermission = await requestPermission()

    if (!nextPermission.granted) {
      Alert.alert(
        'ต้องการสิทธิ์กล้อง',
        'โปรดอนุญาตการใช้งานกล้องเพื่อสแกน QR Code สำหรับรับโอนสิทธิ์',
        [
          {
            text: 'ยกเลิก',
            style: 'cancel',
          },
          {
            text: 'ไปที่การตั้งค่า',
            onPress: () => Linking.openSettings(),
          },
        ],
      )
    }
  }

  const handlePreviewTransfer = async (transferId: string) => {
    if (!isAuthenticated) {
      Alert.alert('กรุณาเข้าสู่ระบบ', 'คุณต้องเข้าสู่ระบบก่อนรับโอนสิทธิ์')
      return
    }

    const result = await previewTransferApi.execute(transferId)

    if (result.error) {
      const error = result.error as ApiError
      Alert.alert('ตรวจสอบคำขอไม่สำเร็จ', getPreviewErrorMessage(error))
      return
    }

    const previewPayload = unwrapData<ITransferPreviewResponse>(result.data)
    if (!previewPayload?.transferId) {
      Alert.alert(
        'ข้อมูลไม่ถูกต้อง',
        'ไม่พบข้อมูลคำขอโอนสิทธิ์ กรุณาลองใหม่อีกครั้ง',
      )
      return
    }

    setActiveTransferId(transferId)
    setPreviewTransfer(previewPayload)
    setShowPreviewModal(true)
  }

  const handleConfirmAcceptTransfer = () => {
    if (!activeTransferId || !previewTransfer) return

    Alert.alert(
      'ยืนยันอีกครั้ง',
      'หลังยืนยันแล้ว ระบบจะโอนความเป็นเจ้าของให้บัญชีนี้ทันที และเจ้าของเดิมจะไม่มีสิทธิ์เข้าถึงข้อมูลสัตว์เลี้ยงนี้',
      [
        {
          text: 'ยกเลิก',
          style: 'cancel',
        },
        {
          text: 'ยืนยันโอนสิทธิ์',
          style: 'destructive',
          onPress: () => {
            void handleAcceptTransfer(activeTransferId)
          },
        },
      ],
    )
  }

  const handleAcceptTransfer = async (transferId: string) => {
    const result = await acceptTransferApi.execute(transferId)

    if (result.error) {
      const error = result.error as ApiError
      Alert.alert('รับโอนสิทธิ์ไม่สำเร็จ', getAcceptErrorMessage(error))
      return
    }

    const acceptedPayload = unwrapData<ITransferAcceptResponse>(result.data)
    const nextTransferredPets = acceptedPayload?.transferredPets ?? []

    await refreshPets()

    if (nextTransferredPets[0]?.id) {
      setSelectedPetId(nextTransferredPets[0].id)
    }

    setResultMessage(acceptedPayload?.message || 'รับโอนสิทธิ์เรียบร้อยแล้ว')
    setTransferredPets(nextTransferredPets)
    setShowPreviewModal(false)
    setShowResultModal(true)
  }

  const onBarcodeScanned = async (event: BarcodeScanningResult) => {
    if (isHandlingScanRef.current || isBusy) {
      return
    }

    const payload = event.data?.trim()
    if (!payload) return

    const now = Date.now()
    const previousScan = lastScannedPayloadRef.current

    if (
      previousScan &&
      previousScan.value === payload &&
      now - previousScan.scannedAt < DUPLICATE_SCAN_WINDOW_MS
    ) {
      return
    }

    isHandlingScanRef.current = true
    lastScannedPayloadRef.current = {
      value: payload,
      scannedAt: now,
    }

    const transferId = extractTransferToken(payload)
    if (!transferId) {
      Alert.alert(
        'QR Code ไม่ถูกต้อง',
        'ไม่พบรหัสโอนสิทธิ์ที่ใช้งานได้ใน QR นี้',
      )
      isHandlingScanRef.current = false
      return
    }

    try {
      await handlePreviewTransfer(transferId)
    } finally {
      isHandlingScanRef.current = false
    }
  }

  const handleManualSubmit = async () => {
    const trimmedCode = manualCode.trim()
    if (!trimmedCode) {
      Alert.alert('กรุณากรอกรหัส', 'กรุณากรอกรหัสโอนสิทธิ์หรือลิงก์โอนสิทธิ์')
      return
    }

    const transferId = extractTransferToken(trimmedCode)
    if (!transferId) {
      Alert.alert('รหัสไม่ถูกต้อง', 'ไม่พบรหัสโอนสิทธิ์ในข้อความที่กรอก')
      return
    }

    await handlePreviewTransfer(transferId)
    setManualCode('')
    setShowManualInput(false)
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.screen}
      keyboardVerticalOffset={0}
    >
      <View style={styles.container}>
        <Header
          title='รับโอนสิทธิ์เจ้าของ'
          goBack
          onBackPress={() => router.push('/(tabs)/pet_profile')}
        />

        <View style={styles.content}>
          {isBusy ? (
            <View style={styles.stateContainer}>
              <ActivityIndicator size='large' color={colors.primary.light} />
            </View>
          ) : !isAuthenticated ? (
            <View style={styles.stateContainer}>
              <ShieldCheck
                color={colors.warning.DEFAULT}
                size={iconSizes['4xl']}
              />
              <Text style={styles.stateTitle}>กรุณาเข้าสู่ระบบก่อน</Text>
              <Text style={styles.stateDescription}>
                คุณต้องเข้าสู่ระบบก่อนรับโอนสิทธิ์เจ้าของสัตว์เลี้ยง
              </Text>
            </View>
          ) : !permission ? (
            <View style={styles.stateContainer}>
              <ActivityIndicator size='large' color={colors.primary.light} />
              <Text style={styles.stateDescription}>กำลังเตรียมกล้อง...</Text>
            </View>
          ) : permissionDenied ? (
            <View style={styles.stateContainer}>
              <ScanLine color={colors.primary.light} size={iconSizes['4xl']} />
              <Text style={styles.stateTitle}>อนุญาตการใช้งานกล้อง</Text>
              <Text style={styles.stateDescription}>
                เพื่อสแกน QR Code สำหรับรับโอนสิทธิ์เจ้าของ
              </Text>

              <Button
                title='อนุญาตใช้งานกล้อง'
                onPress={onRequestPermission}
                style={styles.permissionButton}
              />
            </View>
          ) : showManualInput ? (
            <View style={styles.manualInputContainer}>
              <Text style={styles.manualInputTitle}>กรอกรหัสโอนสิทธิ์</Text>
              <Text style={styles.manualInputDescription}>
                วางลิงก์โอนสิทธิ์หรือรหัส Transfer ID ที่ได้รับมา
              </Text>
              <TextInput
                style={styles.manualInput}
                placeholder='Transfer ID หรือ ลิงก์'
                placeholderTextColor={colors.gray[400]}
                value={manualCode}
                onChangeText={setManualCode}
                autoCapitalize='none'
                autoCorrect={false}
                numberOfLines={2}
              />

              <View style={styles.manualInputButtons}>
                <Button
                  title='ยกเลิก'
                  onPress={() => {
                    setShowManualInput(false)
                    setManualCode('')
                  }}
                  variant='ghost'
                  style={styles.manualInputButtonHalf}
                />
                <Button
                  title='ตรวจสอบ'
                  onPress={handleManualSubmit}
                  loading={previewTransferApi.loading}
                  disabled={previewTransferApi.loading || !manualCode.trim()}
                  style={styles.manualInputButtonHalf}
                />
              </View>

              <TouchableOpacity
                onPress={() => setShowManualInput(false)}
                style={styles.switchModeButton}
              >
                <ScanLine color={colors.primary.light} size={iconSizes.md} />
                <Text style={styles.switchModeText}>สลับไปสแกน QR Code</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.scannerCard}>
                <CameraView
                  style={styles.camera}
                  facing={facing}
                  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                  onBarcodeScanned={onBarcodeScanned}
                />

                <View pointerEvents='none' style={styles.scanFrame} />
              </View>

              <Text style={styles.helperText}>
                วาง QR Code ให้อยู่ในกรอบ เพื่อดูตัวอย่างก่อนยืนยันรับโอนสิทธิ์
              </Text>

              <TouchableOpacity
                onPress={() => setShowManualInput(true)}
                style={styles.switchModeButton}
              >
                <KeyboardIcon
                  color={colors.primary.light}
                  size={iconSizes.md}
                />
                <Text style={styles.switchModeText}>
                  กรอก Transfer ID แทนการสแกน
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <TransferPreviewModal
        visible={showPreviewModal}
        preview={previewTransfer}
        loading={acceptTransferApi.loading}
        onClose={() => setShowPreviewModal(false)}
        onConfirm={handleConfirmAcceptTransfer}
      />

      <TransferResultModal
        visible={showResultModal}
        message={resultMessage}
        transferredPets={transferredPets}
        onClose={() => {
          setShowResultModal(false)
          router.replace('/(tabs)/pet_profile')
        }}
      />
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[5],
  },
  stateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
  },
  stateTitle: {
    fontSize: typography.fontSize.xl,
    color: colors.primary.DEFAULT,
    fontFamily: typography.fontFamily.bold,
    textAlign: 'center',
  },
  stateDescription: {
    fontSize: typography.fontSize.md,
    color: colors.gray[600],
    fontFamily: typography.fontFamily.regular,
    textAlign: 'center',
    lineHeight: typography.lineHeight.relaxed,
  },
  permissionButton: {
    marginTop: spacing[2],
  },
  scannerCard: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.gray[200],
    position: 'relative',
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  scanFrame: {
    position: 'absolute',
    top: '20%',
    left: '15%',
    right: '15%',
    bottom: '20%',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.background.secondary,
  },
  helperText: {
    marginTop: spacing[3],
    fontSize: typography.fontSize.md,
    color: colors.gray[600],
    fontFamily: typography.fontFamily.regular,
    textAlign: 'center',
    lineHeight: typography.lineHeight.relaxed,
  },
  switchModeButton: {
    marginTop: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
  },
  switchModeText: {
    fontSize: typography.fontSize.md,
    color: colors.primary.light,
    fontFamily: typography.fontFamily.medium,
  },
  manualInputContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing[2],
  },
  manualInputTitle: {
    fontSize: typography.fontSize.xl,
    color: colors.primary.DEFAULT,
    fontFamily: typography.fontFamily.bold,
    textAlign: 'center',
  },
  manualInputDescription: {
    fontSize: typography.fontSize.md,
    color: colors.gray[600],
    fontFamily: typography.fontFamily.regular,
    textAlign: 'center',
    lineHeight: typography.lineHeight.relaxed,
  },
  manualInput: {
    minHeight: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    fontSize: typography.fontSize.md,
    color: colors.gray[800],
    fontFamily: typography.fontFamily.regular,
    textAlignVertical: 'top',
  },
  manualInputButtons: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  manualInputButtonHalf: {
    flex: 1,
  },
})
