import React from 'react'
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Users } from 'lucide-react-native'

import { PetClarificationOption } from '@/src/domain/chatbot.domain'

interface PetClarificationWidgetProps {
  prompt: string
  options: PetClarificationOption[]
  onSelect: (petId: string) => void
  disabled?: boolean
}

function getPetId(option: PetClarificationOption): string | undefined {
  return option.petId
}

function getPetName(option: PetClarificationOption): string {
  return option.petName ?? 'สัตว์เลี้ยง'
}

function getRoleLabel(option: PetClarificationOption): string {
  if (option.role === 'CAREGIVER') {
    return option.ownerAlias
      ? `ที่คุณดูแลให้ ${option.ownerAlias}`
      : 'ที่คุณดูแลให้'
  }

  return 'สัตว์เลี้ยงของคุณ'
}

function getAvatarUri(option: PetClarificationOption): string | undefined {
  return option.petProfileUrl ?? undefined
}

function getInitial(name: string): string {
  const cleaned = name.trim()
  return cleaned.length > 0 ? cleaned[0] : '?'
}

export default function PetClarificationWidget({
  prompt,
  options,
  onSelect,
  disabled = false
}: PetClarificationWidgetProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.icon}>🐾</Text>
        <Text style={styles.prompt}>{prompt}</Text>
      </View>

      <View style={styles.optionsContainer}>
        {options
          .map((option) => {
            const petId = getPetId(option)
            const petName = getPetName(option)
            const avatarUri = getAvatarUri(option)

            if (!petId) {
              return null
            }

            return (
              <TouchableOpacity
                key={petId}
                style={[styles.optionButton, disabled && styles.optionDisabled]}
                onPress={() => onSelect(petId)}
                disabled={disabled}
                activeOpacity={0.7}
              >
                <View style={styles.optionRow}>
                  {avatarUri ? (
                    <Image
                      source={{ uri: avatarUri }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarInitial}>
                        {getInitial(petName)}
                      </Text>
                    </View>
                  )}

                  <View style={styles.optionTextBlock}>
                    <Text style={styles.optionTitle}>{petName}</Text>
                    <View style={styles.subtitleRow}>
                      {option.role === 'CAREGIVER' && (
                        <Users
                          size={12}
                          color="#5FA7D1"
                          style={styles.sharedIcon}
                        />
                      )}
                      <Text style={styles.optionSubtitle}>
                        {getRoleLabel(option)}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            )
          })
          .filter(Boolean)}
      </View>

      <Text style={styles.footerText}>
        แตะเพื่อเลือกสัตว์เลี้ยงที่คุณกำลังถามถึง
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
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
    flexShrink: 1,
    fontSize: 12,
    fontFamily: 'Prompt_500Medium',
    color: '#225877',
    textAlign: 'center'
  },
  optionsContainer: {
    gap: 8
  },
  optionButton: {
    borderWidth: 1,
    borderColor: '#D6E4F0',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC'
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 10,
    backgroundColor: '#E2E8F0'
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 10,
    backgroundColor: '#5FA7D1',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarInitial: {
    fontSize: 18,
    fontFamily: 'Prompt_600SemiBold',
    color: '#FFFFFF'
  },
  optionTextBlock: {
    flex: 1,
    minWidth: 0
  },
  optionDisabled: {
    opacity: 0.6
  },
  optionTitle: {
    fontSize: 14,
    fontFamily: 'Prompt_500Medium',
    color: '#0F172A'
  },
  optionSubtitle: {
    fontSize: 12,
    fontFamily: 'Prompt_400Regular',
    color: '#475569'
  },
  subtitleRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center'
  },
  sharedIcon: {
    marginRight: 4
  },
  footerText: {
    fontSize: 10,
    fontFamily: 'Prompt_400Regular',
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  }
})
