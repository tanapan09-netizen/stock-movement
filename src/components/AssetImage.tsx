"use client";

import React, { useState } from 'react';

interface AssetImageProps {
    src: string;
    alt: string;
    className?: string;
    fallbackText?: string;
}

export default function AssetImage({ src, alt, className, fallbackText = 'No Image' }: AssetImageProps) {
    const [imgSrc, setImgSrc] = useState(src);
    const [hasError, setHasError] = useState(false);

    return (
        <img
            src={imgSrc}
            alt={alt}
            className={className}
            onError={() => {
                if (!hasError) {
                    setImgSrc(`https://placehold.co/400x400?text=${encodeURIComponent(fallbackText)}`);
                    setHasError(true);
                }
            }}
        />
    );
}
