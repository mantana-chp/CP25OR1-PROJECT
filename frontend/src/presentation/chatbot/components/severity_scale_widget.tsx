import React, { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SeverityLevel } from '@/src/domain/chatbot.domain'

interface SeverityScaleWidgetProps {
  onSelect: (level: SeverityLevel, label: string) => void
  disabled?: boolean
  prompt?: string
}

const SEVERITY_LEVELS = [
  { level: 1, emoji: '😊', label: 'เล็กน้อย', color: '#10B981', description: 'อาการเบาๆ ไม่กังวล' },
  { level: 2, emoji: '🙂', label: 'ปานกลาง', color: '#84CC16', description: 'อาการเล็กน้อย สังเกตได้' },
  { level: 3, emoji: '😐', label: 'ค่อนข้างรุนแรง', color: '#F59E0B', description: 'อาการชัดเจน เริ่มกังวล' },
  { level: 4, emoji: '😟', label: 'รุนแรง', color: '#F97316', description: 'อาการรุนแรง น่าเป็นห่วง' },
  { level: 5, emoji: '😰', label: 'รุนแรงมาก', color: '#EF4444', description: 'อาการรุนแรงมาก เร่งด่วน' }
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
    
    // Small delay for visual feedback
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
                isSelected && styles.levelButtonSelected,
                disabled && styles.levelButtonDisabled
              ]}
              onPress={() => handleSelect(item.level as SeverityLevel, item.label)}
              disabled={disabled}
              activeOpacity={0.7}
            >
              <View style={[
                styles.emojiContainer,
                isSelected && { backgroundColor: item.color }
              ]}>
                <Text style={styles.emoji}>{item.emoji}</Text>
              </View>
              
              <View style={styles.levelInfo}>
                <Text style={[
                  styles.levelLabel,
                  isSelected && styles.levelLabelSelected
                ]}>
                  {item.label}
                </Text>
                <Text style={[
                  styles.levelDescription,
                  isSelected && styles.levelDescriptionSelected
                ]}>
                  {item.description}
                </Text>
              </View>

              {isSelected && (
                <View style={[styles.selectedIndicator, { backgroundColor: item.color }]}>
                  <Text style={styles.checkmark}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          )
        })}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          ข้อมูลนี้จะช่วยให้ AI วิเคราะห์และให้คำแนะนำได้แม่นยำยิ่งขึ้น
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
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
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  icon: {
    fontSize: 32,
    marginBottom: 8
  },
  prompt: {
    fontSize: 15,
    fontFamily: 'Prompt_500Medium',
    color: '#225877',
    textAlign: 'center',
    lineHeight: 22
  },
  scaleContainer: {
    gap: 10
  },
  levelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    gap: 12
  },
  levelButtonSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6'
  },
  levelButtonDisabled: {
    opacity: 0.6
  },
  emojiContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center'
  },
  emoji: {
    fontSize: 28
  },
  levelInfo: {
    flex: 1
  },
  levelLabel: {
    fontSize: 15,
    fontFamily: 'Prompt_500Medium',
    color: '#334155',
    marginBottom: 2
  },
  levelLabelSelected: {
    color: '#1E40AF'
  },
  levelDescription: {
    fontSize: 12,
    fontFamily: 'Prompt_400Regular',
    color: '#64748B'
  },
  levelDescriptionSelected: {
    color: '#3B82F6'
  },
  selectedIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center'
  },
  checkmark: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold'
  },
  footer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  footerText: {
    fontSize: 12,
    fontFamily: 'Prompt_400Regular',
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18
  }
})
