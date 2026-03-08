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
    const q = query.toLowerCase();
    return pets.find((p) => q.includes(p.pet_name.toLowerCase())) ?? null;
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
    const qLower = query.toLowerCase();

    for (const pet of pets) {
        const name = pet.pet_name.toLowerCase();
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
