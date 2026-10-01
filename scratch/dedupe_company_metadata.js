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

async function deduplicateContacts() {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 20000,
    });
    console.log('Connected to MongoDB Atlas successfully.');

    const docs = await CompanyMetadata.find({ is_deleted: { $ne: true } }).lean();
    console.log(`Total active Company Metadata records fetched: ${docs.length}`);

    let updatedCount = 0;
    let totalDuplicatesRemoved = 0;

    const bulkOps = [];

    for (const doc of docs) {
      const rawNumbers = [];
      if (doc.primary_mobile) {
        doc.primary_mobile.split(/[,;/]+/).forEach((n) => {
          const trimmed = n.trim();
          if (trimmed) rawNumbers.push(trimmed);
        });
      }
      if (Array.isArray(doc.mobile_numbers)) {
        doc.mobile_numbers.forEach((item) => {
          if (typeof item === 'string') {
            item.split(/[,;/]+/).forEach((n) => {
              const trimmed = n.trim();
              if (trimmed) rawNumbers.push(trimmed);
            });
          }
        });
      }

      if (rawNumbers.length === 0) continue;

      const seenNorms = new Set();
      const uniqueRawList = [];

      for (const raw of rawNumbers) {
        const norm = normalizePhone(raw);
        if (norm.length >= 7) {
          if (!seenNorms.has(norm)) {
            seenNorms.add(norm);
            uniqueRawList.push(raw);
          }
        } else {
          // Keep un-normalizable entries (e.g. short notes) if they are unique
          if (!uniqueRawList.includes(raw)) {
            uniqueRawList.push(raw);
          }
        }
      }

      if (uniqueRawList.length < rawNumbers.length) {
        const removedInDoc = rawNumbers.length - uniqueRawList.length;
        totalDuplicatesRemoved += removedInDoc;
        updatedCount++;

        const newPrimary = uniqueRawList[0] || null;
        const newMobiles = uniqueRawList.slice(1);

        bulkOps.push({
          updateOne: {
            filter: { _id: doc._id },
            update: {
              $set: {
                primary_mobile: newPrimary,
                mobile_numbers: newMobiles,
              },
            },
          },
        });
      }
    }

    console.log(`Found ${updatedCount} records to deduplicate (removing ${totalDuplicatesRemoved} duplicate number instances).`);

    if (bulkOps.length > 0) {
      console.log('Executing bulk update operations in MongoDB...');
      const batchSize = 500;
      for (let i = 0; i < bulkOps.length; i += batchSize) {
        const batch = bulkOps.slice(i, i + batchSize);
        await CompanyMetadata.bulkWrite(batch);
        console.log(`Updated batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(bulkOps.length / batchSize)}`);
      }
      console.log(`\nSUCCESSFULLY DEDUPLICATED ${updatedCount} RECORDS!`);
    } else {
      console.log('No duplicate contact entries found to update.');
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error during deduplication:', err);
    process.exit(1);
  }
}

deduplicateContacts();
