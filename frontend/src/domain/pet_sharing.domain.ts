import { IPetProfile } from './pet.domain'

export interface ICaregiver {
  accessId: string
  contactId: string
  alias: string
  grantedAt: string
}

export interface IPendingInvitePet {
  id: string
  pet_name: string
}

export interface IPendingInvite {
  inviteId: string
  alias: string
  expiresAt: string
  createdAt: string
  pets: IPendingInvitePet[]
}

export interface IGenerateInviteResponse {
  inviteId: string
  expiresAt: string
  alias: string
  petIds: string[]
}

export interface IAccessListResponse {
  caregivers: ICaregiver[]
  selfAccessId: string | null
}

export interface IClaimInviteResponse {
  added: IPetProfile[]
  alreadyShared: IPetProfile[]
}

export interface INormalizedClaimInviteResult {
  added: IPetProfile[]
  alreadyShared: IPetProfile[]
}

export type TClaimInvitePayload = IPetProfile[] | IClaimInviteResponse | null
