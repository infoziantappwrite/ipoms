import mongoose from 'mongoose';
import { ActiveLead } from '../models/ActiveLead';

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/ipoms_db');
  await ActiveLead.deleteMany({ academic_year: '2026' });
  const counts = await ActiveLead.aggregate([
    { $group: { _id: '$academic_year', count: { $sum: 1 } } }
  ]);
  console.log('Active Leads grouped by academic_year:', counts);
  await mongoose.disconnect();
}
run();
