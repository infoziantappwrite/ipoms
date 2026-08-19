'use client';

import Image from 'next/image';
import Link from 'next/link';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  clickable?: boolean;
  className?: string;
}

export function InfoziantLogo({
  size = 'md',
  showSubtitle = true,
  clickable = true,
  className = '',
}: Props) {
  const sizeMap = {
    sm: { imgWidth: 32, imgHeight: 32, text: 'text-sm', badge: 'text-micro', sub: 'text-micro' },
    md: { imgWidth: 42, imgHeight: 42, text: 'text-base', badge: 'text-micro', sub: 'text-micro' },
    lg: { imgWidth: 56, imgHeight: 56, text: 'text-xl', badge: 'text-xs', sub: 'text-xs' },
  };

  const current = sizeMap[size];

  const content = (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Official Infoziant Brand Logo */}
      <div className="relative shrink-0 rounded-xl overflow-hidden shadow-sm border border-border/80 bg-white p-1 flex items-center justify-center">
        <Image
          src="/logo.png"
          alt="Infoziant Logo"
          width={current.imgWidth}
          height={current.imgHeight}
          className="object-contain"
          priority
        />
      </div>

      <div>
        <div className="flex items-center gap-2">
          <span className={`font-bold text-fg tracking-tight ${current.text}`}>
            iPOMS
          </span>
          <span className={`bg-primary-subtle text-primary font-bold border border-primary-subtle px-2 py-0.5 rounded-full font-mono ${current.badge}`}>
            v1.0
          </span>
        </div>
        {showSubtitle && (
          <span className={`text-fg-subtle font-medium tracking-wide uppercase block -mt-0.5 ${current.sub}`}>
            Infoziant Placement Operations
          </span>
        )}
      </div>
    </div>
  );

  if (clickable) {
    return (
      <Link href="/" className="group cursor-pointer hover:opacity-95 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
}
