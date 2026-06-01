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
  const [loading, setLoading] = useState(true)
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null)
  const {
    isAuthenticated,
    isLoading: authLoading,
    hasCompletedOnboarding
  } = useAuth()

  const fetchActivePets = useCallback(async () => {
    const response = await petProfileService.getMyPets()
    return response?.data || []
  }, [])

  const fetchPastPets = useCallback(async () => {
    const response = await petProfileService.getPastPets()
    return response?.data || []
  }, [])

  const refreshPets = useCallback(async () => {
    try {
      setLoading(true)
      const [petsData, pastPetsData] = await Promise.all([
        fetchActivePets(),
        fetchPastPets()
      ])

      setActivePetsData(petsData)
      setDeceasedPetsData(pastPetsData)

      setSelectedPetId((currentId) => {
        if (!currentId && petsData.length > 0) {
          return petsData[0].id
        }

        if (currentId && !petsData.find((p) => p.id === currentId)) {
          return petsData.length > 0 ? petsData[0].id : null
        }

        return currentId
      })
    } catch (error) {
      setActivePetsData([])
      setDeceasedPetsData([])
    } finally {
      setLoading(false)
    }
  }, [fetchActivePets, fetchPastPets])

  const refreshPastPets = useCallback(async () => {
    try {
      const pastPetsData = await fetchPastPets()
      setDeceasedPetsData(pastPetsData)
    } catch (error) {
      setDeceasedPetsData([])
    }
  }, [fetchPastPets])

  const getFirstPetId = useCallback(() => {
    return activePetsData[0]?.id || ''
  }, [activePetsData])

  const getSelectedPet = useCallback(() => {
    return activePetsData.find((p) => p.id === selectedPetId) || null
  }, [activePetsData, selectedPetId])

  const refreshDeletedPets = useCallback(async () => {
    try {
      const response = await petProfileService.getRecentlyDeletedPets()
      const deletedPetsData = response?.data || []
      const formattedDeleted: IDeletedPet[] = deletedPetsData
        .filter((pet) => pet.status === 'DELETED' && pet.deleted_at)
        .map((pet) => ({
          ...pet,
          deleted_at: pet.deleted_at!,
          status: 'DELETED' as const
        }))
      setDeletedPets(formattedDeleted)
    } catch (error) {
      setDeletedPets([])
    }
  }, [])

  const softDeletePet = useCallback(
    async (petId: string) => {
      try {
        await petProfileService.softDeletePet(petId)

        await Promise.all([refreshPets(), refreshDeletedPets()])
      } catch (error) {
        throw error
      }
    },
    [refreshPets, refreshDeletedPets]
  )

  const hardDeletePet = useCallback(
    async (petId: string) => {
      try {
        await petProfileService.permanentDeletePet(petId)

        await refreshDeletedPets()
      } catch (error) {
        throw error
      }
    },
    [refreshDeletedPets]
  )

  const restorePet = useCallback(
    async (petId: string) => {
      try {
        await petProfileService.restorePet(petId)
        await Promise.all([refreshPets(), refreshDeletedPets()])
      } catch (error) {
        throw error
      }
    },
    [refreshPets, refreshDeletedPets]
  )

  const markPetDeceased = useCallback(
    async (petId: string) => {
      try {
        await petProfileService.markPetAsDeceased(petId)

        await refreshPets()
      } catch (error) {
        throw error
      }
    },
    [refreshPets]
  )

  useEffect(() => {
    if (!authLoading && isAuthenticated && hasCompletedOnboarding) {
      refreshPets()
      refreshDeletedPets()
      return
    }

    setLoading(false)
    setActivePetsData([])
    setDeceasedPetsData([])
    setDeletedPets([])
    setSelectedPetId(null)
  }, [
    authLoading,
    isAuthenticated,
    hasCompletedOnboarding,
    refreshPets,
    refreshDeletedPets
  ])

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
