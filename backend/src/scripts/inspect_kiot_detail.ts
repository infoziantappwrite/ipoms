import mongoose from 'mongoose';
import dns from 'dns';
import dotenv from 'dotenv';
import path from 'path';
import * as xlsx from 'xlsx';
import { College } from '../models/College';
import { User } from '../models/User';

dns.setServers(['8.8.8.8', '1.1.1.1']);
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function inspectKIOT() {
  await mongoose.connect(process.env.MONGODB_URI || '');
  console.log('Connected to DB');

  const kiot = await College.findOne({
    $or: [{ college_code: 'KIOT' }, { college_name: /Knowledge Institute/i }]
  });
  console.log('KIOT College in DB:', kiot);

  if (kiot) {
    const coordinators: any[] = await User.find({ assigned_college_ids: kiot._id });
    console.log('Assigned coordinators for KIOT:', coordinators.map(c => ({ id: c._id, name: c.full_name || c.username, email: c.email })));
  }

  const filePath = "C:\\Users\\admin\\Downloads\\Weekly Report 2027 BATCH.xlsx";
  const wb = xlsx.readFile(filePath);
  const sheet = wb.Sheets['KIOT'];
  const rawRows: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  console.log('\n--- Full KIOT sheet contents ---');
  rawRows.forEach((r, idx) => {
    const nonBlank = r.some(c => c !== '');
    if (nonBlank) {
      console.log(`Row ${idx + 1}:`, JSON.stringify(r.filter((c, i) => i < 10)));
    }
  });

  await mongoose.disconnect();
}

inspectKIOT().catch(console.error);
