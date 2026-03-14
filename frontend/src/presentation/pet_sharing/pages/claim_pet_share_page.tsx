import {
  borderRadius,
  colors,
  iconSizes,
  spacing,
  typography
} from '@/constants/design-system'
import { IPetProfile } from '@/src/domain/pet.domain'
import { useAuth } from '@/src/context/AuthContext'
import { usePets } from '@/src/context/PetContext'
import { ApiError } from '@/src/utils/api/api_client'
import { petSharingService } from '@/src/utils/api/services/pet_sharing_service'
import { useApi } from '@/src/utils/api/use_api'
import { extractClaimToken, unwrapData } from '@/src/utils/pet_sharing_utils'
import { useRouter } from 'expo-router'
import {
  BarcodeScanningResult,
  CameraType,
  CameraView,
  useCameraPermissions
} from 'expo-camera'
import { RefreshCw, ScanLine, ShieldCheck } from 'lucide-react-native'
import React, { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  View
} from 'react-native'

import Button from '../../components/button'
import Header from '../../components/header_component'

const getClaimErrorMessage = (error: ApiError) => {
  const message = error.message?.toLowerCase() ?? ''

  if (error.statusCode === 401) {
    return 'กรุณาเข้าสู่ระบบก่อนรับคำเชิญ'
  }

  if (error.statusCode === 404 || message.includes('invalid code')) {
    return 'QR Code ไม่ถูกต้องหรือถูกยกเลิกแล้ว'
  }

  if (message.includes('already the owner')) {
    return 'บัญชีนี้เป็นเจ้าของสัตว์เลี้ยงนี้อยู่แล้ว'
  }

  if (message.includes('code expired or already used')) {
    return 'QR Code นี้หมดอายุหรือถูกใช้ไปแล้ว'
  }

  if (message.includes('expired')) {
    return 'QR Code หมดอายุแล้ว กรุณาขอรหัสเชิญใหม่จากเจ้าของสัตว์เลี้ยง'
  }

  if (message.includes('already used')) {
    return 'QR Code นี้ถูกใช้ไปแล้ว'
  }

  if (message.includes('no longer active')) {
    return 'คำเชิญนี้อ้างอิงสัตว์เลี้ยงที่ไม่พร้อมแชร์แล้ว กรุณาขอรหัสใหม่'
  }

  return error.message || 'ไม่สามารถรับคำเชิญได้ กรุณาลองใหม่อีกครั้ง'
}

export default function ClaimPetSharePage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { refreshPets } = usePets()

  const [permission, requestPermission] = useCameraPermissions()
  const [facing, setFacing] = useState<CameraType>('back')
  const [hasScanned, setHasScanned] = useState(false)

  const claimInviteApi = useApi(petSharingService.claimInvite, {
    showErrorAlert: false
  })

  const isBusy = claimInviteApi.loading || authLoading

  const permissionDenied = useMemo(() => {
    if (!permission) return false
    return !permission.granted
  }, [permission])

  const onBackPress = () => {
    router.push('/(tabs)/pet_profile')
  }

  const onRequestPermission = async () => {
    const nextPermission = await requestPermission()

    if (!nextPermission.granted) {
      Alert.alert(
        'ต้องการสิทธิ์กล้อง',
        'โปรดอนุญาตการใช้งานกล้องเพื่อสแกน QR Code คำเชิญ'
      )
    }
  }

  const onClaimInvite = async (token: string) => {
    if (!isAuthenticated) {
      Alert.alert('กรุณาเข้าสู่ระบบ', 'คุณต้องเข้าสู่ระบบก่อนรับคำเชิญ')
      setHasScanned(false)
      return
    }

    const result = await claimInviteApi.execute(token)

    if (result.error) {
      const error = result.error as ApiError
      Alert.alert('รับคำเชิญไม่สำเร็จ', getClaimErrorMessage(error))
      setHasScanned(false)
      return
    }

    const claimedPets = unwrapData<IPetProfile[]>(result.data)
    const firstPetName = claimedPets?.[0]?.pet_name

    await refreshPets()

    Alert.alert(
      'รับคำเชิญสำเร็จ',
      firstPetName
        ? `เพิ่ม "${firstPetName}" ไปยังรายการสัตว์เลี้ยงเรียบร้อยแล้ว`
        : 'เพิ่มสัตว์เลี้ยงที่แชร์แล้วไปยังรายการของคุณเรียบร้อยแล้ว',
      [
        {
          text: 'ตกลง',
          onPress: () => router.replace('/(tabs)/pet_profile')
        }
      ]
    )
  }

  const onBarcodeScanned = async (event: BarcodeScanningResult) => {
    if (hasScanned || claimInviteApi.loading) {
      return
    }

    setHasScanned(true)

    const token = extractClaimToken(event.data)
    if (!token) {
      Alert.alert('QR Code ไม่ถูกต้อง', 'ไม่พบรหัสคำเชิญใน QR Code นี้')
      setHasScanned(false)
      return
    }

    await onClaimInvite(token)
  }

  const onFlipCamera = () => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'))
  }

  const onResetScan = () => {
    if (claimInviteApi.loading) return
    setHasScanned(false)
  }

  return (
    <View style={styles.container}>
      <Header title="สแกน QR Code" goBack onBackPress={onBackPress} />

      <View style={styles.content}>
        {isBusy ? (
          <View style={styles.stateContainer}>
            <ActivityIndicator size="large" color={colors.primary.light} />
          </View>
        ) : !isAuthenticated ? (
          <View style={styles.stateContainer}>
            <ShieldCheck color={colors.warning.DEFAULT} size={iconSizes['4xl']} />
            <Text style={styles.stateTitle}>กรุณาเข้าสู่ระบบก่อน</Text>
            <Text style={styles.stateDescription}>
              คุณต้องเข้าสู่ระบบก่อนรับคำเชิญผู้ดูแลร่วม
            </Text>
          </View>
        ) : !permission ? (
          <View style={styles.stateContainer}>
            <ActivityIndicator size="large" color={colors.primary.light} />
            <Text style={styles.stateDescription}>กำลังเตรียมกล้อง...</Text>
          </View>
        ) : permissionDenied ? (
          <View style={styles.stateContainer}>
            <ScanLine color={colors.primary.light} size={iconSizes['4xl']} />
            <Text style={styles.stateTitle}>อนุญาตการใช้งานกล้อง</Text>
            <Text style={styles.stateDescription}>
              เพื่อสแกน QR Code คำเชิญผู้ดูแลร่วม
            </Text>

            <Button
              title="อนุญาตใช้งานกล้อง"
              onPress={onRequestPermission}
              style={styles.permissionButton}
            />
          </View>
        ) : (
          <>
            <View style={styles.scannerCard}>
              <CameraView
                style={styles.camera}
                facing={facing}
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={
                  hasScanned || claimInviteApi.loading ? undefined : onBarcodeScanned
                }
              />

              <View pointerEvents="none" style={styles.scanFrame} />
            </View>

            <Text style={styles.helperText}>
              วาง QR Code คำเชิญให้อยู่ภายในกรอบเพื่อรับสิทธิ์ผู้ดูแลร่วม
            </Text>

            <View style={styles.actionRow}>
              <Button
                title="สลับกล้อง"
                onPress={onFlipCamera}
                variant="ghost"
                icon={
                  <RefreshCw
                    size={iconSizes.md}
                    color={colors.primary.DEFAULT}
                    strokeWidth={2}
                  />
                }
                style={styles.secondaryButton}
                textStyle={styles.secondaryButtonText}
              />

              <Button
                title={hasScanned ? 'สแกนอีกครั้ง' : 'พร้อมสแกน'}
                onPress={onResetScan}
                disabled={!hasScanned}
                style={styles.primaryButton}
              />
            </View>
          </>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary
  },
  content: {
    flex: 1,
    padding: spacing[4],
    justifyContent: 'center'
  },
  scannerCard: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    backgroundColor: colors.gray[900],
    borderWidth: 1,
    borderColor: colors.border.light,
    aspectRatio: 1
  },
  camera: {
    flex: 1
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
    backgroundColor: 'transparent'
  },
  helperText: {
    marginTop: spacing[4],
    textAlign: 'center',
    color: colors.gray[600],
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    lineHeight: typography.lineHeight.normal
  },
  actionRow: {
    marginTop: spacing[4],
    flexDirection: 'row',
    gap: spacing[3]
  },
  secondaryButton: {
    flex: 1
  },
  secondaryButtonText: {
    color: colors.primary.DEFAULT,
    fontFamily: typography.fontFamily.medium
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.primary.light
  },
  stateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[6]
  },
  stateTitle: {
    fontSize: typography.fontSize['2xl'],
    color: colors.primary.DEFAULT,
    fontFamily: typography.fontFamily.bold,
    textAlign: 'center'
  },
  stateDescription: {
    fontSize: typography.fontSize.base,
    color: colors.gray[600],
    fontFamily: typography.fontFamily.regular,
    textAlign: 'center',
    lineHeight: typography.lineHeight.normal
  },
  permissionButton: {
    width: '100%',
    marginTop: spacing[2],
    backgroundColor: colors.primary.light
  }
})
