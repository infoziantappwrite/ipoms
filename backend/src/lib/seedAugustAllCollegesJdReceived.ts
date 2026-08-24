import { Types } from 'mongoose';
import { DailyLead } from '../models/DailyLead';
import { College } from '../models/College';
import { User } from '../models/User';
import { CompanyMetadata } from '../models/CompanyMetadata';

export interface JdSeedItem {
  date: string;
  time: string;
  company: string;
  role: string;
  ctc: string;
  batch: string;
  collegeCode: string;
}

export const AUGUST_JD_RECEIVED_DATA: JdSeedItem[] = [
  // ── 08/04/2026 ─────────────────────────────────────────────────────────────
  {
    date: '2026-08-04',
    time: '12:00 PM',
    company: 'Fristine Infotech Private Limited',
    role: 'Zoho Developer, Business Analyst, Data Engineer - Intern',
    ctc: 'Not Mentioned',
    batch: '2027',
    collegeCode: 'PSNA',
  },

  // ── 08/05/2026 ─────────────────────────────────────────────────────────────
  {
    date: '2026-08-05',
    time: '11:00 AM',
    company: 'Tridots',
    role: 'Business Analyst',
    ctc: '4 - 4.5 LPA',
    batch: '2027',
    collegeCode: 'KLU',
  },

  // ── 08/06/2026 ─────────────────────────────────────────────────────────────
  {
    date: '2026-08-06',
    time: '04:00 PM',
    company: 'Perfint Healthcare Ltd',
    role: 'QARA- Engineer, Intern - SDE',
    ctc: '5 - 6 LPA',
    batch: '2027',
    collegeCode: 'KLU',
  },
  {
    date: '2026-08-06',
    time: '10:54 AM',
    company: 'InCoban',
    role: 'Multiple Roles',
    ctc: '3 LPA',
    batch: '2027',
    collegeCode: 'DSU',
  },

  // ── 08/07/2026 ─────────────────────────────────────────────────────────────
  {
    date: '2026-08-07',
    time: '01:08 PM',
    company: 'Fristine Infotech Private Limited',
    role: 'Zoho Developer, Business Analyst, Data Engineer - Intern',
    ctc: 'Not Mentioned',
    batch: '2027',
    collegeCode: 'KIOT',
  },

  // ── 08/11/2026 ─────────────────────────────────────────────────────────────
  {
    date: '2026-08-11',
    time: '02:19 PM',
    company: 'Integra',
    role: 'Production Editor Trainee',
    ctc: '3 - 4 LPA',
    batch: '2027',
    collegeCode: 'KLU',
  },
  {
    date: '2026-08-11',
    time: '04:18 PM',
    company: 'V max Health Tech',
    role: 'Multiple Roles',
    ctc: '3 LPA',
    batch: '2027',
    collegeCode: 'KLU',
  },

  // ── 08/12/2026 ─────────────────────────────────────────────────────────────
  {
    date: '2026-08-12',
    time: '02:27 PM',
    company: 'Resnet Solutions',
    role: 'ML Developer',
    ctc: '8 - 12 LPA',
    batch: '2027',
    collegeCode: 'PSNA',
  },
  {
    date: '2026-08-12',
    time: '02:23 PM',
    company: 'Resnet Solutions',
    role: 'ML Developer',
    ctc: '8 - 12 LPA',
    batch: '2027',
    collegeCode: 'NGCE',
  },
  {
    date: '2026-08-12',
    time: '02:20 PM',
    company: 'Resnet Solutions',
    role: 'ML Developer',
    ctc: '8 - 12 LPA',
    batch: '2027',
    collegeCode: 'NEHRU',
  },

  // ── 08/13/2026 ─────────────────────────────────────────────────────────────
  {
    date: '2026-08-13',
    time: '12:05 PM',
    company: 'BIBUS INDIA PVT LTD',
    role: 'Design Engineer',
    ctc: 'Not Mentioned',
    batch: '2027',
    collegeCode: 'PSNA',
  },
  {
    date: '2026-08-13',
    time: '04:27 PM',
    company: 'Kritilabs',
    role: 'Mechanical Engineering- Intern',
    ctc: '14k/M',
    batch: '2027',
    collegeCode: 'ACET',
  },

  // ── 08/14/2026 ─────────────────────────────────────────────────────────────
  {
    date: '2026-08-14',
    time: '10:46 AM',
    company: 'BIBUS INDIA PVT LTD',
    role: 'Design Engineer, Internal Coordinator',
    ctc: '3 LPA',
    batch: '2027',
    collegeCode: 'KPR',
  },
  {
    date: '2026-08-14',
    time: '09:58 AM',
    company: 'BIBUS INDIA PVT LTD',
    role: 'Design Engineer, Internal Coordinator',
    ctc: '3 LPA',
    batch: '2027',
    collegeCode: 'ACET',
  },
  {
    date: '2026-08-14',
    time: '02:36 PM',
    company: 'Voltech',
    role: 'GTE (EEE)',
    ctc: '25,997/M',
    batch: '2027',
    collegeCode: 'ACET',
  },
  {
    date: '2026-08-14',
    time: '10:05 AM',
    company: 'BIBUS INDIA PVT LTD',
    role: 'Design Engineer, Internal Coordinator',
    ctc: '3 LPA',
    batch: '2027',
    collegeCode: 'NEHRU',
  },
  {
    date: '2026-08-14',
    time: '10:02 AM',
    company: 'BIBUS INDIA PVT LTD',
    role: 'Design Engineer, Internal Coordinator',
    ctc: '3 LPA',
    batch: '2027',
    collegeCode: 'HITS',
  },

  // ── 08/18/2026 ─────────────────────────────────────────────────────────────
  {
    date: '2026-08-18',
    time: '12:30 PM',
    company: 'Voltech Group',
    role: 'Graduate Trainee Engineer',
    ctc: '3.12 LPA',
    batch: '2027',
    collegeCode: 'NEHRU',
  },
  {
    date: '2026-08-18',
    time: '09:45 AM',
    company: 'CartRabbit',
    role: 'Digital Marketing/Product Support/Sales',
    ctc: '3 LPA',
    batch: '2027',
    collegeCode: 'NGCE',
  },
  {
    date: '2026-08-18',
    time: '09:47 AM',
    company: 'CartRabbit',
    role: 'Digital Marketing Intern',
    ctc: '3 LPA',
    batch: '2027',
    collegeCode: 'ACEW',
  },

  // ── 08/19/2026 ─────────────────────────────────────────────────────────────
  {
    date: '2026-08-19',
    time: '02:37 PM',
    company: 'Rishabh Enterprises',
    role: 'GET',
    ctc: '3 - 4 LPA',
    batch: '2027',
    collegeCode: 'PSNA',
  },

  // ── 08/20/2026 ─────────────────────────────────────────────────────────────
  {
    date: '2026-08-20',
    time: '12:26 PM',
    company: 'Brakes India Pvt Ltd',
    role: 'Graduate Engineer Trainee',
    ctc: '3.80 - 5.82 LPA',
    batch: '2027',
    collegeCode: 'HITS',
  },
  {
    date: '2026-08-20',
    time: '10:14 AM',
    company: 'Fristine Infotech Pvt Ltd',
    role: 'Zoho Developer/Business Analyst/Data Engineer',
    ctc: '3 - 6 LPA',
    batch: '2027',
    collegeCode: 'NEHRU',
  },

  // ── 08/21/2026 ─────────────────────────────────────────────────────────────
  {
    date: '2026-08-21',
    time: '12:02 PM',
    company: 'Loyal Wingman Technologies Pvt. Ltd.',
    role: 'GET',
    ctc: 'Not Mentioned',
    batch: '2026 & 2027',
    collegeCode: 'PSNA',
  },
  {
    date: '2026-08-21',
    time: '04:27 PM',
    company: 'Loyal Wingman Technologies Pvt. Ltd.',
    role: 'GET',
    ctc: 'Not Mentioned',
    batch: '2026 & 2027',
    collegeCode: 'SMVEC',
  },

  // ── 08/24/2026 (Today) ─────────────────────────────────────────────────────
  {
    date: '2026-08-24',
    time: '11:19 AM',
    company: 'Crawl Crop India Pvt Ltd',
    role: 'Software Associate Trainee',
    ctc: '3.5 - 4 LPA',
    batch: '2027',
    collegeCode: 'HITS',
  },
  {
    date: '2026-08-24',
    time: '12:41 PM',
    company: 'AquaAirX',
    role: 'Sourcing & Procurement Intern',
    ctc: '10k/month',
    batch: '2027',
    collegeCode: 'HITS',
  },
  {
    date: '2026-08-24',
    time: '03:16 PM',
    company: 'Pepagora',
    role: 'Inside Sales Associate/BDA',
    ctc: '10k/month & 4 LPA',
    batch: '2027',
    collegeCode: 'HITS',
  },
  {
    date: '2026-08-24',
    time: '11:19 AM',
    company: 'Crawl Crop India Pvt Ltd',
    role: 'Software Associate Trainee',
    ctc: '3.5 - 4 LPA',
    batch: '2027',
    collegeCode: 'NEHRU',
  },
  {
    date: '2026-08-24',
    time: '12:43 PM',
    company: 'AquaAirX',
    role: 'Sourcing & Procurement Intern',
    ctc: '10k/month',
    batch: '2027',
    collegeCode: 'NEHRU',
  },
  {
    date: '2026-08-24',
    time: '11:17 AM',
    company: 'Crawl Crop India Pvt Ltd',
    role: 'Software Associate Trainee',
    ctc: '3.5 - 4 LPA',
    batch: '2027',
    collegeCode: 'KIOT',
  },
  {
    date: '2026-08-24',
    time: '12:39 PM',
    company: 'AquaAirX',
    role: 'Sourcing & Procurement Intern',
    ctc: '10k/month',
    batch: '2027',
    collegeCode: 'SMVEC',
  },
  {
    date: '2026-08-24',
    time: '01:05 PM',
    company: 'Fristine Infotech Pvt Ltd',
    role: 'Zoho Developer/Business Analyst/Data Engineer',
    ctc: '3 - 6 LPA',
    batch: '2027',
    collegeCode: 'SMVEC',
  },
  {
    date: '2026-08-24',
    time: '12:39 PM',
    company: 'AquaAirX',
    role: 'Sourcing & Procurement Intern',
    ctc: '10k/month',
    batch: '2027',
    collegeCode: 'ACEW',
  },
  {
    date: '2026-08-24',
    time: '11:19 AM',
    company: 'Crawl Crop India Pvt Ltd',
    role: 'Software Associate Trainee',
    ctc: '3.5 - 4 LPA',
    batch: '2027',
    collegeCode: 'PSNA',
  },
  {
    date: '2026-08-24',
    time: '12:38 PM',
    company: 'AquaAirX',
    role: 'Sourcing & Procurement Intern',
    ctc: '10k/month',
    batch: '2027',
    collegeCode: 'DSU',
  },
  {
    date: '2026-08-24',
    time: '11:17 AM',
    company: 'Crawl Crop India Pvt Ltd',
    role: 'Software Associate Trainee',
    ctc: '3.5 - 4 LPA',
    batch: '2027',
    collegeCode: 'AIHT',
  },
  {
    date: '2026-08-24',
    time: '12:42 PM',
    company: 'AquaAirX',
    role: 'Sourcing & Procurement Intern',
    ctc: '10k/month',
    batch: '2027',
    collegeCode: 'AIHT',
  },
];

const COLLEGE_META_MAP: Record<string, { name: string; location: string; aliases: string[] }> = {
  PSNA: { name: 'PSNA College of Engineering and Technology', location: 'Dindigul, Tamil Nadu', aliases: ['PSNA'] },
  NPR: { name: 'NPR College of Engineering & Technology', location: 'Natham / Dindigul, Tamil Nadu', aliases: ['NPR'] },
  KIOT: { name: 'Knowledge Institute of Technology', location: 'Salem, Tamil Nadu', aliases: ['KIOT'] },
  SMVEC: { name: 'Sri Manakula Vinayagar Engineering College', location: 'Puducherry', aliases: ['SMVEC'] },
  DSU: { name: 'Dhanalakshmi Srinivasan University', location: 'Perambalur / Trichy, Tamil Nadu', aliases: ['DSU'] },
  AIHT: { name: 'Anand Institute of Higher Technology', location: 'Chennai, Tamil Nadu', aliases: ['AIHT', 'AHID'] },
  KPR: { name: 'KPR Institute of Engineering and Technology', location: 'Coimbatore, Tamil Nadu', aliases: ['KPR'] },
  ACET: { name: 'Akshaya College of Engineering and Technology', location: 'Coimbatore, Tamil Nadu', aliases: ['ACET', 'Akshaya'] },
  ACEW: { name: 'Annai College of Engineering for Women', location: 'Kanyakumari, Tamil Nadu', aliases: ['ACEW'] },
  HITS: { name: 'Hindustan Institute of Technology and Science', location: 'Chennai, Tamil Nadu', aliases: ['HITS'] },
  NEHRU: { name: 'Nehru Institute of Engineering and Technology', location: 'Coimbatore, Tamil Nadu', aliases: ['NEHRU'] },
  NGCE: { name: 'Narayana Guru College of Engineering', location: 'Kanyakumari / Coimbatore, Tamil Nadu', aliases: ['NGCE', 'NGC'] },
  KLU: { name: 'Kalasalingam Academy of Research and Education', location: 'Virudhunagar, Tamil Nadu', aliases: ['KLU'] },
};

export async function seedAugustAllCollegesJdReceived() {
  try {
    console.log('🌱 [Seed August JD Received] Starting segregation across all colleges...');

    // 1. Resolve coordinator
    const defaultCoordinator =
      (await User.findOne({ account_status: 'active', is_deleted: { $ne: true }, role_codes: 'PLACEMENT_COORDINATOR' })) ||
      (await User.findOne({ account_status: 'active', is_deleted: { $ne: true } })) ||
      (await User.findOne({ is_deleted: { $ne: true } })) ||
      (await User.findOne({}));

    const coordinatorId = defaultCoordinator ? defaultCoordinator._id : new Types.ObjectId();

    // 2. Resolve/Upsert Colleges
    const collegeIdMap = new Map<string, Types.ObjectId>();

    for (const [code, meta] of Object.entries(COLLEGE_META_MAP)) {
      let college = await College.findOne({
        $or: [
          { college_code: code },
          { college_code: { $in: meta.aliases } },
          { college_name: meta.name },
        ],
      });

      if (!college) {
        college = await College.create({
          college_name: meta.name,
          college_code: code,
          location: meta.location,
          departments: ['CSE', 'IT', 'AI & DS', 'ECE', 'MECH'],
          is_deleted: false,
        });
      } else if (college.college_code !== code) {
        const existingWithCode = await College.findOne({ college_code: code });
        if (!existingWithCode) {
          college.college_code = code;
          college.college_name = meta.name;
          await college.save();
        } else {
          college = existingWithCode;
        }
      }

      collegeIdMap.set(code, college._id as Types.ObjectId);
      for (const alias of meta.aliases) {
        collegeIdMap.set(alias, college._id as Types.ObjectId);
      }
    }

    // 3. Wipe any pre-August JD Received records and clear August window to prevent duplicates
    const augStart = new Date(Date.UTC(2026, 7, 1, 0, 0, 0, 0));
    const augEnd = new Date(Date.UTC(2026, 7, 31, 23, 59, 59, 999));

    await DailyLead.deleteMany({
      lead_type: 'jd_received',
      lead_date: { $lt: augStart },
    });

    await DailyLead.deleteMany({
      lead_type: 'jd_received',
      lead_date: { $gte: augStart, $lte: augEnd },
    });

    // 4. Insert all August JD Received leads into their respective colleges
    let inserted = 0;
    for (const item of AUGUST_JD_RECEIVED_DATA) {
      const collegeId = collegeIdMap.get(item.collegeCode.trim().toUpperCase());
      if (!collegeId) {
        console.warn(`⚠️ [Seed August JD Received] Could not resolve college for code: ${item.collegeCode}`);
        continue;
      }

      const parts = item.date.split('-');
      const leadDate = new Date(Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 0, 0, 0, 0));

      let companyMeta = null;
      try {
        const escaped = item.company.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        companyMeta = await CompanyMetadata.findOne({
          company_name: { $regex: `^${escaped}$`, $options: 'i' },
        });
      } catch (e) {
        // fallback
      }

      await DailyLead.create({
        lead_type: 'jd_received',
        college_id: collegeId,
        coordinator_id: coordinatorId,
        company_id: companyMeta?._id || new Types.ObjectId(),
        company_name: item.company.trim(),
        job_role: item.role.trim(),
        ctc: item.ctc.trim(),
        eligible_batch: item.batch.trim(),
        event_time: item.time.trim(),
        lead_date: leadDate,
        remarks: '',
        is_moved_to_jd: true,
        is_finalized: true,
        is_deleted: false,
      });

      inserted++;
    }

    console.log(`✅ [Seed August JD Received] Successfully segregated and inserted ${inserted} JD Received leads across colleges.`);
  } catch (err) {
    console.error('❌ [Seed August JD Received] Error seeding August JD Received:', err);
  }
}

if (require.main === module) {
  const { connectDatabase } = require('../config/database');
  connectDatabase().then(async () => {
    await seedAugustAllCollegesJdReceived();
    process.exit(0);
  });
}
