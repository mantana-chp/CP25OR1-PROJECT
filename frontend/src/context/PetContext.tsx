import { petProfileService } from '@/src/utils/api/services/pet_profile_service'
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState
} from 'react'
import { IPetProfile } from '../domain/pet.domain'
import { useAuth } from './AuthContext'

interface PetContextType {
  pets: IPetProfile[]
  loading: boolean
  refreshPets: () => Promise<void>
  getFirstPetId: () => string
  selectedPetId: string | null
  setSelectedPetId: (petId: string | null) => void
  getSelectedPet: () => IPetProfile | null
}

const PetContext = createContext<PetContextType | undefined>(undefined)

export function PetProvider({ children }: { children: React.ReactNode }) {
  const [pets, setPets] = useState<IPetProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null)
  const { isAuthenticated, isLoading: authLoading } = useAuth()

  const refreshPets = useCallback(async () => {
    try {
      setLoading(true)
      const response = await petProfileService.getMyPets()
      const petsData = response?.data || []
      setPets(petsData)

      // Auto-select first pet if none selected
      if (petsData.length > 0 && !selectedPetId) {
        setSelectedPetId(petsData[0].id)
      }

      // Clear selection if selected pet no longer exists
      if (selectedPetId && !petsData.find((p) => p.id === selectedPetId)) {
        setSelectedPetId(petsData.length > 0 ? petsData[0].id : null)
      }
    } catch (error) {
      console.error('Error fetching pets:', error)
      setPets([])
    } finally {
      setLoading(false)
    }
  }, [selectedPetId])

  const getFirstPetId = useCallback(() => {
    return pets[0]?.id || ''
  }, [pets])

  const getSelectedPet = useCallback(() => {
    return pets.find((p) => p.id === selectedPetId) || null
  }, [pets, selectedPetId])

  useEffect(() => {
    // Only fetch pets when authentication is complete and user is authenticated
    if (!authLoading && isAuthenticated) {
      refreshPets()
    }
  }, [authLoading, isAuthenticated, refreshPets])

  return (
    <PetContext.Provider
      value={{
        pets,
        loading,
        refreshPets,
        getFirstPetId,
        selectedPetId,
        setSelectedPetId,
        getSelectedPet
      }}
    >
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
