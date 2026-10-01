const path = require('path');
const fs = require('fs');
const dns = require('dns');

try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {}

function getModule(name) {
  const p1 = path.join(__dirname, '../node_modules', name);
  const p2 = path.join(__dirname, '../backend/node_modules', name);
  if (fs.existsSync(p1)) return require(p1);
  if (fs.existsSync(p2)) return require(p2);
  return require(name);
}

const mongoose = getModule('mongoose');
const dotenv = getModule('dotenv');

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI in backend/.env');
  process.exit(1);
}

const CompanyMetadataSchema = new mongoose.Schema(
  {
    serial_number: Number,
    company_name: String,
    hr_name: String,
    hr_designation: String,
    primary_mobile: String,
    mobile_numbers: [String],
    primary_email: String,
    email_ids: [String],
    is_deleted: Boolean,
  },
  { collection: 'company_metadata' }
);

const CompanyMetadata = mongoose.model('CompanyMetadata', CompanyMetadataSchema);

function normalizePhone(raw) {
  if (!raw) return '';
  let cleaned = String(raw).replace(/[^\d]/g, '');
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }
  return cleaned;
}

async function runAudit() {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
    });
    console.log('Connected to MongoDB Atlas successfully.');

    const docs = await CompanyMetadata.find({ is_deleted: { $ne: true } }).lean();
    console.log(`Total active Company Metadata records fetched: ${docs.length}`);

    let duplicateRowsCount = 0;
    const duplicateDetails = [];

    for (const doc of docs) {
      // Gather all mobile numbers from primary_mobile and mobile_numbers array
      const rawNumbers = [];
      if (doc.primary_mobile) {
        doc.primary_mobile.split(/[,;/]+/).forEach((n) => rawNumbers.push(n.trim()));
      }
      if (Array.isArray(doc.mobile_numbers)) {
        doc.mobile_numbers.forEach((item) => {
          if (typeof item === 'string') {
            item.split(/[,;/]+/).forEach((n) => rawNumbers.push(n.trim()));
          }
        });
      }

      const validRaw = rawNumbers.filter(Boolean);
      if (validRaw.length < 2) continue;

      // Map raw numbers to normalized digits
      const normalizedList = validRaw.map((r) => ({ raw: r, norm: normalizePhone(r) })).filter((x) => x.norm.length >= 7);

      // Check if any normalized number appears more than once in this specific row
      const normCounts = {};
      normalizedList.forEach((x) => {
        normCounts[x.norm] = (normCounts[x.norm] || 0) + 1;
      });

      const duplicatesInRow = Object.entries(normCounts).filter(([norm, count]) => count > 1);

      if (duplicatesInRow.length > 0) {
        duplicateRowsCount++;
        duplicateDetails.push({
          s_no: doc.serial_number || '—',
          id: doc._id,
          company_name: doc.company_name,
          hr_name: doc.hr_name || '—',
          raw_numbers: validRaw,
          duplicates: duplicatesInRow.map(([norm, count]) => ({ norm, count })),
        });
      }
    }

    console.log('\n==================================================');
    console.log(`AUDIT RESULT: ${duplicateRowsCount} row(s) have internal duplicate contact numbers.`);
    console.log('==================================================\n');

    duplicateDetails.forEach((item, idx) => {
      console.log(`${idx + 1}. [S.No: ${item.s_no}] ${item.company_name} | HR: ${item.hr_name}`);
      console.log(`   Raw Mobile Entries: [${item.raw_numbers.join(' | ')}]`);
      console.log(`   Repeated Contact Number(s): ${item.duplicates.map((d) => `${d.norm} (${d.count}x)`).join(', ')}`);
      console.log('--------------------------------------------------');
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error running audit:', err);
    process.exit(1);
  }
}

runAudit();
