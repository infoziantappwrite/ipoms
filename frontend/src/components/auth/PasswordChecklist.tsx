'use client';

import { checkPassword } from '@/lib/passwordPolicy';

/**
 * Compact 2-line password policy hint. Shows a condensed summary instead of
 * 6 separate bullet points. Turns green when all rules are satisfied.
 */
export function PasswordChecklist({ password }: { password: string }) {
  const rules = checkPassword(password);
  const allPassed = password.length > 0 && rules.every((r) => r.passed);
  const failedRules = rules.filter((r) => !r.passed);

  if (allPassed) {
    return (
      <p className="mt-1.5 text-micro text-success font-medium" aria-live="polite">
        Password meets all requirements.
      </p>
    );
  }

  return (
    <div className="mt-1.5 text-micro text-fg-subtle leading-relaxed" aria-live="polite">
      <p>
        Min 9 characters with uppercase, lowercase, a number, and one special character (@ or .).
      </p>
      {password.length > 0 && failedRules.length > 0 && (
        <p className="text-destructive mt-0.5 font-medium">
          Missing: {failedRules.map((r) => r.label).join(' · ')}
        </p>
      )}
    </div>
  );
}
