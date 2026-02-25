import { petProfileService } from '@/src/utils/api/services/pet_profile_service'
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState
} from 'react'
import { IDeletedPet, IPetProfile } from '../domain/pet.domain'
import { useAuth } from './AuthContext'

interface PetContextType {
  pets: IPetProfile[]
  deletedPets: IDeletedPet[]
  loading: boolean
  refreshPets: () => Promise<void>
  refreshDeletedPets: () => Promise<void>
  getFirstPetId: () => string
  selectedPetId: string | null
  setSelectedPetId: (petId: string | null) => void
  getSelectedPet: () => IPetProfile | null
  softDeletePet: (petId: string) => Promise<void>
  hardDeletePet: (petId: string) => Promise<void>
  restorePet: (petId: string) => Promise<void>
}

const PetContext = createContext<PetContextType | undefined>(undefined)

export function PetProvider({ children }: { children: React.ReactNode }) {
  const [pets, setPets] = useState<IPetProfile[]>([])
  const [deletedPets, setDeletedPets] = useState<IDeletedPet[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null)
  const { isAuthenticated, isLoading: authLoading } = useAuth()

  const refreshPets = useCallback(async () => {
    try {
      setLoading(true)
      const response = await petProfileService.getMyPets()
      const petsData = response?.data || []

      // MOCK: Filter out pets that are in deletedPets (since API still returns them)
      const deletedIds = new Set(deletedPets.map((p) => p.id))
      const activePets = petsData.filter((p) => !deletedIds.has(p.id))
      setPets(activePets)

      // Auto-select first pet if none selected
      if (activePets.length > 0 && !selectedPetId) {
        setSelectedPetId(activePets[0].id)
      }

      // Clear selection if selected pet no longer exists
      if (selectedPetId && !activePets.find((p) => p.id === selectedPetId)) {
        setSelectedPetId(activePets.length > 0 ? activePets[0].id : null)
      }
    } catch (error) {
      console.error('Error fetching pets:', error)
      setPets([])
    } finally {
      setLoading(false)
    }
  }, [selectedPetId, deletedPets])

  const getFirstPetId = useCallback(() => {
    return pets[0]?.id || ''
  }, [pets])

  const getSelectedPet = useCallback(() => {
    return pets.find((p) => p.id === selectedPetId) || null
  }, [pets, selectedPetId])

  const refreshDeletedPets = useCallback(async () => {
    // Mock: deletedPets is managed locally, no API call needed
  }, [])

  // MOCK: Soft delete - move pet from pets to deletedPets (local state only)
  const softDeletePet = useCallback(
    async (petId: string) => {
      const petToDelete = pets.find((p) => p.id === petId)
      if (petToDelete) {
        // Remove from active pets
        setPets((prev) => prev.filter((p) => p.id !== petId))
        // Add to deleted pets with deleted_at timestamp
        const deletedPet: IDeletedPet = {
          ...petToDelete,
          deleted_at: new Date().toISOString()
        }
        setDeletedPets((prev) => [deletedPet, ...prev])
        // Update selected pet if needed
        if (selectedPetId === petId) {
          const remainingPets = pets.filter((p) => p.id !== petId)
          setSelectedPetId(
            remainingPets.length > 0 ? remainingPets[0].id : null
          )
        }
      }
    },
    [pets, selectedPetId]
  )

  // MOCK: Hard delete - permanently remove from deletedPets (local state only)
  const hardDeletePet = useCallback(async (petId: string) => {
    setDeletedPets((prev) => prev.filter((p) => p.id !== petId))
  }, [])

  // MOCK: Restore - move pet from deletedPets back to pets (local state only)
  const restorePet = useCallback(
    async (petId: string) => {
      const petToRestore = deletedPets.find((p) => p.id === petId)
      if (petToRestore) {
        // Remove deleted_at and add back to active pets
        const { deleted_at, ...restoredPet } = petToRestore
        setPets((prev) => [...prev, restoredPet])
        setDeletedPets((prev) => prev.filter((p) => p.id !== petId))
      }
    },
    [deletedPets]
  )

  useEffect(() => {
    // Only fetch pets when authentication is complete and user is authenticated
    if (!authLoading && isAuthenticated) {
      refreshPets()
      refreshDeletedPets()
    }
  }, [authLoading, isAuthenticated, refreshPets, refreshDeletedPets])

  return (
    <PetContext.Provider
      value={{
        pets,
        deletedPets,
        loading,
        refreshPets,
        refreshDeletedPets,
        getFirstPetId,
        selectedPetId,
        setSelectedPetId,
        getSelectedPet,
        softDeletePet,
        hardDeletePet,
        restorePet
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
