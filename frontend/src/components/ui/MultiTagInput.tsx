'use client';

import React, { useState, useRef, useCallback, KeyboardEvent, ClipboardEvent } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import type { ValidationResult } from '@/lib/contactValidation';

export interface MultiTagInputProps {
  values: string[];
  onChange: (newValues: string[]) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  type?: 'text' | 'email' | 'tel';
  required?: boolean;
  disabled?: boolean;
  maxTags?: number;
  className?: string;
  isMono?: boolean;
  validator?: (val: string) => ValidationResult;
  onError?: (errorMessage: string) => void;
  inputRef?: React.RefObject<HTMLInputElement>;
}

/**
 * Split text by common separators (comma, semicolon, newline, slash, tab)
 */
function parseRawInput(raw: string): string[] {
  return raw
    .split(/[,;\n\r\t/]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function MultiTagInput({
  values = [],
  onChange,
  placeholder = 'Type and press comma or Enter…',
  icon,
  type = 'text',
  required = false,
  disabled = false,
  maxTags,
  className = '',
  isMono = true,
  validator,
  onError,
  inputRef,
}: MultiTagInputProps) {
  const { toast } = useToast();
  const [inputValue, setInputValue] = useState('');
  const [hasError, setHasError] = useState(false);
  const internalInputRef = useRef<HTMLInputElement>(null);

  const setCombinedRef = useCallback(
    (element: HTMLInputElement | null) => {
      (internalInputRef as any).current = element;
      if (!inputRef) return;
      if (typeof inputRef === 'function') {
        (inputRef as any)(element);
      } else {
        (inputRef as any).current = element;
      }
    },
    [inputRef]
  );

  const addValues = useCallback(
    (newItems: string[]) => {
      if (disabled) return;
      const validItems: string[] = [];
      let lastError: string | null = null;

      newItems.forEach((item) => {
        const raw = item.trim();
        if (!raw) return;

        if (validator) {
          const res = validator(raw);
          if (!res.valid) {
            lastError = res.error || `Invalid entry: "${raw}"`;
            return;
          }
          if (values.includes(res.normalized)) return; // Avoid duplicates
          validItems.push(res.normalized);
        } else {
          const cleaned = type === 'email' ? raw.toLowerCase() : raw;
          if (values.includes(cleaned)) return; // Avoid duplicates
          validItems.push(cleaned);
        }
      });

      if (lastError) {
        setHasError(true);
        setTimeout(() => setHasError(false), 2000);
        if (onError) {
          onError(lastError);
        } else {
          toast(lastError, 'warning');
        }
      }

      if (validItems.length > 0) {
        const combined = [...values, ...validItems];
        const limited = maxTags ? combined.slice(0, maxTags) : combined;
        onChange(limited);
        setInputValue('');
      }
    },
    [disabled, type, values, validator, onError, maxTags, onChange, toast]
  );

  const handleRemoveTag = (indexToRemove: number) => {
    if (disabled) return;
    const updated = values.filter((_, idx) => idx !== indexToRemove);
    onChange(updated);
    internalInputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    // Trigger tag creation on Enter, Comma, Semicolon, or Tab
    if (e.key === 'Enter' || e.key === ',' || e.key === ';' || e.key === 'Tab') {
      if (inputValue.trim()) {
        e.preventDefault();
        const parsed = parseRawInput(inputValue);
        addValues(parsed);
      }
    } else if (e.key === 'Backspace' && !inputValue && values.length > 0) {
      // Remove last tag on Backspace when input is empty
      e.preventDefault();
      handleRemoveTag(values.length - 1);
    }
  };

  const handleBlur = () => {
    if (inputValue.trim()) {
      const parsed = parseRawInput(inputValue);
      addValues(parsed);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    if (pastedText) {
      const parsed = parseRawInput(pastedText);
      addValues(parsed);
    }
  };

  const handleContainerClick = () => {
    internalInputRef.current?.focus();
  };

  return (
    <div
      onClick={handleContainerClick}
      className={`relative min-h-[38px] flex flex-wrap items-center gap-1.5 p-1.5 ${
        icon ? 'pl-9' : 'pl-3'
      } pr-2.5 bg-surface-sunken border rounded-xl text-xs text-fg transition-all shadow-2xs cursor-text ${
        hasError
          ? 'border-rose-500/80 ring-2 ring-rose-500/20 bg-rose-50/20 dark:bg-rose-950/20'
          : 'border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20'
      } ${disabled ? 'opacity-60 cursor-not-allowed bg-surface-raised' : 'hover:border-border-strong'} ${className}`}
    >
      {/* Icon */}
      {icon && (
        <div className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none shrink-0 transition-colors ${
          hasError ? 'text-rose-500' : 'text-fg-subtle'
        }`}>
          {icon}
        </div>
      )}

      {/* Rendered Tag Badges */}
      {values.map((tag, idx) => (
        <span
          key={`${tag}-${idx}`}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20 font-medium text-xs select-none transition-all animate-in fade-in zoom-in-95 duration-100 ${
            isMono ? 'font-mono' : ''
          }`}
        >
          <span className="truncate max-w-[200px]" title={tag}>
            {tag}
          </span>
          {!disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveTag(idx);
              }}
              title="Remove"
              className="w-3.5 h-3.5 rounded-full hover:bg-primary/20 flex items-center justify-center text-primary/70 hover:text-primary transition-colors cursor-pointer shrink-0"
            >
              <X size={10} strokeWidth={2.5} />
            </button>
          )}
        </span>
      ))}

      {/* Embedded Input Field */}
      {(!maxTags || values.length < maxTags) && (
        <input
          ref={setCombinedRef}
          type="text"
          value={inputValue}
          disabled={disabled}
          onChange={(e) => {
            const val = e.target.value;
            // If user types a comma or semicolon directly, commit immediately
            if (val.includes(',') || val.includes(';')) {
              const parsed = parseRawInput(val);
              addValues(parsed);
            } else {
              setInputValue(val);
            }
          }}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onPaste={handlePaste}
          placeholder={values.length === 0 ? placeholder : 'Add another…'}
          className={`flex-1 min-w-[140px] bg-transparent border-0 outline-none text-xs text-fg placeholder:text-fg-disabled py-0.5 px-1 ${
            isMono ? 'font-mono' : ''
          }`}
        />
      )}

      {/* Hidden input for HTML5 required constraint validation */}
      {required && values.length === 0 && !inputValue.trim() && (
        <input
          tabIndex={-1}
          required
          aria-hidden
          className="opacity-0 w-0 h-0 absolute pointer-events-none"
          value=""
          onChange={() => {}}
        />
      )}
    </div>
  );
}
