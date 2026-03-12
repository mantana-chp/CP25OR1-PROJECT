import { IDeletedPet } from '@/src/domain/pet.domain'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { History, RotateCcw, Trash2, X } from 'lucide-react-native'
import React, { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native'

interface RecentlyDeletedModalProps {
  visible: boolean
  deletedPets: IDeletedPet[]
  onClose: () => void
  onRestore: (petId: string) => Promise<void>
  onPermanentDelete: (petId: string) => Promise<void>
}

export default function RecentlyDeletedModal({
  visible,
  deletedPets,
  onClose,
  onRestore,
  onPermanentDelete
}: RecentlyDeletedModalProps) {
  const [processingId, setProcessingId] = useState<string | null>(null)

  const formatDeletedDate = (dateStr: string): string => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffTime = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'วันนี้'
    if (diffDays === 1) return 'เมื่อวาน'
    if (diffDays < 7) return ` ${diffDays} วันที่แล้ว`
    if (diffDays < 30) return ` ${Math.floor(diffDays / 7)} สัปดาห์ที่แล้ว`
    return ` ${Math.floor(diffDays / 30)} เดือนที่แล้ว`
  }

  const handleRestore = (pet: IDeletedPet) => {
    Alert.alert(
      'กู้คืนสัตว์เลี้ยง',
      `คุณต้องการกู้คืน "${pet.pet_name}" กลับมาเป็นสัตว์เลี้ยงที่ใช้งานอยู่ใช่ไหม?`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'กู้คืน',
          onPress: async () => {
            setProcessingId(pet.id)
            try {
              await onRestore(pet.id)
              if (deletedPets.length === 1) {
                onClose()
              }
            } finally {
              setProcessingId(null)
            }
          }
        }
      ]
    )
  }

  const handlePermanentDelete = (pet: IDeletedPet) => {
    Alert.alert(
      'ลบถาวร',
      `คุณแน่ใจหรือไม่ที่จะลบ "${pet.pet_name}" อย่างถาวร?\n\nการดำเนินการนี้ไม่สามารถยกเลิกได้`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ลบถาวร',
          style: 'destructive',
          onPress: async () => {
            setProcessingId(pet.id)
            try {
              await onPermanentDelete(pet.id)
              if (deletedPets.length === 1) {
                onClose()
              }
            } finally {
              setProcessingId(null)
            }
          }
        }
      ]
    )
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={styles.container}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Trash2 size={18} color="#BF1737" />
              <Text style={styles.title}>เพิ่งลบล่าสุด</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{deletedPets.length}</Text>
              </View>
            </View>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <X size={20} color="#6B7280" />
            </Pressable>
          </View>

          {/* Pet List */}
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
          >
            {deletedPets.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>ไม่มีรายการที่ถูกลบ</Text>
              </View>
            ) : (
              <View style={styles.petList}>
                {deletedPets.map((pet) => (
                  <View key={pet.id} style={styles.petItem}>
                    <View style={styles.petInfo}>
                      <View style={styles.petAvatar}>
                        {pet.profile_image_url ? (
                          <Image
                            source={{ uri: pet.profile_image_url }}
                            style={styles.petAvatarImage}
                          />
                        ) : (
                          <MaterialCommunityIcons
                            name="dog"
                            size={18}
                            color="white"
                          />
                        )}
                      </View>
                      <View style={styles.petDetails}>
                        <Text style={styles.petName} numberOfLines={1}>
                          {pet.pet_name}
                        </Text>
                        <Text style={styles.deletedDate}>
                          ลบ{formatDeletedDate(pet.deleted_at)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.actions}>
                      <Pressable
                        style={styles.restoreButton}
                        onPress={() => handleRestore(pet)}
                        disabled={processingId === pet.id}
                      >
                        {processingId === pet.id ? (
                          <ActivityIndicator size="small" color="#5FA7D1" />
                        ) : (
                          <History size={16} color="#5FA7D1" />
                        )}
                      </Pressable>
                      <Pressable
                        style={styles.deleteButton}
                        onPress={() => handlePermanentDelete(pet)}
                        disabled={processingId === pet.id}
                      >
                        <Trash2 size={16} color="#BF1737" />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    paddingBottom: 32
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  title: {
    fontSize: 16,
    fontFamily: 'Prompt_500Medium',
    color: '#374151'
  },
  badge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10
  },
  badgeText: {
    fontSize: 12,
    fontFamily: 'Prompt_500Medium',
    color: '#BF1737'
  },
  closeButton: {
    padding: 4
  },
  scrollView: {
    paddingHorizontal: 20
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Prompt_400Regular',
    color: '#9CA3AF'
  },
  petList: {
    paddingVertical: 12,
    gap: 8
  },
  petItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12
  },
  petInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  petAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#9CA3AF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    overflow: 'hidden'
  },
  petAvatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18
  },
  petDetails: {
    flex: 1
  },
  petName: {
    fontSize: 14,
    color: '#374151',
    fontFamily: 'Prompt_500Medium'
  },
  deletedDate: {
    fontSize: 11,
    color: '#9CA3AF',
    fontFamily: 'Prompt_400Regular'
  },
  actions: {
    flexDirection: 'row',
    gap: 8
  },
  restoreButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#E8F4F8',
    justifyContent: 'center',
    alignItems: 'center'
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center'
  }
})
