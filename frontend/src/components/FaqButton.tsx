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
    sm: 'w-[30px] h-[30px] text-xs',
    md: 'w-[30px] h-[30px] text-xs',
    lg: 'h-[30px] px-3 text-xs',
  }[size];

  const href = category && category !== 'all' ? `/faq?category=${category}` : '/faq';

  return (
    <Link
      href={href}
      title="Frequently Asked Questions & Placement Operations Manual (25 Topics)"
      aria-label="Open Frequently Asked Questions"
      style={{ background: 'linear-gradient(180deg, #9AA0A6 0%, #64748B 50%, #334155 100%)' }}
      className={`flex items-center justify-center gap-1.5 rounded-lg border border-slate-400/30 text-white hover:brightness-110 transition-all cursor-pointer shadow-md shadow-slate-500/25 active:scale-[0.95] group select-none ${
        showLabel ? 'h-[30px] px-3' : sizeClasses
      } ${className}`}
    >
      <HelpCircle
        size={14}
        strokeWidth={2.2}
        className="text-white shrink-0"
      />
      {showLabel && (
        <span className="font-bold text-white text-xs">
          FAQs & Help
        </span>
      )}
    </Link>
  );
}
