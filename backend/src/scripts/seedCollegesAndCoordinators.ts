import path from 'path';
import * as xlsx from 'xlsx';
import bcrypt from 'bcryptjs';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { College } from '../models/College';
import { User } from '../models/User';
import { Role } from '../models/Role';

const sanitize = (val: any): string => {
  if (val === undefined || val === null) return '';
  const str = String(val).trim();
  if (str === '#VALUE!' || str === 'NIL' || str === 'None' || str === 'null') return '';
  return str;
};

const sanitizePhone = (val: any): string => {
  const raw = sanitize(val);
  if (!raw) return '';
  return raw.replace(/[^\d+]/g, '').trim();
};

const sanitizeEmail = (val: any): string => {
  const raw = sanitize(val).toLowerCase();
  if (raw.includes('@') && raw.includes('.')) return raw;
  return '';
};

// Known locations map for clean defaults
const LOCATION_MAP: Record<string, string> = {
  ACET: 'Puducherry',
  KIOT: 'Salem, Tamil Nadu',
  KLU: 'Virudhunagar, Tamil Nadu',
  KPR: 'Coimbatore, Tamil Nadu',
  KARPAGAM: 'Coimbatore, Tamil Nadu',
  AIHT: 'Chennai, Tamil Nadu',
  PSNA: 'Dindigul, Tamil Nadu',
  SMVEC: 'Puducherry',
  DSU: 'Perambalur / Trichy, Tamil Nadu',
  MKCE: 'Karur, Tamil Nadu',
  SONA: 'Salem, Tamil Nadu',
  KARUNYA: 'Coimbatore, Tamil Nadu',
  KAMARAJ: 'Virudhunagar, Tamil Nadu',
  NPR: 'Natham / Dindigul, Tamil Nadu',
  AVS: 'Salem, Tamil Nadu',
  AAA: 'Sivakasi, Tamil Nadu',
  KGISL: 'Coimbatore, Tamil Nadu',
  SSEI: 'Salem, Tamil Nadu',
  NGP: 'Coimbatore, Tamil Nadu',
  HITS: 'Chennai, Tamil Nadu',
  NEHRU: 'Coimbatore, Tamil Nadu',
  MAR: 'Kanyakumari, Tamil Nadu',
  NGCE: 'Kanyakumari, Tamil Nadu',
  ACEW: 'Kanyakumari, Tamil Nadu',
};

async function seedCollegesAndCoordinators() {
  console.log('\n=============================================================');
  console.log('🏛️ INFOZIANT iPOMS — COLLEGES & COORDINATORS INGESTION ENGINE');
  console.log('=============================================================\n');

  try {
    await connectDatabase();

    // Drop legacy employee_id unique index if present
    try {
      await User.collection.dropIndex('employee_id_1');
      console.log('🧹 [MongoDB] Dropped legacy employee_id index.');
    } catch (e) {
      // Index might already not exist
    }

    const excelPath = path.resolve(__dirname, '../../../Colleges and Coordinators.xlsx');
    console.log(`📖 [Excel] Reading workbook from: ${excelPath}`);

    const workbook = xlsx.readFile(excelPath);

    // 1. INGEST COLLEGES
    const collegeSheet = workbook.Sheets['College'];
    if (!collegeSheet) {
      throw new Error('Sheet "College" not found in workbook');
    }

    const rawColleges: any[] = xlsx.utils.sheet_to_json(collegeSheet, { defval: '' });
    console.log(`\n🏛️ [Colleges] Found ${rawColleges.length} colleges in Excel sheet...`);

    let collegeCount = 0;
    for (const row of rawColleges) {
      const collegeName = sanitize(row['College Name']);
      const shortForm = sanitize(row['Short Form']).toUpperCase();
      let location = sanitize(row['Location']);

      if (!collegeName || !shortForm) continue;

      if (!location) {
        location = LOCATION_MAP[shortForm] || 'Tamil Nadu, India';
      }

      const tpoName = sanitize(row['TPO Name']);
      const tpoEmail = sanitizeEmail(row['Email ID']);
      const tpoContact = sanitizePhone(row['TPO Contact Number']);

      let collegeDoc = await College.findOne({ college_code: shortForm });

      if (!collegeDoc) {
        collegeDoc = await College.create({
          college_name: collegeName,
          college_code: shortForm,
          location,
          tpo_name: tpoName,
          tpo_email: tpoEmail,
          tpo_contact_mobile: tpoContact,
          status: 'active',
          assigned_coordinator_ids: [],
        });
        console.log(`   ➔ [Added] ${shortForm} — ${collegeName} (${location})`);
      } else {
        collegeDoc.college_name = collegeName;
        collegeDoc.location = location;
        collegeDoc.tpo_name = tpoName;
        collegeDoc.tpo_email = tpoEmail;
        collegeDoc.tpo_contact_mobile = tpoContact;
        await collegeDoc.save();
        console.log(`   ➔ [Updated] ${shortForm} — ${collegeName}`);
      }
      collegeCount++;
    }

    // 2. INGEST COORDINATORS
    const coordinatorSheet = workbook.Sheets['Coordinators'];
    if (!coordinatorSheet) {
      throw new Error('Sheet "Coordinators" not found in workbook');
    }

    const rawCoordinators: any[] = xlsx.utils.sheet_to_json(coordinatorSheet, { defval: '' });
    console.log(`\n👥 [Coordinators] Found ${rawCoordinators.length} coordinators in Excel sheet...`);

    const coordinatorRole = await Role.findOne({ role_code: 'PLACEMENT_COORDINATOR' });
    const defaultPasswordHash = await bcrypt.hash('Ipoms@123', 12);

    let coordCount = 0;
    for (const row of rawCoordinators) {
      const fullName = sanitize(row['Coordinator Name']);
      const email = sanitizeEmail(row['Coordinator Email ID'] || row['Official Email']);
      const phone = sanitizePhone(row['Coordinator Contact Number'] || row['Mobile']);

      if (!fullName || !email) continue;

      let userDoc = await User.findOne({ official_email: email });

      if (!userDoc) {
        userDoc = await User.create({
          full_name: fullName,
          username: email,
          official_email: email,
          password_hash: defaultPasswordHash,
          primary_mobile: phone,
          account_status: 'active',
          presence_status: 'available',
          role_ids: coordinatorRole ? [coordinatorRole._id] : [],
          role_codes: ['PLACEMENT_COORDINATOR'],
          assigned_college_ids: [],
          is_email_verified: true,
          must_change_password: false,
          is_deleted: false,
        });
        console.log(`   ➔ [Added Coordinator] ${fullName} (${email})`);
      } else {
        userDoc.full_name = fullName;
        userDoc.primary_mobile = phone;
        await userDoc.save();
        console.log(`   ➔ [Updated Coordinator] ${fullName} (${email})`);
      }
      coordCount++;
    }

    console.log('\n=============================================================');
    console.log(`🎉 [SUCCESS] Ingested ${collegeCount} Colleges & ${coordCount} Coordinators into MongoDB!`);
    console.log('=============================================================\n');
  } catch (error) {
    console.error('❌ [ERROR] Failed to seed colleges and coordinators:', error);
  } finally {
    await disconnectDatabase();
    process.exit(0);
  }
}

seedCollegesAndCoordinators();
