'use client';

import React, { useRef } from 'react';
import { Clock, type LucideIcon } from 'lucide-react';
import { formatTimeAutoMask, smartParseTime } from '@/lib/timeValidation';

interface SmoothTimeInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  icon?: LucideIcon | null;
  autoFocus?: boolean;
  disabled?: boolean;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  title?: string;
  required?: boolean;
  id?: string;
  name?: string;
}

export function SmoothTimeInput({
  value,
  onChange,
  placeholder = 'e.g. 10:30 AM',
  className = '',
  icon: Icon = Clock,
  autoFocus = false,
  disabled = false,
  onBlur,
  onKeyDown,
  title = 'Type 2 numbers for hour (e.g. 11), 2 numbers for min (e.g. 14) — colon & AM/PM are added automatically',
  required = false,
  id,
  name,
}: SmoothTimeInputProps) {
  const prevValRef = useRef(value || '');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const masked = formatTimeAutoMask(raw, prevValRef.current);
    prevValRef.current = masked;
    onChange(masked);
  };

  const handleBlur = () => {
    if (value && value.trim()) {
      const parsed = smartParseTime(value);
      if (parsed) {
        prevValRef.current = parsed.formatted;
        onChange(parsed.formatted);
      }
    }
    if (onBlur) onBlur();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Quick toggle with 'a' or 'p' keys without needing to select text
    if ((e.key === 'a' || e.key === 'A') && value && value.length >= 4) {
      e.preventDefault();
      const updated = value.replace(/\s*[APMamp]*$/i, '').trim() + ' AM';
      prevValRef.current = updated;
      onChange(updated);
      return;
    }
    if ((e.key === 'p' || e.key === 'P') && value && value.length >= 4) {
      e.preventDefault();
      const updated = value.replace(/\s*[APMamp]*$/i, '').trim() + ' PM';
      prevValRef.current = updated;
      onChange(updated);
      return;
    }
    if (onKeyDown) onKeyDown(e);
  };

  return (
    <div className="relative flex items-center w-full">
      {Icon && (
        <Icon
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none opacity-70 shrink-0"
        />
      )}
      <input
        id={id}
        name={name}
        type="text"
        required={required}
        disabled={disabled}
        autoFocus={autoFocus}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleInputKeyDown}
        placeholder={placeholder}
        title={title}
        className={`w-full bg-surface-sunken border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl ${
          Icon ? 'pl-9' : 'pl-3'
        } pr-3.5 py-2.5 text-fg placeholder:text-fg-disabled text-xs transition-all outline-none font-mono font-medium ${className}`}
      />
    </div>
  );
}
