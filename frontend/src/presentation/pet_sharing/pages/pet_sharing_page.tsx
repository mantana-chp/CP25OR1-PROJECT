import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { Info, UserPlus } from 'lucide-react-native'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Share,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native'

import {
  borderRadius,
  colors,
  iconSizes,
  spacing,
  typography
} from '@/constants/design-system'
import { ApiError } from '@/src/utils/api/api_client'
import {
  ICaregiver,
  IGenerateInviteResponse,
  IPendingInvite,
  petSharingService
} from '@/src/utils/api/services/pet_sharing_service'
import { useApi } from '@/src/utils/api/use_api'

import Button from '../../components/button'
import Header from '../../components/header_component'
import Modal from '../../components/modal'
import AccessListSection from '../components/access_list_section'
import AliasModal from '../components/alias_modal'
import EmptyState from '../components/empty_state'
import QrModal from '../components/qr_modal'
import PetSharingStateView from '../components/state_view'
import { CLAIM_SCHEME, unwrapData } from '../../../utils/pet_sharing_utils'
import PendingInviteCard from '../components/pending_invite_card'

export default function PetSharingPage() {
  const router = useRouter()
  const { petId: rawPetId } = useLocalSearchParams<{
    petId?: string | string[]
  }>()
  const petId = Array.isArray(rawPetId) ? rawPetId[0] : rawPetId

  const [caregivers, setCaregivers] = useState<ICaregiver[]>([])
  const [pendingInvite, setPendingInvite] = useState<IPendingInvite | null>(
    null
  )
  const [isOwner, setIsOwner] = useState(true)
  const [showAliasModal, setShowAliasModal] = useState(false)
  const [aliasInput, setAliasInput] = useState('')
  const [showQrModal, setShowQrModal] = useState(false)
  const [showCancelInviteModal, setShowCancelInviteModal] = useState(false)
  const [caregiverToRevoke, setCaregiverToRevoke] = useState<ICaregiver | null>(
    null
  )
  const isRealtimeSyncingRef = useRef(false)
  const caregiversRef = useRef<ICaregiver[]>([])
  const pendingInviteRef = useRef<IPendingInvite | null>(null)
  const showQrModalRef = useRef(false)

  const listCaregiversApi = useApi(petSharingService.listCaregivers, {
    showErrorAlert: false
  })
  const listInvitesApi = useApi(petSharingService.listPendingInvites, {
    showErrorAlert: false
  })
  const generateInviteApi = useApi(petSharingService.generateInvite, {
    showErrorAlert: false
  })
  const revokeApi = useApi(petSharingService.revokeCaregiver, {
    showErrorAlert: false
  })
  const cancelInviteApi = useApi(petSharingService.cancelInvite, {
    showErrorAlert: false
  })

  const loadData = useCallback(async () => {
    if (!petId) return

    const [caregiversRes, invitesRes] = await Promise.all([
      listCaregiversApi.execute(petId),
      listInvitesApi.execute()
    ])

    if (caregiversRes.error) {
      const statusCode = (caregiversRes.error as ApiError).statusCode
      if (statusCode === 403) {
        setIsOwner(false)
        setCaregivers([])
        setPendingInvite(null)
        return
      }
    } else {
      setIsOwner(true)
      const caregiversData = unwrapData<ICaregiver[]>(caregiversRes.data)
      setCaregivers(Array.isArray(caregiversData) ? caregiversData : [])
    }

    if (!invitesRes.error) {
      const allInvites = unwrapData<IPendingInvite[]>(invitesRes.data)
      const invites = Array.isArray(allInvites) ? allInvites : []
      const inviteForPet = invites.find((invite) =>
        invite.pets.some((pet) => pet.id === petId)
      )
      setPendingInvite(inviteForPet ?? null)
    }
  }, [petId, listCaregiversApi.execute, listInvitesApi.execute])

  useEffect(() => {
    caregiversRef.current = caregivers
  }, [caregivers])

  useEffect(() => {
    pendingInviteRef.current = pendingInvite
  }, [pendingInvite])

  useEffect(() => {
    showQrModalRef.current = showQrModal
  }, [showQrModal])

  const syncRealtimeData = useCallback(async () => {
    if (!petId || !isOwner) return
    if (isRealtimeSyncingRef.current) return

    isRealtimeSyncingRef.current = true

    try {
      const previousCaregivers = caregiversRef.current
      const previousPendingInvite = pendingInviteRef.current

      const [caregiversRes, invitesRes] = await Promise.all([
        petSharingService.listCaregivers(petId),
        petSharingService.listPendingInvites()
      ])

      const caregiversData = unwrapData<ICaregiver[]>(caregiversRes)
      const nextCaregivers = Array.isArray(caregiversData) ? caregiversData : []

      const allInvites = unwrapData<IPendingInvite[]>(invitesRes)
      const invites = Array.isArray(allInvites) ? allInvites : []
      const nextPendingInvite =
        invites.find((invite) => invite.pets.some((pet) => pet.id === petId)) ??
        null

      setCaregivers(nextCaregivers)
      setPendingInvite(nextPendingInvite)

      const hadPendingInvite = Boolean(previousPendingInvite)
      const isInviteAcceptedNow = hadPendingInvite && !nextPendingInvite

      if (isInviteAcceptedNow) {
        const previousAccessIds = new Set(
          previousCaregivers.map((caregiver) => caregiver.accessId)
        )
        const newlyAcceptedCaregivers = nextCaregivers.filter(
          (caregiver) => !previousAccessIds.has(caregiver.accessId)
        )

        if (newlyAcceptedCaregivers.length > 0) {
          if (showQrModalRef.current) {
            setShowQrModal(false)
          }

          Alert.alert(
            'ผู้ดูแลรับคำเชิญแล้ว',
            `"${newlyAcceptedCaregivers[0].alias}" เข้าร่วมเป็นผู้ดูแลร่วมเรียบร้อยแล้ว`
          )
        }
      }
    } catch (error) {
      const apiError = error as ApiError
      if (apiError?.statusCode === 403) {
        setIsOwner(false)
        setCaregivers([])
        setPendingInvite(null)
      }
    } finally {
      isRealtimeSyncingRef.current = false
    }
  }, [petId, isOwner])

  useFocusEffect(
    useCallback(() => {
      void loadData()
    }, [loadData])
  )

  useFocusEffect(
    useCallback(() => {
      if (!petId || !isOwner || !pendingInvite) return

      void syncRealtimeData()

      const pollInterval = setInterval(() => {
        void syncRealtimeData()
      }, 3000)

      return () => {
        clearInterval(pollInterval)
      }
    }, [petId, isOwner, pendingInvite?.inviteId, syncRealtimeData])
  )

  const openCreateInviteModal = () => {
    setAliasInput('')
    setShowAliasModal(true)
  }

  const handleBackPress = () => {
    router.push('/(tabs)/pet_profile')
  }

  const handleInfo = () => {
    Alert.alert(
      'การจัดการผู้ดูแลร่วม',
      'เชิญเพื่อนหรือครอบครัวมาช่วยดูแลสัตว์เลี้ยงของคุณ ผู้ดูแลร่วมสามารถดูข้อมูลสัตว์เลี้ยงได้ และเฉพาะเจ้าของเท่านั้นที่สามารถสร้างคำเชิญหรือยกเลิกสิทธิ์ผู้ดูแลได้'
    )
  }

  const handleGenerateInvite = async () => {
    if (!petId) return

    const alias = aliasInput.trim()
    if (!alias) {
      Alert.alert('กรุณาระบุชื่อ', 'กรุณากรอกชื่อผู้ดูแลก่อนสร้างรหัสเชิญ')
      return
    }

    setShowAliasModal(false)

    const result = await generateInviteApi.execute([petId], alias)
    if (result.error) {
      Alert.alert(
        'เกิดข้อผิดพลาด',
        'ไม่สามารถสร้างรหัสเชิญได้ กรุณาลองใหม่อีกครั้ง'
      )
      return
    }

    const invite = unwrapData<IGenerateInviteResponse>(result.data)
    if (!invite?.inviteId) {
      Alert.alert('เกิดข้อผิดพลาด', 'ข้อมูลรหัสเชิญไม่ถูกต้อง กรุณาลองใหม่')
      return
    }

    setPendingInvite({
      inviteId: invite.inviteId,
      alias: invite.alias,
      expiresAt: invite.expiresAt,
      createdAt: new Date().toISOString(),
      pets: [{ id: petId, pet_name: '' }]
    })
  }

  const handleShareInvite = async () => {
    if (!pendingInvite) return

    const claimLink = `${CLAIM_SCHEME}/${pendingInvite.inviteId}`
    try {
      await Share.share({
        message: `คุณได้รับคำเชิญเป็นผู้ดูแลสัตว์เลี้ยง\nเปิดลิงก์หรือสแกน QR ได้ที่:\n${claimLink}`,
        url: claimLink
      })
    } catch {
      // User can close native share sheet; no action needed.
    }
  }

  const handleCancelInvite = () => {
    if (!pendingInvite) return
    setShowCancelInviteModal(true)
  }

  const closeCancelInviteModal = () => {
    if (cancelInviteApi.loading) return
    setShowCancelInviteModal(false)
  }

  const handleConfirmCancelInvite = async () => {
    if (!pendingInvite) return

    const result = await cancelInviteApi.execute(pendingInvite.inviteId)
    if (result.error) {
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถยกเลิกรหัสเชิญได้')
      return
    }

    setPendingInvite(null)
    setShowCancelInviteModal(false)
  }

  const handleRevokeCaregiver = (caregiver: ICaregiver) => {
    if (!petId) return
    setCaregiverToRevoke(caregiver)
  }

  const closeRevokeCaregiverModal = () => {
    if (revokeApi.loading) return
    setCaregiverToRevoke(null)
  }

  const handleConfirmRevokeCaregiver = async () => {
    if (!petId || !caregiverToRevoke) return

    const targetCaregiver = caregiverToRevoke
    const result = await revokeApi.execute(petId, targetCaregiver.accessId)
    if (result.error) {
      Alert.alert(
        'เกิดข้อผิดพลาด',
        'ไม่สามารถลบผู้ดูแลได้ กรุณาลองใหม่อีกครั้ง'
      )
      return
    }

    setCaregivers((prev) =>
      prev.filter((item) => item.accessId !== targetCaregiver.accessId)
    )
    setCaregiverToRevoke(null)
  }

  const isLoading = listCaregiversApi.loading || listInvitesApi.loading
  const claimLink = pendingInvite
    ? `${CLAIM_SCHEME}/${pendingInvite.inviteId}`
    : ''

  const headerRight = (
    <TouchableOpacity onPress={handleInfo} style={styles.infoButton}>
      <Info size={iconSizes.xl} color={colors.background.secondary} />
    </TouchableOpacity>
  )

  if (!petId) {
    return (
      <View style={styles.container}>
        <Header title="จัดการผู้ดูแล" goBack rightChildren={headerRight} />
        <PetSharingStateView
          title="ไม่พบสัตว์เลี้ยง"
          subtitle="กรุณากลับไปเลือกสัตว์เลี้ยงอีกครั้ง"
        />
      </View>
    )
  }

  if (!isOwner) {
    return (
      <View style={styles.container}>
        <Header title="จัดการผู้ดูแล" goBack rightChildren={headerRight} />
        <PetSharingStateView
          title="คุณไม่มีสิทธิ์เข้าถึง"
          subtitle="เฉพาะเจ้าของสัตว์เลี้ยงเท่านั้นที่สามารถจัดการผู้ดูแลร่วมได้"
        />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Header
        title="จัดการผู้ดูแล"
        rightChildren={headerRight}
        onBackPress={handleBackPress}
        goBack
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.light} />
        </View>
      ) : caregivers.length === 0 && !pendingInvite ? (
        <EmptyState onCreateInvite={openCreateInviteModal} />
      ) : (
        <>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContentContainer}
            showsVerticalScrollIndicator={false}
          >
            <AccessListSection
              caregivers={caregivers}
              revoking={revokeApi.loading}
              onRevoke={handleRevokeCaregiver}
            />

            {pendingInvite ? (
              <PendingInviteCard
                pendingInvite={pendingInvite}
                claimLink={claimLink}
                canceling={cancelInviteApi.loading}
                onOpenQr={() => setShowQrModal(true)}
                onShare={handleShareInvite}
                onCancel={handleCancelInvite}
              />
            ) : null}
          </ScrollView>

          <View style={styles.stickyFooter}>
            <Button
              title="สร้างรหัสเชิญใหม่"
              onPress={openCreateInviteModal}
              icon={
                <UserPlus
                  size={iconSizes.lg}
                  color={colors.background.secondary}
                />
              }
              loading={generateInviteApi.loading}
              disabled={generateInviteApi.loading}
              style={[
                styles.createInviteButton,
                generateInviteApi.loading && styles.createInviteButtonDisabled
              ]}
              textStyle={styles.createInviteButtonText}
            />
          </View>
        </>
      )}

      <AliasModal
        visible={showAliasModal}
        aliasInput={aliasInput}
        onChangeAlias={setAliasInput}
        onClose={() => setShowAliasModal(false)}
        onConfirm={handleGenerateInvite}
      />

      <QrModal
        visible={showQrModal}
        pendingInvite={pendingInvite}
        claimLink={claimLink}
        onClose={() => setShowQrModal(false)}
        onShare={handleShareInvite}
      />

      <Modal
        visible={showCancelInviteModal}
        onClose={closeCancelInviteModal}
        variant="confirmation"
        icon="warning"
        title="ยกเลิกรหัสเชิญ"
        message="คุณต้องการยกเลิกรหัสเชิญนี้ใช่หรือไม่?"
        confirmText="ยกเลิกคำเชิญ"
        cancelText="ไม่"
        confirmVariant="error"
        onConfirm={handleConfirmCancelInvite}
        isLoading={cancelInviteApi.loading}
      />

      <Modal
        visible={Boolean(caregiverToRevoke)}
        onClose={closeRevokeCaregiverModal}
        variant="confirmation"
        icon="trash"
        title="ยกเลิกสิทธิ์ผู้ดูแล"
        message={`ต้องการลบ "${caregiverToRevoke?.alias ?? ''}" ออกจากรายชื่อผู้ดูแลหรือไม่?`}
        confirmText="ลบผู้ดูแล"
        cancelText="ไม่"
        confirmVariant="error"
        onConfirm={handleConfirmRevokeCaregiver}
        isLoading={revokeApi.loading}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary
  },
  infoButton: {
    padding: spacing[1]
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  scrollView: {
    flex: 1
  },
  scrollContentContainer: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: 120
  },
  stickyFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 4,
    backgroundColor: colors.background.primary,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[6]
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
  createInviteButtonDisabled: {
    opacity: 0.6
  },
  createInviteButtonText: {
    fontSize: typography.fontSize.md,
    color: colors.background.secondary,
    fontFamily: typography.fontFamily.bold
  }
})
