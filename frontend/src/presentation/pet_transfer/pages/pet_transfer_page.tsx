import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, ScrollView, Share, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'

import {
  borderRadius,
  colors,
  spacing,
  typography,
} from '@/constants/design-system'
import { usePets } from '@/src/context/PetContext'
import {
  IPendingTransfer,
  ITransferTokenResponse,
} from '@/src/domain/pet_transfer.domain'
import { ApiError } from '@/src/utils/api/api_client'
import { petTransferService } from '@/src/utils/api/services/pet_transfer_service'
import { useApi } from '@/src/utils/api/use_api'
import { unwrapData } from '@/src/utils/pet_sharing_utils'
import {
  TRANSFER_SCHEME,
  unwrapPendingTransfers,
} from '@/src/utils/pet_transfer_utils'

import Header from '../../components/header_component'
import Modal from '../../components/modal'
import QrModal from '../../pet_sharing/components/qr_modal'
import OwnerTransferCompletedModal from '../components/owner_transfer_completed_modal'
import TransferOwnerSection from '../components/transfer_owner_section'
import TransferPetPickerModal from '../components/transfer_pet_picker_modal'

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

export default function PetTransferPage() {
  const router = useRouter()
  const { activePets, refreshPets } = usePets()

  const [pendingTransfers, setPendingTransfers] = useState<IPendingTransfer[]>(
    [],
  )
  const [showTransferPetPickerModal, setShowTransferPetPickerModal] =
    useState(false)
  const [selectedTransferPetIds, setSelectedTransferPetIds] = useState<
    string[]
  >([])
  const [showTransferQrModal, setShowTransferQrModal] = useState(false)
  const [showCancelTransferModal, setShowCancelTransferModal] = useState(false)
  const [transferToCancel, setTransferToCancel] =
    useState<IPendingTransfer | null>(null)
  const [selectedTransferForQr, setSelectedTransferForQr] =
    useState<IPendingTransfer | null>(null)
  const [showOwnerCompletionModal, setShowOwnerCompletionModal] =
    useState(false)
  const [ownerCompletedTransfer, setOwnerCompletedTransfer] =
    useState<IPendingTransfer | null>(null)

  const pendingTransfersRef = useRef<IPendingTransfer[]>([])
  const cancelledTransferIdsRef = useRef<Set<string>>(new Set())

  const ownerTransferablePets = useMemo(
    () => activePets.filter((pet) => pet.petRole === 'OWNER'),
    [activePets],
  )

  const pendingTransferPetIds = useMemo(
    () =>
      Array.from(
        new Set(
          pendingTransfers.flatMap((transfer) =>
            transfer.pets.map((pet) => pet.id),
          ),
        ),
      ),
    [pendingTransfers],
  )

  const activePendingTransfer = useMemo(() => {
    if (pendingTransfers.length === 0) {
      return null
    }

    return [...pendingTransfers].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })[0]
  }, [pendingTransfers])

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

  const loadPendingTransfers = useCallback(async (): Promise<
    IPendingTransfer[] | null
  > => {
    const transferRes = await listPendingTransfersApi.execute()
    if (transferRes.error) return null

    const nextTransfers = unwrapPendingTransfers(transferRes.data)
    setPendingTransfers(nextTransfers)
    return nextTransfers
  }, [listPendingTransfersApi.execute])

  useEffect(() => {
    pendingTransfersRef.current = pendingTransfers
  }, [pendingTransfers])

  const syncRealtimeTransfers = useCallback(async () => {
    try {
      const previousTransfers = pendingTransfersRef.current
      const previousIds = new Set(
        previousTransfers.map((item) => item.transferId),
      )

      const transferRes = await petTransferService.listPendingTransfers()
      const nextTransfers = unwrapPendingTransfers(transferRes)
      const nextIds = new Set(nextTransfers.map((item) => item.transferId))

      setPendingTransfers(nextTransfers)

      const disappearedTransfers = previousTransfers.filter(
        (item) => !nextIds.has(item.transferId),
      )

      if (disappearedTransfers.length === 0) {
        return
      }

      const completedTransfer = disappearedTransfers.find((item) => {
        if (!previousIds.has(item.transferId)) {
          return false
        }

        if (cancelledTransferIdsRef.current.has(item.transferId)) {
          cancelledTransferIdsRef.current.delete(item.transferId)
          return false
        }

        const isExpired = new Date(item.expiresAt).getTime() <= Date.now()
        return !isExpired
      })

      if (!completedTransfer) {
        return
      }

      if (
        selectedTransferForQr &&
        selectedTransferForQr.transferId === completedTransfer.transferId
      ) {
        setShowTransferQrModal(false)
        setSelectedTransferForQr(null)
      }

      await refreshPets()
      setOwnerCompletedTransfer(completedTransfer)
      setShowOwnerCompletionModal(true)
    } catch {
      // Keep silent while polling in background.
    }
  }, [refreshPets, selectedTransferForQr])

  useFocusEffect(
    useCallback(() => {
      void loadPendingTransfers()
    }, [loadPendingTransfers]),
  )

  useFocusEffect(
    useCallback(() => {
      if (pendingTransfers.length === 0) return

      void syncRealtimeTransfers()

      const pollInterval = setInterval(() => {
        void syncRealtimeTransfers()
      }, 3000)

      return () => {
        clearInterval(pollInterval)
      }
    }, [pendingTransfers.length, syncRealtimeTransfers]),
  )

  const isPetPendingTransfer = useCallback(
    (targetPetId: string) => pendingTransferPetIds.includes(targetPetId),
    [pendingTransferPetIds],
  )

  const handleOpenInitiateTransferModal = async () => {
    if (ownerTransferablePets.length === 0) {
      Alert.alert(
        'ยังเริ่มโอนไม่ได้',
        'ไม่พบสัตว์เลี้ยงที่คุณเป็นเจ้าของและพร้อมสำหรับการโอนสิทธิ์',
      )
      return
    }

    const latestTransfers = await loadPendingTransfers()

    if (!latestTransfers) {
      Alert.alert(
        'ไม่สามารถตรวจสอบคำขอโอนสิทธิ์ได้',
        'กรุณาลองใหม่อีกครั้งก่อนเริ่มโอนสิทธิ์',
      )
      return
    }

    const latestPendingPetIdSet = new Set(
      latestTransfers.flatMap((transfer) => transfer.pets.map((pet) => pet.id)),
    )

    const selectablePets = ownerTransferablePets.filter(
      (pet) => !latestPendingPetIdSet.has(pet.id),
    )

    if (selectablePets.length === 0) {
      Alert.alert(
        'ยังเริ่มโอนไม่ได้',
        'สัตว์เลี้ยงที่คุณเป็นเจ้าของมีคำขอโอนค้างอยู่ทั้งหมด กรุณารอให้คำขอเดิมเสร็จสิ้นก่อน',
      )
      return
    }

    setSelectedTransferPetIds([selectablePets[0].id])
    setShowTransferPetPickerModal(true)
  }

  const closeTransferPetPickerModal = () => {
    if (initiateTransferApi.loading) return
    setShowTransferPetPickerModal(false)
  }

  const handleToggleTransferPet = (targetPetId: string) => {
    if (isPetPendingTransfer(targetPetId)) return

    setSelectedTransferPetIds((prev) => {
      if (prev.includes(targetPetId)) {
        return prev.filter((id) => id !== targetPetId)
      }

      return [...prev, targetPetId]
    })
  }

  const handleToggleSelectAllTransferPets = (selectAll: boolean) => {
    if (!selectAll) {
      setSelectedTransferPetIds([])
      return
    }

    setSelectedTransferPetIds(
      ownerTransferablePets
        .filter((pet) => !isPetPendingTransfer(pet.id))
        .map((pet) => pet.id),
    )
  }

  const handleConfirmInitiateTransfer = async () => {
    if (selectedTransferPetIds.length === 0) {
      Alert.alert(
        'กรุณาเลือกสัตว์เลี้ยง',
        'กรุณาเลือกสัตว์เลี้ยงอย่างน้อย 1 ตัว',
      )
      return
    }

    const result = await initiateTransferApi.execute(selectedTransferPetIds)
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
      pets: selectedTransferPetIds.map((selectedId) => {
        const matchedPet = ownerTransferablePets.find(
          (pet) => pet.id === selectedId,
        )
        return {
          id: selectedId,
          petName: matchedPet?.pet_name || 'สัตว์เลี้ยงนี้',
        }
      }),
    }

    setPendingTransfers((prev) => [
      createdTransfer,
      ...prev.filter((item) => item.transferId !== createdTransfer.transferId),
    ])
    setShowTransferPetPickerModal(false)
    setSelectedTransferPetIds([])
    setSelectedTransferForQr(createdTransfer)
    setShowTransferQrModal(true)
  }

  const handleOpenTransferQr = () => {
    if (!activePendingTransfer) return
    setSelectedTransferForQr(activePendingTransfer)
    setShowTransferQrModal(true)
  }

  const closeTransferQrModal = () => {
    setShowTransferQrModal(false)
    setSelectedTransferForQr(null)
  }

  const handleShareTransfer = async () => {
    if (!activePendingTransfer) return

    try {
      await Share.share({
        message:
          `🐾 คำขอโอนสิทธิ์สัตว์เลี้ยง\n\n` +
          `Transfer ID:\n${activePendingTransfer.transferId}\n\n` +
          `ผู้รับโอนสามารถใช้รหัสนี้ในแอปเพื่อดูรายละเอียดและยืนยันรับโอนสิทธิ์`,
      })
    } catch {
      // User can close native share sheet.
    }
  }

  const handleOpenCancelTransferModal = () => {
    if (!activePendingTransfer) return
    setTransferToCancel(activePendingTransfer)
    setShowCancelTransferModal(true)
  }

  const closeCancelTransferModal = () => {
    if (cancelTransferApi.loading) return
    setShowCancelTransferModal(false)
    setTransferToCancel(null)
  }

  const handleConfirmCancelTransfer = async () => {
    if (!transferToCancel) return

    cancelledTransferIdsRef.current.add(transferToCancel.transferId)

    const result = await cancelTransferApi.execute(transferToCancel.transferId)
    if (result.error) {
      cancelledTransferIdsRef.current.delete(transferToCancel.transferId)
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

  const handleCloseOwnerCompletionModal = () => {
    setShowOwnerCompletionModal(false)
    setOwnerCompletedTransfer(null)
    router.push('/(tabs)/pet_profile')
  }

  const transferClaimLink = activePendingTransfer
    ? `${TRANSFER_SCHEME}/${activePendingTransfer.transferId}`
    : TRANSFER_SCHEME

  return (
    <View style={styles.container}>
      <Header
        title='โอนสิทธิ์เจ้าของ'
        goBack
        onBackPress={() => router.push('/(tabs)/pet_profile')}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
      >
        <TransferOwnerSection
          isOwner={ownerTransferablePets.length > 0}
          isDeceasedPet={false}
          pendingTransfer={activePendingTransfer}
          claimLink={transferClaimLink}
          initiating={initiateTransferApi.loading}
          canceling={cancelTransferApi.loading}
          onInitiateTransfer={handleOpenInitiateTransferModal}
          onOpenQr={handleOpenTransferQr}
          onShare={handleShareTransfer}
          onCancel={handleOpenCancelTransferModal}
          onOpenReceiveTransfer={handleOpenReceiveTransfer}
        />

        <View style={styles.noteBox}>
          <View style={styles.noteDot} />
          <View style={styles.noteContent}>
            <Text style={styles.noteTitle}>ข้อควรรู้ก่อนโอนสิทธิ์</Text>
            <Text style={styles.noteText}>
              เมื่อโอนสำเร็จ คุณจะสูญเสียสิทธิ์เจ้าของทันที
              และต้องรอให้เจ้าของใหม่เชิญกลับจึงจะเข้าถึงข้อมูลสัตว์เลี้ยงตัวนั้นได้อีก
            </Text>
          </View>
        </View>
      </ScrollView>

      <TransferPetPickerModal
        visible={showTransferPetPickerModal}
        pets={ownerTransferablePets}
        selectedPetIds={selectedTransferPetIds}
        pendingPetIds={pendingTransferPetIds}
        loading={initiateTransferApi.loading}
        onTogglePet={handleToggleTransferPet}
        onToggleSelectAll={handleToggleSelectAllTransferPets}
        onClose={closeTransferPetPickerModal}
        onConfirm={handleConfirmInitiateTransfer}
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

      <QrModal
        visible={showTransferQrModal}
        claimLink={
          selectedTransferForQr
            ? `${TRANSFER_SCHEME}/${selectedTransferForQr.transferId}`
            : TRANSFER_SCHEME
        }
        expiresAt={selectedTransferForQr?.expiresAt ?? null}
        mode='transfer'
        onClose={closeTransferQrModal}
      />

      <OwnerTransferCompletedModal
        visible={showOwnerCompletionModal}
        completedTransfer={ownerCompletedTransfer}
        onClose={handleCloseOwnerCompletionModal}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[6],
  },
  noteBox: {
    marginTop: spacing[4],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.info.DEFAULT,
    backgroundColor: colors.info.light,
    padding: spacing[3],
    flexDirection: 'row',
    gap: spacing[2],
    alignItems: 'flex-start',
  },
  noteDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.info.dark,
    marginTop: 6,
  },
  noteContent: {
    flex: 1,
  },
  noteTitle: {
    fontSize: typography.fontSize.base,
    color: colors.info.dark,
    fontFamily: typography.fontFamily.bold,
    marginBottom: spacing[1],
  },
  noteText: {
    fontSize: typography.fontSize.sm,
    color: colors.info.dark,
    fontFamily: typography.fontFamily.regular,
    lineHeight: typography.lineHeight.relaxed,
  },
})
