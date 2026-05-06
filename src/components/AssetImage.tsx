"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface AssetImageProps {
    src: string;
    alt: string;
    className?: string;
    fallbackText?: string;
}

export default function AssetImage({ src, alt, className, fallbackText = 'No Image' }: AssetImageProps) {
    const [imgSrc, setImgSrc] = useState(src);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        setImgSrc(src);
        setHasError(false);
    }, [src]);

    return (
        <div className={`relative ${className} overflow-hidden`}>
            <Image
                src={imgSrc}
                alt={alt}
                fill
                className="object-cover"
                onError={() => {
                    if (!hasError) {
                        setImgSrc(`https://placehold.co/400x400?text=${encodeURIComponent(fallbackText)}`);
                        setHasError(true);
                    }
                }}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
        </div>
    );
}
