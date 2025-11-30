import { petProfileService } from '@/src/utils/api/services/pet_profile_service'
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState
} from 'react'
import { IPetProfile } from '../domain/pet.domain'

interface PetContextType {
  pets: IPetProfile[]
  loading: boolean
  refreshPets: () => Promise<void>
  getFirstPetId: () => string
}

const PetContext = createContext<PetContextType | undefined>(undefined)

export function PetProvider({ children }: { children: React.ReactNode }) {
  const [pets, setPets] = useState<IPetProfile[]>([])
  const [loading, setLoading] = useState(false)

  const refreshPets = useCallback(async () => {
    try {
      setLoading(true)
      const response = await petProfileService.getMyPets()
      const petsData = response?.data || []
      setPets(petsData)
    } catch (error) {
      console.error('Error fetching pets:', error)
      setPets([])
    } finally {
      setLoading(false)
    }
  }, [])

  const getFirstPetId = useCallback(() => {
    return pets[0]?.id || ''
  }, [pets])

  useEffect(() => {
    refreshPets()
  }, [refreshPets])

  return (
    <PetContext.Provider value={{ pets, loading, refreshPets, getFirstPetId }}>
      {children}
    </PetContext.Provider>
  )
}

export function usePets() {
  const context = useContext(PetContext)
  if (!context) {
    throw new Error('usePets must be used within PetProvider')
  }
  return context
}
