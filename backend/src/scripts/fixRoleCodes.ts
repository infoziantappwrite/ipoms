import { connectDatabase, disconnectDatabase } from '../config/database';
import { User } from '../models/User';
import { Role } from '../models/Role';
import { normalizeRole } from '../lib/routePolicy';
import { writeAudit } from '../lib/audit';

/**
 * Repairs drifted `users.role_codes` values.
 *
 *   npm run fix:roles -- --dry     (report only, default)
 *   npm run fix:roles -- --apply   (write changes)
 *
 * Live data contained role codes absent from the `roles` collection —
 * `TEAM_LEAD` instead of `TEAM_LEADER`, `COORDINATOR` instead of
 * `PLACEMENT_COORDINATOR`. Because authorization compares these strings, an
 * active Team Leader silently failed every Team Leader check with no error
 * anywhere: not a crash, just quietly missing access.
 *
 * routePolicy.ts also normalises these aliases at request time, so the system
 * behaves correctly either way. That mapping is a safety net, not a fix — the
 * stored data should still say what it means, or every future query, report and
 * aggregation over role_codes inherits the drift.
 */
async function fixRoleCodes() {
  const apply = process.argv.includes('--apply');

  try {
    await connectDatabase();

    const validCodes = new Set((await Role.find({})).map((r: any) => r.role_code));
    console.log(`\nValid role codes in DB: ${[...validCodes].join(', ')}\n`);

    const users = await User.find({});
    let changed = 0;
    let unfixable = 0;

    for (const user of users) {
      const before: string[] = [...(user.role_codes || [])];
      const after = before.map((code) => {
        if (validCodes.has(code)) return code;
        const normalized = normalizeRole(code);
        return normalized && validCodes.has(normalized) ? normalized : code;
      });

      const stillInvalid = after.filter((c) => !validCodes.has(c));
      if (stillInvalid.length) {
        console.log(`  [UNFIXABLE] ${user.full_name}: ${JSON.stringify(stillInvalid)} — no known mapping`);
        unfixable++;
        continue;
      }

      if (JSON.stringify(before) === JSON.stringify(after)) continue;

      console.log(`  ${apply ? '[FIXED]  ' : '[WOULD FIX]'} ${user.full_name}: ${JSON.stringify(before)} -> ${JSON.stringify(after)}`);
      changed++;

      if (apply) {
        user.role_codes = after;
        await user.save();
        await writeAudit({
          action: 'UPDATE',
          entityType: 'users',
          entityId: user._id,
          performedByRole: 'system',
          performedByEmail: user.official_email,
          module: 'Security & Audit',
          severity: 'critical',
          summary: `Normalised drifted role_codes ${JSON.stringify(before)} -> ${JSON.stringify(after)}`,
        });
      }
    }

    console.log('\n=============================================================');
    console.log(`  Users scanned : ${users.length}`);
    console.log(`  ${apply ? 'Repaired' : 'Would repair'}      : ${changed}`);
    console.log(`  Unfixable     : ${unfixable}`);
    if (!apply && changed > 0) console.log('\n  Dry run. Re-run with --apply to write these changes.');
    console.log('=============================================================\n');
  } catch (error) {
    console.error('[ERROR] Role code repair failed:', error);
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }
}

fixRoleCodes();
