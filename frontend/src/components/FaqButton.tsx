'use client';

import React from 'react';
import Link from 'next/link';
import { HelpCircle } from 'lucide-react';

interface FaqButtonProps {
  category?: string;
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function FaqButton({
  category = 'all',
  className = '',
  showLabel = false,
  size = 'md',
}: FaqButtonProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-9 h-9 text-xs',
    lg: 'px-3 py-2 text-xs',
  }[size];

  const href = category && category !== 'all' ? `/faq?category=${category}` : '/faq';

  return (
    <Link
      href={href}
      title="Frequently Asked Questions & Placement Operations Manual (25 Topics)"
      aria-label="Open Frequently Asked Questions"
      className={`flex items-center justify-center gap-1.5 rounded-xl border border-border/80 bg-surface/90 hover:bg-surface-raised hover:border-primary/40 text-fg-subtle hover:text-primary transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-95 group select-none ${
        showLabel ? 'px-3 py-1.5' : sizeClasses
      } ${className}`}
    >
      <HelpCircle
        size={size === 'sm' ? 15 : 17}
        strokeWidth={2.2}
        className="group-hover:scale-110 group-hover:text-primary transition-all text-primary/80"
      />
      {showLabel && (
        <span className="font-bold text-fg group-hover:text-primary transition-colors text-xs">
          FAQs & Help
        </span>
      )}
    </Link>
  );
}
