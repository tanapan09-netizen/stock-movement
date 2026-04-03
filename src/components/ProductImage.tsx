"use client";

import React, { useState } from 'react';

interface ProductImageProps {
    src: string;
    alt: string;
    className?: string;
}

export default function ProductImage({ src, alt, className }: ProductImageProps) {
    const [imgSrc, setImgSrc] = useState(src);
    const [retryStage, setRetryStage] = useState(0);
    const fallbackSvg =
        "data:image/svg+xml;utf8," +
        encodeURIComponent(
            `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'>
                <rect width='64' height='64' fill='#f3f4f6'/>
                <path d='M14 45l10-12 8 9 8-10 10 13H14z' fill='#cbd5e1'/>
                <circle cx='24' cy='22' r='5' fill='#cbd5e1'/>
            </svg>`,
        );

    return (
        <img
            src={imgSrc}
            alt={alt}
            className={className}
            onError={() => {
                // Retry with legacy uploads root path if current path points to /uploads/products/*
                if (retryStage === 0 && imgSrc.includes('/uploads/products/')) {
                    const legacyRootPath = imgSrc.replace('/uploads/products/', '/uploads/');
                    setRetryStage(1);
                    setImgSrc(legacyRootPath);
                    return;
                }
                setImgSrc(fallbackSvg);
            }}
        />
    );
}
