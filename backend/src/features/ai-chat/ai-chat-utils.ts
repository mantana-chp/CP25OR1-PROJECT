import {
  AIRequestMetrics,
  GeminiUsage,
  SeverityContextStatus,
  RequestFinalState,
  UsageSummaryParams,
} from './ai-chat-types';


export const createTraceId = (): string =>
  `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const toSafeNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return undefined;
};

export const formatTokenLogValue = (value?: number): string =>
  value === undefined ? 'n/a' : String(value);


/**
 * Extracts token usage from a LangChain LLM response (used for Layer 3 calls).
 */
export const extractGeminiUsage = (message: unknown): GeminiUsage => {
  const msg = message as {
    usage_metadata?: {
      input_tokens?: number;
      output_tokens?: number;
      total_tokens?: number;
    };
    response_metadata?: {
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      };
      usage_metadata?: {
        input_tokens?: number;
        output_tokens?: number;
        total_tokens?: number;
      };
      tokenUsage?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      };
    };
  };

  if (msg.usage_metadata) {
    return {
      promptTokens: toSafeNumber(msg.usage_metadata.input_tokens),
      completionTokens: toSafeNumber(msg.usage_metadata.output_tokens),
      totalTokens: toSafeNumber(msg.usage_metadata.total_tokens),
    };
  }

  const usageMeta = (
    msg.response_metadata?.usageMetadata ??
    msg.response_metadata?.usage_metadata ??
    msg.response_metadata?.tokenUsage
  ) as Record<string, unknown> | undefined;

  return {
    promptTokens: toSafeNumber(
      usageMeta?.promptTokenCount ?? usageMeta?.input_tokens
    ),
    completionTokens: toSafeNumber(
      usageMeta?.candidatesTokenCount ?? usageMeta?.output_tokens
    ),
    totalTokens: toSafeNumber(
      usageMeta?.totalTokenCount ?? usageMeta?.total_tokens
    ),
  };
};

/**
 * Extracts token usage from a native @google/genai chat.sendMessage() response.
 * Response shape: { usageMetadata: { promptTokenCount, candidatesTokenCount, totalTokenCount } }
 */
export const extractNativeGeminiUsage = (response: unknown): GeminiUsage => {
  const res = response as {
    usageMetadata?: {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
      totalTokenCount?: number;
    };
  };

  const meta = res.usageMetadata;
  if (!meta) return {};

  return {
    promptTokens: toSafeNumber(meta.promptTokenCount),
    completionTokens: toSafeNumber(meta.candidatesTokenCount),
    totalTokens: toSafeNumber(meta.totalTokenCount),
  };
};

export const addUsageToMetrics = (
  metrics: AIRequestMetrics,
  usage: GeminiUsage
): void => {
  if (usage.promptTokens !== undefined) {
    metrics.geminiPromptTokens += usage.promptTokens;
  }
  if (usage.completionTokens !== undefined) {
    metrics.geminiCompletionTokens += usage.completionTokens;
  }
  if (usage.totalTokens !== undefined) {
    metrics.geminiTotalTokens += usage.totalTokens;
  }
};


export const buildRequestUsageSummary = ({
  traceId,
  clientChatSessionId,
  sessionTurnCount,
  contextId,
  contextStatus,
  startedAt,
  metrics,
  finalState,
  hasPetProfileContext,
  petProfileSkipped,
  pineconeRelevantDocs,
}: UsageSummaryParams): string =>
  `[AI Chat][${traceId}] Session usage summary: clientChatSessionId=${clientChatSessionId.slice(0, 8)}…, sessionTurn=${sessionTurnCount}, contextId=${contextId}, contextStatus=${contextStatus}, finalState=${finalState}, durationMs=${Date.now() - startedAt}, calls{geminiText=${metrics.geminiTextCalls}, geminiEmbedding=${metrics.geminiEmbeddingCalls}, pineconeSearch=${metrics.pineconeSearchCalls}}, tokens{prompt=${formatTokenLogValue(metrics.geminiPromptTokens)}, completion=${formatTokenLogValue(metrics.geminiCompletionTokens)}, total=${formatTokenLogValue(metrics.geminiTotalTokens)}}, rag{petProfileIncluded=${hasPetProfileContext}, petProfileSkipped=${petProfileSkipped}, pineconeRelevantDocs=${pineconeRelevantDocs}}`;
