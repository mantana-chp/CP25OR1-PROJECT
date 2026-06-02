import { MaterialCommunityIcons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import type { ComponentProps } from 'react'
import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

interface ImagePickerButtonProps {
  onImageSelected: (imageUri: string) => void
  onImageDeleted?: () => void
  imageUri?: string
  disabled?: boolean
  placeholder?: string
  placeholderPreviewIconName?: ComponentProps<
    typeof MaterialCommunityIcons
  >['name']
  placeholderPreviewBackgroundColor?: string
  colorOptions?: string[]
  selectedColor?: string
  onSelectColor?: (color: string) => void
}

export default function ImagePickerButton({
  onImageSelected,
  onImageDeleted,
  imageUri,
  disabled = false,
  placeholder = 'เลือกรูปภาพสัตว์เลี้ยง',
  placeholderPreviewIconName,
  placeholderPreviewBackgroundColor,
  colorOptions,
  selectedColor,
  onSelectColor,
}: ImagePickerButtonProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const requestPermissions = async () => {
      const { status: cameraStatus } =
        await ImagePicker.requestCameraPermissionsAsync()
      const { status: libraryStatus } =
        await ImagePicker.requestMediaLibraryPermissionsAsync()

      setHasPermission(
        cameraStatus === 'granted' || libraryStatus === 'granted',
      )
    }

    requestPermissions()
  }, [])

  const handlePickImage = async (source: 'camera' | 'library') => {
    if (!hasPermission) {
      Alert.alert(
        'ไม่มีสิทธิ์เข้าใช้',
        'กรุณาอนุญาตการเข้าใช้กล้องและคลังรูปภาพในการตั้งค่า',
      )
      return
    }

    try {
      setIsLoading(true)

      let result: ImagePicker.ImagePickerResult

      if (source === 'camera') {
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
        })
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
        })
      }

      if (!result.canceled && result.assets.length > 0) {
        onImageSelected(result.assets[0].uri)
      }
    } catch (error) {
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถเลือกรูปภาพได้')
    } finally {
      setIsLoading(false)
    }
  }



  const handleButtonPress = () => {
    if (disabled) return

    const options: any[] = [
      {
        text: 'ถ่ายรูป',
        onPress: () => handlePickImage('camera'),
      },
      {
        text: 'เลือกจากคลังรูป',
        onPress: () => handlePickImage('library'),
      },
    ]

    options.push({
      text: 'ยกเลิก',
      style: 'cancel',
    })

    Alert.alert('จัดการรูปภาพ', 'เลือกการกระทำที่ต้องการ', options)
  }

  const handleDeleteImage = () => {
    Alert.alert('ลบรูปภาพ', 'คุณแน่ใจว่าต้องการลบรูปภาพนี้หรือไม่?', [
      {
        text: 'ยกเลิก',
        style: 'cancel',
      },
      {
        text: 'ลบ',
        onPress: onImageDeleted,
        style: 'destructive',
      },
    ])
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.imageContainer,
          disabled && styles.imageContainerDisabled,
        ]}
        onPress={handleButtonPress}
        disabled={disabled || isLoading}
      >
        {imageUri ? (
          <>
            <Image source={{ uri: imageUri }} style={styles.image} />
            <View style={styles.overlay}>
              {isLoading ? (
                <ActivityIndicator size='large' color='#fff' />
              ) : (
                <MaterialCommunityIcons name='pencil' size={24} color='white' />
              )}
            </View>
            {onImageDeleted && !isLoading && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDeleteImage}
                disabled={disabled}
              >
                <MaterialCommunityIcons
                  name='trash-can'
                  size={20}
                  color='white'
                />
              </TouchableOpacity>
            )}
          </>
        ) : (
          <View style={styles.placeholderContainer}>
            {isLoading ? (
              <ActivityIndicator size='large' color='#5FA7D1' />
            ) : (
              <>
                {placeholderPreviewIconName ? (
                  <View style={styles.avatarPreviewWrapper}>
                    <View
                      style={[
                        styles.avatarPreviewCircle,
                        placeholderPreviewBackgroundColor
                          ? {
                              backgroundColor:
                                placeholderPreviewBackgroundColor,
                            }
                          : undefined,
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={placeholderPreviewIconName}
                        size={36}
                        color='white'
                      />
                    </View>
                    <View style={styles.avatarAddOverlay}>
                      <MaterialCommunityIcons
                        name='plus'
                        size={14}
                        color='white'
                      />
                    </View>
                  </View>
                ) : (
                  <MaterialCommunityIcons
                    name='image-plus'
                    size={48}
                    color='#5FA7D1'
                  />
                )}
                <Text style={styles.placeholderText}>{placeholder}</Text>
              </>
            )}
          </View>
        )}
      </TouchableOpacity>

      {!!colorOptions?.length && onSelectColor && !imageUri && (
        <View style={styles.colorOptionsRowOutside}>
          {colorOptions.map((colorOption) => (
            <TouchableOpacity
              key={colorOption}
              onPress={() => onSelectColor(colorOption)}
              style={[
                styles.colorOption,
                { backgroundColor: colorOption },
                selectedColor === colorOption && styles.colorOptionActive,
              ]}
              disabled={disabled}
            />
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    alignItems: 'center',
  },
  imageContainer: {
    width: 150,
    height: 150,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#5FA7D1',
    borderStyle: 'dashed',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainerDisabled: {
    opacity: 0.6,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#DC2626',
    borderRadius: 50,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  placeholderText: {
    marginTop: 8,
    fontSize: 12,
    color: '#5FA7D1',
    textAlign: 'center',
    fontFamily: 'Prompt_400Regular',
  },
  avatarPreviewWrapper: {
    position: 'relative',
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPreviewCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#5BA3D0',
  },
  avatarAddOverlay: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#5FA7D1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  colorOptionsRowOutside: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  colorOption: {
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  colorOptionActive: {
    borderWidth: 2,
    borderColor: '#111827',
  },
})
