export const GENERAL_REQUEST_ONLY_TAG = 'source:general_request';

function parseTagList(tags?: string | null): string[] {
    if (!tags) return [];
    return tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
}

export function hasGeneralRequestOnlyTag(tags?: string | null): boolean {
    return parseTagList(tags).some((tag) => tag.toLowerCase() === GENERAL_REQUEST_ONLY_TAG);
}

export function markAsGeneralRequestOnly(tags?: string | null): string | null {
    const nextTags = parseTagList(tags);
    if (!hasGeneralRequestOnlyTag(tags)) {
        nextTags.push(GENERAL_REQUEST_ONLY_TAG);
    }
    return nextTags.length > 0 ? nextTags.join(',') : null;
}

export function unmarkGeneralRequestOnly(tags?: string | null): string | null {
    const nextTags = parseTagList(tags).filter(
        (tag) => tag.toLowerCase() !== GENERAL_REQUEST_ONLY_TAG,
    );
    return nextTags.length > 0 ? nextTags.join(',') : null;
}
