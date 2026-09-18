import { connectDatabase } from '../config/database';
import { ActiveLead } from '../models/ActiveLead';

async function main() {
  await connectDatabase();
  const total = await ActiveLead.countDocuments({ is_deleted: false });
  console.log('Total active leads before update:', total);

  // Update leads with status 'Hiring' from seed to '' so they display "Select Status" placeholder
  const res = await ActiveLead.updateMany(
    { is_deleted: false },
    { $set: { status: '' } }
  );
  console.log('Updated leads to empty status:', res.modifiedCount);

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
