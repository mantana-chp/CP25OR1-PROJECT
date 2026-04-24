import { GoogleGenAI, Chat } from '@google/genai';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../../config';
import { logger } from '../../libs/logger';

type SeverityContextStatus =
  | 'not_required'
  | 'pending_clarification'
  | 'pending_severity'
  | 'resolved';

export type SessionEntry = {
  chatSession: Chat;
  createdAt: number;
  lastActivityAt: number;
  turnCount: number;
  /** Pet currently resolved for this session. Updated each turn by pet detection. */
  resolvedPetId?: string;
  /** Role of the currently resolved pet (OWNER or CAREGIVER). */
  resolvedPetRole?: 'OWNER' | 'CAREGIVER';
  /**
   * The petId whose full profile was last injected into the conversation.
   * Used to skip re-injection when the same pet continues.
   */
  lastInjectedPetId?: string;
  /** Role of the last injected pet (to detect role change on re-injection). */
  lastInjectedPetRole?: 'OWNER' | 'CAREGIVER';
  /** Active severity context UUID for this session. */
  activeContextId: string;
  contextStatus: SeverityContextStatus;
  /** If severity was resolved this session, stores the level. */
  severityLevel?: number;
  /**
   * Symptom topics detected from the latest symptom turn.
   * Used to detect context rotation when a new symptom topic arrives.
   */
  lastSymptomTopics: Set<string>;
  /**
   * Tracks pending pet clarification when duplicate pet names are detected.
   * Cleared once the user selects which pet they mean.
   */
  pendingPetClarification?: {
    contextId: string;
    ambiguousPetIds: string[];
  };
  /**
   * When a symptom turn (pending_severity) coincides with pet name ambiguity,
   * the severity request is deferred here and activated once the pet is resolved.
   */
  pendingSymptomSeverity?: {
    contextId: string;
    contextChanged: boolean;
    symptomTopics: Set<string>;
  };
};

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes inactivity
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // sweep every 5 minutes

// ---------------------------------------------------------------------------
// In-memory store
// Key format: `${installationId}:${clientChatSessionId}`
// ---------------------------------------------------------------------------

const sessions = new Map<string, SessionEntry>();

// ---------------------------------------------------------------------------
// Native Gemini AI client (for chat sessions only)
// Layer 3 pet extraction continues to use the LangChain llm in the service.
// ---------------------------------------------------------------------------

const genAI = new GoogleGenAI({ apiKey: config.google.apiKey });

const buildSessionKey = (
  installationId: string,
  clientChatSessionId: string
): string => `${installationId}:${clientChatSessionId}`;

const maskKey = (key: string): string => {
  const parts = key.split(':');
  const masked = parts.map((p) =>
    p.length > 8 ? `${p.slice(0, 4)}…${p.slice(-4)}` : '****'
  );
  return masked.join(':');
};

/**
 * Returns an existing session or creates a new Gemini chat session.
 * The systemInstruction (static vet assistant rules) is set at creation
 * and stays fixed for the session lifetime.
 */
export const getOrCreateSession = (
  installationId: string,
  clientChatSessionId: string,
  systemInstruction: string
): SessionEntry => {
  const key = buildSessionKey(installationId, clientChatSessionId);
  const existing = sessions.get(key);

  if (existing) {
    logger.info(
      `[SessionManager] Reusing session. key=${maskKey(key)}, turn=${existing.turnCount}, lastActivity=${Date.now() - existing.lastActivityAt}ms ago`
    );
    return existing;
  }

  logger.info(`[SessionManager] Creating new session. key=${maskKey(key)}`);

  const chatSession = genAI.chats.create({
    model: 'gemini-2.5-flash',
    config: { systemInstruction },
  });

  const entry: SessionEntry = {
    chatSession,
    createdAt: Date.now(),
    lastActivityAt: Date.now(),
    turnCount: 0,
    resolvedPetId: undefined,
    resolvedPetRole: undefined,
    lastInjectedPetId: undefined,
    lastInjectedPetRole: undefined,
    activeContextId: uuidv4(),
    contextStatus: 'not_required',
    severityLevel: undefined,
    lastSymptomTopics: new Set(),
    pendingPetClarification: undefined,
    pendingSymptomSeverity: undefined,
  };

  sessions.set(key, entry);

  logger.info(
    `[SessionManager] Session created. key=${maskKey(key)}, totalActiveSessions=${sessions.size}`
  );

  return entry;
};

/**
 * Updates lastActivityAt and increments turnCount.
 * Call this AFTER a successful sendMessage.
 */
export const touchSession = (
  installationId: string,
  clientChatSessionId: string
): void => {
  const key = buildSessionKey(installationId, clientChatSessionId);
  const entry = sessions.get(key);
  if (entry) {
    entry.lastActivityAt = Date.now();
    entry.turnCount += 1;
  }
};

/**
 * Forcibly removes a session from the store.
 */
export const destroySession = (
  installationId: string,
  clientChatSessionId: string
): void => {
  const key = buildSessionKey(installationId, clientChatSessionId);
  const existed = sessions.delete(key);
  if (existed) {
    logger.info(`[SessionManager] Session destroyed. key=${maskKey(key)}`);
  }
};

/**
 * Evicts sessions that have been inactive for longer than SESSION_TTL_MS.
 */
const cleanupStaleSessions = (): void => {
  const now = Date.now();
  let evicted = 0;

  for (const [key, entry] of sessions.entries()) {
    if (now - entry.lastActivityAt > SESSION_TTL_MS) {
      sessions.delete(key);
      evicted += 1;
    }
  }

  logger.info(
    `[SessionManager] Cleanup sweep: evicted=${evicted}, remaining=${sessions.size}`
  );
};

/**
 * Starts the periodic cleanup timer.
 * Should be called once at application startup.
 */
export const startCleanupTimer = (): void => {
  setInterval(cleanupStaleSessions, CLEANUP_INTERVAL_MS);
  logger.info(
    `[SessionManager] Cleanup timer started. TTL=${SESSION_TTL_MS / 1000}s, interval=${CLEANUP_INTERVAL_MS / 1000}s`
  );
};

/** Returns the current active session count (for observability). */
export const getSessionCount = (): number => sessions.size;
