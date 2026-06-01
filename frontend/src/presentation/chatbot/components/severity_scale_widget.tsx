import React, { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SeverityLevel } from '@/src/domain/chatbot.domain'

interface SeverityScaleWidgetProps {
  onSelect: (level: SeverityLevel, label: string) => void
  disabled?: boolean
  prompt?: string
}

const SEVERITY_LEVELS = [
  {
    level: 1,
    emoji: '😊',
    label: 'เล็กน้อย',
    color: '#10B981',
    description: 'อาการเบาๆ ไม่กังวล'
  },
  {
    level: 2,
    emoji: '🙂',
    label: 'ปานกลาง',
    color: '#84CC16',
    description: 'อาการเล็กน้อย สังเกตได้'
  },
  {
    level: 3,
    emoji: '😐',
    label: 'ค่อนข้างรุนแรง',
    color: '#F59E0B',
    description: 'อาการชัดเจน เริ่มกังวล'
  },
  {
    level: 4,
    emoji: '😟',
    label: 'รุนแรง',
    color: '#F97316',
    description: 'อาการรุนแรง น่าเป็นห่วง'
  },
  {
    level: 5,
    emoji: '😰',
    label: 'รุนแรงมาก',
    color: '#EF4444',
    description: 'อาการรุนแรงมาก เร่งด่วน'
  }
] as const

export default function SeverityScaleWidget({
  onSelect,
  disabled = false,
  prompt = 'กรุณาเลือกระดับความรุนแรงของอาการ'
}: SeverityScaleWidgetProps) {
  const [selectedLevel, setSelectedLevel] = useState<SeverityLevel | null>(null)

  const handleSelect = (level: SeverityLevel, label: string) => {
    if (disabled) return
    setSelectedLevel(level)

    setTimeout(() => {
      onSelect(level, label)
    }, 300)
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.icon}>🩺</Text>
        <Text style={styles.prompt}>{prompt}</Text>
      </View>

      <View style={styles.scaleContainer}>
        {SEVERITY_LEVELS.map((item) => {
          const isSelected = selectedLevel === item.level

          return (
            <TouchableOpacity
              key={item.level}
              style={[
                styles.levelButton,
                isSelected && {
                  borderColor: item.color,
                  backgroundColor: '#FFF'
                },
                disabled && styles.levelButtonDisabled
              ]}
              onPress={() =>
                handleSelect(item.level as SeverityLevel, item.label)
              }
              disabled={disabled}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.emojiContainer,
                  isSelected && { backgroundColor: item.color }
                ]}
              >
                <Text style={styles.emoji}>{item.emoji}</Text>
              </View>
              <Text
                style={[styles.levelLabel, isSelected && { color: item.color }]}
                numberOfLines={2}
              >
                {item.label}
              </Text>
              <Text
                style={[
                  styles.levelDescription,
                  isSelected && { color: item.color }
                ]}
                numberOfLines={2}
              >
                {item.description}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      <Text style={styles.footerText}>
        ข้อมูลนี้จะช่วยให้ AI วิเคราะห์และให้คำแนะนำได้แม่นยำยิ่งขึ้น
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    marginVertical: 6,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  header: {
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6
  },
  icon: {
    fontSize: 16
  },
  prompt: {
    fontSize: 12,
    fontFamily: 'Prompt_500Medium',
    color: '#225877',
    textAlign: 'center'
  },
  scaleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 5
  },
  levelButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4
  },
  levelButtonDisabled: {
    opacity: 0.6
  },
  emojiContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center'
  },
  emoji: {
    fontSize: 20
  },
  levelLabel: {
    fontSize: 10,
    fontFamily: 'Prompt_500Medium',
    color: '#334155',
    textAlign: 'center'
  },
  levelDescription: {
    fontSize: 9,
    fontFamily: 'Prompt_400Regular',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 13
  },
  footerText: {
    fontSize: 10,
    fontFamily: 'Prompt_400Regular',
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    lineHeight: 15
  }
})
