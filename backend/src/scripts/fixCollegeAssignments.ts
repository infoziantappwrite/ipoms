/**
 * Corrects users.assigned_college_ids to the real, human-confirmed roster of
 * which coordinator handles which college - replacing the "everyone assigned
 * to nearly all 25 colleges" state left over from an old boot bug (see CLAUDE.md
 * trap 10 / §5 item 0h).
 *
 * This list is the source of truth for the Weekly Tracker "not your college"
 * warning and its owner-notification email - it is NEVER used to block access.
 * Any coordinator can still create/edit/delete anywhere; this only decides who
 * gets warned and who gets notified.
 *
 * DRY RUN BY DEFAULT. Pass --apply to write.
 *
 *   npm run fix:college-assignments
 *   npm run fix:college-assignments -- --apply
 */
import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);
import dotenv from 'dotenv';
dotenv.config();

import { connectDatabase, disconnectDatabase } from '../config/database';
import { College } from '../models/College';
import { User } from '../models/User';

// Human-confirmed roster (2026-09-05). Colleges not listed anywhere here are
// deliberately left unassigned - no coordinator "owns" them yet, so no warning
// fires for them until someone is assigned.
const ROSTER: Record<string, RegExp[]> = {
  'mohanaradha_a@infoziant.com': [/karpagam/i, /anand institute/i, /achariya/i, /^KPR Institute/i],
  'thirisha_r@infoziant.com': [/^PSNA/i, /dhanalakshmi srinivasan/i, /manakula/i],
  'malavika_ramesh@infoziant.com': [/kalasalingam/i, /narayanaguru/i],
  'lizenya_r@infoziant.com': [/^NPR College/i, /knowledge institute/i, /arunachala/i],
  'megaladevi_ps@infoziant.com': [/N\.?G\.?P\.?/i, /kamaraj/i],
  'seshmitha_tamil@icl.today': [/mahalingam/i, /muthayammal/i],
  // Sujitha is a Team Leader, but genuinely handles these 5 colleges hands-on -
  // treated as their focus owner for warning/notification purposes only. Her
  // Team Leader oversight of every other college is unaffected.
  'sujitha_s@infoziant.com': [/nehru/i, /ephraem/i, /^KPR Institute/i, /hindustan/i, /^SONA/i],
};

async function main() {
  const apply = process.argv.indexOf('--apply') !== -1;
  await connectDatabase();

  const colleges: any[] = await College.find({}).select('_id college_name');
  const report: string[] = [];
  const coveredIds = new Set<string>();

  for (const [email, patterns] of Object.entries(ROSTER)) {
    const user: any = await User.findOne({ official_email: email });
    if (!user) {
      report.push(`  !! NO USER FOUND for ${email}`);
      continue;
    }

    const matched: any[] = [];
    for (const re of patterns) {
      const hit = colleges.find((c) => re.test(c.college_name));
      if (hit) {
        matched.push(hit);
        coveredIds.add(String(hit._id));
      } else {
        report.push(`  !! ${email}: no college matches ${re}`);
      }
    }

    const before = (user.assigned_college_ids || []).length;
    report.push(
      `  ${email.padEnd(32)} ${String(before).padStart(2)} colleges -> ${String(matched.length).padStart(2)} colleges: ` +
      matched.map((m) => m.college_name).join(', ')
    );

    if (apply) {
      user.assigned_college_ids = matched.map((m) => m._id);
      await user.save();
    }
  }

  console.log('\n===== ' + (apply ? 'APPLIED' : 'DRY RUN') + ' =====');
  console.log(report.join('\n'));

  console.log('\n===== Colleges left unassigned (no warning fires for these) =====');
  colleges.forEach((c) => { if (!coveredIds.has(String(c._id))) console.log('  ' + c.college_name); });

  if (!apply) console.log('\n  DRY RUN - nothing was written. Re-run with --apply to save.\n');
  await disconnectDatabase();
}

main().catch((e) => {
  console.error('ERR', e);
  process.exit(1);
});
