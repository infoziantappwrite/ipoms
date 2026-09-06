import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { DailyLead } from '../models/DailyLead';
import { College } from '../models/College';

async function verify() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const _initCollege = College.modelName; // ensures College is registered in mongoose connection
  const d3 = new Date(Date.UTC(2026, 8, 3));
  const d4 = new Date(Date.UTC(2026, 8, 4));
  const count3 = await DailyLead.countDocuments({ lead_type: 'positive', lead_date: d3, is_deleted: false });
  const count4 = await DailyLead.countDocuments({ lead_type: 'positive', lead_date: d4, is_deleted: false });
  console.log(`✅ Sept 3 Positives count in Atlas: ${count3} (Expected: 27)`);
  console.log(`✅ Sept 4 Positives count in Atlas: ${count4} (Expected: 23)`);
  
  const leads3 = await DailyLead.find({ lead_type: 'positive', lead_date: d3, is_deleted: false }).populate('college_id', 'college_code college_name');
  console.log('\n--- 09/03/2026 Summary ---');
  leads3.forEach((l, idx) => {
    console.log(`${idx + 1}. [${(l.college_id as any)?.college_code}] ${l.company_name} | ${l.job_role} | ${l.ctc} | ${l.event_time}`);
  });

  const leads4 = await DailyLead.find({ lead_type: 'positive', lead_date: d4, is_deleted: false }).populate('college_id', 'college_code college_name');
  console.log('\n--- 09/04/2026 Summary ---');
  leads4.forEach((l, idx) => {
    console.log(`${idx + 1}. [${(l.college_id as any)?.college_code}] ${l.company_name} | ${l.job_role} | ${l.ctc} | ${l.event_time}`);
  });

  await mongoose.disconnect();
}

verify();
