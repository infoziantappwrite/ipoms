import { connectDatabase, disconnectDatabase } from '../config/database';
import { College } from '../models/College';
import { User } from '../models/User';

/**
 * Official default college focus allocations for all 6 Placement Coordinators.
 * Every coordinator handles their assigned institutions with 100% ownership.
 */
export const DEFAULT_COORDINATOR_COLLEGE_ROSTER: { email: string; name: string; collegeCodes: string[] }[] = [
  {
    name: 'Sujitha S (Sujitha)',
    email: 'sujitha_s@infoziant.com',
    collegeCodes: ['NEHRU', 'KPR', 'SONA', 'MAREPHRA'],
  },
  {
    name: 'A.Mohanaradha (Mohana)',
    email: 'mohanaradha_a@infoziant.com',
    collegeCodes: ['KARPAGAM', 'AIHT', 'ACET', 'KPR'],
  },
  {
    name: 'Thirisha R (Thirisha)',
    email: 'thirisha_r@infoziant.com',
    collegeCodes: ['PSNA', 'DSU', 'SMVEC'],
  },
  {
    name: 'Malavika Ramesh T K (Malavika)',
    email: 'malavika_ramesh@infoziant.com',
    collegeCodes: ['KLU', 'NGCE'],
  },
  {
    name: 'Lizenya R (Lizenya)',
    email: 'lizenya_r@infoziant.com',
    collegeCodes: ['NPR', 'KIOT', 'ACEW'],
  },
  {
    name: 'Megala Devi P S (Megala)',
    email: 'megaladevi_ps@infoziant.com',
    collegeCodes: ['NGP', 'KAMARAJ'],
  },
  {
    name: 'Seshmitha Tamilselvi R (Tamil)',
    email: 'seshmitha_tamil@icl.today',
    collegeCodes: ['MCET', 'MEC'],
  },
];

function getWeekMondayKey(d: Date = new Date()): string {
  const target = new Date(d);
  const day = target.getDay();
  const diff = target.getDate() - day + (day === 0 ? -6 : 1);
  target.setDate(diff);
  return target.toISOString().split('T')[0];
}

async function run() {
  console.log('🏛️ Seeding Official Default College Allocations for all 6 Coordinators...\n');
  await connectDatabase();

  const currentWeekMonday = getWeekMondayKey();
  const allColleges = await College.find({ status: 'active' });
  const collegeCodeMap = new Map<string, any>();
  allColleges.forEach((c) => collegeCodeMap.set(c.college_code.toUpperCase(), c));

  for (const item of DEFAULT_COORDINATOR_COLLEGE_ROSTER) {
    const user = await User.findOne({
      $or: [
        { official_email: item.email.toLowerCase() },
        { full_name: new RegExp(item.name.split(' ')[0], 'i') },
      ],
      is_deleted: false,
    });

    if (!user) {
      console.warn(`⚠️ User not found for email: ${item.email}`);
      continue;
    }

    const assignedIds: any[] = [];
    const validCollegeNames: string[] = [];

    for (const code of item.collegeCodes) {
      const college = collegeCodeMap.get(code.toUpperCase());
      if (college) {
        assignedIds.push(college._id);
        validCollegeNames.push(`[${college.college_code}] ${college.college_name}`);
      } else {
        console.warn(`⚠️ College code "${code}" not found in DB!`);
      }
    }

    user.assigned_college_ids = assignedIds;
    user.weekly_focus_locked = true;
    user.weekly_focus_week_key = currentWeekMonday;
    user.weekly_focus_locked_at = new Date();
    await user.save();

    // Sync bidirectional references on College model
    await College.updateMany(
      { _id: { $in: assignedIds } },
      { $addToSet: { assigned_coordinator_ids: user._id } }
    );

    console.log(`✅ ${user.full_name} (${item.email})`);
    console.log(`   Assigned Colleges (${assignedIds.length}): ${validCollegeNames.join(', ')}`);
    console.log(`   Locked for Week: ${currentWeekMonday}\n`);
  }

  console.log('🎉 Successfully applied 100% default college focus mapping to all coordinators!');
  await disconnectDatabase();
}

if (require.main === module) {
  run().catch(console.error);
}
