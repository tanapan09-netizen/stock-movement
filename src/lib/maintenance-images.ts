const ABSOLUTE_URL_PATTERN = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;
const COPIED_SOURCE_REQUEST_TAG_PREFIX = '__copied_source_request:';
const COPIED_SOURCE_IMAGE_COUNT_TAG_PREFIX = '__copied_source_image_count:';

function normalizeMaintenanceImageUrl(url: string): string {
    const trimmed = url.trim();
    if (!trimmed) return '';

    const normalized = trimmed.replace(/\\/g, '/');

    if (ABSOLUTE_URL_PATTERN.test(normalized)) {
        return normalized;
    }

    if (normalized.startsWith('/public/uploads/')) {
        return normalized.replace(/^\/public\//, '/');
    }

    if (normalized.startsWith('/uploads/')) {
        return normalized;
    }

    if (normalized.startsWith('/')) {
        return normalized;
    }

    if (normalized.startsWith('public/uploads/')) {
        return `/${normalized.replace(/^public\//, '')}`;
    }

    if (normalized.startsWith('uploads/')) {
        return `/${normalized}`;
    }

    const uploadsIndex = normalized.indexOf('/uploads/');
    if (uploadsIndex >= 0) {
        return normalized.slice(uploadsIndex);
    }

    const publicUploadsIndex = normalized.indexOf('public/uploads/');
    if (publicUploadsIndex >= 0) {
        const fromPublic = normalized.slice(publicUploadsIndex);
        return `/${fromPublic.replace(/^public\//, '')}`;
    }

    return `/uploads/${normalized.replace(/^\/+/, '')}`;
}

export function parseMaintenanceImageUrls(value?: string | null): string[] {
    if (!value) return [];

    const trimmed = value.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith('[') || trimmed.startsWith('"')) {
        try {
            const parsed = JSON.parse(trimmed);

            if (Array.isArray(parsed)) {
                return parsed
                    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
                    .map(normalizeMaintenanceImageUrl);
            }

            if (typeof parsed === 'string' && parsed.trim().length > 0) {
                return [normalizeMaintenanceImageUrl(parsed)];
            }
        } catch {
            // Fall through to treat the stored value as a plain URL/path.
        }
    }

    return [normalizeMaintenanceImageUrl(trimmed)];
}

export function getPrimaryMaintenanceImageUrl(value?: string | null): string | null {
    return parseMaintenanceImageUrls(value)[0] ?? null;
}

function splitTags(value?: string | null): string[] {
    return (value || '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
}

export function appendCopiedImageMetadataTags(
    tagsValue: string | null | undefined,
    sourceRequestId: number | null,
    copiedImageCount: number,
): string | null {
    const baseTags = splitTags(tagsValue).filter(
        (tag) =>
            !tag.startsWith(COPIED_SOURCE_REQUEST_TAG_PREFIX) &&
            !tag.startsWith(COPIED_SOURCE_IMAGE_COUNT_TAG_PREFIX),
    );

    if (sourceRequestId && copiedImageCount > 0) {
        baseTags.push(
            `${COPIED_SOURCE_REQUEST_TAG_PREFIX}${sourceRequestId}`,
            `${COPIED_SOURCE_IMAGE_COUNT_TAG_PREFIX}${copiedImageCount}`,
        );
    }

    return baseTags.length > 0 ? baseTags.join(',') : null;
}

export function getCopiedImageMetadata(tagsValue?: string | null): {
    sourceRequestId: number | null;
    copiedImageCount: number;
} {
    let sourceRequestId: number | null = null;
    let copiedImageCount = 0;

    splitTags(tagsValue).forEach((tag) => {
        if (tag.startsWith(COPIED_SOURCE_REQUEST_TAG_PREFIX)) {
            const parsed = Number.parseInt(tag.slice(COPIED_SOURCE_REQUEST_TAG_PREFIX.length), 10);
            sourceRequestId = Number.isFinite(parsed) ? parsed : null;
        }

        if (tag.startsWith(COPIED_SOURCE_IMAGE_COUNT_TAG_PREFIX)) {
            const parsed = Number.parseInt(tag.slice(COPIED_SOURCE_IMAGE_COUNT_TAG_PREFIX.length), 10);
            copiedImageCount = Number.isFinite(parsed) ? parsed : 0;
        }
    });

    return { sourceRequestId, copiedImageCount };
}
