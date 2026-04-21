export interface ChatRequest {
  query: string
  clientChatSessionId: string
  resolvedPetId?: string
  contextId?: string
  severitySubmission?: {
    contextId: string
    level: SeverityLevel
    label?: string
  }
  petClarificationSubmission?: {
    contextId: string
    selectedPetId: string
  }
}

export type ContextStatus =
  | 'clean'
  | 'pending_clarification'
  | 'pending_severity'
  | 'resolved'
  | 'not_required'

export type PetContextStatus =
  | 'no_pet'
  | 'pending_clarification'
  | 'resolved'
  | 'not_required'

export interface SeverityRequestData {
  contextId: string
  prompt: string
  reason: 'symptom_needs_assessment' | 'new_symptom_context'
}

export interface ClarificationRequestData {
  contextId: string
  prompt: string
  reason: 'ambiguous_health_query'
  options?: string[]
}

export interface PetClarificationOption {
  petId?: string
  petName?: string
  id?: string
  pet_name?: string
  profileImageUrl?: string | null
  profile_image_url?: string | null
  profileImage?: string | null
  avatarUrl?: string | null
  imageUrl?: string | null
  role: 'OWNER' | 'CAREGIVER'
  ownerAlias?: string | null
}

export interface PetClarificationRequestData {
  contextId: string
  prompt: string
  reason?: 'ambiguous_pet_name'
  options?: PetClarificationOption[]
  ambiguousPets?: PetClarificationOption[]
}

export interface ChatResponse {
  answer: string
  contextId: string
  contextStatus: ContextStatus
  resolvedPetId?: string
  resolvedPetRole?: 'OWNER' | 'CAREGIVER'
  resolvedOwnerAlias?: string
  severityFlag?: boolean
  contextChanged?: boolean
  petContextStatus?: PetContextStatus
  petContextChanged?: boolean
  severityRequest?: SeverityRequestData
  clarificationRequest?: ClarificationRequestData
  petClarificationRequest?: PetClarificationRequestData
  severityLevel?: number
}

export type SeverityLevel = 1 | 2 | 3 | 4 | 5

export interface SeverityContext {
  level: SeverityLevel
  label: string
}
