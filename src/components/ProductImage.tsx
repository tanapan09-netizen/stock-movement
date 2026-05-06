"use client";

import React, { useMemo, useState, useEffect } from 'react';
import Image from 'next/image';
import { getProductImageFallbackCandidates, resolveProductImageSrc } from '@/lib/product-image';

interface ProductImageProps {
    src: string;
    alt: string;
    className?: string;
}

const fallbackSvg =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'>
            <rect width='64' height='64' fill='#f3f4f6'/>
            <path d='M14 45l10-12 8 9 8-10 10 13H14z' fill='#cbd5e1'/>
            <circle cx='24' cy='22' r='5' fill='#cbd5e1'/>
        </svg>`,
    );

export default function ProductImage({ src, alt, className }: ProductImageProps) {
    const normalizedSource = useMemo(() => resolveProductImageSrc(src) ?? src, [src]);
    const fallbackCandidates = useMemo(
        () => getProductImageFallbackCandidates(normalizedSource),
        [normalizedSource],
    );

    const [imgSrc, setImgSrc] = useState(normalizedSource);
    const [fallbackIndex, setFallbackIndex] = useState(0);
    const [prevSource, setPrevSource] = useState(normalizedSource);

    if (normalizedSource !== prevSource) {
        setImgSrc(normalizedSource);
        setFallbackIndex(0);
        setPrevSource(normalizedSource);
    }

    const handleError = () => {
        if (imgSrc === fallbackSvg) return;

        if (fallbackIndex < fallbackCandidates.length) {
            setImgSrc(fallbackCandidates[fallbackIndex]);
            setFallbackIndex(prev => prev + 1);
        } else {
            setImgSrc(fallbackSvg);
        }
    };

    return (
        <div className={`relative ${className} overflow-hidden`}>
            <Image
                src={imgSrc}
                alt={alt}
                fill
                className="object-cover"
                onError={handleError}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
        </div>
    );
}
