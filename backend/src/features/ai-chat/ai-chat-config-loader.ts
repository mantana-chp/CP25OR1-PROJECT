import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../../libs/logger';

export type AIChatSymptomTopicGroup = {
    topic: string;
    keywords: string[];
};

export type AIChatRuntimeConfig = {
    system_instruction_lines: string[];
    symptom_topic_groups: AIChatSymptomTopicGroup[];
    normal_care_keywords: string[];
    health_ambiguous_hint_keywords: string[];
    clarification_prompt: string;
    clarification_options: string[];
};

let configCache: AIChatRuntimeConfig | null = null;
let lastCacheTime: number | null = null;

// Keep the same caching style as health-insight keyword loader.
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;

const FALLBACK_CONFIG: AIChatRuntimeConfig = {
    system_instruction_lines: [
        'You are a knowledgeable, calm veterinary assistant.',
        'Provide practical and safe advice.',
        'Never make a definitive diagnosis.',
    ],
    symptom_topic_groups: [],
    normal_care_keywords: [],
    health_ambiguous_hint_keywords: [],
    clarification_prompt:
        'ช่วยระบุอาการหลักของน้องเพิ่มเติมได้ไหมครับ เช่น อาเจียน / ท้องเสีย / ไอหรือหายใจลำบาก / เบื่ออาหาร / ซึม / บาดเจ็บ',
    clarification_options: ['อาเจียน', 'ท้องเสีย', 'ไอหรือหายใจลำบาก', 'เบื่ออาหาร', 'ซึม', 'บาดเจ็บ', 'อื่นๆ'],
};

const isStringArray = (value: unknown): value is string[] =>
    Array.isArray(value) && value.every((item) => typeof item === 'string');

const isSymptomTopicGroups = (
    value: unknown
): value is AIChatSymptomTopicGroup[] => {
    if (!Array.isArray(value)) return false;

    return value.every((group) => {
        if (typeof group !== 'object' || group === null) return false;

        const candidate = group as {
            topic?: unknown;
            keywords?: unknown;
        };

        return (
            typeof candidate.topic === 'string' &&
            isStringArray(candidate.keywords)
        );
    });
};

const validateConfig = (config: unknown): config is AIChatRuntimeConfig => {
    if (typeof config !== 'object' || config === null) return false;

    const candidate = config as Partial<AIChatRuntimeConfig>;

    return (
        isStringArray(candidate.system_instruction_lines) &&
        isSymptomTopicGroups(candidate.symptom_topic_groups) &&
        isStringArray(candidate.normal_care_keywords) &&
        isStringArray(candidate.health_ambiguous_hint_keywords) &&
        typeof candidate.clarification_prompt === 'string' &&
        isStringArray(candidate.clarification_options)
    );
};

export const loadAIChatRuntimeConfig = (): AIChatRuntimeConfig => {
    const now = Date.now();

    if (configCache && lastCacheTime && now - lastCacheTime < CACHE_DURATION_MS) {
        return configCache;
    }

    try {
        const configPath = path.join(__dirname, '../../../config/ai-chat-runtime-config.json');
        const fileContent = fs.readFileSync(configPath, 'utf8');
        const parsed = JSON.parse(fileContent) as unknown;

        if (!validateConfig(parsed)) {
            throw new Error('Invalid ai-chat runtime config structure');
        }

        configCache = parsed;
        lastCacheTime = now;

        logger.info(
            `[AIChatConfigLoader] Loaded config with ${parsed.symptom_topic_groups.length} symptom topic groups`
        );

        return configCache;
    } catch (error) {
        logger.error('[AIChatConfigLoader] Failed to load ai-chat runtime config:', error as Error);
        return FALLBACK_CONFIG;
    }
};

export const reloadAIChatRuntimeConfig = (): void => {
    configCache = null;
    lastCacheTime = null;
    loadAIChatRuntimeConfig();
    logger.info('[AIChatConfigLoader] Runtime config reloaded from disk');
};
