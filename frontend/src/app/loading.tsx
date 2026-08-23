import { PageSkeleton } from '@/components/PageSkeleton';

/**
 * Next.js App Router default Loading boundary.
 * Rendered automatically during page transitions and initial page loads.
 */
export default function Loading() {
  return <PageSkeleton />;
}
