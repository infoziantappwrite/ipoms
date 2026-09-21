import { connectDatabase, disconnectDatabase } from '../config/database';
import { ActiveLead } from '../models/ActiveLead';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

// Canonical key: remove legal suffixes, tech/solutions suffixes, punctuation, spaces
function cleanCanonicalName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(private\s+limited|pvt\.?\s*ltd\.?|private|limited|ltd\.?|inc\.?|llc|corp\.?|corporation)\b/gi, '')
    .replace(/\b(technologies|technology|tech|solutions|solution|services|service|india|global|software|infotech|systems)\b/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function normalizeRole(role: string): string {
  return role
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

async function analyze() {
  await connectDatabase();

  const jdLeads = await ActiveLead.find({ lead_type: 'jd_received', is_deleted: false }).lean();
  console.log(`Total JD Received Leads: ${jdLeads.length}\n`);

  const clusters = new Map<string, typeof jdLeads>();
  for (const lead of jdLeads) {
    const key = cleanCanonicalName(lead.company_name);
    if (!clusters.has(key)) clusters.set(key, []);
    clusters.get(key)!.push(lead);
  }

  const multiEntryClusters: any[] = [];

  for (const [key, list] of clusters.entries()) {
    if (list.length > 1) {
      multiEntryClusters.push({
        canonicalKey: key,
        count: list.length,
        entries: list.map(l => ({
          id: String(l._id),
          company_name: l.company_name,
          role: l.role,
          ctc: l.ctc,
          section: l.pipeline_section,
          academic_year: l.academic_year,
        })),
      });
    }
  }

  console.log(`Found ${multiEntryClusters.length} clusters with multiple entries for the same company:\n`);
  for (const c of multiEntryClusters) {
    console.log(`=======================================================`);
    console.log(`🏢 Cluster: "${c.canonicalKey}" (${c.count} records)`);
    console.log(`=======================================================`);
    c.entries.forEach((e: any, idx: number) => {
      console.log(`  [${idx + 1}] ID: ${e.id}`);
      console.log(`      Company Name: "${e.company_name}"`);
      console.log(`      Role:         "${e.role}"`);
      console.log(`      CTC:          "${e.ctc}"`);
      console.log(`      Section:      "${e.section}"`);
    });
    console.log('');
  }

  await disconnectDatabase();
}

analyze().catch(console.error);
