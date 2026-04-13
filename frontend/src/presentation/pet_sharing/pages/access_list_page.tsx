import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import AccessListSection from '../components/access_list_section'
import Header from '../../components/header_component'
import {
  IAccessListResponse,
  ICaregiver,
} from '@/src/domain/pet_sharing.domain'
import { petSharingService } from '@/src/utils/api/services/pet_sharing_service'
import {
  IPendingTransfer,
  ITransferTokenResponse,
} from '@/src/domain/pet_transfer.domain'
import { ApiError } from '@/src/utils/api/api_client'
import { petTransferService } from '@/src/utils/api/services/pet_transfer_service'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { useApi } from '@/src/utils/api/use_api'
import { unwrapData } from '@/src/utils/pet_sharing_utils'
import {
  TRANSFER_SCHEME,
  unwrapPendingTransfers,
} from '@/src/utils/pet_transfer_utils'
import { usePets } from '@/src/context/PetContext'
import PetInfoCard from '../../pet_profile/components/pet_info_card'
import Modal from '../../components/modal'
import {
  borderRadius,
  colors,
  spacing,
  typography,
} from '@/constants/design-system'
import PetSharingStateView from '../components/state_view'
import TransferQrModal from '../../pet_transfer/components/transfer_qr_modal'

const getInitiateTransferErrorMessage = (error: ApiError) => {
  const message = error.message?.toLowerCase() ?? ''
  const backendMessage =
    typeof error.errors?.[0]?.message === 'string'
      ? error.errors[0].message.toLowerCase()
      : ''
  const mergedMessage = `${message} ${backendMessage}`

  if (error.statusCode === 409 || mergedMessage.includes('pending transfer')) {
    return 'สัตว์เลี้ยงนี้มีคำขอโอนสิทธิ์ที่รอดำเนินการอยู่แล้ว กรุณายกเลิกหรือรอให้หมดอายุก่อน'
  }

  if (mergedMessage.includes('last accessible pet')) {
    return 'ไม่สามารถโอนสัตว์เลี้ยงตัวสุดท้ายได้ คุณต้องมีสัตว์เลี้ยงที่เข้าถึงได้อย่างน้อย 1 ตัว'
  }

  if (
    mergedMessage.includes('not found') ||
    mergedMessage.includes('not active')
  ) {
    return 'สัตว์เลี้ยงนี้ไม่พร้อมสำหรับการโอน (อาจไม่ใช่ของคุณ, ไม่ active หรือถูกลบแล้ว)'
  }

  return error.message || 'ไม่สามารถเริ่มคำขอโอนสิทธิ์ได้ กรุณาลองใหม่อีกครั้ง'
}

const getCancelTransferErrorMessage = (error: ApiError) => {
  const message = error.message?.toLowerCase() ?? ''
  const backendMessage =
    typeof error.errors?.[0]?.message === 'string'
      ? error.errors[0].message.toLowerCase()
      : ''
  const mergedMessage = `${message} ${backendMessage}`

  if (error.statusCode === 404) {
    return 'ไม่พบคำขอโอนสิทธิ์นี้ หรือคำขอไม่ได้เป็นของบัญชีคุณ'
  }

  if (mergedMessage.includes('only pending transfers can be cancelled')) {
    return 'ยกเลิกได้เฉพาะคำขอโอนสิทธิ์ที่อยู่ในสถานะรอดำเนินการเท่านั้น'
  }

  return error.message || 'ไม่สามารถยกเลิกคำขอโอนสิทธิ์ได้ กรุณาลองใหม่อีกครั้ง'
}

export default function AccessListPage() {
  const router = useRouter()
  const { petId } = useLocalSearchParams<{ petId?: string }>()
  const { activePets, deceasedPets, loading: petsLoading } = usePets()

  const [caregivers, setCaregivers] = useState<ICaregiver[]>([])
  const [selfAccessId, setSelfAccessId] = useState<string | null>(null)
  const [caregiverToRevoke, setCaregiverToRevoke] = useState<ICaregiver | null>(
    null,
  )
  const [pendingTransfers, setPendingTransfers] = useState<IPendingTransfer[]>(
    [],
  )
  const [showInitiateTransferModal, setShowInitiateTransferModal] =
    useState(false)
  const [showTransferQrModal, setShowTransferQrModal] = useState(false)
  const [showCancelTransferModal, setShowCancelTransferModal] = useState(false)
  const [transferToCancel, setTransferToCancel] =
    useState<IPendingTransfer | null>(null)
  const [selectedTransferForQr, setSelectedTransferForQr] =
    useState<IPendingTransfer | null>(null)

  const pendingTransfersRef = useRef<IPendingTransfer[]>([])
  const showTransferQrModalRef = useRef(false)

  const allPets = useMemo(
    () => [...activePets, ...deceasedPets],
    [activePets, deceasedPets],
  )

  const currentPet = useMemo(() => {
    if (!petId) return null
    return allPets.find((pet) => pet.id === petId) ?? null
  }, [allPets, petId])

  const isOwner = currentPet?.petRole === 'OWNER'
  const isDeceasedPet = currentPet?.status === 'DECEASED'
  const canManageAccess = isOwner && !isDeceasedPet

  const listAccessListApi = useApi(petSharingService.listAccessList, {
    showErrorAlert: false,
  })
  const revokeApi = useApi(petSharingService.revokeCaregiver, {
    showErrorAlert: false,
  })
  const listPendingTransfersApi = useApi(
    petTransferService.listPendingTransfers,
    {
      showErrorAlert: false,
    },
  )
  const initiateTransferApi = useApi(petTransferService.initiateTransfer, {
    showErrorAlert: false,
  })
  const cancelTransferApi = useApi(petTransferService.cancelTransfer, {
    showErrorAlert: false,
  })

  const loadAccessList = useCallback(async () => {
    if (!petId) return

    const accessRes = await listAccessListApi.execute(petId)
    if (accessRes.error) return

    const accessData = unwrapData<IAccessListResponse>(accessRes.data)
    setCaregivers(
      Array.isArray(accessData?.caregivers) ? accessData.caregivers : [],
    )
    setSelfAccessId(accessData?.selfAccessId ?? null)
  }, [listAccessListApi.execute, petId])

  const loadPendingTransfers = useCallback(async () => {
    const transferRes = await listPendingTransfersApi.execute()
    if (transferRes.error) return

    setPendingTransfers(unwrapPendingTransfers(transferRes.data))
  }, [listPendingTransfersApi.execute])

  useEffect(() => {
    pendingTransfersRef.current = pendingTransfers
  }, [pendingTransfers])

  useEffect(() => {
    showTransferQrModalRef.current = showTransferQrModal
  }, [showTransferQrModal])

  const syncRealtimeTransfers = useCallback(async () => {
    if (!petId) return

    try {
      const previousTransfers = pendingTransfersRef.current
      const previousCurrentTransfer = previousTransfers.find((transfer) =>
        transfer.pets.some((pet) => pet.id === petId),
      )

      const transferRes = await petTransferService.listPendingTransfers()
      const nextTransfers = unwrapPendingTransfers(transferRes)
      const nextCurrentTransfer = nextTransfers.find((transfer) =>
        transfer.pets.some((pet) => pet.id === petId),
      )

      setPendingTransfers(nextTransfers)

      if (
        previousCurrentTransfer &&
        !nextCurrentTransfer &&
        showTransferQrModalRef.current
      ) {
        setShowTransferQrModal(false)
        setSelectedTransferForQr(null)
        Alert.alert(
          'คำขอโอนสิทธิ์สิ้นสุดแล้ว',
          'คำขอโอนสิทธิ์นี้อาจถูกยืนยันโดยผู้รับโอน, ถูกยกเลิก หรือหมดอายุแล้ว',
        )
      }
    } catch {
      // Keep silent while polling in background.
    }
  }, [petId])

  useFocusEffect(
    useCallback(() => {
      void loadAccessList()
      void loadPendingTransfers()
    }, [loadAccessList, loadPendingTransfers]),
  )

  useFocusEffect(
    useCallback(() => {
      if (!petId) return

      void syncRealtimeTransfers()

      const pollInterval = setInterval(() => {
        void syncRealtimeTransfers()
      }, 3000)

      return () => {
        clearInterval(pollInterval)
      }
    }, [petId, syncRealtimeTransfers]),
  )

  const handleRevokeCaregiver = (caregiver: ICaregiver) => {
    setCaregiverToRevoke(caregiver)
  }

  const closeRevokeCaregiverModal = () => {
    if (revokeApi.loading) return
    setCaregiverToRevoke(null)
  }

  const handleConfirmRevokeCaregiver = async () => {
    if (!caregiverToRevoke || !petId) return

    const result = await revokeApi.execute(petId, caregiverToRevoke.accessId)
    if (result.error) {
      Alert.alert(
        'เกิดข้อผิดพลาด',
        'ไม่สามารถลบผู้ดูแลได้ กรุณาลองใหม่อีกครั้ง',
      )
      return
    }

    setCaregivers((prev) =>
      prev.filter((item) => item.accessId !== caregiverToRevoke.accessId),
    )
    setCaregiverToRevoke(null)
  }

  const currentPetPendingTransfer = useMemo(() => {
    if (!petId) return null

    return (
      pendingTransfers.find((transfer) =>
        transfer.pets.some((pet) => pet.id === petId),
      ) ?? null
    )
  }, [pendingTransfers, petId])

  const transferClaimLink = currentPetPendingTransfer
    ? `${TRANSFER_SCHEME}/${currentPetPendingTransfer.transferId}`
    : TRANSFER_SCHEME

  const handleOpenInitiateTransferModal = () => {
    if (!isOwner || isDeceasedPet || !petId) return
    setShowInitiateTransferModal(true)
  }

  const closeInitiateTransferModal = () => {
    if (initiateTransferApi.loading) return
    setShowInitiateTransferModal(false)
  }

  const handleConfirmInitiateTransfer = async () => {
    if (!petId) return

    const result = await initiateTransferApi.execute([petId])
    if (result.error) {
      Alert.alert(
        'เริ่มโอนสิทธิ์ไม่สำเร็จ',
        getInitiateTransferErrorMessage(result.error as ApiError),
      )
      return
    }

    const token = unwrapData<ITransferTokenResponse>(result.data)
    if (!token?.transferId) {
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่พบข้อมูลคำขอโอนสิทธิ์ที่สร้างใหม่')
      return
    }

    const createdTransfer: IPendingTransfer = {
      transferId: token.transferId,
      expiresAt: token.expiresAt,
      createdAt: token.createdAt,
      pets: [
        {
          id: petId,
          petName: currentPet?.pet_name || 'สัตว์เลี้ยงนี้',
        },
      ],
    }

    setPendingTransfers((prev) => [
      createdTransfer,
      ...prev.filter((item) => item.transferId !== createdTransfer.transferId),
    ])
    setShowInitiateTransferModal(false)
    setSelectedTransferForQr(createdTransfer)
    setShowTransferQrModal(true)
  }

  const handleOpenTransferQr = () => {
    if (!currentPetPendingTransfer) return
    setSelectedTransferForQr(currentPetPendingTransfer)
    setShowTransferQrModal(true)
  }

  const closeTransferQrModal = () => {
    setShowTransferQrModal(false)
    setSelectedTransferForQr(null)
  }

  const handleShareTransfer = async () => {
    if (!currentPetPendingTransfer) return

    try {
      await Share.share({
        message:
          `🐾 คำขอโอนสิทธิ์สัตว์เลี้ยง\n\n` +
          `Transfer ID:\n${currentPetPendingTransfer.transferId}\n\n` +
          `ผู้รับโอนสามารถใช้รหัสนี้ในแอปเพื่อดูรายละเอียดและยืนยันรับโอนสิทธิ์`,
      })
    } catch {
      // User can close native share sheet.
    }
  }

  const handleOpenCancelTransferModal = () => {
    if (!currentPetPendingTransfer) return
    setTransferToCancel(currentPetPendingTransfer)
    setShowCancelTransferModal(true)
  }

  const closeCancelTransferModal = () => {
    if (cancelTransferApi.loading) return
    setShowCancelTransferModal(false)
    setTransferToCancel(null)
  }

  const handleConfirmCancelTransfer = async () => {
    if (!transferToCancel) return

    const result = await cancelTransferApi.execute(transferToCancel.transferId)
    if (result.error) {
      Alert.alert(
        'ยกเลิกไม่สำเร็จ',
        getCancelTransferErrorMessage(result.error as ApiError),
      )
      return
    }

    setPendingTransfers((prev) =>
      prev.filter((item) => item.transferId !== transferToCancel.transferId),
    )
    setTransferToCancel(null)
    setShowCancelTransferModal(false)
    setShowTransferQrModal(false)
  }

  const handleOpenReceiveTransfer = () => {
    router.push('/(tabs)/scan_pet_transfer')
  }

  const isLoading =
    petsLoading || listAccessListApi.loading || listPendingTransfersApi.loading

  return (
    <View style={styles.container}>
      <Header
        title='จัดการผู้ดูแลร่วม'
        goBack
        onBackPress={() => router.push('/(tabs)/pet_profile')}
      />

      {!petId ? (
        <PetSharingStateView
          title='ไม่พบสัตว์เลี้ยง'
          subtitle='กรุณากลับไปเลือกสัตว์เลี้ยงอีกครั้ง'
        />
      ) : isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color={colors.primary.light} />
        </View>
      ) : !currentPet ? (
        <PetSharingStateView
          title='ไม่พบข้อมูลสัตว์เลี้ยง'
          subtitle='สัตว์เลี้ยงที่เลือกอาจถูกลบหรือไม่สามารถเข้าถึงได้'
        />
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.petInfoSection}>
            <PetInfoCard data={currentPet} readOnly />
          </View>

          <AccessListSection
            caregivers={caregivers}
            revoking={revokeApi.loading}
            onRevoke={handleRevokeCaregiver}
            isOwner={Boolean(isOwner)}
            canManageAccess={canManageAccess}
            selfAccessId={selfAccessId ?? undefined}
            isDeceasedPet={isDeceasedPet}
            pendingTransfer={currentPetPendingTransfer}
            transferClaimLink={transferClaimLink}
            initiatingTransfer={initiateTransferApi.loading}
            cancelingTransfer={cancelTransferApi.loading}
            onInitiateTransfer={handleOpenInitiateTransferModal}
            onOpenTransferQr={handleOpenTransferQr}
            onShareTransfer={handleShareTransfer}
            onCancelTransfer={handleOpenCancelTransferModal}
            onOpenReceiveTransfer={handleOpenReceiveTransfer}
          />

          {isDeceasedPet && (
            <View style={styles.deceasedNote}>
              <Text style={styles.deceasedNoteText}>
                สัตว์เลี้ยงนี้ถูกทำเครื่องหมายว่าเสียชีวิตแล้ว
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      <Modal
        visible={Boolean(caregiverToRevoke)}
        onClose={closeRevokeCaregiverModal}
        variant='confirmation'
        icon='trash'
        title='ยกเลิกสิทธิ์ผู้ดูแล'
        message={`ต้องการลบ "${caregiverToRevoke?.alias ?? ''}" ออกจากรายชื่อผู้ดูแลหรือไม่?`}
        confirmText='ลบผู้ดูแล'
        cancelText='ไม่'
        confirmVariant='error'
        onConfirm={handleConfirmRevokeCaregiver}
        isLoading={revokeApi.loading}
      />

      <Modal
        visible={showInitiateTransferModal}
        onClose={closeInitiateTransferModal}
        variant='confirmation'
        icon='warning'
        title='เริ่มโอนสิทธิ์เจ้าของ'
        message='เมื่อผู้รับโอนยืนยันสำเร็จ สิทธิ์เข้าถึงของเจ้าของเดิมจะสิ้นสุดทันที คุณต้องการเริ่มคำขอโอนสิทธิ์นี้หรือไม่?'
        confirmText='เริ่มโอนสิทธิ์'
        cancelText='ยกเลิก'
        onConfirm={handleConfirmInitiateTransfer}
        isLoading={initiateTransferApi.loading}
      />

      <Modal
        visible={showCancelTransferModal}
        onClose={closeCancelTransferModal}
        variant='confirmation'
        icon='warning'
        title='ยกเลิกคำขอโอนสิทธิ์'
        message='คุณต้องการยกเลิกคำขอโอนสิทธิ์นี้หรือไม่? ผู้รับโอนจะไม่สามารถใช้รหัสเดิมได้อีก'
        confirmText='ยืนยันยกเลิก'
        cancelText='กลับ'
        confirmVariant='error'
        onConfirm={handleConfirmCancelTransfer}
        isLoading={cancelTransferApi.loading}
      />

      <TransferQrModal
        visible={showTransferQrModal}
        pendingTransfer={selectedTransferForQr}
        claimLink={
          selectedTransferForQr
            ? `${TRANSFER_SCHEME}/${selectedTransferForQr.transferId}`
            : TRANSFER_SCHEME
        }
        onClose={closeTransferQrModal}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[6],
  },
  petInfoSection: {
    marginBottom: spacing[4],
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing[3],
  },
  deceasedNote: {
    marginTop: spacing[4],
    padding: spacing[3],
    backgroundColor: colors.gray[100] || '#F3F4F6',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray[300] || '#D1D5DB',
  },
  deceasedNoteText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[700] || '#374151',
    fontFamily: typography.fontFamily.regular,
    textAlign: 'center',
    lineHeight: typography.lineHeight.relaxed,
  },
})
