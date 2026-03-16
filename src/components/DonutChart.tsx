'use client';

import { useState } from 'react';

export interface CategoryBreakdown {
    label: string;
    value: number;
    color: string;
}

export function DonutChart({ data }: { data: CategoryBreakdown[] }) {
    const [activeIdx, setActiveIdx] = useState<number | null>(null);

    const total = data.reduce((s, d) => s + d.value, 0);
    if (total === 0) return null;

    const R = 72, cx = 100, cy = 100;
    const circ = 2 * Math.PI * R;
    const GAP = 0.03;

    let cumAngle = 0;
    const slices = data.map((d) => {
        const slice = (d.value / total) * 2 * Math.PI;
        const startA = cumAngle + GAP / 2;
        const dashLen = Math.max(0, (slice - GAP) / (2 * Math.PI)) * circ;
        const startOffset = -(startA / (2 * Math.PI)) * circ;
        cumAngle += slice;
        return { ...d, dashLen, startOffset };
    });

    const active = activeIdx !== null ? slices[activeIdx] : null;

    return (
        <div className="flex flex-col items-center gap-4">
            {/* SVG */}
            <svg width="200" height="200" viewBox="0 0 200 200">
                {slices.map((s, i) => (
                    <circle
                        key={i}
                        cx={cx} cy={cy} r={R}
                        fill="none"
                        stroke={s.color}
                        strokeWidth={22}
                        strokeDasharray={`${s.dashLen} ${circ - s.dashLen}`}
                        strokeDashoffset={s.startOffset}
                        strokeLinecap="round"
                        opacity={activeIdx === null || activeIdx === i ? 1 : 0.3}
                        style={{
                            cursor: 'pointer',
                            transition: 'opacity .2s, transform .2s',
                            transform: activeIdx === i ? 'scale(1.04)' : 'scale(1)',
                            transformOrigin: 'center',
                        }}
                        onClick={() => setActiveIdx(activeIdx === i ? null : i)}
                    />
                ))}
                {/* Center hole */}
                <circle cx={cx} cy={cy} r={50} className="fill-white dark:fill-slate-800" />
                {/* Center text */}
                <text
                    x={cx} y={cy - 8}
                    textAnchor="middle"
                    className="fill-gray-400"
                    style={{ fontSize: 11, fontFamily: 'inherit' }}
                >
                    {active ? active.label : 'ทั้งหมด'}
                </text>
                <text
                    x={cx} y={cy + 14}
                    textAnchor="middle"
                    style={{
                        fontSize: 20,
                        fontWeight: 700,
                        fontFamily: 'inherit',
                        fill: active ? active.color : 'currentColor',
                    }}
                    className={active ? '' : 'fill-gray-800 dark:fill-gray-100'}
                >
                    {active ? active.value : total}
                </text>
            </svg>

            {/* Legend */}
            <div className="w-full space-y-1.5">
                {slices.map((s, i) => {
                    const pct = Math.round((s.value / total) * 100);
                    return (
                        <button
                            key={i}
                            onClick={() => setActiveIdx(activeIdx === i ? null : i)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors text-sm ${
                                activeIdx === i
                                    ? 'bg-gray-100 dark:bg-slate-700'
                                    : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'
                            }`}
                        >
                            <span
                                className="w-2.5 h-2.5 rounded-sm shrink-0"
                                style={{ background: s.color }}
                            />
                            <span className="flex-1 text-gray-700 dark:text-gray-300">{s.label}</span>
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                {s.value} <span className="font-normal">({pct}%)</span>
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}