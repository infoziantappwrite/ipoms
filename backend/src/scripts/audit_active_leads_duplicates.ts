import { connectDatabase, disconnectDatabase } from '../config/database';
import { ActiveLead } from '../models/ActiveLead';
import { DailyLead } from '../models/DailyLead';
import { WeeklyTracker } from '../models/WeeklyTracker';
import { MASTER_POSITIVES_DATA } from '../lib/seedMasterDailyLeads';

function cleanBase(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\b(private\s+limited|pvt\.?\s*ltd\.?|ltd\.?|limited|inc\.?|llp|technologies|tech|solutions|services|group|india|pvt|lmt\.?)\b/gi, '')
    .replace(/[\(\)\[\]\.\,\-\_\&\/\'\"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeNoSpace(name: string): string {
  if (!name) return '';
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

async function audit() {
  await connectDatabase();

  const activeLeads = await ActiveLead.find({}).lean();
  console.log(`Total ActiveLead records in DB: ${activeLeads.length}`);

  // Collect all company entries from ActiveLead and MASTER_POSITIVES_DATA
  const companyEntries: { company_name: string; source: string; ctc?: string; college?: string; section?: string }[] = [];

  for (const al of activeLeads) {
    if (al.company_name) {
      companyEntries.push({
        company_name: al.company_name.trim(),
        source: 'ActiveLead DB',
        ctc: al.ctc || 'N/A',
        college: al.college_id ? String(al.college_id) : 'N/A',
        section: (al.status as string) || al.pipeline_section || 'N/A'
      });
    }
  }

  for (const mp of MASTER_POSITIVES_DATA) {
    if (mp.company) {
      companyEntries.push({
        company_name: mp.company.trim(),
        source: 'Master Positives',
        ctc: mp.ctc || 'N/A',
        college: mp.collegeCode || 'N/A',
        section: mp.role || 'N/A'
      });
    }
  }

  console.log(`Total Company instances analyzed: ${companyEntries.length}`);

  // 1. EXACT DUPLICATES (Same company name appearing multiple times)
  const exactMap = new Map<string, typeof companyEntries>();
  for (const entry of companyEntries) {
    const key = entry.company_name.toLowerCase();
    if (!exactMap.has(key)) exactMap.set(key, []);
    exactMap.get(key)!.push(entry);
  }

  const exactRepeats = Array.from(exactMap.entries())
    .filter(([_, list]) => list.length > 1)
    .sort((a, b) => b[1].length - a[1].length);

  // 2. GAP / DOT / CASE / PUNCTUATION VARIATIONS (Same alphanumeric chars, but difference in spaces, dots, capitals)
  const noSpaceMap = new Map<string, typeof companyEntries>();
  for (const entry of companyEntries) {
    const key = normalizeNoSpace(entry.company_name);
    if (!key) continue;
    if (!noSpaceMap.has(key)) noSpaceMap.set(key, []);
    noSpaceMap.get(key)!.push(entry);
  }

  const gapCaseVariations = Array.from(noSpaceMap.entries())
    .filter(([_, list]) => {
      const distinctExact = new Set(list.map(x => x.company_name.toLowerCase().trim()));
      return distinctExact.size > 1;
    });

  // 3. CORPORATE SUFFIX VARIATIONS (Pvt Ltd, Ltd, Technologies, Solutions, etc.)
  const baseMap = new Map<string, typeof companyEntries>();
  for (const entry of companyEntries) {
    const base = cleanBase(entry.company_name);
    if (!base || base.length < 3) continue;
    if (!baseMap.has(base)) baseMap.set(base, []);
    baseMap.get(base)!.push(entry);
  }

  const suffixVariations = Array.from(baseMap.entries())
    .filter(([_, list]) => {
      const distinctNoSpace = new Set(list.map(x => normalizeNoSpace(x.company_name)));
      return distinctNoSpace.size > 1;
    });

  // 4. FUZZY / TYPO MATCHES (Levenshtein edit distance <= 2 on normalized bases)
  const distinctBases = Array.from(baseMap.keys());
  const typoPairs: { base1: string; base2: string; names1: string[]; names2: string[] }[] = [];
  for (let i = 0; i < distinctBases.length; i++) {
    for (let j = i + 1; j < distinctBases.length; j++) {
      const b1 = distinctBases[i];
      const b2 = distinctBases[j];
      if (Math.abs(b1.length - b2.length) > 2) continue;
      if (b1.length < 4 || b2.length < 4) continue;
      const dist = levenshteinDistance(b1, b2);
      if (dist >= 1 && dist <= 2) {
        typoPairs.push({
          base1: b1,
          base2: b2,
          names1: Array.from(new Set(baseMap.get(b1)!.map(x => x.company_name))),
          names2: Array.from(new Set(baseMap.get(b2)!.map(x => x.company_name)))
        });
      }
    }
  }

  console.log('\n=== AUDIT RESULTS ===');
  console.log(`1. Exact Duplicate Companies (Repeating names): ${exactRepeats.length}`);
  console.log(`2. Gap/Dot/Case Variations: ${gapCaseVariations.length}`);
  console.log(`3. Suffix / Legal Entity Variations: ${suffixVariations.length}`);
  console.log(`4. Potential Typo / Edit Distance Variations: ${typoPairs.length}`);

  console.log('\n--- 1. TOP EXACT REPEATS ---');
  exactRepeats.slice(0, 15).forEach(([name, list]) => {
    console.log(`* ${list[0].company_name} (Occurrences: ${list.length})`);
  });

  console.log('\n--- 2. GAP / DOT / CASE VARIATIONS ---');
  gapCaseVariations.forEach(([key, list]) => {
    const distinct = Array.from(new Set(list.map(x => x.company_name)));
    console.log(`* Key [${key}]: ${distinct.join('  VS  ')}`);
  });

  console.log('\n--- 3. CORPORATE SUFFIX VARIATIONS ---');
  suffixVariations.forEach(([base, list]) => {
    const distinct = Array.from(new Set(list.map(x => x.company_name)));
    console.log(`* Root [${base}]: ${distinct.join('  |  ')}`);
  });

  console.log('\n--- 4. TYPO / NEAR SPELLING PAIRS ---');
  typoPairs.forEach(p => {
    console.log(`* "${p.names1.join('/')}"  VS  "${p.names2.join('/')}" (Distance: ${levenshteinDistance(p.base1, p.base2)})`);
  });

  await disconnectDatabase();
}

audit().catch(console.error);
