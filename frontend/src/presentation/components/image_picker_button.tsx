import { MaterialCommunityIcons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'

interface ImagePickerButtonProps {
  onImageSelected: (imageUri: string) => void
  onImageDeleted?: () => void
  imageUri?: string
  disabled?: boolean
  placeholder?: string
}

export default function ImagePickerButton({
  onImageSelected,
  onImageDeleted,
  imageUri,
  disabled = false,
  placeholder = 'เลือกรูปภาพสัตว์เลี้ยง'
}: ImagePickerButtonProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Request image picker permissions
  useEffect(() => {
    const requestPermissions = async () => {
      const { status: cameraStatus } =
        await ImagePicker.requestCameraPermissionsAsync()
      const { status: libraryStatus } =
        await ImagePicker.requestMediaLibraryPermissionsAsync()

      setHasPermission(
        cameraStatus === 'granted' || libraryStatus === 'granted'
      )
    }

    requestPermissions()
  }, [])

  const handlePickImage = async (source: 'camera' | 'library') => {
    if (!hasPermission) {
      Alert.alert(
        'ไม่มีสิทธิ์เข้าใช้',
        'กรุณาอนุญาตการเข้าใช้กล้องและคลังรูปภาพในการตั้งค่า'
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
          quality: 0.7
        })
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7
        })
      }

      if (!result.canceled && result.assets.length > 0) {
        onImageSelected(result.assets[0].uri)
      }
    } catch (error) {
      console.error('❌ Error picking image:', error)
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถเลือกรูปภาพได้')
    } finally {
      setIsLoading(false)
    }
  }

  // const handleButtonPress = () => {
  //   if (disabled) return

  //   Alert.alert('เลือกรูปภาพ', 'เลือกที่มาของรูปภาพ', [
  //     {
  //       text: 'ถ่ายรูป',
  //       onPress: () => handlePickImage('camera'),
  //     },
  //     {
  //       text: 'เลือกจากคลังรูป',
  //       onPress: () => handlePickImage('library'),
  //     },
  //     {
  //       text: 'ยกเลิก',
  //       style: 'cancel',
  //     },
  //   ])
  // }

  const handleButtonPress = () => {
    if (disabled) return

    const options: any[] = [
      {
        text: 'ถ่ายรูป',
        onPress: () => handlePickImage('camera')
      },
      {
        text: 'เลือกจากคลังรูป',
        onPress: () => handlePickImage('library')
      }
    ]

    options.push({
      text: 'ยกเลิก',
      style: 'cancel'
    })

    Alert.alert('จัดการรูปภาพ', 'เลือกการกระทำที่ต้องการ', options)
  }

  const handleDeleteImage = () => {
    Alert.alert('ลบรูปภาพ', 'คุณแน่ใจว่าต้องการลบรูปภาพนี้หรือไม่?', [
      {
        text: 'ยกเลิก',
        style: 'cancel'
      },
      {
        text: 'ลบ',
        onPress: onImageDeleted,
        style: 'destructive'
      }
    ])
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.imageContainer,
          disabled && styles.imageContainerDisabled
        ]}
        onPress={handleButtonPress}
        disabled={disabled || isLoading}
      >
        {imageUri ? (
          <>
            <Image source={{ uri: imageUri }} style={styles.image} />
            <View style={styles.overlay}>
              {isLoading ? (
                <ActivityIndicator size="large" color="#fff" />
              ) : (
                <MaterialCommunityIcons name="pencil" size={24} color="white" />
              )}
            </View>
            {onImageDeleted && !isLoading && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDeleteImage}
                disabled={disabled}
              >
                <MaterialCommunityIcons
                  name="trash-can"
                  size={20}
                  color="white"
                />
              </TouchableOpacity>
            )}
          </>
        ) : (
          <View style={styles.placeholderContainer}>
            {isLoading ? (
              <ActivityIndicator size="large" color="#5FA7D1" />
            ) : (
              <>
                <MaterialCommunityIcons
                  name="image-plus"
                  size={48}
                  color="#5FA7D1"
                />
                <Text style={styles.placeholderText}>{placeholder}</Text>
              </>
            )}
          </View>
        )}
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    alignItems: 'center'
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
    alignItems: 'center'
  },
  imageContainerDisabled: {
    opacity: 0.6
  },
  image: {
    width: '100%',
    height: '100%'
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  deleteButton: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#DC2626',
    borderRadius: 50,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  placeholderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%'
  },
  placeholderText: {
    marginTop: 8,
    fontSize: 12,
    color: '#5FA7D1',
    textAlign: 'center',
    fontFamily: 'Prompt_400Regular'
  }
})
