import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes with correct conflict resolution.
 * `clsx` and `tailwind-merge` were already dependencies but had zero imports.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
