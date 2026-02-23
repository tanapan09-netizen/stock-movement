import React from 'react';

// Basic skeleton line
export function SkeletonLine({ className = '' }: { className?: string }) {
    return (
        <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
    );
}

// Card skeleton for dashboard
export function SkeletonCard() {
    return (
        <div className="bg-white rounded-xl shadow p-6 animate-pulse">
            <div className="flex items-center justify-between">
                <div className="space-y-3 flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
            </div>
        </div>
    );
}

// Table skeleton
export function SkeletonTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
    return (
        <div className="bg-white rounded-lg shadow overflow-hidden">
            {/* Header */}
            <div className="bg-gray-50 border-b p-4">
                <div className="flex gap-4">
                    {Array.from({ length: cols }).map((_, i) => (
                        <div key={i} className="h-4 bg-gray-200 rounded flex-1 animate-pulse"></div>
                    ))}
                </div>
            </div>
            {/* Rows */}
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <div key={rowIndex} className="border-b last:border-0 p-4">
                    <div className="flex gap-4">
                        {Array.from({ length: cols }).map((_, colIndex) => (
                            <div
                                key={colIndex}
                                className="h-4 bg-gray-200 rounded flex-1 animate-pulse"
                                style={{ animationDelay: `${(rowIndex + colIndex) * 50}ms` }}
                            ></div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

// Form skeleton
export function SkeletonForm({ fields = 4 }: { fields?: number }) {
    return (
        <div className="bg-white rounded-lg shadow p-6 space-y-6 animate-pulse">
            {Array.from({ length: fields }).map((_, i) => (
                <div key={i} className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                </div>
            ))}
            <div className="h-12 bg-gray-300 rounded w-full mt-6"></div>
        </div>
    );
}

// Dashboard skeleton
export function SkeletonDashboard() {
    return (
        <div className="space-y-6">
            {/* Title */}
            <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse"></div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow p-6 animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="space-y-3">
                        <div className="h-4 bg-gray-200 rounded"></div>
                        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                        <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow p-6 animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="h-48 bg-gray-200 rounded"></div>
                </div>
            </div>
        </div>
    );
}

// Product list skeleton
export function SkeletonProductList() {
    return (
        <div className="space-y-4">
            {/* Search bar */}
            <div className="h-12 bg-gray-200 rounded-lg animate-pulse w-full max-w-md"></div>

            {/* Table */}
            <SkeletonTable rows={8} cols={6} />
        </div>
    );
}

// Asset detail skeleton
export function SkeletonAssetDetail() {
    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="w-24 h-24 bg-gray-200 rounded-lg"></div>
                <div className="flex-1 space-y-2">
                    <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                        <div className="h-6 bg-gray-200 rounded w-2/3"></div>
                    </div>
                ))}
            </div>
        </div>
    );
}
