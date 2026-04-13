'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

import { FloatingSearchInput } from '@/components/FloatingField';

interface Option {
    value: string;
    label: string;
    disabled?: boolean;
}

interface SearchableSelectProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    required?: boolean;
    searchPlaceholder?: string;
    emptyText?: string;
}

export default function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = 'เลือก...',
    className = '',
    required,
    searchPlaceholder = 'ค้นหา...',
    emptyText = 'ไม่พบรายการ',
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const selectedOption = useMemo(
        () => options.find((opt) => opt.value === value),
        [options, value],
    );

    const filteredOptions = useMemo(() => {
        const keyword = searchTerm.trim().toLowerCase();
        if (!keyword) return options;

        return options.filter((opt) => {
            const haystack = `${opt.label} ${opt.value}`.toLowerCase();
            return haystack.includes(keyword);
        });
    }, [options, searchTerm]);

    return (
        <div ref={wrapperRef} className={`relative ${className}`}>
            <button
                type="button"
                className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-sm text-slate-700 transition hover:border-sky-300 hover:bg-sky-50/40 focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                onClick={() => {
                    setIsOpen((prev) => !prev);
                    if (!isOpen) setSearchTerm('');
                }}
            >
                <span className={`truncate ${selectedOption ? 'text-slate-700 dark:text-slate-100' : 'text-slate-400 dark:text-slate-300'}`}>
                    {selectedOption?.label || placeholder}
                </span>
                <ChevronDown
                    size={16}
                    className={`flex-shrink-0 text-slate-400 transition ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            <input
                type="text"
                value={value}
                onChange={() => {}}
                required={required}
                className="pointer-events-none absolute h-0 w-0 opacity-0"
                tabIndex={-1}
                aria-hidden="true"
                readOnly
            />

            {isOpen && (
                <div className="absolute z-50 mt-2 flex max-h-72 w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-600 dark:bg-slate-800">
                    <div className="border-b border-slate-100 p-2 dark:border-slate-600">
                        <FloatingSearchInput
                            type="text"
                            label="ค้นหา"
                            dense
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            placeholder={searchPlaceholder}
                            autoFocus
                            className="text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                        />
                    </div>

                    <div
                        className="flex-1 overflow-y-auto overscroll-contain p-1"
                        style={{ WebkitOverflowScrolling: 'touch' }}
                    >
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt) => {
                                const isSelected = value === opt.value;
                                return (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        disabled={opt.disabled}
                                        className={[
                                            'flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition',
                                            opt.disabled
                                                ? 'hidden cursor-not-allowed opacity-50'
                                                : 'hover:bg-sky-50 dark:hover:bg-sky-900/30',
                                            isSelected
                                                ? 'bg-sky-50 font-medium text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'
                                                : 'text-slate-700 dark:text-slate-100',
                                        ].join(' ')}
                                        onClick={() => {
                                            if (opt.disabled) return;
                                            onChange(opt.value);
                                            setIsOpen(false);
                                            setSearchTerm('');
                                        }}
                                    >
                                        <span className="truncate">{opt.label}</span>
                                        {isSelected ? <Check size={14} /> : null}
                                    </button>
                                );
                            })
                        ) : (
                            <div className="px-3 py-4 text-center text-sm text-slate-500 dark:text-slate-300">
                                {emptyText}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
