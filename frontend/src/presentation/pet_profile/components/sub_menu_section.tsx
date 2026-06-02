import { colors } from '@/constants/design-system'
import { useRouter } from 'expo-router'
import { ClipboardList, ScanQrCode, Users } from 'lucide-react-native'
import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

interface SubMenuSectionProps {
  petId?: string
  isViewingDeceased?: boolean
}

export default function SubMenuSection({
  petId,
  isViewingDeceased
}: SubMenuSectionProps) {
  const router = useRouter()

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>เมนู</Text>
      <View style={styles.container}>
        {/* Health Record */}
        <Pressable
          onPress={() => {
            router.push({
              pathname: '/(tabs)/health_record',
              params: petId ? { petId } : {}
            })
          }}
          style={styles.menuButton}
        >
          <View style={styles.iconCircle}>
            <ClipboardList
              size={28}
              color={colors.primary.DEFAULT}
              strokeWidth={1.5}
            />
          </View>
          <Text style={styles.text}>ประวัติสุขภาพ</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            router.push({
              pathname: '/(tabs)/access_list',
              params: petId ? { petId } : {}
            })
          }}
          style={styles.menuButton}
        >
          <View style={styles.iconCircle}>
            <Users size={28} color={colors.primary.DEFAULT} strokeWidth={1.5} />
          </View>
          <Text style={styles.text}>ผู้ดูแลร่วม</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.background.secondary
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: 'Prompt_500Medium',
    color: colors.primary.DEFAULT,
    marginBottom: 8
  },
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    alignItems: 'flex-start',
    paddingHorizontal: 8,
    paddingBottom: 8
  },
  menuButton: {
    alignItems: 'center',
    gap: 2,
    width: 70
  },
  iconCircle: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center'
  },
  text: {
    fontSize: 12,
    fontFamily: 'Prompt_400Regular',
    color: colors.primary.DEFAULT,
    textAlign: 'center'
  }
})
