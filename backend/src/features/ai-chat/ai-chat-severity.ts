// ---------------------------------------------------------------------------
// AI Chat Service - Severity Context Module
// Query intent classification and severity state derivation
// ---------------------------------------------------------------------------

import { v4 as uuidv4 } from 'uuid';
import { AIChatRuntimeConfig } from './ai-chat-config-loader';
import { SessionEntry } from './ai-chat-session-manager';
import {
  QueryIntent,
  SeverityContextStatus,
} from './ai-chat-types';

// ---------------------------------------------------------------------------
// Text processing helpers
// ---------------------------------------------------------------------------

const LEGACY_SEVERITY_PREFIX = /^\s*\[SEVERITY:\s*([1-5])\/5\]\s*/i;

const normalizeText = (value: string): string => value.toLowerCase().trim();

const containsAnyKeyword = (input: string, keywords: string[]): boolean => {
  const normalized = normalizeText(input);
  if (!normalized) return false;
  return keywords.some((keyword) => normalized.includes(keyword));
};

export const buildSystemInstruction = (
  runtimeConfig: AIChatRuntimeConfig
): string => runtimeConfig.system_instruction_lines.join('\n').trim();

export const parseLegacySeverityQuery = (
  input: string
): { level?: number; cleanQuery: string } => {
  const match = input.match(LEGACY_SEVERITY_PREFIX);
  if (!match) {
    return { cleanQuery: input };
  }

  const level = Number(match[1]);
  const cleanQuery = input.replace(LEGACY_SEVERITY_PREFIX, '').trim();
  return {
    level: Number.isInteger(level) ? level : undefined,
    cleanQuery,
  };
};

export const extractSymptomTopics = (
  input: string,
  symptomTopicGroups: AIChatRuntimeConfig['symptom_topic_groups']
): Set<string> => {
  const normalized = normalizeText(input);
  const topics = new Set<string>();

  if (!normalized) return topics;

  for (const group of symptomTopicGroups) {
    if (group.keywords.some((keyword) => normalized.includes(keyword))) {
      topics.add(group.topic);
    }
  }

  return topics;
};

export const hasSymptomTopics = (
  input: string,
  symptomTopicGroups: AIChatRuntimeConfig['symptom_topic_groups']
): boolean => extractSymptomTopics(input, symptomTopicGroups).size > 0;

export const classifyQueryIntent = (
  input: string,
  runtimeConfig: AIChatRuntimeConfig
): QueryIntent => {
  if (hasSymptomTopics(input, runtimeConfig.symptom_topic_groups)) {
    return 'symptom';
  }

  if (containsAnyKeyword(input, runtimeConfig.health_ambiguous_hint_keywords)) {
    return 'ambiguous_health';
  }

  if (containsAnyKeyword(input, runtimeConfig.normal_care_keywords)) {
    return 'normal';
  }

  return 'normal';
};

/**
 * Determines if the current symptom query represents a NEW symptom context
 * compared to what is stored in session metadata.
 * Replaces the old `shouldRotateContextForNewSymptom()` that scanned history.
 */
const shouldRotateContextViaSession = (
  currentTopics: Set<string>,
  sessionLastTopics: Set<string>
): boolean => {
  if (currentTopics.size === 0) return false;
  if (sessionLastTopics.size === 0) return false;

  for (const topic of currentTopics) {
    if (sessionLastTopics.has(topic)) {
      return false; // overlap found — same context
    }
  }

  return true; // no overlap — context shifted
};

// ---------------------------------------------------------------------------
// Session-based severity state deriver
// ---------------------------------------------------------------------------

/**
 * Derives the new contextStatus and whether to rotate context,
 * based on session metadata instead of the old history array scanning.
 */
export const deriveContextState = (
  session: SessionEntry,
  queryIntent: QueryIntent,
  isSeveritySubmissionTurn: boolean,
  currentSymptomTopics: Set<string>,
  incomingContextId: string | undefined,
  runtimeConfig: AIChatRuntimeConfig
): {
  effectiveContextId: string;
  contextChanged: boolean;
  contextStatus: SeverityContextStatus;
} => {
  // If submitting severity for an existing context
  if (isSeveritySubmissionTurn) {
    return {
      effectiveContextId: incomingContextId ?? session.activeContextId,
      contextChanged: false,
      contextStatus: 'resolved',
    };
  }

  if (queryIntent === 'ambiguous_health') {
    // If the session already has an active symptom context (resolved or pending),
    // this is a follow-up question, not a new ambiguous query.
    // e.g. "ต้องเฝ้าดูอาการอีกกี่ชั่วโมงดี" after a vomiting severity was resolved
    // → contains "อาการ" (health keyword) but is clearly a follow-up.
    const hasActiveSymptomContext =
      session.contextStatus === 'resolved' ||
      session.contextStatus === 'pending_severity';

    if (hasActiveSymptomContext) {
      return {
        effectiveContextId: incomingContextId ?? session.activeContextId,
        contextChanged: false,
        contextStatus: session.contextStatus, // keep current state
      };
    }

    return {
      effectiveContextId: incomingContextId ?? session.activeContextId,
      contextChanged: false,
      contextStatus: 'pending_clarification',
    };
  }

  if (queryIntent === 'normal') {
    return {
      effectiveContextId: incomingContextId ?? session.activeContextId,
      contextChanged: false,
      contextStatus: 'not_required',
    };
  }

  // queryIntent === 'symptom'
  const shouldRotate = shouldRotateContextViaSession(
    currentSymptomTopics,
    session.lastSymptomTopics
  );

  if (shouldRotate) {
    return {
      effectiveContextId: uuidv4(),
      contextChanged: true,
      contextStatus: 'pending_severity',
    };
  }

  // Same symptom context — check if severity is already resolved in this session
  const alreadyResolved =
    session.contextStatus === 'resolved' &&
    session.activeContextId === (incomingContextId ?? session.activeContextId);

  return {
    effectiveContextId: incomingContextId ?? session.activeContextId,
    contextChanged: false,
    contextStatus: alreadyResolved ? 'resolved' : 'pending_severity',
  };
};
