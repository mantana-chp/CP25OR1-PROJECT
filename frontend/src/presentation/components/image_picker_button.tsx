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
  View,
} from 'react-native'

interface ImagePickerButtonProps {
  onImageSelected: (imageUri: string) => void
  imageUri?: string
  disabled?: boolean
  placeholder?: string
}

export default function ImagePickerButton({
  onImageSelected,
  imageUri,
  disabled = false,
  placeholder = 'เลือกรูปภาพสัตว์เลี้ยง',
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
      console.error('❌ Error picking image:', error)
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถเลือกรูปภาพได้')
    } finally {
      setIsLoading(false)
    }
  }

  const handleButtonPress = () => {
    if (disabled) return

    Alert.alert('เลือกรูปภาพ', 'เลือกที่มาของรูปภาพ', [
      {
        text: 'ถ่ายรูป',
        onPress: () => handlePickImage('camera'),
      },
      {
        text: 'เลือกจากคลังรูป',
        onPress: () => handlePickImage('library'),
      },
      {
        text: 'ยกเลิก',
        style: 'cancel',
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
          </>
        ) : (
          <View style={styles.placeholderContainer}>
            {isLoading ? (
              <ActivityIndicator size='large' color='#4CAF50' />
            ) : (
              <>
                <MaterialCommunityIcons
                  name='image-plus'
                  size={48}
                  color='#4CAF50'
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
    alignItems: 'center',
  },
  imageContainer: {
    width: 150,
    height: 150,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#4CAF50',
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
  placeholderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  placeholderText: {
    marginTop: 8,
    fontSize: 12,
    color: '#4CAF50',
    textAlign: 'center',
    fontFamily: 'Prompt_400Regular',
  },
})
