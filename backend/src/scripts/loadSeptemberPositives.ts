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
import { ActiveLead } from '../models/ActiveLead';
import { COLLEGE_META_MAP } from '../lib/seedMasterDailyLeads';

const SEPTEMBER_3_AND_4_DATA = [
  // ── 09/03/2026 ─────────────────────────────────────────────────────────────
  { date: '2026-09-03', time: '12:40 PM', company: 'ELEATION CAE Service Pvt Ltd', role: 'CAE Project Engineer', ctc: '9.6 LPA', batch: '2027', collegeCode: 'NEHRU' },
  { date: '2026-09-03', time: '11:22 AM', company: 'Omega Health Care', role: 'AR Caller/Trainee Coder', ctc: '3 LPA', batch: '2027', collegeCode: 'HITS' },
  { date: '2026-09-03', time: '12:02 PM', company: 'FocusR', role: 'IT trainee roles', ctc: '3 LPA', batch: '2027', collegeCode: 'HITS' },
  { date: '2026-09-03', time: '04:50 PM', company: 'LTTS', role: 'Associate Engineer Trainee', ctc: '4 LPA', batch: '2027', collegeCode: 'HITS' },
  { date: '2026-09-03', time: '12:10 PM', company: 'Klenty (Voxy Health)', role: 'Engineering/IT Roles', ctc: '3-5 LPA', batch: '2027', collegeCode: 'HITS' },
  { date: '2026-09-03', time: '12:21 PM', company: 'ELEATION CAE Service Pvt Ltd', role: 'CAE Project Engineer', ctc: '9.6 LPA', batch: '2027', collegeCode: 'HITS' },
  { date: '2026-09-03', time: '11:44 AM', company: 'EY', role: 'Associate Analyst', ctc: '4 LPA', batch: '2027', collegeCode: 'MCET' },
  { date: '2026-09-03', time: '11:48 AM', company: 'EMERSON', role: 'Application Engineer', ctc: '4-5 LPA', batch: '2027', collegeCode: 'MCET' },
  { date: '2026-09-03', time: '12:24 PM', company: 'Sanmar', role: 'Technical Engineer', ctc: '4 LPA', batch: '2027', collegeCode: 'MCET' },
  { date: '2026-09-03', time: '12:54 PM', company: 'Kriti Labs', role: 'Engineering/IT Roles', ctc: '3-4 LPA', batch: '2027', collegeCode: 'MCET' },
  { date: '2026-09-03', time: '03:52 PM', company: 'Intel', role: 'Software Engineer', ctc: '3 LPA', batch: '2027', collegeCode: 'MCET' },
  { date: '2026-09-03', time: '02:11 PM', company: 'HCL Tech', role: 'Software Engineer / Developer', ctc: '4 LPA', batch: '2027', collegeCode: 'MCET' },
  { date: '2026-09-03', time: '01:56 PM', company: 'INube Solutions', role: 'Software/AI Engineer', ctc: '3 LPA', batch: '2027', collegeCode: 'MCET' },
  { date: '2026-09-03', time: '02:25 PM', company: 'QnA International LLC', role: 'MULTIPLE ROLES', ctc: '3 LPA', batch: '2027', collegeCode: 'NGP' },
  { date: '2026-09-03', time: '02:10 PM', company: 'AquaAirX', role: 'SOURCING AND PROCUREMENT INTERN', ctc: '2 LPA', batch: '2027', collegeCode: 'NGP' },
  { date: '2026-09-03', time: '03:30 PM', company: 'Fristine Infotech Private Limited', role: 'DATAENGINEER,ZOHO DEVELOPER,DATA ANALYST', ctc: '5 LPA', batch: '2027', collegeCode: 'NGP' },
  { date: '2026-09-03', time: '02:21 PM', company: 'Kriti labs', role: 'ENGINEERING ROLES', ctc: '3 LPA', batch: '2027', collegeCode: 'NGP' },
  { date: '2026-09-03', time: '12:00 PM', company: 'ResNet Solutions Pvt. Ltd.', role: 'ML DEVELOPER', ctc: '8 LPA', batch: '2027', collegeCode: 'KAMARAJ' },
  { date: '2026-09-03', time: '12:20 PM', company: 'QnA International LLC', role: 'MULTIPLE ROLES', ctc: '3 LPA', batch: '2027', collegeCode: 'KAMARAJ' },
  { date: '2026-09-03', time: '12:50 PM', company: 'AquaAirX', role: 'SOURCING AND PROCUREMENT INTERN', ctc: '2 LPA', batch: '2027', collegeCode: 'KAMARAJ' },
  { date: '2026-09-03', time: '02:45 PM', company: 'Medtronic engineering', role: 'GET', ctc: '7 - 13 LPA', batch: '2027', collegeCode: 'DSU' },
  { date: '2026-09-03', time: '03:16 PM', company: 'Siemens', role: 'Software Engineer / Developer', ctc: '4-5 LPA', batch: '2027', collegeCode: 'NPR' },
  { date: '2026-09-03', time: '02:24 PM', company: 'Eleation', role: 'Application Engineer', ctc: '4.5 - 6 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-09-03', time: '03:56 PM', company: 'Triphase Tech', role: 'Test Engineer', ctc: '3.5 - 3.9 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-09-03', time: '05:01 PM', company: 'Jayam Autos', role: 'Quality Engineer', ctc: '3 - 4.5 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-09-03', time: '04:13 PM', company: 'VOLTECH', role: 'GET', ctc: '3 LPA', batch: '2027', collegeCode: 'ACEW' },
  { date: '2026-09-03', time: '04:17 PM', company: 'FristineTech', role: 'AI Engineer Intern', ctc: '3-5 LPA', batch: '2027', collegeCode: 'ACEW' },

  // ── 09/04/2026 ─────────────────────────────────────────────────────────────
  { date: '2026-09-04', time: '12:55 PM', company: 'Jasmin Infotech', role: 'Engineer Trainee', ctc: '3 - 3.75 LPA', batch: '2027', collegeCode: 'HITS' },
  { date: '2026-09-04', time: '12:59 PM', company: 'Jayam Autos', role: 'Quality Engineer', ctc: '3 - 4.5 LPA', batch: '2027', collegeCode: 'HITS' },
  { date: '2026-09-04', time: '01:19 PM', company: 'Hitachi', role: 'GET/Associte Software Engineer', ctc: '4 - 7 LPA', batch: '2027', collegeCode: 'HITS' },
  { date: '2026-09-04', time: '01:22 PM', company: 'Revature', role: 'Software Engineer Trainee', ctc: '4 - 5 LPA', batch: '2027', collegeCode: 'HITS' },
  { date: '2026-09-04', time: '04:40 PM', company: 'Mitsogo', role: 'Software Engineer/Developer', ctc: '3.5 - 6.5 LPA', batch: '2027', collegeCode: 'HITS' },
  { date: '2026-09-04', time: '04:44 PM', company: 'Tata Power', role: 'GET', ctc: '3 - 5 LPA', batch: '2027', collegeCode: 'HITS' },
  { date: '2026-09-04', time: '10:21 AM', company: 'Novatech', role: 'Junior Software Developer', ctc: '4-6 LPA', batch: '2027', collegeCode: 'MCET' },
  { date: '2026-09-04', time: '11:05 AM', company: 'AquaAirX', role: 'Engineer', ctc: '3-4 LPA', batch: '2027', collegeCode: 'MCET' },
  { date: '2026-09-04', time: '11:33 AM', company: 'Namekart', role: 'Business Analyst', ctc: '5-7 LPA', batch: '2027', collegeCode: 'MCET' },
  { date: '2026-09-04', time: '12:10 PM', company: 'TCF', role: 'SDE', ctc: '2-4 LPA', batch: '2027', collegeCode: 'MCET' },
  { date: '2026-09-04', time: '11:02 AM', company: 'Hitachi', role: 'Software Engineer / Developer', ctc: '6-8 LPA', batch: '2027', collegeCode: 'MCET' },
  { date: '2026-09-04', time: '12:25 PM', company: 'Revature', role: 'Associate Engineer/ SDE', ctc: '4-6 LPA', batch: '2027', collegeCode: 'MCET' },
  { date: '2026-09-04', time: '01:05 PM', company: 'TCF', role: 'SDE', ctc: '3.5 - 5 LPA', batch: '2027', collegeCode: 'KAMARAJ' },
  { date: '2026-09-04', time: '01:00 PM', company: 'Mitzuba', role: 'M', ctc: '2 LPA', batch: '2027', collegeCode: 'KAMARAJ' },
  { date: '2026-09-04', time: '01:10 PM', company: 'AQUASUB ENGINEERING', role: 'GET', ctc: '1.7 LPA', batch: '2027', collegeCode: 'KAMARAJ' },
  { date: '2026-09-04', time: '01:25 PM', company: 'Fristine Infotech Private Limited', role: 'DATAENGINEER,ZOHO DEVELOPER,DATA ANALYST', ctc: '5 LPA', batch: '2027', collegeCode: 'MAR EPHRAEM' },
  { date: '2026-09-04', time: '11:17 AM', company: 'Jayam Autos', role: 'Quality Engineer', ctc: '3 - 4.5 LPA', batch: '2027', collegeCode: 'MAR EPHRAEM' },
  { date: '2026-09-04', time: '11:25 AM', company: 'Mitsogo', role: 'SOFTWARE TEST ENGINEER', ctc: '3.5 LPA', batch: '2027', collegeCode: 'MAR EPHRAEM' },
  { date: '2026-09-04', time: '11:30 AM', company: 'AQUASUB ENGINEERING', role: 'GET', ctc: '1.7 LPA', batch: '2027', collegeCode: 'MAR EPHRAEM' },
  { date: '2026-09-04', time: '04:00 PM', company: 'Siemens', role: 'Software Engineer / Developer', ctc: '4-5 LPA', batch: '2027', collegeCode: 'MAR EPHRAEM' },
  { date: '2026-09-04', time: '03:05 PM', company: 'TCF', role: 'SDE', ctc: '3.5 - 5 LPA', batch: '2027', collegeCode: 'NGP' },
  { date: '2026-09-04', time: '03:10 PM', company: 'ELEATION CAE Service Pvt Ltd', role: 'CAE Project Engineer', ctc: '9.6 LPA', batch: '2027', collegeCode: 'NGP' },
  { date: '2026-09-04', time: '03:20 PM', company: 'Jayam Autos', role: 'Quality Engineer', ctc: '3 - 4.5 LPA', batch: '2027', collegeCode: 'NGP' },
];

async function loadSeptemberPositives() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is not configured in backend/.env');
    process.exit(1);
  }

  console.log('\n===============================================================');
  console.log('🚀 LOADING CALL POSITIVES FOR 09/03/2026 & 09/04/2026');
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

    // 2. Resolve / Link Colleges
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

    // 3. Upsert DailyLead records for 09/03/2026 and 09/04/2026
    let insertedCount = 0;
    let updatedCount = 0;
    let activeLeadsSynced = 0;

    for (const item of SEPTEMBER_3_AND_4_DATA) {
      const collegeId = collegeIdMap.get(item.collegeCode.toUpperCase());
      if (!collegeId) {
        console.warn(`⚠️ Could not resolve college for code: "${item.collegeCode}", skipping ${item.company}`);
        continue;
      }

      const [year, month, day] = item.date.split('-').map(Number);
      const leadDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

      // Resolve Company Metadata
      let meta = await CompanyMetadata.findOne({
        company_name: { $regex: `^${item.company.trim()}$`, $options: 'i' },
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

      // Check existing DailyLead for this date, college and company
      const existingLead = await DailyLead.findOne({
        lead_type: 'positive',
        college_id: collegeId,
        lead_date: leadDate,
        company_name: { $regex: `^${item.company.trim()}$`, $options: 'i' },
        is_deleted: false,
      });

      if (!existingLead) {
        await DailyLead.create({
          lead_type: 'positive',
          college_id: collegeId,
          coordinator_id: coordinatorId,
          company_id: meta._id,
          company_name: item.company.trim(),
          job_role: item.role.trim() || 'Graduate Trainee',
          ctc: item.ctc.trim() || '',
          eligible_batch: item.batch.trim() || '2027',
          event_time: item.time.trim() || '',
          lead_date: leadDate,
          remarks: 'Direct call positive confirmed by HR',
          is_moved_to_jd: false,
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

      // Upsert into ActiveLead
      const existingActive = await ActiveLead.findOne({
        company_name: { $regex: `^${item.company.trim()}$`, $options: 'i' },
        is_deleted: false,
      });

      if (!existingActive) {
        await ActiveLead.create({
          company_name: item.company.trim(),
          role: item.role.trim() || 'Graduate Trainee',
          ctc: item.ctc.trim() || '',
          status: 'Hiring',
          followup_month: '',
          academic_year: '2027',
          coordinator_id: coordinatorId,
          college_id: collegeId,
          is_deleted: false,
        });
        activeLeadsSynced++;
      } else {
        if (item.ctc && item.ctc.length > (existingActive.ctc || '').length) {
          existingActive.ctc = item.ctc.trim();
        }
        if (item.role && item.role.length > (existingActive.role || '').length) {
          existingActive.role = item.role.trim();
        }
        await existingActive.save();
      }
    }

    console.log('\n===============================================================');
    console.log('🎉 SEPTEMBER CALL POSITIVES INGESTION COMPLETE');
    console.log(`✅ Newly Inserted Daily Leads:  ${insertedCount}`);
    console.log(`📝 Updated Daily Leads:         ${updatedCount}`);
    console.log(`🌟 Active Leads Synced:         ${activeLeadsSynced}`);
    console.log(`📅 Total Records Processed:     ${SEPTEMBER_3_AND_4_DATA.length} (27 on 09/03/2026 + 23 on 09/04/2026)`);
    console.log('===============================================================\n');
  } catch (error) {
    console.error('❌ Error loading September positives:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.');
  }
}

loadSeptemberPositives();
