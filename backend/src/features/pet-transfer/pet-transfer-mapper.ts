import { TransferPreviewPetDto } from './pet-transfer-types'
import { formatAgeFromBirthDate } from '../../shared/utils'
import { generateDownloadUrl } from '../file-uploads/upload-service'

/**
 * Map a pet database record to a TransferPreviewPetDto.
 */
export const toPreviewPetDto = async (pet: {
  id: string
  pet_name: string
  gender: string
  birth_date: Date | null
  weight: any
  profile_image_key: string | null
  status: string
  species: { name_th: string } | null
  breeds: { name_th: string } | null
}): Promise<TransferPreviewPetDto> => {
  let profileImageUrl: string | null = null
  if (pet.profile_image_key) {
    try {
      profileImageUrl = await generateDownloadUrl(pet.profile_image_key, 3600)
    } catch {
      profileImageUrl = null
    }
  }

  return {
    id: pet.id,
    petName: pet.pet_name,
    species: pet.species?.name_th ?? null,
    breed: pet.breeds?.name_th ?? null,
    gender: pet.gender,
    age: pet.birth_date ? formatAgeFromBirthDate(pet.birth_date) : null,
    weight: pet.weight ? parseFloat(pet.weight.toString()) : null,
    profileImageUrl,
    status: pet.status,
  }
}
