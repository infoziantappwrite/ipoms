'use client';

interface Props {
  className?: string;
}

/**
 * 5-bar animated equalizer wave loader (Uiverse.io by satyamchaudharydev).
 * Smoothly scales 5 vibrant bars with staggered delays.
 */
export function WaveLoader({ className = '' }: Props) {
  return (
    <div className={`wave-loading ${className}`} aria-label="Loading..." role="status">
      <span />
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}
