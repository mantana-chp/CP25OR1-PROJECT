import React from 'react'
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native'
import { Image as ExpoImage } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { useProfileImageUpload } from '@/src/hooks/useProfileImageUpload'
import { IPetProfile } from '@/src/domain/pet.domain'

interface PetAvatarProps {
  pet: IPetProfile
  onImageUpdated: () => void
}

export default function PetAvatar({ pet, onImageUpdated }: PetAvatarProps) {
  const { isUploading, showImagePickerModal } = useProfileImageUpload({
    onSuccess: onImageUpdated,
  })

  return (
    <TouchableOpacity
      onPress={() => showImagePickerModal(pet.id, !!pet.profile_image_url)}
      disabled={isUploading}
      style={styles.container}
    >
      {pet.profile_image_url ? (
        <ExpoImage
          source={{ uri: pet.profile_image_url }}
          style={styles.image}
          contentFit='cover'
          transition={200}
        />
      ) : (
        <View style={styles.placeholder}>
          <Ionicons name='paw' size={40} color='#ccc' />
        </View>
      )}

      {isUploading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color='#fff' />
        </View>
      )}

      <View style={styles.editBadge}>
        <Ionicons name='camera' size={16} color='#fff' />
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
