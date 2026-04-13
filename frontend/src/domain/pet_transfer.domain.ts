export interface ITransferTokenResponse {
  transferId: string
  expiresAt: string
  createdAt: string
  petIds: string[]
}

export interface ITransferPreviewPet {
  id: string
  petName: string
  species: string | null
  breed: string | null
  gender: string
  age: number | null
  weight: number | null
  profileImageUrl: string | null
  status: string
}

export interface ITransferPreviewResponse {
  transferId: string
  expiresAt: string
  pets: ITransferPreviewPet[]
  receiverCurrentPetCount: number
  incomingPetCount: number
  wouldExceedLimit: boolean
  maxPetLimit: number
}

export interface ITransferAcceptResponse {
  message: string
  transferredPets: ITransferPreviewPet[]
}

export interface IPendingTransferPet {
  id: string
  petName: string
}

export interface IPendingTransfer {
  transferId: string
  expiresAt: string
  createdAt: string
  pets: IPendingTransferPet[]
}
