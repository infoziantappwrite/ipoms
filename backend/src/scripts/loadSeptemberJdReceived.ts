import mongoose, { Types } from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { DailyLead } from '../models/DailyLead';
import { College } from '../models/College';
import { User } from '../models/User';
import { CompanyMetadata } from '../models/CompanyMetadata';
import { COLLEGE_META_MAP } from '../lib/seedAugustAllCollegesJdReceived';

const SEPTEMBER_3_AND_4_JD_DATA = [
  // ── 09/03/2026 ─────────────────────────────────────────────────────────────
  {
    date: '2026-09-03',
    time: '01:23 PM',
    company: 'Hudsmer Business Solutions',
    role: 'Software Quality & Accessibility Engineer Trainee',
    ctc: '5-12k for Internship/ 3-5 LPA',
    collegeCode: 'HITS',
    batch: '2027',
  },
  {
    date: '2026-09-03',
    time: '02:29 PM',
    company: 'PERI Industries',
    role: 'GET',
    ctc: '2-3 LPA',
    collegeCode: 'HITS',
    batch: '2027',
  },
  {
    date: '2026-09-03',
    time: '09:59 AM',
    company: 'KritiLabs (New JD)',
    role: 'Engineering roles (Production Dept)',
    ctc: '12k for Internship/ 3-5 LPA',
    collegeCode: 'HITS',
    batch: '2027',
  },
  {
    date: '2026-09-03',
    time: '01:21 PM',
    company: 'Crawl Corp India Pvt Ltd',
    role: 'Associate Trainee',
    ctc: '8-12k for Intern/3-4.5 LPA',
    collegeCode: 'HITS',
    batch: '2027',
  },
  {
    date: '2026-09-03',
    time: '12:38 PM',
    company: 'ELEATION CAE Service Pvt Ltd',
    role: 'CAE Project Engineer',
    ctc: '9.6 LPA',
    collegeCode: 'HITS',
    batch: '2027',
  },
  {
    date: '2026-09-03',
    time: '12:56 PM',
    company: 'ELEATION CAE Service Pvt Ltd',
    role: 'CAE Project Engineer',
    ctc: '9.6 LPA',
    collegeCode: 'NEHRU',
    batch: '2027',
  },
  {
    date: '2026-09-03',
    time: '01:23 PM',
    company: 'Crawl Corp India Pvt Ltd',
    role: 'Associate Trainee',
    ctc: '8-12k for Intern/3-4.5 LPA',
    collegeCode: 'NEHRU',
    batch: '2027',
  },
  {
    date: '2026-09-03',
    time: '11:00 AM',
    company: 'Crawl Corp India Pvt Ltd',
    role: 'Associate Trainee',
    ctc: '8-12k for Intern/3-4.5 LPA',
    collegeCode: 'KAMARAJ',
    batch: '2027',
  },
  {
    date: '2026-09-03',
    time: '01:18 PM',
    company: 'Crawl Corp India Pvt Ltd',
    role: 'Associate Trainee',
    ctc: '8-12k for Intern/3-4.5 LPA',
    collegeCode: 'NPR',
    batch: '2027',
  },

  // ── 09/04/2026 ─────────────────────────────────────────────────────────────
  {
    date: '2026-09-04',
    time: '12:44 PM',
    company: 'ELEATION CAE Service Pvt Ltd',
    role: 'CAE Project Engineer',
    ctc: '9.6 LPA',
    collegeCode: 'AIHT',
    batch: '2027',
  },
  {
    date: '2026-09-04',
    time: '12:48 PM',
    company: 'ELEATION CAE Service Pvt Ltd',
    role: 'CAE Project Engineer',
    ctc: '9.6 LPA',
    collegeCode: 'ACET',
    batch: '2027',
  },
  {
    date: '2026-09-04',
    time: '12:51 PM',
    company: 'India Shelter Finance Corporation Ltd',
    role: 'Management Trainee',
    ctc: '3.5 LPA',
    collegeCode: 'HITS',
    batch: '2027',
  },
  {
    date: '2026-09-04',
    time: '10:00 AM',
    company: 'Crawl Corp India Pvt Ltd',
    role: 'Software Engineer',
    ctc: '8-12k for intern/3-4.5 LPA',
    collegeCode: 'MCET',
    batch: '2027',
  },
  {
    date: '2026-09-04',
    time: '12:54 PM',
    company: 'KritiLabs',
    role: 'SDE',
    ctc: '12k for intern/3-4 LPA',
    collegeCode: 'MCET',
    batch: '2027',
  },
  {
    date: '2026-09-04',
    time: '11:06 AM',
    company: 'Aquasub Engineering',
    role: 'Training Engineer',
    ctc: '16.5k for intern/3.2 LPA',
    collegeCode: 'MCET',
    batch: '2027',
  },
  {
    date: '2026-09-04',
    time: '05:50 PM',
    company: 'Fristine Infotech Pvt Ltd',
    role: 'Zoho Developer/Business Analyst/Data Engineer',
    ctc: '3 - 6 LPA',
    collegeCode: 'NPR',
    batch: '2027',
  },
  {
    date: '2026-09-04',
    time: '10:20 AM',
    company: 'Fristine Infotech Pvt Ltd',
    role: 'Zoho Developer/Business Analyst/Data Engineer',
    ctc: '3 - 6 LPA',
    collegeCode: 'ACEW',
    batch: '2027',
  },
  {
    date: '2026-09-04',
    time: '05:00 PM',
    company: 'Fristine Infotech Pvt Ltd',
    role: 'Zoho Developer/Business Analyst/Data Engineer',
    ctc: '3 - 6 LPA',
    collegeCode: 'NGP',
    batch: '2027',
  },
];

async function loadSeptemberJdReceived() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is not set in backend/.env');
    process.exit(1);
  }

  console.log('\n===============================================================');
  console.log('🚀 LOADING JD RECEIVED LEADS FOR 09/03/2026 & 09/04/2026');
  console.log('===============================================================\n');

  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB Atlas.');

  try {
    // 1. Resolve Coordinator
    const coordinator =
      (await User.findOne({ account_status: 'active', is_deleted: { $ne: true }, role_codes: 'PLACEMENT_COORDINATOR' })) ||
      (await User.findOne({ account_status: 'active', is_deleted: { $ne: true } })) ||
      (await User.findOne({ is_deleted: { $ne: true } }));

    const coordinatorId = coordinator ? coordinator._id : new Types.ObjectId();
    console.log(`👤 Using Coordinator: ${coordinator?.full_name || 'System Admin'} (${coordinatorId})`);

    // 2. Resolve / Cache Colleges
    const collegeIdMap = new Map<string, Types.ObjectId>();

    for (const [code, meta] of Object.entries(COLLEGE_META_MAP)) {
      let college = await College.findOne({
        $or: [
          { college_code: code },
          { college_code: { $in: meta.aliases } },
          { college_name: meta.name },
          { college_name: new RegExp(code, 'i') },
        ],
      });

      if (!college) {
        college = await College.create({
          college_name: meta.name,
          college_code: code,
          location: meta.location,
          departments: ['CSE', 'IT', 'AI & DS', 'ECE', 'MECH'],
          is_deleted: false,
          status: 'active',
        });
        console.log(`🏫 Created college: ${meta.name} [${code}]`);
      }

      collegeIdMap.set(code.toUpperCase(), college._id as Types.ObjectId);
      for (const alias of meta.aliases) {
        collegeIdMap.set(alias.toUpperCase(), college._id as Types.ObjectId);
      }
    }

    // 3. Upsert DailyLead records with lead_type = 'jd_received'
    let insertedCount = 0;
    let updatedCount = 0;

    for (const item of SEPTEMBER_3_AND_4_JD_DATA) {
      const collegeId = collegeIdMap.get(item.collegeCode.toUpperCase());
      if (!collegeId) {
        console.warn(`⚠️ Could not resolve college for code: "${item.collegeCode}", skipping ${item.company}`);
        continue;
      }

      const [year, month, day] = item.date.split('-').map(Number);
      const leadDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

      // Resolve Company Metadata
      let meta = await CompanyMetadata.findOne({
        company_name: { $regex: `^${item.company.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
      });

      if (!meta) {
        const lastMeta = await CompanyMetadata.findOne().sort({ serial_number: -1 }).select('serial_number');
        const nextSNo = (lastMeta?.serial_number || 0) + 1;
        meta = await CompanyMetadata.create({
          serial_number: nextSNo,
          company_name: item.company.trim(),
          mobile_numbers: [],
          email_ids: [],
          is_deleted: false,
        });
        console.log(`🏢 Registered company in Meta Directory: ${item.company.trim()} (S.No: ${nextSNo})`);
      }

      // Check existing DailyLead for this date, college, company, and lead_type = 'jd_received'
      const existingLead = await DailyLead.findOne({
        lead_type: 'jd_received',
        college_id: collegeId,
        lead_date: leadDate,
        company_name: { $regex: `^${item.company.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
        is_deleted: false,
      });

      if (!existingLead) {
        await DailyLead.create({
          lead_type: 'jd_received',
          college_id: collegeId,
          coordinator_id: coordinatorId,
          company_id: meta._id,
          company_name: item.company.trim(),
          job_role: item.role.trim() || 'Graduate Trainee',
          ctc: item.ctc.trim() || '',
          eligible_batch: item.batch.trim() || '2027',
          event_time: item.time.trim() || '',
          lead_date: leadDate,
          remarks: 'JD Received from Company HR',
          is_moved_to_jd: true,
          is_finalized: true,
          is_deleted: false,
        });
        insertedCount++;
      } else {
        existingLead.job_role = item.role.trim() || existingLead.job_role;
        existingLead.ctc = item.ctc.trim() || existingLead.ctc;
        existingLead.eligible_batch = item.batch.trim() || existingLead.eligible_batch;
        existingLead.event_time = item.time.trim() || existingLead.event_time;
        await existingLead.save();
        updatedCount++;
      }
    }

    console.log('\n===============================================================');
    console.log('🎉 SEPTEMBER JD RECEIVED LEADS INGESTION COMPLETE');
    console.log(`✅ Newly Inserted JD Leads:     ${insertedCount}`);
    console.log(`📝 Updated JD Leads:            ${updatedCount}`);
    console.log(`📅 Total Records Processed:     ${SEPTEMBER_3_AND_4_JD_DATA.length} (9 on 09/03/2026 + 9 on 09/04/2026)`);
    console.log('===============================================================\n');
  } catch (error) {
    console.error('❌ Error loading September JD Received leads:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.');
  }
}

loadSeptemberJdReceived();
