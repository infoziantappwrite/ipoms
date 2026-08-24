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
 * Amber "below minimum" / emerald "valid" character-count pill, shared by any
 * free-text field with a minimum-length rule (Pending Tasks add/bulk-edit modals).
 */
export function CharCountBadge({ length, min, belowLabel, validUnit = 'chars' }: Props) {
  const isValid = length >= min;
  return (
    <span
      className={
        isValid
          ? 'text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded'
          : 'text-amber-600 font-semibold bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded'
      }
    >
      {isValid ? `✓ Valid (${length} ${validUnit})` : `${belowLabel ?? `Min ${min} characters required`} (${length}/${min})`}
    </span>
  );
}
