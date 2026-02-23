"use client";

import React, { useState } from 'react';

interface ProductImageProps {
    src: string;
    alt: string;
    className?: string;
}

export default function ProductImage({ src, alt, className }: ProductImageProps) {
    const [imgSrc, setImgSrc] = useState(src);

    return (
        <img
            src={imgSrc}
            alt={alt}
            className={className}
            onError={() => {
                setImgSrc('https://placehold.co/32');
            }}
        />
    );
}
