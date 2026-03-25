import React, { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native'
import AccessListSection from '../components/access_list_section'
import Header from '../../components/header_component'
import {
  IAccessListResponse,
  ICaregiver,
  petSharingService
} from '@/src/utils/api/services/pet_sharing_service'
import { useFocusEffect, useLocalSearchParams } from 'expo-router'
import { useApi } from '@/src/utils/api/use_api'
import { unwrapData } from '@/src/utils/pet_sharing_utils'
import { usePets } from '@/src/context/PetContext'
import PetInfoCard from '../../pet_profile/components/pet_info_card'
import Modal from '../../components/modal'
import {
  borderRadius,
  colors,
  spacing,
  typography
} from '@/constants/design-system'
import PetSharingStateView from '../components/state_view'

export default function AccessListPage() {
  const { petId } = useLocalSearchParams<{ petId?: string }>()
  const { activePets, deceasedPets, loading: petsLoading } = usePets()

  const [caregivers, setCaregivers] = useState<ICaregiver[]>([])
  const [selfAccessId, setSelfAccessId] = useState<string | null>(null)
  const [caregiverToRevoke, setCaregiverToRevoke] = useState<ICaregiver | null>(
    null
  )

  const allPets = useMemo(
    () => [...activePets, ...deceasedPets],
    [activePets, deceasedPets]
  )

  const currentPet = useMemo(() => {
    if (!petId) return null
    return allPets.find((pet) => pet.id === petId) ?? null
  }, [allPets, petId])

  const isOwner = currentPet?.petRole === 'OWNER'
  const isDeceasedPet = currentPet?.status === 'DECEASED'
  const canManageAccess = isOwner && !isDeceasedPet

  const listAccessListApi = useApi(petSharingService.listAccessList, {
    showErrorAlert: false
  })
  const revokeApi = useApi(petSharingService.revokeCaregiver, {
    showErrorAlert: false
  })

  const loadAccessList = useCallback(async () => {
    if (!petId) return

    const accessRes = await listAccessListApi.execute(petId)
    if (accessRes.error) return

    const accessData = unwrapData<IAccessListResponse>(accessRes.data)
    setCaregivers(
      Array.isArray(accessData?.caregivers) ? accessData.caregivers : []
    )
    setSelfAccessId(accessData?.selfAccessId ?? null)
  }, [listAccessListApi.execute, petId])

  useFocusEffect(
    useCallback(() => {
      void loadAccessList()
    }, [loadAccessList])
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
        'ไม่สามารถลบผู้ดูแลได้ กรุณาลองใหม่อีกครั้ง'
      )
      return
    }

    setCaregivers((prev) =>
      prev.filter((item) => item.accessId !== caregiverToRevoke.accessId)
    )
    setCaregiverToRevoke(null)
  }

  const isLoading = petsLoading || listAccessListApi.loading

  return (
    <View style={styles.container}>
      <Header title="จัดการผู้ดูแลร่วม" goBack/>

      {!petId ? (
        <PetSharingStateView
          title="ไม่พบสัตว์เลี้ยง"
          subtitle="กรุณากลับไปเลือกสัตว์เลี้ยงอีกครั้ง"
        />
      ) : isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.light} />
        </View>
      ) : !currentPet ? (
        <PetSharingStateView
          title="ไม่พบข้อมูลสัตว์เลี้ยง"
          subtitle="สัตว์เลี้ยงที่เลือกอาจถูกลบหรือไม่สามารถเข้าถึงได้"
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
            isOwner={canManageAccess}
            selfAccessId={selfAccessId ?? undefined}
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
    paddingBottom: spacing[6]
  },
  petInfoSection: {
    marginBottom: spacing[4],
    backgroundColor: colors.background.secondary
  },
  deceasedNote: {
    marginTop: spacing[4],
    padding: spacing[3],
    backgroundColor: colors.gray[100] || '#F3F4F6',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray[300] || '#D1D5DB'
  },
  deceasedNoteText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[700] || '#374151',
    fontFamily: typography.fontFamily.regular,
    textAlign: 'center',
    lineHeight: typography.lineHeight.relaxed
  }
})
