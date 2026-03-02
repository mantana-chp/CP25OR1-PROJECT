import { petProfileService } from '@/src/utils/api/services/pet_profile_service'
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react'
import { IDeletedPet, IPetProfile } from '../domain/pet.domain'
import { useAuth } from './AuthContext'

interface PetContextType {
  pets: IPetProfile[]
  activePets: IPetProfile[]
  deceasedPets: IPetProfile[]
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
  markPetDeceased: (petId: string) => Promise<void>
}

const PetContext = createContext<PetContextType | undefined>(undefined)

export function PetProvider({ children }: { children: React.ReactNode }) {
  const [activePetsData, setActivePetsData] = useState<IPetProfile[]>([])
  const [deceasedPetsData, setDeceasedPetsData] = useState<IPetProfile[]>([])
  const [deletedPets, setDeletedPets] = useState<IDeletedPet[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null)
  const { isAuthenticated, isLoading: authLoading } = useAuth()

  // Fetch active pets
  const refreshPets = useCallback(async () => {
    try {
      setLoading(true)
      const response = await petProfileService.getMyPets()
      const petsData = response?.data || []
      setActivePetsData(petsData)

      // Update selection state after fetching, using the current selectedPetId
      // This is a closure over selectedPetId, not a dependency
      setSelectedPetId((currentId) => {
        // Auto-select first pet if none selected
        if (!currentId && petsData.length > 0) {
          return petsData[0].id
        }

        // Clear selection if selected pet no longer exists
        if (currentId && !petsData.find((p) => p.id === currentId)) {
          return petsData.length > 0 ? petsData[0].id : null
        }

        return currentId
      })
    } catch (error) {
      console.error('Error fetching active pets:', error)
      setActivePetsData([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch deceased pets
  const refreshPastPets = useCallback(async () => {
    try {
      const response = await petProfileService.getPastPets()
      const pastPetsData = response?.data || []
      setDeceasedPetsData(pastPetsData)
    } catch (error) {
      console.error('Error fetching past pets:', error)
      setDeceasedPetsData([])
    }
  }, [])

  const getFirstPetId = useCallback(() => {
    return activePetsData[0]?.id || ''
  }, [activePetsData])

  const getSelectedPet = useCallback(() => {
    return activePetsData.find((p) => p.id === selectedPetId) || null
  }, [activePetsData, selectedPetId])

  const refreshDeletedPets = useCallback(async () => {
    try {
      console.log('🔄 Fetching recently deleted pets...')
      const response = await petProfileService.getRecentlyDeletedPets()
      console.log('📦 Deleted pets response:', response)
      const deletedPetsData = response?.data || []
      console.log('📊 Deleted pets data:', deletedPetsData)
      // Filter only deleted pets (not deceased)
      const formattedDeleted: IDeletedPet[] = deletedPetsData
        .filter((pet) => pet.status === 'DELETED' && pet.deleted_at)
        .map((pet) => ({
          ...pet,
          deleted_at: pet.deleted_at!,
          status: 'DELETED' as const
        }))
      console.log('✅ Formatted deleted pets:', formattedDeleted.length, 'pets')
      setDeletedPets(formattedDeleted)
    } catch (error) {
      console.error('❌ Error fetching deleted pets:', error)
      setDeletedPets([])
    }
  }, [])

  // Soft delete - call backend API with JUST_DELETE reason
  const softDeletePet = useCallback(
    async (petId: string) => {
      try {
        console.log('🗑️ Soft deleting pet:', petId)
        // Call backend API to soft delete
        const response = await petProfileService.softDeletePet(petId)
        console.log('✅ Soft delete response:', response)

        // Refresh data from all APIs
        // This will automatically update selection if the deleted pet was selected
        await Promise.all([refreshPets(), refreshDeletedPets()])
        console.log('✅ Pets and deleted pets refreshed after delete')
      } catch (error) {
        console.error('❌ Error soft deleting pet:', error)
        throw error
      }
    },
    [refreshPets, refreshDeletedPets]
  )

  // MOCK: Hard delete - permanently remove from deletedPets (local state only)
  const hardDeletePet = useCallback(async (petId: string) => {
    setDeletedPets((prev) => prev.filter((p) => p.id !== petId))
  }, [])

  // MOCK: Restore - move pet from deletedPets back to activePets (local state only)
  const restorePet = useCallback(
    async (petId: string) => {
      const petToRestore = deletedPets.find((p) => p.id === petId)
      if (petToRestore) {
        // Remove deleted_at and add back to active pets
        const { deleted_at, ...restoredPet } = petToRestore
        setActivePetsData((prev) => [...prev, restoredPet as IPetProfile])
        setDeletedPets((prev) => prev.filter((p) => p.id !== petId))
      }
    },
    [deletedPets]
  )

  // Mark pet as deceased - call backend API
  const markPetDeceased = useCallback(
    async (petId: string) => {
      try {
        // Call backend API to mark as deceased
        await petProfileService.markPetAsDeceased(petId)

        // Refresh data from both APIs
        // This will automatically update selection if the deceased pet was selected
        await refreshPets()
        await refreshPastPets()
      } catch (error) {
        console.error('Error marking pet as deceased:', error)
        throw error
      }
    },
    [refreshPets, refreshPastPets]
  )

  useEffect(() => {
    // Only fetch pets when authentication is complete and user is authenticated
    if (!authLoading && isAuthenticated) {
      refreshPets()
      refreshPastPets()
      refreshDeletedPets()
    }
  }, [
    authLoading,
    isAuthenticated,
    refreshPets,
    refreshPastPets,
    refreshDeletedPets
  ])

  // Combine all pets for the provider value
  const allPets = [...activePetsData, ...deceasedPetsData]

  return (
    <PetContext.Provider
      value={{
        pets: allPets,
        activePets: activePetsData,
        deceasedPets: deceasedPetsData,
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
        restorePet,
        markPetDeceased
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
