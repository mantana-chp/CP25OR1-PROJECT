/**
 * Pet Name Matcher — Layers 1 & 2 of the 3-layer pet detection system.
 *
 * Layer 1 (exactMatch)  — O(n), zero cost, catches normal usage
 * Layer 2 (fuzzyMatch)  — O(n * queryLen), zero cost, catches same-script typos
 * Layer 3               — LLM call, lives in ai-chat-service.ts, only fires when
 *                         L1+L2 both miss AND no resolvedPetId exists in the session
 */

export type PetCandidate = {
    id: string;
    pet_name: string;
};

export type PetMatch = {
    id: string;
    pet_name: string;
    role: 'OWNER' | 'CAREGIVER';
    /** For CAREGIVER pets: the owner's alias (contact name) */
    ownerAlias?: string;
};

const MIN_EXACT_NAME_LENGTH = 2;
const MIN_FUZZY_NAME_LENGTH = 3;

function normalize(value: string): string {
    return value.trim().toLowerCase();
}

function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isLatinAlphaNumeric(value: string): boolean {
    return /^[a-z0-9]+$/i.test(value);
}

function rankCandidates<T extends PetCandidate>(pets: T[]): T[] {
    return [...pets].sort(
        (a, b) => b.pet_name.trim().length - a.pet_name.trim().length
    );
}

function isExactNameMatch(queryLower: string, petNameLower: string): boolean {
    if (petNameLower.length < MIN_EXACT_NAME_LENGTH) {
        return false;
    }

    // For Latin names, require token boundaries to avoid matching inside words
    // (e.g. pet name "v" or "bo" matching "vomit" / "bored").
    if (isLatinAlphaNumeric(petNameLower)) {
        const pattern = new RegExp(
            `(^|[^a-z0-9])${escapeRegex(petNameLower)}([^a-z0-9]|$)`,
            'i'
        );
        return pattern.test(queryLower);
    }

    return queryLower.includes(petNameLower);
}

/**
 * Calculates the Levenshtein edit distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
    const rows = a.length + 1;
    const cols = b.length + 1;

    // Use a flat array for performance
    const dp = new Array<number>(rows * cols);

    for (let i = 0; i < rows; i++) dp[i * cols] = i;
    for (let j = 0; j < cols; j++) dp[j] = j;

    for (let i = 1; i < rows; i++) {
        for (let j = 1; j < cols; j++) {
            if (a[i - 1] === b[j - 1]) {
                dp[i * cols + j] = dp[(i - 1) * cols + (j - 1)];
            } else {
                dp[i * cols + j] =
                    1 +
                    Math.min(
                        dp[(i - 1) * cols + j],     // deletion
                        dp[i * cols + (j - 1)],     // insertion
                        dp[(i - 1) * cols + (j - 1)] // substitution
                    );
            }
        }
    }

    return dp[(rows - 1) * cols + (cols - 1)];
}

/**
 * Dynamic threshold based on name length:
 *  ≤ 3 chars → allow 1 edit  (e.g. "บลุ" → "บลู")
 *  > 3 chars → allow 2 edits (e.g. "อู้ดด" → "อู๊ด")
 */
function getThreshold(name: string): number {
    return name.length <= 3 ? 1 : 2;
}

/**
 * Layer 1 — Exact case-insensitive substring match.
 * e.g. query "บลูป่วยไหม" contains "บลู" → match
 */
export function exactMatch(
    query: string,
    pets: PetCandidate[]
): PetCandidate | null {
    const qLower = normalize(query);

    for (const pet of rankCandidates(pets)) {
        const nameLower = normalize(pet.pet_name);
        if (!nameLower) continue;

        if (isExactNameMatch(qLower, nameLower)) {
            return pet;
        }
    }

    return null;
}

/**
 * Layer 2 — Levenshtein sliding-window fuzzy match.
 *
 * Slides a window the same length as each pet name across the query and
 * checks whether any window is within the edit distance threshold.
 * This catches single-char typos and Thai tone-mark mistakes.
 *
 * e.g. query "บลุป่วยไหม", pet "บลู" (len 3):
 *   window "บลุ" → distance("บลุ","บลู") = 1 ≤ threshold(1) → match
 */
export function fuzzyMatch(
    query: string,
    pets: PetCandidate[]
): PetCandidate | null {
    const qLower = normalize(query);

    for (const pet of rankCandidates(pets)) {
        const name = normalize(pet.pet_name);
        if (!name || name.length < MIN_FUZZY_NAME_LENGTH) {
            continue;
        }

        const threshold = getThreshold(name);
        const windowSize = name.length;

        // Need at least windowSize chars to slide
        if (qLower.length < windowSize) continue;

        for (let i = 0; i <= qLower.length - windowSize; i++) {
            const window = qLower.slice(i, i + windowSize);
            if (levenshteinDistance(window, name) <= threshold) {
                return pet;
            }
        }
    }

    return null;
}

/**
 * Runs Layer 1 then Layer 2 in order and returns the first match found.
 * Returns null if neither layer finds a match.
 */
export function detectPetInQuery(
    query: string,
    pets: PetCandidate[]
): PetCandidate | null {
    return exactMatch(query, pets) ?? fuzzyMatch(query, pets);
}

/**
 * Detects ALL pets matching the query (for duplicate name disambiguation).
 * Returns every pet whose name is detected via Layer 1 (exact) or Layer 2 (fuzzy).
 * Empty array means no matches.
 */
export function detectAllPetsInQuery(
    query: string,
    pets: PetMatch[]
): PetMatch[] {
    const qLower = normalize(query);
    const matchedIds = new Set<string>();

    // Layer 1: Exact matches — collect ALL
    for (const pet of rankCandidates(pets)) {
        const nameLower = normalize(pet.pet_name);
        if (!nameLower) continue;
        if (isExactNameMatch(qLower, nameLower)) {
            matchedIds.add(pet.id);
        }
    }

    // Layer 2: Fuzzy matches — collect ALL (skip already-matched)
    const unmatched = pets.filter(p => !matchedIds.has(p.id));
    for (const pet of rankCandidates(unmatched)) {
        const name = normalize(pet.pet_name);
        if (!name || name.length < MIN_FUZZY_NAME_LENGTH) continue;

        const threshold = getThreshold(name);
        const windowSize = name.length;
        if (qLower.length < windowSize) continue;

        for (let i = 0; i <= qLower.length - windowSize; i++) {
            const window = qLower.slice(i, i + windowSize);
            if (levenshteinDistance(window, name) <= threshold) {
                matchedIds.add(pet.id);
                break;
            }
        }
    }

    return pets.filter(p => matchedIds.has(p.id));
}
