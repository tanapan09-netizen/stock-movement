'use client';

import { useState, useEffect, useCallback } from 'react';

interface CurrencyInputProps {
    name: string;
    defaultValue?: number;
    required?: boolean;
    placeholder?: string;
    className?: string;
}

export default function CurrencyInput({
    name,
    defaultValue = 0,
    required = false,
    placeholder = '0.00',
    className = ''
}: CurrencyInputProps) {
    const [displayValue, setDisplayValue] = useState('');
    const [rawValue, setRawValue] = useState(defaultValue);

    const formatNumber = useCallback((num: number): string => {
        return num.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }, []);

    useEffect(() => {
        if (defaultValue > 0) {
            setDisplayValue(formatNumber(defaultValue));
            setRawValue(defaultValue);
        }
    }, [defaultValue, formatNumber]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value;

        // Remove all characters except digits and decimal point
        value = value.replace(/[^0-9.]/g, '');

        // Ensure only one decimal point
        const parts = value.split('.');
        if (parts.length > 2) {
            value = parts[0] + '.' + parts.slice(1).join('');
        }

        // Limit to 2 decimal places
        if (parts[1] && parts[1].length > 2) {
            value = parts[0] + '.' + parts[1].slice(0, 2);
        }

        // Parse and format
        const numericValue = parseFloat(value) || 0;
        setRawValue(numericValue);

        // Show formatted on blur, raw while typing
        setDisplayValue(value);
    };

    const handleBlur = () => {
        if (rawValue > 0) {
            setDisplayValue(formatNumber(rawValue));
        } else {
            setDisplayValue('');
        }
    };

    const handleFocus = () => {
        // Show raw value when focused for easier editing
        if (rawValue > 0) {
            setDisplayValue(rawValue.toString());
        }
    };

    return (
        <>
            <input
                type="text"
                inputMode="decimal"
                value={displayValue}
                onChange={handleChange}
                onBlur={handleBlur}
                onFocus={handleFocus}
                placeholder={placeholder}
                required={required}
                className={`mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 ${className}`}
            />
            <input type="hidden" name={name} value={rawValue} />
        </>
    );
}
