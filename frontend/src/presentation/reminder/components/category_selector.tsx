import { CATEGORY_MAP } from '@/src/domain/reminder.domain'
import {
  Bone,
  LayoutGrid,
  Pill,
  Pipette,
  Scissors,
  Stethoscope,
  Syringe,
  Tag,
  X
} from 'lucide-react-native'
import React, { useState } from 'react'
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'

const ICON_MAP: Record<string, any> = {
  Tag,
  Syringe,
  Stethoscope,
  Pill,
  Pipette,
  Scissors,
  Bone
}

interface CategorySelectorProps {
  value?: string
  onChange: (categoryId: string) => void
  error?: string
  required?: boolean
}

export default function CategorySelector({
  value,
  onChange,
  error,
  required
}: CategorySelectorProps) {
  const [modalVisible, setModalVisible] = useState(false)

  const selectedCategory = value ? CATEGORY_MAP[value] : null
  const SelectedIcon = selectedCategory ? ICON_MAP[selectedCategory.icon] : null

  const handleSelect = (categoryId: string) => {
    onChange(categoryId)
    setModalVisible(false)
  }

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>หมวดหมู่</Text>
      </View>

      <TouchableOpacity
        style={[
          styles.selector,
          modalVisible && styles.selectorActive,
          error && styles.selectorError
        ]}
        onPress={() => setModalVisible(true)}
      >
        {selectedCategory ? (
          <View style={styles.selectedContent}>
            {SelectedIcon && (
              <SelectedIcon size={20} color={selectedCategory.color} />
            )}
            <Text style={styles.selectedText}>{selectedCategory.label}</Text>
          </View>
        ) : (
          <View style={styles.placeholderContent}>
            <LayoutGrid
              size={20}
              color={modalVisible ? '#ffffff' : '#9ca3af'}
            />
            <Text
              style={[
                styles.placeholder,
                modalVisible && styles.placeholderActive
              ]}
            >
              เลือกหมวดหมู่
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>เลือกหมวดหมู่</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.categoriesGrid}>
              {Object.entries(CATEGORY_MAP).map(([id, category]) => {
                const Icon = ICON_MAP[category.icon]
                const isSelected = value === id

                return (
                  <TouchableOpacity
                    key={id}
                    style={[
                      styles.categoryItem,
                      isSelected && {
                        backgroundColor: category.color + '20',
                        borderColor: category.color
                      }
                    ]}
                    onPress={() => handleSelect(id)}
                  >
                    <View
                      style={[
                        styles.iconContainer,
                        isSelected && { backgroundColor: category.color }
                      ]}
                    >
                      <Icon
                        size={28}
                        color={isSelected ? '#fff' : category.color}
                      />
                    </View>
                    <Text
                      style={[
                        styles.categoryLabel,
                        isSelected && { color: category.color }
                      ]}
                    >
                      {category.label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  label: {
    fontSize: 14,
    color: '#225877',
    fontFamily: 'Prompt_400Regular',
    marginLeft: 4,
  
  },
  required: {
    color: '#ef4444'
  },
  selector: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 48,
    justifyContent: 'center'
  },
  selectorActive: {
    backgroundColor: '#5FA7D1',
    borderColor: '#5FA7D1'
  },
  selectorError: {
    borderColor: '#ef4444'
  },
  selectedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  selectedText: {
    fontSize: 16,
    color: '#225877',
    fontFamily: 'Prompt_400Regular'
  },
  placeholderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  placeholder: {
    fontSize: 16,
    color: '#9ca3af',
    fontFamily: 'Prompt_400Regular'
  },
  placeholderActive: {
    color: '#ffffff'
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    fontFamily: 'Prompt_400Regular',
    marginTop: 4,
    marginLeft: 4
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '85%',
    maxWidth: 400
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Prompt_500Medium',
    color: '#225877'
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center'
  },
  categoryItem: {
    width: 90,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 8
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center'
  },
  categoryLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'Prompt_400Regular',
    textAlign: 'center'
  }
})
