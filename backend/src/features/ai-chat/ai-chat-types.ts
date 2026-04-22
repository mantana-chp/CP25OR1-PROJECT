import { SeveritySubmissionInput, PetClarificationSubmissionInput } from './ai-chat-schema';

export type AIRequestMetrics = {
  geminiTextCalls: number;
  geminiEmbeddingCalls: number;
  pineconeSearchCalls: number;
  geminiPromptTokens: number;
  geminiCompletionTokens: number;
  geminiTotalTokens: number;
};

export type GeminiUsage = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
};

export type SeverityContextStatus =
  | 'not_required'
  | 'pending_clarification'
  | 'pending_severity'
  | 'resolved';

export type SeverityRequestData = {
  contextId: string;
  prompt: string;
  reason: 'symptom_needs_assessment' | 'new_symptom_context';
};

export type ClarificationRequestData = {
  contextId: string;
  prompt: string;
  reason: 'ambiguous_health_query';
  options: string[];
};

export type PetContextStatus =
  | 'not_required'
  | 'pending_clarification'
  | 'resolved';

export type PetClarificationRequestData = {
  contextId: string;
  prompt: string;
  reason: 'ambiguous_pet_name';
  options: Array<{
    petId: string;
    petName: string;
    role: 'OWNER' | 'CAREGIVER';
    petProfileUrl?: string;
  }>;
};

export type QueryIntent = 'symptom' | 'normal' | 'ambiguous_health';

export type RequestFinalState = 'completed' | 'clarification_returned' | 'failed';

// ---------------------------------------------------------------------------
// Service input/output types
// ---------------------------------------------------------------------------

export type ChatWithAIInput = {
  query: string;
  userId: string;
  installationId: string;
  clientChatSessionId: string;
  resolvedPetId?: string;
  contextId?: string;
  severitySubmission?: SeveritySubmissionInput;
  petClarificationSubmission?: PetClarificationSubmissionInput;
};

export type ChatWithAIResult = {
  answer: string;
  resolvedPetId?: string;
  resolvedPetRole?: 'OWNER' | 'CAREGIVER';
  severityFlag?: boolean;
  contextId: string;
  contextChanged?: boolean;
  contextStatus: SeverityContextStatus;
  petContextStatus?: PetContextStatus;
  petContextChanged?: boolean;
  severityRequest?: SeverityRequestData;
  clarificationRequest?: ClarificationRequestData;
  petClarificationRequest?: PetClarificationRequestData;
  severityLevel?: number;
};

// ---------------------------------------------------------------------------
// Usage summary logger types
// ---------------------------------------------------------------------------

export type UsageSummaryParams = {
  traceId: string;
  clientChatSessionId: string;
  sessionTurnCount: number;
  contextId: string;
  contextStatus: SeverityContextStatus;
  startedAt: number;
  metrics: AIRequestMetrics;
  finalState: RequestFinalState;
  hasPetProfileContext: boolean;
  petProfileSkipped: boolean;
  pineconeRelevantDocs: number;
};
