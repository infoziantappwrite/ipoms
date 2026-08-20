'use client';

import Image from 'next/image';

interface Props {
  /** Rendered height in px; width follows the asset's 1:1 aspect ratio. */
  size?: number;
  className?: string;
}

/**
 * Infoziant hexagon mark alone — no wordmark, no version badge.
 *
 * Distinct from `InfoziantLogo` (the horizontal "Infoziant" wordmark used in
 * the persistent nav / /home): this is the icon-only asset
 * (college logos/Infozianthead.png, copied to public/infoziant-head.png),
 * square (625x625), used specifically on the splash screen and the
 * login/signup card per the brief — rendered bare and large rather than
 * boxed, since it's the sole visual anchor on those screens.
 */
export function InfoziantMark({ size = 96, className = '' }: Props) {
  return (
    <Image
      src="/infoziant-head.png"
      alt="Infoziant"
      width={size}
      height={size}
      className={`object-contain ${className}`}
      priority
    />
  );
}
