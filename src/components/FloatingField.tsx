'use client';

import {
    type InputHTMLAttributes,
    type ReactNode,
    type SelectHTMLAttributes,
    type TextareaHTMLAttributes,
    useEffect,
    useId,
    useState,
} from 'react';
import { Search } from 'lucide-react';

type BaseFloatingProps = {
    label: string;
    icon?: ReactNode;
    containerClassName?: string;
    labelClassName?: string;
    dense?: boolean;
};

type FloatingInputProps = BaseFloatingProps & InputHTMLAttributes<HTMLInputElement>;
type FloatingTextareaProps = BaseFloatingProps & TextareaHTMLAttributes<HTMLTextAreaElement>;
type FloatingSelectProps = BaseFloatingProps & SelectHTMLAttributes<HTMLSelectElement>;

function cx(...values: Array<string | false | null | undefined>) {
    return values.filter(Boolean).join(' ');
}

function isFilledValue(value: unknown) {
    return value !== undefined && value !== null && String(value).trim().length > 0;
}

function FloatingShell({
    children,
    label,
    icon,
    htmlFor,
    containerClassName,
    labelClassName,
    filled = false,
    dense = false,
}: {
    children: ReactNode;
    label: string;
    icon?: ReactNode;
    htmlFor: string;
    containerClassName?: string;
    labelClassName?: string;
    filled?: boolean;
    dense?: boolean;
}) {
    return (
        <div
            className={cx('floating-field', dense && 'floating-field--dense', containerClassName)}
            data-filled={filled ? 'true' : 'false'}
            data-has-icon={icon ? 'true' : 'false'}
        >
            {children}
            {icon ? <span className="floating-icon">{icon}</span> : null}
            <label htmlFor={htmlFor} className={cx('floating-label', labelClassName)}>
                {label}
            </label>
        </div>
    );
}

export function FloatingInput({
    label,
    icon,
    id,
    className,
    containerClassName,
    labelClassName,
    dense,
    placeholder,
    value,
    defaultValue,
    ...props
}: FloatingInputProps) {
    const autoId = useId();
    const resolvedId = id ?? `floating-input-${autoId}`;
    const filled = isFilledValue(value ?? defaultValue);

    return (
        <FloatingShell
            label={label}
            icon={icon}
            htmlFor={resolvedId}
            containerClassName={containerClassName}
            labelClassName={labelClassName}
            filled={filled}
            dense={dense}
        >
            <input
                {...props}
                id={resolvedId}
                value={value}
                defaultValue={defaultValue}
                placeholder={placeholder ?? ' '}
                className={cx('floating-control', className)}
            />
        </FloatingShell>
    );
}

export function FloatingTextarea({
    label,
    icon,
    id,
    className,
    containerClassName,
    labelClassName,
    dense,
    placeholder,
    value,
    defaultValue,
    rows,
    ...props
}: FloatingTextareaProps) {
    const autoId = useId();
    const resolvedId = id ?? `floating-textarea-${autoId}`;
    const filled = isFilledValue(value ?? defaultValue);

    return (
        <FloatingShell
            label={label}
            icon={icon}
            htmlFor={resolvedId}
            containerClassName={containerClassName}
            labelClassName={labelClassName}
            filled={filled}
            dense={dense}
        >
            <textarea
                {...props}
                id={resolvedId}
                value={value}
                defaultValue={defaultValue}
                rows={rows ?? 4}
                placeholder={placeholder ?? ' '}
                className={cx('floating-control floating-control--textarea', className)}
            />
        </FloatingShell>
    );
}

export function FloatingSelect({
    label,
    icon,
    id,
    className,
    containerClassName,
    labelClassName,
    dense,
    value,
    defaultValue,
    onChange,
    children,
    ...props
}: FloatingSelectProps) {
    const autoId = useId();
    const resolvedId = id ?? `floating-select-${autoId}`;
    const [filled, setFilled] = useState(isFilledValue(value ?? defaultValue));

    useEffect(() => {
        if (value !== undefined) {
            setFilled(isFilledValue(value));
        }
    }, [value]);

    return (
        <FloatingShell
            label={label}
            icon={icon}
            htmlFor={resolvedId}
            containerClassName={containerClassName}
            labelClassName={labelClassName}
            filled={filled}
            dense={dense}
        >
            <select
                {...props}
                id={resolvedId}
                value={value}
                defaultValue={defaultValue}
                onChange={(event) => {
                    setFilled(isFilledValue(event.target.value));
                    onChange?.(event);
                }}
                className={cx('floating-control floating-control--select', className)}
            >
                {children}
            </select>
        </FloatingShell>
    );
}

type FloatingSearchInputProps = Omit<FloatingInputProps, 'icon'>;

export function FloatingSearchInput({
    label = 'Search',
    dense = false,
    className,
    containerClassName,
    labelClassName,
    ...props
}: FloatingSearchInputProps) {
    return (
        <FloatingInput
            {...props}
            label={label}
            icon={<Search className="h-4 w-4" />}
            dense={dense}
            className={cx('floating-control--search', className)}
            containerClassName={containerClassName}
            labelClassName={labelClassName}
        />
    );
}
