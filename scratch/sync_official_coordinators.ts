import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../backend/src/models/User';
import { College } from '../backend/src/models/College';

dotenv.config({ path: 'c:/Projects/iPOMS/backend/.env' });

export const DEFAULT_COORDINATOR_COLLEGE_ROSTER: { email: string; name: string; collegeCodes: string[] }[] = [
  {
    name: 'A.Mohanaradha (Mohana)',
    email: 'mohanaradha_a@infoziant.com',
    collegeCodes: ['KARPAGAM', 'AIHT', 'ACET', 'KPR'],
  },
  {
    name: 'Sujitha S (Sujitha)',
    email: 'sujitha_s@infoziant.com',
    collegeCodes: ['HITS', 'NEHRU', 'KPR', 'SONA', 'MAREPHRA'],
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

function getWeekMondayKey(d = new Date()) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  const year = monday.getFullYear();
  const month = String(monday.getMonth() + 1).padStart(2, '0');
  const dayStr = String(monday.getDate()).padStart(2, '0');
  return `${year}-${month}-${dayStr}`;
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected to DB');

  const currentWeekMonday = getWeekMondayKey();
  const allColleges = await College.find({ status: 'active' });
  const collegeCodeMap = new Map<string, any>();
  allColleges.forEach((c: any) => collegeCodeMap.set(c.college_code.toUpperCase(), c));

  for (const item of DEFAULT_COORDINATOR_COLLEGE_ROSTER) {
    const user = await User.findOne({
      official_email: item.email.toLowerCase(),
      is_deleted: false,
    });

    if (!user) {
      console.warn(`User not found for: ${item.email}`);
      continue;
    }

    const assignedIds: any[] = [];
    const validCollegeNames: string[] = [];

    for (const code of item.collegeCodes) {
      const college = collegeCodeMap.get(code.toUpperCase());
      if (college) {
        assignedIds.push(college._id);
        validCollegeNames.push(`[${college.college_code}] ${college.college_name}`);
      }
    }

    user.assigned_college_ids = assignedIds;
    user.weekly_focus_locked = true;
    user.weekly_focus_week_key = currentWeekMonday;
    user.weekly_focus_locked_at = new Date();
    await user.save();

    // Pull this user from all colleges first, then add to the designated colleges
    await College.updateMany(
      { assigned_coordinator_ids: user._id },
      { $pull: { assigned_coordinator_ids: user._id } }
    );
    await College.updateMany(
      { _id: { $in: assignedIds } },
      { $addToSet: { assigned_coordinator_ids: user._id } }
    );

    console.log(`Updated ${user.full_name} (${item.email}): [${item.collegeCodes.join(', ')}]`);
  }

  console.log('\n--- VERIFYING SIMULATED FOCUS MATRIX FOR MOHANARADHA ---');
  const mohana = await User.findOne({ official_email: 'mohanaradha_a@infoziant.com' });
  const currentUserId = String(mohana!._id);
  const activeCoordinators = await User.find({
    role_codes: { $in: ['COORDINATOR', 'PLACEMENT_COORDINATOR', 'TEAM_LEADER'] },
    account_status: 'active',
    is_deleted: false,
  }).select('_id full_name official_email assigned_college_ids weekly_focus_locked weekly_focus_week_key weekly_focus_locked_at').lean();

  const collegeHandlersMap = new Map<string, Array<{ user_id: string; name: string; email: string }>>();
  for (const coord of activeCoordinators) {
    const coordIdStr = String(coord._id);
    if (currentUserId && coordIdStr === String(currentUserId)) {
      continue;
    }
    const isLockedForWeek = Boolean(coord.weekly_focus_locked && coord.weekly_focus_week_key === currentWeekMonday);
    const assignedIds = Array.isArray(coord.assigned_college_ids) ? coord.assigned_college_ids : [];
    if (isLockedForWeek && assignedIds.length > 0) {
      for (const cid of assignedIds) {
        const cIdStr = String(cid);
        const list = collegeHandlersMap.get(cIdStr) || [];
        if (!list.some((h) => h.user_id === coordIdStr)) {
          list.push({
            user_id: coordIdStr,
            name: coord.full_name,
            email: coord.official_email,
          });
          collegeHandlersMap.set(cIdStr, list);
        }
      }
    }
  }

  for (const col of allColleges) {
    const cIdStr = String(col._id);
    const otherHandlers = collegeHandlersMap.get(cIdStr) || [];
    const isSelectedByMe = (mohana!.assigned_college_ids || []).map(String).includes(cIdStr);
    if (['ACET', 'AIHT', 'KARPAGAM', 'KPR'].includes((col as any).college_code)) {
      console.log(`[${(col as any).college_code}] isSelectedByMe: ${isSelectedByMe}, otherHandlers (${otherHandlers.length}): ${otherHandlers.map(h => h.name).join(', ')}`);
    }
  }

  await mongoose.disconnect();
}

run().catch(console.error);
