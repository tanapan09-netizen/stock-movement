export const GENERAL_REQUEST_ONLY_TAG = 'source:general_request';
export const GENERAL_REQUEST_FORWARDED_BY_TAG_PREFIX = 'forwarded_by:';

function parseTagList(tags?: string | null): string[] {
    if (!tags) return [];
    return tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
}

function normalizeForwardedByTagValue(actorName?: string | null): string {
    return (actorName || '')
        .replace(/,/g, ' ')
        .trim()
        .replace(/\s+/g, '_')
        .toLowerCase();
}

export function hasGeneralRequestOnlyTag(tags?: string | null): boolean {
    return parseTagList(tags).some((tag) => tag.toLowerCase() === GENERAL_REQUEST_ONLY_TAG);
}

export function hasGeneralRequestForwardedByTag(tags?: string | null): boolean {
    return parseTagList(tags).some((tag) => tag.toLowerCase().startsWith(GENERAL_REQUEST_FORWARDED_BY_TAG_PREFIX));
}

export function markAsGeneralRequestOnly(tags?: string | null): string | null {
    const nextTags = parseTagList(tags);
    if (!hasGeneralRequestOnlyTag(tags)) {
        nextTags.push(GENERAL_REQUEST_ONLY_TAG);
    }
    return nextTags.length > 0 ? nextTags.join(',') : null;
}

export function markGeneralRequestForwardedBy(tags?: string | null, actorName?: string | null): string | null {
    const nextTags = parseTagList(tags).filter(
        (tag) => !tag.toLowerCase().startsWith(GENERAL_REQUEST_FORWARDED_BY_TAG_PREFIX),
    );
    const normalizedActor = normalizeForwardedByTagValue(actorName);
    if (normalizedActor) {
        nextTags.push(`${GENERAL_REQUEST_FORWARDED_BY_TAG_PREFIX}${normalizedActor}`);
    }
    return nextTags.length > 0 ? nextTags.join(',') : null;
}

export function unmarkGeneralRequestOnly(tags?: string | null): string | null {
    const nextTags = parseTagList(tags).filter(
        (tag) => tag.toLowerCase() !== GENERAL_REQUEST_ONLY_TAG,
    );
    return nextTags.length > 0 ? nextTags.join(',') : null;
}
