const mongoose = require('mongoose');
const { Types } = mongoose;

function getTodayDate() {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

function parseDateParam(dateStr) {
  if (!dateStr) return getTodayDate();
  const trimmed = dateStr.trim();
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(trimmed)) {
    const parts = trimmed.split(/[-/]/);
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  }
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(trimmed)) {
    const parts = trimmed.split(/[-/]/);
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2].slice(0, 2), 10);
    return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  }
  const d = new Date(trimmed);
  if (isNaN(d.getTime())) return getTodayDate();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

async function debugFilter() {
  await mongoose.connect('mongodb://127.0.0.1:27017/ipoms_db');
  const db = mongoose.connection.db;

  const date = '2026-08-25';
  const lead_type = 'positive';

  const filter = {
    is_deleted: false,
  };

  if (date && date !== 'all') {
    const targetDate = parseDateParam(String(date));
    const nextDate = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);
    filter.lead_date = { $gte: targetDate, $lt: nextDate };
    console.log('targetDate:', targetDate.toISOString(), 'nextDate:', nextDate.toISOString());
  }

  if (lead_type) {
    filter.lead_type = lead_type;
  }

  console.log('Constructed filter:', JSON.stringify(filter, null, 2));

  const count = await db.collection('dailyleads').countDocuments(filter);
  console.log('Raw collection countDocuments:', count);

  const all = await db.collection('dailyleads').find({ lead_type: 'positive' }).toArray();
  console.log('Sample dates of positives in DB:');
  all.slice(0, 5).forEach(x => console.log(x.company_name, x.lead_date.toISOString(), typeof x.lead_date, x.is_deleted));
  
  const on25 = all.filter(x => x.lead_date.toISOString().startsWith('2026-08-25'));
  console.log('Filtered on25 count in JS:', on25.length);
  if (on25.length > 0) {
    console.log('Sample on25:', on25[0].company_name, on25[0].lead_date.toISOString(), on25[0].is_deleted);
  }

  process.exit(0);
}

debugFilter();
