import { connectDatabase, disconnectDatabase } from '../config/database';
import { ActiveLead } from '../models/ActiveLead';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

async function run() {
  await connectDatabase();
  const leads = await ActiveLead.find({ is_deleted: { $ne: true } }).lean();
  const seen = new Set<string>();
  const dupIds: any[] = [];

  for (const l of leads) {
    const normName = (l.company_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const lt = (l.lead_type || 'pipeline').toLowerCase();
    const role = (l.role || '').toLowerCase().trim();
    const key = `${normName}__${lt}__${role}`;

    if (seen.has(key)) {
      dupIds.push(l._id);
    } else {
      seen.add(key);
    }
  }

  if (dupIds.length > 0) {
    await ActiveLead.updateMany({ _id: { $in: dupIds } }, { $set: { is_deleted: true, deleted_reason: 'exact_duplicate' } });
    console.log(`Cleaned ${dupIds.length} duplicate records.`);
  } else {
    console.log('Zero exact duplicate records found.');
  }

  const pipeline = await ActiveLead.countDocuments({
    is_deleted: { $ne: true },
    $or: [{ lead_type: { $in: ['pipeline', 'positive', 'positives'] } }, { lead_type: { $exists: false } }, { lead_type: null }, { lead_type: '' }],
  });
  const jd = await ActiveLead.countDocuments({
    is_deleted: { $ne: true },
    lead_type: { $in: ['jd_received', 'jd'] },
  });

  console.log(`Final Active Leads in Directory: ${pipeline + jd}`);
  console.log(`├─ Pipeline (Positives): ${pipeline}`);
  console.log(`└─ JD Received:          ${jd}`);

  await disconnectDatabase();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
