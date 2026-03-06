'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

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
}

export default function SearchableSelect({ options, value, onChange, placeholder = 'เลือก...', className = '', required }: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Close when clicking outside
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

    const selectedOption = options.find(opt => opt.value === value);
    const displayValue = selectedOption ? selectedOption.label : '';

    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div ref={wrapperRef} className={`relative ${className}`}>
            <div
                className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-slate-700 dark:border-slate-600 flex items-center justify-between cursor-pointer"
                onClick={() => {
                    setIsOpen(!isOpen);
                    if (!isOpen) setSearchTerm(''); // reset search when opening
                }}
            >
                <div className={`truncate ${!selectedOption ? 'text-gray-500' : ''}`}>
                    {displayValue || placeholder}
                </div>
                <ChevronDown size={16} className="text-gray-400 flex-shrink-0 ml-2" />
            </div>

            {/* Hidden native input for required validation */}
            <input
                type="text"
                value={value}
                onChange={() => { }}
                required={required}
                className="absolute opacity-0 w-0 h-0 pointer-events-none"
                tabIndex={-1}
            />

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border dark:border-slate-600 rounded-lg shadow-xl max-h-60 flex flex-col">
                    <div className="p-2 border-b dark:border-slate-600">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                className="w-full pl-8 pr-3 py-1.5 bg-gray-50 dark:bg-slate-700 border dark:border-slate-600 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="ค้นหา..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                            />
                        </div>
                    </div>
                    <div className="overflow-y-auto p-1 flex-1">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt) => (
                                <div
                                    key={opt.value}
                                    className={`px-3 py-2 text-sm rounded-md cursor-pointer flex items-center justify-between
                                        ${opt.disabled
                                            ? 'opacity-50 cursor-not-allowed hidden' // hidden completely based on previous logic, or just disabled
                                            : 'hover:bg-blue-50 dark:hover:bg-blue-900/30'
                                        }
                                        ${value === opt.value ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium' : ''}
                                    `}
                                    onClick={() => {
                                        if (opt.disabled) return;
                                        onChange(opt.value);
                                        setIsOpen(false);
                                    }}
                                >
                                    <span className="truncate">{opt.label}</span>
                                    {value === opt.value && <Check size={14} />}
                                </div>
                            ))
                        ) : (
                            <div className="px-3 py-4 text-center text-sm text-gray-500">
                                ไม่พบรายการ
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
