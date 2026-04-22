const ABSOLUTE_URL_PATTERN = /^[a-z][a-z0-9+.-]*:\/\//i;

export function resolveProductImageSrc(imagePath?: string | null): string | null {
    if (!imagePath) return null;

    const normalizedInput = imagePath.trim().replace(/\\/g, '/');
    if (!normalizedInput) return null;

    if (normalizedInput.startsWith('data:image/')) {
        return normalizedInput;
    }

    if (ABSOLUTE_URL_PATTERN.test(normalizedInput)) {
        return normalizedInput;
    }

    if (normalizedInput.startsWith('//')) {
        return `https:${normalizedInput}`;
    }

    if (normalizedInput.startsWith('storage.googleapis.com/')) {
        return `https://${normalizedInput}`;
    }

    if (normalizedInput.startsWith('/uploads/')) {
        return normalizedInput.replace('/uploads//', '/uploads/');
    }

    if (normalizedInput.startsWith('uploads/')) {
        return `/${normalizedInput}`;
    }

    if (normalizedInput.startsWith('/products/')) {
        return `/uploads${normalizedInput}`;
    }

    if (normalizedInput.startsWith('products/')) {
        return `/uploads/${normalizedInput}`;
    }

    if (normalizedInput.startsWith('/public/uploads/')) {
        return normalizedInput.replace('/public/', '/');
    }

    if (normalizedInput.startsWith('public/uploads/')) {
        return `/${normalizedInput.replace(/^public\//, '')}`;
    }

    const uploadsIndex = normalizedInput.indexOf('/uploads/');
    if (uploadsIndex >= 0) {
        return normalizedInput.slice(uploadsIndex).replace('/uploads//', '/uploads/');
    }

    const publicUploadsIndex = normalizedInput.indexOf('public/uploads/');
    if (publicUploadsIndex >= 0) {
        const publicUploads = normalizedInput.slice(publicUploadsIndex);
        return `/${publicUploads.replace(/^public\//, '')}`;
    }

    const normalized = normalizedInput.replace(/^\/+/, '');
    if (!normalized) return null;

    const fileName = normalized.split('/').pop();
    if (!fileName) return null;

    return `/uploads/products/${fileName}`;
}

export function getProductImageFallbackCandidates(src: string): string[] {
    const normalizedSource = resolveProductImageSrc(src);
    if (!normalizedSource) return [];

    const fallbackList: string[] = [];
    const pushIfUnique = (value: string | null | undefined) => {
        const resolved = resolveProductImageSrc(value);
        if (!resolved) return;
        if (resolved === normalizedSource) return;
        if (fallbackList.includes(resolved)) return;
        fallbackList.push(resolved);
    };

    pushIfUnique(normalizedSource.replace('/uploads//uploads/', '/uploads/'));

    const sourceWithoutQuery = normalizedSource.split('?')[0];
    const fileName = sourceWithoutQuery.split('/').pop();
    if (fileName) {
        pushIfUnique(`/uploads/${fileName}`);
        pushIfUnique(`/uploads/products/${fileName}`);
    }

    if (sourceWithoutQuery.startsWith('/products/')) {
        pushIfUnique(`/uploads${sourceWithoutQuery}`);
    }

    if (sourceWithoutQuery.startsWith('/uploads/products/')) {
        pushIfUnique(sourceWithoutQuery.replace('/uploads/products/', '/uploads/'));
    } else if (sourceWithoutQuery.startsWith('/uploads/')) {
        const tail = sourceWithoutQuery.slice('/uploads/'.length);
        if (tail && !tail.startsWith('products/')) {
            pushIfUnique(`/uploads/products/${tail}`);
        }
    }

    if (
        sourceWithoutQuery.startsWith('https://storage.googleapis.com/') ||
        sourceWithoutQuery.startsWith('http://storage.googleapis.com/')
    ) {
        try {
            const url = new URL(sourceWithoutQuery);
            const pathParts = url.pathname.split('/').filter(Boolean);
            if (pathParts.length >= 2) {
                const objectPath = pathParts.slice(1).join('/');
                if (objectPath.startsWith('uploads/')) {
                    pushIfUnique(`/${objectPath}`);
                } else if (objectPath.startsWith('products/')) {
                    pushIfUnique(`/uploads/${objectPath}`);
                }
                const objectFileName = objectPath.split('/').pop();
                if (objectFileName) {
                    pushIfUnique(`/uploads/products/${objectFileName}`);
                }
            }
        } catch {
            // Ignore URL parsing errors and continue with collected candidates.
        }
    }

    return fallbackList;
}
