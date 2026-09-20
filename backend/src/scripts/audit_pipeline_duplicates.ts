import mongoose from 'mongoose';
import { ActiveLead } from '../models/ActiveLead';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ipoms';

function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/\b(private|pvt|limited|ltd|inc|technologies|technology|tech|solutions|services|corp|corporation|india|group|software|labs|llc|gmbh)\b/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function levenshtein(a: string, b: string): number {
  const an = a ? a.length : 0;
  const bn = b ? b.length : 0;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const matrix = Array.from({ length: bn + 1 }, () => Array(an + 1).fill(0));
  for (let i = 0; i <= an; i++) matrix[0][i] = i;
  for (let j = 0; j <= bn; j++) matrix[j][0] = j;
  for (let j = 1; j <= bn; j++) {
    for (let i = 1; i <= an; i++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[j][i] = matrix[j - 1][i - 1];
      } else {
        matrix[j][i] = Math.min(
          matrix[j - 1][i - 1] + 1,
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1
        );
      }
    }
  }
  return matrix[bn][an];
}

async function auditPipeline() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const leads = await ActiveLead.find({ lead_type: 'pipeline', is_deleted: false }).lean();
  console.log(`Total Pipeline Leads: ${leads.length}`);

  // 1. Exact / Case-insensitive match
  const exactMap = new Map<string, typeof leads>();
  for (const l of leads) {
    const key = (l.company_name || '').trim().toLowerCase();
    if (!exactMap.has(key)) exactMap.set(key, []);
    exactMap.get(key)!.push(l);
  }

  const exactDups = Array.from(exactMap.entries()).filter(([_, arr]) => arr.length > 1);
  console.log(`\n=== 1. EXACT / CASE-INSENSITIVE DUPLICATES: ${exactDups.length} groups ===`);
  for (const [key, arr] of exactDups) {
    console.log(`- Company: "${key}" (${arr.length} records)`);
    arr.forEach((r, idx) => {
      console.log(`   [${idx + 1}] ID: ${r._id} | Name: "${r.company_name}" | Role: "${r.role}" | CTC: "${r.ctc}" | Year: "${r.academic_year}" | Month: "${r.followup_month}"`);
    });
  }

  // 2. Normalized matches (stripping legal suffixes, spaces, special chars)
  const normMap = new Map<string, typeof leads>();
  for (const l of leads) {
    const key = normalize(l.company_name || '');
    if (!key) continue;
    if (!normMap.has(key)) normMap.set(key, []);
    normMap.get(key)!.push(l);
  }

  const normDups = Array.from(normMap.entries()).filter(([_, arr]) => {
    if (arr.length <= 1) return false;
    const distinctNames = new Set(arr.map(r => (r.company_name || '').trim().toLowerCase()));
    return distinctNames.size > 1;
  });

  console.log(`\n=== 2. NORMALIZED / SUFFIX / SPELLING VARIATION DUPLICATES: ${normDups.length} groups ===`);
  for (const [normKey, arr] of normDups) {
    console.log(`- Normalized Key: "${normKey}" (${arr.length} records across ${new Set(arr.map(r => r.company_name.trim())).size} variations)`);
    arr.forEach((r, idx) => {
      console.log(`   [${idx + 1}] ID: ${r._id} | Name: "${r.company_name}" | Role: "${r.role}" | CTC: "${r.ctc}" | Year: "${r.academic_year}"`);
    });
  }

  // 3. Fuzzy similarity (Levenshtein distance <= 2 for strings with length >= 4)
  const uniqueNames = Array.from(new Set(leads.map(l => l.company_name.trim())));
  const fuzzyPairs: Array<{ name1: string; name2: string; dist: number }> = [];

  for (let i = 0; i < uniqueNames.length; i++) {
    for (let j = i + 1; j < uniqueNames.length; j++) {
      const n1 = normalize(uniqueNames[i]);
      const n2 = normalize(uniqueNames[j]);
      if (n1 === n2) continue; // Already caught in normalized
      if (n1.length >= 4 && n2.length >= 4) {
        const dist = levenshtein(n1, n2);
        if (dist <= 2 && Math.abs(n1.length - n2.length) <= 2) {
          fuzzyPairs.push({ name1: uniqueNames[i], name2: uniqueNames[j], dist });
        }
      }
    }
  }

  console.log(`\n=== 3. FUZZY / SIMILAR NAME CANDIDATES (Distance <= 2): ${fuzzyPairs.length} pairs ===`);
  for (const p of fuzzyPairs) {
    const r1 = leads.filter(l => l.company_name.trim() === p.name1);
    const r2 = leads.filter(l => l.company_name.trim() === p.name2);
    console.log(`- "${p.name1}" (Roles: ${r1.map(r => r.role).join(', ')}) VS "${p.name2}" (Roles: ${r2.map(r => r.role).join(', ')}) [Edit Dist: ${p.dist}]`);
  }

  await mongoose.disconnect();
}

auditPipeline().catch(console.error);
