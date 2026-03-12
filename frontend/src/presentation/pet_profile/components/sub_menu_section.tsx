import { colors } from '@/constants/design-system'
import { useRouter } from 'expo-router'
import { BriefcaseMedical } from 'lucide-react-native'
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
            <BriefcaseMedical
              size={30}
              color={colors.primary.DEFAULT}
              strokeWidth={1.5}
            />
          </View>
          <Text style={styles.text}>ประวัติสุขภาพ</Text>
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
    marginBottom: 4
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingBottom: 8
  },
  menuButton: {
    alignItems: 'center',
    gap: 8
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
