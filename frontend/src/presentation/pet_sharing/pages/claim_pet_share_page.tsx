import {
  borderRadius,
  colors,
  iconSizes,
  spacing,
  typography,
} from '@/constants/design-system'
import { IPetProfile } from '@/src/domain/pet.domain'
import {
  IClaimInviteResponse,
  INormalizedClaimInviteResult,
  TClaimInvitePayload,
} from '@/src/domain/pet_sharing.domain'
import {
  ITransferAcceptResponse,
  ITransferPreviewPet,
  ITransferPreviewResponse,
} from '@/src/domain/pet_transfer.domain'
import { useAuth } from '@/src/context/AuthContext'
import { usePets } from '@/src/context/PetContext'
import { ApiError } from '@/src/utils/api/api_client'
import { petSharingService } from '@/src/utils/api/services/pet_sharing_service'
import { petTransferService } from '@/src/utils/api/services/pet_transfer_service'
import { useApi } from '@/src/utils/api/use_api'
import { extractClaimToken, unwrapData } from '@/src/utils/pet_sharing_utils'
import {
  extractTransferToken,
  markTransferAsResolved,
} from '@/src/utils/pet_transfer_utils'
import { useRouter, useLocalSearchParams } from 'expo-router'
import {
  BarcodeScanningResult,
  CameraType,
  CameraView,
  useCameraPermissions,
} from 'expo-camera'
import { KeyboardAvoidingView, Linking, Platform } from 'react-native'
import {
  ScanLine,
  ShieldCheck,
  Keyboard as KeyboardIcon,
} from 'lucide-react-native'
import React, { useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'

import Button from '../../components/button'
import Header from '../../components/header_component'
import ClaimedPetsModal from '../components/claimed_pets_modal'
import TransferPreviewModal from '../../pet_transfer/components/transfer_preview_modal'
import TransferResultModal from '../../pet_transfer/components/transfer_result_modal'

const DUPLICATE_SCAN_WINDOW_MS = 2000

const normalizeClaimResult = (
  payload: TClaimInvitePayload,
): INormalizedClaimInviteResult => {
  if (!payload) {
    return { added: [], alreadyShared: [] }
  }

  if (Array.isArray(payload)) {
    return { added: payload, alreadyShared: [] }
  }

  return {
    added: payload.added ?? [],
    alreadyShared: payload.alreadyShared ?? [],
  }
}

const getClaimErrorMessage = (error: ApiError) => {
  const message = error.message?.toLowerCase() ?? ''
  const backendMessage =
    typeof error.errors?.[0]?.message === 'string'
      ? error.errors[0].message.toLowerCase()
      : ''
  const mergedMessage = `${message} ${backendMessage}`

  if (error.statusCode === 401) {
    return 'กรุณาเข้าสู่ระบบก่อนรับคำเชิญ'
  }

  if (error.statusCode === 404 || mergedMessage.includes('invalid code')) {
    return 'QR Code ไม่ถูกต้องหรือถูกยกเลิกแล้ว'
  }

  if (mergedMessage.includes('already the owner')) {
    return 'บัญชีนี้เป็นเจ้าของสัตว์เลี้ยงนี้อยู่แล้ว'
  }

  if (
    mergedMessage.includes('already a caregiver') ||
    mergedMessage.includes('already caregiver')
  ) {
    return 'คุณอยู่ในรายชื่อผู้ดูแลร่วมของสัตว์เลี้ยงนี้แล้ว'
  }

  if (mergedMessage.includes('code expired or already used')) {
    return 'QR Code นี้หมดอายุหรือถูกใช้ไปแล้ว'
  }

  if (mergedMessage.includes('expired')) {
    return 'QR Code หมดอายุแล้ว กรุณาขอรหัสเชิญใหม่จากเจ้าของสัตว์เลี้ยง'
  }

  if (mergedMessage.includes('already used')) {
    return 'QR Code นี้ถูกใช้ไปแล้ว'
  }

  if (mergedMessage.includes('no longer active')) {
    return 'คำเชิญนี้อ้างอิงสัตว์เลี้ยงที่ไม่พร้อมแชร์แล้ว กรุณาขอรหัสใหม่'
  }

  return error.message || 'ไม่สามารถรับคำเชิญได้ กรุณาลองใหม่อีกครั้ง'
}

const getPreviewTransferErrorMessage = (error: ApiError) => {
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

const getAcceptTransferErrorMessage = (error: ApiError) => {
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

  return getPreviewTransferErrorMessage(error)
}

const isInvalidClaimTokenError = (error: ApiError) => {
  const message = `${error.message ?? ''} ${error.errors?.[0]?.message ?? ''}`
    .toLowerCase()
    .trim()
  return error.statusCode === 404 || message.includes('invalid code')
}

const isInvalidTransferTokenError = (error: ApiError) => {
  const message = `${error.message ?? ''} ${error.errors?.[0]?.message ?? ''}`
    .toLowerCase()
    .trim()
  return error.statusCode === 404 || message.includes('invalid transfer token')
}

export default function ClaimPetSharePage() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const fromOnboarding = params?.fromOnboarding === 'true'
  const isFromPetOptions = params?.isFromPetOptions === 'true'
  const isPostOnboarding = params?.isPostOnboarding === 'true'

  const {
    isAuthenticated,
    isLoading: authLoading,
    completeOnboarding,
  } = useAuth()
  const { refreshPets, activePets, deceasedPets, setSelectedPetId } = usePets()

  const [permission, requestPermission] = useCameraPermissions()
  const [showManualInput, setShowManualInput] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [lastErrorToken, setLastErrorToken] = useState<string | null>(null)
  const [claimResult, setClaimResult] = useState<INormalizedClaimInviteResult>({
    added: [],
    alreadyShared: [],
  })
  const [showClaimedPetsModal, setShowClaimedPetsModal] = useState(false)
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

  const claimInviteApi = useApi(petSharingService.claimInvite, {
    showErrorAlert: false,
  })
  const previewTransferApi = useApi(petTransferService.previewTransfer, {
    showErrorAlert: false,
  })
  const acceptTransferApi = useApi(petTransferService.acceptTransfer, {
    showErrorAlert: false,
  })

  const isBusy =
    claimInviteApi.loading ||
    previewTransferApi.loading ||
    acceptTransferApi.loading ||
    authLoading

  // Determine if user has no pets (used to hide back button)
  const hasNoPets =
    (!activePets || activePets.length === 0) &&
    (!deceasedPets || deceasedPets.length === 0)

  const permissionDenied = useMemo(() => {
    if (!permission) return false
    return !permission.granted
  }, [permission])

  const onBackPress = () => {
    if (fromOnboarding || isFromPetOptions) {
      if (isPostOnboarding) {
        router.push('/onboarding/pet-options?isPostOnboarding=true')
      } else {
        router.push('/onboarding/pet-options')
      }
    } else {
      router.push('/(tabs)/pet_profile')
    }
  }

  const onRequestPermission = async () => {
    const nextPermission = await requestPermission()

    if (!nextPermission.granted) {
      Alert.alert(
        'ต้องการสิทธิ์กล้อง',
        'โปรดอนุญาตการใช้งานกล้องเพื่อสแกน QR Code สำหรับรับสิทธิ์ดูแลร่วมหรือรับโอนสิทธิ์เจ้าของ',
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

  const onClaimInvite = async (
    token: string,
    options?: { silentInvalidError?: boolean },
  ) => {
    if (!isAuthenticated) {
      Alert.alert('กรุณาเข้าสู่ระบบ', 'คุณต้องเข้าสู่ระบบก่อนรับคำเชิญ')
      return false
    }

    const result = await claimInviteApi.execute(token)

    if (result.error) {
      const error = result.error as ApiError
      if (options?.silentInvalidError && isInvalidClaimTokenError(error)) {
        return false
      }

      Alert.alert('รับคำเชิญไม่สำเร็จ', getClaimErrorMessage(error))
      return false
    }

    const claimPayload = unwrapData<IPetProfile[] | IClaimInviteResponse>(
      result.data,
    )

    const normalizedResult = normalizeClaimResult(claimPayload)
    const claimedPetId =
      normalizedResult.added[0]?.id ?? normalizedResult.alreadyShared[0]?.id

    await refreshPets()

    if (claimedPetId) {
      setSelectedPetId(claimedPetId)
    }

    // If coming from onboarding, complete it after claiming pet
    if (fromOnboarding && !isPostOnboarding) {
      console.log('✅ Claiming pet from onboarding, completing onboarding')
      await completeOnboarding()
    }

    // Show claimed pets modal
    if (
      normalizedResult.added.length > 0 ||
      normalizedResult.alreadyShared.length > 0
    ) {
      setClaimResult(normalizedResult)
      setShowClaimedPetsModal(true)
    } else {
      // Fallback to navigate directly if no pets data
      router.replace('/(tabs)/pet_profile')
    }

    return true
  }

  const handlePreviewTransfer = async (
    transferId: string,
    options?: { silentInvalidError?: boolean },
  ) => {
    if (!isAuthenticated) {
      Alert.alert('กรุณาเข้าสู่ระบบ', 'คุณต้องเข้าสู่ระบบก่อนรับโอนสิทธิ์')
      return false
    }

    const result = await previewTransferApi.execute(transferId)

    if (result.error) {
      const error = result.error as ApiError
      if (options?.silentInvalidError && isInvalidTransferTokenError(error)) {
        return false
      }

      Alert.alert('ตรวจสอบคำขอไม่สำเร็จ', getPreviewTransferErrorMessage(error))
      return false
    }

    const previewPayload = unwrapData<ITransferPreviewResponse>(result.data)
    if (!previewPayload?.transferId) {
      Alert.alert(
        'ข้อมูลไม่ถูกต้อง',
        'ไม่พบข้อมูลคำขอโอนสิทธิ์ กรุณาลองใหม่อีกครั้ง',
      )
      return false
    }

    setActiveTransferId(transferId)
    setPreviewTransfer(previewPayload)
    setShowPreviewModal(true)
    return true
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
      Alert.alert('รับโอนสิทธิ์ไม่สำเร็จ', getAcceptTransferErrorMessage(error))
      return
    }

    const acceptedPayload = unwrapData<ITransferAcceptResponse>(result.data)
    const nextTransferredPets = acceptedPayload?.transferredPets ?? []

    await markTransferAsResolved(transferId)

    await refreshPets()

    if (nextTransferredPets[0]?.id) {
      setSelectedPetId(nextTransferredPets[0].id)
    }

    setResultMessage(acceptedPayload?.message || 'รับโอนสิทธิ์เรียบร้อยแล้ว')
    setTransferredPets(nextTransferredPets)
    setShowPreviewModal(false)
    setShowResultModal(true)
  }

  const handleReceiveToken = async (payload: string) => {
    const trimmedPayload = payload.trim()
    if (!trimmedPayload) return

    const looksLikeClaimLink =
      trimmedPayload.includes('/claim/') ||
      trimmedPayload.startsWith('cp25or1-frontend://claim/')
    const looksLikeTransferLink =
      trimmedPayload.includes('/transfer/') ||
      trimmedPayload.startsWith('cp25or1-frontend://transfer/')

    if (looksLikeClaimLink) {
      const claimToken = extractClaimToken(trimmedPayload)
      if (!claimToken) {
        Alert.alert('ข้อมูลไม่ถูกต้อง', 'ไม่พบรหัสคำเชิญผู้ดูแลในข้อมูลที่สแกน')
        return
      }
      await onClaimInvite(claimToken)
      return
    }

    if (looksLikeTransferLink) {
      const transferToken = extractTransferToken(trimmedPayload)
      if (!transferToken) {
        Alert.alert('ข้อมูลไม่ถูกต้อง', 'ไม่พบรหัสโอนสิทธิ์ในข้อมูลที่สแกน')
        return
      }
      await handlePreviewTransfer(transferToken)
      return
    }

    const transferToken = extractTransferToken(trimmedPayload)
    const claimToken = extractClaimToken(trimmedPayload)

    if (!transferToken && !claimToken) {
      Alert.alert(
        'QR Code/Code ไม่ถูกต้อง',
        'ไม่พบรหัสคำเชิญผู้ดูแลหรือรหัสโอนสิทธิ์ในข้อมูลนี้',
      )
      return
    }

    if (transferToken) {
      const transferHandled = await handlePreviewTransfer(transferToken, {
        silentInvalidError: Boolean(claimToken),
      })
      if (transferHandled) {
        return
      }
    }

    if (claimToken) {
      await onClaimInvite(claimToken)
      return
    }

    Alert.alert(
      'ไม่สามารถตรวจสอบรหัสได้',
      'รหัสนี้ไม่สามารถใช้รับสิทธิ์ดูแลร่วมหรือรับโอนสิทธิ์ได้',
    )
  }

  const onBarcodeScanned = async (event: BarcodeScanningResult) => {
    if (isHandlingScanRef.current || claimInviteApi.loading) {
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

    try {
      // Only show error once per invalid payload
      if (lastErrorToken === payload) {
        await handleReceiveToken(payload)
      } else {
        setLastErrorToken(payload)
        await handleReceiveToken(payload)
      }
    } finally {
      isHandlingScanRef.current = false
    }
  }

  const handleManualSubmit = async () => {
    const trimmedCode = manualCode.trim()
    if (!trimmedCode) {
      Alert.alert('กรุณากรอกรหัส', 'กรุณากรอกรหัสคำเชิญหรือลิงก์')
      return
    }

    await handleReceiveToken(trimmedCode)
    setManualCode('')
    setShowManualInput(false)
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <View style={styles.container}>
        <Header
          title='รับสิทธิ์ด้วย QR/Code'
          goBack
          onBackPress={onBackPress}
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
                คุณต้องเข้าสู่ระบบก่อนรับสิทธิ์ดูแลร่วมหรือรับโอนสิทธิ์เจ้าของ
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
                เพื่อสแกน QR Code สำหรับรับสิทธิ์ดูแลร่วมและรับโอนสิทธิ์เจ้าของ
              </Text>

              <Button
                title='อนุญาตใช้งานกล้อง'
                onPress={onRequestPermission}
                style={styles.permissionButton}
              />
            </View>
          ) : (
            <>
              {showManualInput ? (
                <View style={styles.manualInputContainer}>
                  <Text style={styles.manualInputTitle}>กรอกรหัสด้วยตนเอง</Text>
                  <Text style={styles.manualInputDescription}>
                    รองรับทั้งลิงก์/รหัสเชิญผู้ดูแล และลิงก์/Transfer ID
                    สำหรับโอนสิทธิ์
                  </Text>
                  <TextInput
                    style={styles.manualInput}
                    placeholder='รหัสเชิญ / Transfer ID / ลิงก์'
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
                      loading={
                        claimInviteApi.loading || previewTransferApi.loading
                      }
                      disabled={
                        claimInviteApi.loading ||
                        previewTransferApi.loading ||
                        !manualCode.trim()
                      }
                      style={styles.manualInputButtonHalf}
                    />
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowManualInput(false)}
                    style={styles.switchModeButton}
                  >
                    <ScanLine
                      color={colors.primary.light}
                      size={iconSizes.md}
                    />
                    <Text style={styles.switchModeText}>
                      สลับไปสแกน QR Code
                    </Text>
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
                    วาง QR Code
                    ของคำเชิญดูแลร่วมหรือโอนสิทธิ์เจ้าของให้อยู่ในกรอบ
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
                      กรอกโค้ด/ลิงก์ด้วยตนเอง
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          )}
        </View>

        <ClaimedPetsModal
          visible={showClaimedPetsModal}
          addedPets={claimResult.added}
          alreadySharedPets={claimResult.alreadyShared}
          onClose={() => {
            setShowClaimedPetsModal(false)
            router.replace('/(tabs)/pet_profile')
          }}
        />

        <TransferPreviewModal
          visible={showPreviewModal}
          preview={previewTransfer}
          loading={acceptTransferApi.loading}
          onClose={() => {
            if (acceptTransferApi.loading) return
            setShowPreviewModal(false)
            setPreviewTransfer(null)
            setActiveTransferId(null)
          }}
          onConfirm={handleConfirmAcceptTransfer}
        />

        <TransferResultModal
          visible={showResultModal}
          message={resultMessage}
          transferredPets={transferredPets}
          onClose={() => {
            setShowResultModal(false)
            setResultMessage('')
            setTransferredPets([])
            setPreviewTransfer(null)
            setActiveTransferId(null)
            router.replace('/(tabs)/pet_profile')
          }}
        />
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    flex: 1,
    padding: spacing[4],
    justifyContent: 'center',
  },
  scannerCard: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    backgroundColor: colors.gray[900],
    borderWidth: 1,
    borderColor: colors.border.light,
    aspectRatio: 1,
  },
  camera: {
    flex: 1,
  },
  scanFrame: {
    position: 'absolute',
    top: '22%',
    left: '16%',
    right: '16%',
    bottom: '22%',
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.background.secondary,
    backgroundColor: 'transparent',
  },
  helperText: {
    marginTop: spacing[4],
    textAlign: 'center',
    color: colors.gray[600],
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    lineHeight: typography.lineHeight.normal,
  },
  stateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[6],
  },
  stateTitle: {
    fontSize: typography.fontSize['2xl'],
    color: colors.primary.DEFAULT,
    fontFamily: typography.fontFamily.bold,
    textAlign: 'center',
  },
  stateDescription: {
    fontSize: typography.fontSize.base,
    color: colors.gray[600],
    fontFamily: typography.fontFamily.regular,
    textAlign: 'center',
    lineHeight: typography.lineHeight.normal,
  },
  permissionButton: {
    width: '100%',
    marginTop: spacing[2],
    backgroundColor: colors.primary.light,
  },
  manualInputContainer: {
    gap: spacing[3],
  },
  manualInputTitle: {
    fontSize: typography.fontSize['2xl'],
    color: colors.primary.DEFAULT,
    fontFamily: typography.fontFamily.bold,
    textAlign: 'center',
  },
  manualInputDescription: {
    fontSize: typography.fontSize.base,
    color: colors.gray[600],
    fontFamily: typography.fontFamily.regular,
    textAlign: 'center',
    lineHeight: typography.lineHeight.normal,
  },
  manualInput: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    padding: spacing[3],
    fontSize: typography.fontSize.md,
    color: colors.gray[800],
    fontFamily: typography.fontFamily.regular,
    minHeight: 50,
    textAlignVertical: 'top',
    backgroundColor: colors.background.secondary,
  },
  manualInputButtons: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  manualInputButtonHalf: {
    flex: 1,
  },
  switchModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    marginTop: spacing[2],
  },
  switchModeText: {
    fontSize: typography.fontSize.md,
    color: colors.primary.light,
    fontFamily: typography.fontFamily.medium,
  },
})
