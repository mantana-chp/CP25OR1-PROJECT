import { useFocusEffect, useRouter } from 'expo-router'
import { Info } from 'lucide-react-native'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Share,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native'

import { colors, iconSizes, spacing } from '@/constants/design-system'
import { usePets } from '@/src/context/PetContext'
import { 
  petSharingService
} from '@/src/utils/api/services/pet_sharing_service'
import { useApi } from '@/src/utils/api/use_api'
import { saveCaregiverSuggestion } from '@/src/utils/caregiver_suggestions_storage'

import Header from '../../components/header_component'
import Modal from '../../components/modal'
import AliasModal from '../components/alias_modal'
import InviteCaregiver from '../components/invite_caregiver'
import QrModal from '../components/qr_modal'
import PetSharingStateView from '../components/state_view'
import { CLAIM_SCHEME, unwrapData } from '../../../utils/pet_sharing_utils'
import PendingInviteCard from '../components/pending_invite_card'
import { IGenerateInviteResponse, IPendingInvite } from '@/src/domain/pet_sharing.domain'

export default function PetSharingPage() {
  const router = useRouter()
  const { activePets, deceasedPets, loading: petsLoading } = usePets()

  const [pendingInvites, setPendingInvites] = useState<IPendingInvite[]>([])
  const [showAliasModal, setShowAliasModal] = useState(false)
  const [aliasInput, setAliasInput] = useState('')
  const [selectedPetIds, setSelectedPetIds] = useState<string[]>([])
  const [showQrModal, setShowQrModal] = useState(false)
  const [showCancelInviteModal, setShowCancelInviteModal] = useState(false)
  const [inviteToCancel, setInviteToCancel] = useState<IPendingInvite | null>(
    null
  )
  const isRealtimeSyncingRef = useRef(false)
  const pendingInvitesRef = useRef<IPendingInvite[]>([])
  const showQrModalRef = useRef(false)
  const [selectedInviteForQr, setSelectedInviteForQr] =
    useState<IPendingInvite | null>(null)

  const listInvitesApi = useApi(petSharingService.listPendingInvites, {
    showErrorAlert: false
  })
  const generateInviteApi = useApi(petSharingService.generateInvite, {
    showErrorAlert: false
  })
  const cancelInviteApi = useApi(petSharingService.cancelInvite, {
    showErrorAlert: false
  })

  const allPets = useMemo(
    () => [...activePets, ...deceasedPets],
    [activePets, deceasedPets]
  )

  const ownerPets = useMemo(
    () => allPets.filter((pet) => pet.petRole === 'OWNER'),
    [allPets]
  )

  const ownerShareablePets = useMemo(
    () => ownerPets.filter((pet) => pet.status !== 'DECEASED'),
    [ownerPets]
  )

  const loadData = useCallback(async () => {
    const invitesRes = await listInvitesApi.execute()

    if (!invitesRes.error) {
      const allInvites = unwrapData<IPendingInvite[]>(invitesRes.data)
      const invites = Array.isArray(allInvites) ? allInvites : []
      setPendingInvites(invites)
    }
  }, [listInvitesApi.execute])

  useEffect(() => {
    pendingInvitesRef.current = pendingInvites
  }, [pendingInvites])

  useEffect(() => {
    showQrModalRef.current = showQrModal
  }, [showQrModal])

  const syncRealtimeData = useCallback(async () => {
    if (isRealtimeSyncingRef.current) return

    isRealtimeSyncingRef.current = true

    try {
      const previousInvites = pendingInvitesRef.current

      const invitesRes = await petSharingService.listPendingInvites()

      const allInvites = unwrapData<IPendingInvite[]>(invitesRes)
      const nextInvites = Array.isArray(allInvites) ? allInvites : []

      setPendingInvites(nextInvites)

      const hadInvites = previousInvites.length > 0
      const inviteAcceptedNow =
        hadInvites && nextInvites.length < previousInvites.length

      if (inviteAcceptedNow) {
        if (showQrModalRef.current) {
          setShowQrModal(false)
        }

        Alert.alert('ผู้ดูแลรับคำเชิญแล้ว', 'มีผู้ดูแลเข้าร่วมเรียบร้อยแล้ว', [
          {
            text: 'รับทราบ',
            onPress: () => {
              router.push('/(tabs)/pet_profile')
            }
          }
        ])
      }
    } catch (error) {
      // Handle error silently
    } finally {
      isRealtimeSyncingRef.current = false
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      void loadData()
    }, [loadData])
  )

  useFocusEffect(
    useCallback(() => {
      if (pendingInvites.length === 0) return

      void syncRealtimeData()

      const pollInterval = setInterval(() => {
        void syncRealtimeData()
      }, 3000)

      return () => {
        clearInterval(pollInterval)
      }
    }, [pendingInvites.length, syncRealtimeData])
  )

  const openCreateInviteModal = () => {
    setAliasInput('')
    setSelectedPetIds([])
    setShowAliasModal(true)
  }

  const handleTogglePet = (togglePetId: string) => {
    setSelectedPetIds((prev) => {
      if (prev.includes(togglePetId)) {
        return prev.filter((id) => id !== togglePetId)
      } else {
        // Limit to 10 pets
        if (prev.length >= 10) {
          Alert.alert('ถึงขีดจำกัด', 'สามารถเลือกสัตว์เลี้ยงได้สูงสุด 10 ตัว')
          return prev
        }
        return [...prev, togglePetId]
      }
    })
  }

  const handleBackPress = () => {
    router.push('/(tabs)/pet_profile')
  }

  const handleInfo = () => {
    Alert.alert(
      'การเชิญผู้ดูแลร่วม',
      'เชิญเพื่อนหรือครอบครัวมาช่วยดูแลสัตว์เลี้ยงของคุณ คุณสามารถเลือกแชร์สัตว์เลี้ยงหลายตัวในคำเชิญเดียวได้'
    )
  }

  const handleGenerateInvite = async () => {
    if (ownerShareablePets.length === 0) {
      Alert.alert(
        'ไม่สามารถสร้างคำเชิญได้',
        'ไม่มีสัตว์เลี้ยงที่สามารถแชร์ได้ในขณะนี้'
      )
      return
    }

    const alias = aliasInput.trim()
    if (!alias) {
      Alert.alert('กรุณาระบุชื่อ', 'กรุณากรอกชื่อผู้ดูแลก่อนสร้างรหัสเชิญ')
      return
    }

    if (selectedPetIds.length === 0) {
      Alert.alert(
        'กรุณาเลือกสัตว์เลี้ยง',
        'กรุณาเลือกสัตว์เลี้ยงอย่างน้อย 1 ตัว'
      )
      return
    }

    setShowAliasModal(false)

    const result = await generateInviteApi.execute(selectedPetIds, alias)
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

    // Save alias to suggestions for future use
    await saveCaregiverSuggestion(alias)

    // Reload pending invites
    await loadData()
  }

  const handleShareInvite = async (invite: IPendingInvite) => {
    try {
      await Share.share({
        message: `🐾 คุณได้รับคำเชิญเป็นผู้ดูแลสัตว์เลี้ยง\n\n📋 รหัสคำเชิญ:\n${invite.inviteId}\n\nคัดลอกรหัสด้านบนและนำไปกรอกในแอพเพื่อเข้าร่วมเป็นผู้ดูแล`
      })
    } catch {
      // User can close native share sheet; no action needed.
    }
  }

  const handleCancelInvite = (invite: IPendingInvite) => {
    setInviteToCancel(invite)
    setShowCancelInviteModal(true)
  }

  const handleOpenQr = (invite: IPendingInvite) => {
    setSelectedInviteForQr(invite)
    setShowQrModal(true)
  }

  const closeQrModal = () => {
    setShowQrModal(false)
    setSelectedInviteForQr(null)
  }

  const closeCancelInviteModal = () => {
    if (cancelInviteApi.loading) return
    setShowCancelInviteModal(false)
    setInviteToCancel(null)
  }

  const handleConfirmCancelInvite = async () => {
    if (!inviteToCancel) return

    const result = await cancelInviteApi.execute(inviteToCancel.inviteId)
    if (result.error) {
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถยกเลิกรหัสเชิญได้')
      return
    }

    setPendingInvites((prev) =>
      prev.filter((inv) => inv.inviteId !== inviteToCancel.inviteId)
    )
    setShowCancelInviteModal(false)
    setInviteToCancel(null)
  }

  const isLoading = listInvitesApi.loading || petsLoading
  const canCreateInvite = ownerShareablePets.length > 0

  const headerRight = (
    <TouchableOpacity onPress={handleInfo} style={styles.infoButton}>
      <Info size={iconSizes.xl} color={colors.background.secondary} />
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      <Header
        title="เชิญผู้ดูแลร่วม"
        rightChildren={headerRight}
        onBackPress={handleBackPress}
        goBack
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.light} />
        </View>
      ) : pendingInvites.length === 0 ? (
        canCreateInvite ? (
          <InviteCaregiver onCreateInvite={openCreateInviteModal} />
        ) : (
          <PetSharingStateView
            title="ยังไม่มีสัตว์เลี้ยงที่แชร์ได้"
            subtitle="คุณต้องเป็นเจ้าของสัตว์เลี้ยงอย่างน้อย 1 ตัวที่ยังไม่ถูกทำเครื่องหมายว่าเสียชีวิต"
          />
        )
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContentContainer}
          showsVerticalScrollIndicator={false}
        >
          {pendingInvites.map((invite) => {
            const claimLink = `${CLAIM_SCHEME}/${invite.inviteId}`
            return (
              <PendingInviteCard
                key={invite.inviteId}
                pendingInvite={invite}
                claimLink={claimLink}
                canceling={cancelInviteApi.loading}
                onOpenQr={() => handleOpenQr(invite)}
                onShare={() => void handleShareInvite(invite)}
                onCancel={() => handleCancelInvite(invite)}
              />
            )
          })}
        </ScrollView>
      )}

      <AliasModal
        visible={showAliasModal}
        aliasInput={aliasInput}
        onChangeAlias={setAliasInput}
        onClose={() => setShowAliasModal(false)}
        onConfirm={handleGenerateInvite}
        pets={ownerShareablePets}
        selectedPetIds={selectedPetIds}
        onTogglePet={handleTogglePet}
      />

      <QrModal
        visible={showQrModal}
        pendingInvite={selectedInviteForQr}
        claimLink={
          selectedInviteForQr
            ? `${CLAIM_SCHEME}/${selectedInviteForQr.inviteId}`
            : CLAIM_SCHEME
        }
        onClose={closeQrModal}
        onShare={() => {
          if (selectedInviteForQr) {
            void handleShareInvite(selectedInviteForQr)
          }
        }}
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
  }
})
