const ABSOLUTE_URL_PATTERN = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;

function normalizeMaintenanceImageUrl(url: string): string {
    const trimmed = url.trim();
    if (!trimmed) return '';

    if (ABSOLUTE_URL_PATTERN.test(trimmed) || trimmed.startsWith('/')) {
        return trimmed;
    }

    return `/uploads/${trimmed.replace(/^\/+/, '')}`;
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
