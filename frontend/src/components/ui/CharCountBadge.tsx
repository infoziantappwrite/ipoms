'use client';

interface Props {
  length: number;
  min: number;
  /** Label used below the minimum, e.g. "Min 10 characters required" */
  belowLabel?: string;
  /** Label used at/above the minimum, e.g. "chars" */
  validUnit?: string;
}

/**
 * High-contrast, theme-aware character count pill for text fields with minimum length requirements.
 */
export function CharCountBadge({ length, min, belowLabel, validUnit = 'chars' }: Props) {
  const isValid = length >= min;
  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold text-[11px] px-2 py-0.5 rounded-lg border transition-colors ${
        isValid
          ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 dark:bg-emerald-950/60 border-emerald-500/30'
          : 'text-amber-700 dark:text-amber-300 bg-amber-500/10 dark:bg-amber-950/60 border-amber-500/30'
      }`}
    >
      {isValid ? `✓ Valid (${length} ${validUnit})` : `${belowLabel ?? `Min ${min} characters required`} (${length}/${min})`}
    </span>
  );
}
