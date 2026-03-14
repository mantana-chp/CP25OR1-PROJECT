import { colors } from '@/constants/design-system'
import { useRouter } from 'expo-router'
import {
  BriefcaseMedical,
  ClipboardList,
  User2,
  Users
} from 'lucide-react-native'
import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

interface SubMenuSectionProps {
  petId?: string
}

export default function SubMenuSection({ petId }: SubMenuSectionProps) {
  const router = useRouter()

  // -------------
  // Render
  // -------------
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>เมนู</Text>
      <View style={styles.container}>
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
              pathname: '/(tabs)/pet_sharing',
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF'
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: 'Prompt_500Medium',
    color: colors.primary.DEFAULT,
    marginBottom: 8
  },
  container: {
    flexDirection: 'row',
    gap: 24,
    alignItems: 'flex-start',
    paddingHorizontal: 8,
    paddingBottom: 8
  },
  menuButton: {
    alignItems: 'center',
    gap: 2
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
