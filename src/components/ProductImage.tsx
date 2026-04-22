"use client";

import React, { useMemo } from 'react';
import { getProductImageFallbackCandidates, resolveProductImageSrc } from '@/lib/product-image';

interface ProductImageProps {
    src: string;
    alt: string;
    className?: string;
}

export default function ProductImage({ src, alt, className }: ProductImageProps) {
    const normalizedSource = useMemo(() => resolveProductImageSrc(src) ?? src, [src]);
    const fallbackCandidates = useMemo(
        () => getProductImageFallbackCandidates(normalizedSource),
        [normalizedSource],
    );
    const fallbackSvg =
        "data:image/svg+xml;utf8," +
        encodeURIComponent(
            `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'>
                <rect width='64' height='64' fill='#f3f4f6'/>
                <path d='M14 45l10-12 8 9 8-10 10 13H14z' fill='#cbd5e1'/>
                <circle cx='24' cy='22' r='5' fill='#cbd5e1'/>
            </svg>`,
        );

    const handleError = (event: React.SyntheticEvent<HTMLImageElement>) => {
        const imgElement = event.currentTarget;
        if (imgElement.src === fallbackSvg) return;

        const currentIndex = Number(imgElement.dataset.fallbackIndex || '0');
        const nextCandidate =
            currentIndex < fallbackCandidates.length
                ? fallbackCandidates[currentIndex]
                : fallbackSvg;

        imgElement.dataset.fallbackIndex = String(currentIndex + 1);
        imgElement.src = nextCandidate;
    };

    return (
        <img
            src={normalizedSource}
            alt={alt}
            className={className}
            loading="lazy"
            data-fallback-index="0"
            onError={handleError}
        />
    );
}
