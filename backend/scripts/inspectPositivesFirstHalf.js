const mongoose = require('mongoose');

async function listFirstHalf() {
  await mongoose.connect('mongodb://127.0.0.1:27017/ipoms_db');
  const db = mongoose.connection.db;

  const leads = await db.collection('dailyleads').aggregate([
    { $match: { lead_type: 'positive', is_deleted: { $ne: true }, lead_date: { $lte: new Date('2026-08-14T23:59:59.999Z') } } },
    {
      $lookup: {
        from: 'colleges',
        localField: 'college_id',
        foreignField: '_id',
        as: 'collegeInfo'
      }
    },
    {
      $project: {
        dateStr: { $dateToString: { format: '%Y-%m-%d', date: '$lead_date' } },
        time: '$event_time',
        company: '$company_name',
        role: '$job_role',
        ctc: '$ctc',
        collegeCode: { $arrayElemAt: ['$collegeInfo.college_code', 0] },
        batch: '$eligible_batch'
      }
    },
    { $sort: { dateStr: 1, time: 1 } }
  ]).toArray();

  const byDate = {};
  for (const l of leads) {
    if (!byDate[l.dateStr]) byDate[l.dateStr] = [];
    byDate[l.dateStr].push(l);
  }

  for (const [date, items] of Object.entries(byDate)) {
    console.log(`\n================= DATE: ${date} (${items.length} Positive entries) =================`);
    items.forEach((it, idx) => {
      console.log(`${idx + 1}. [${it.collegeCode || 'ALL'}] ${it.company} | ${it.role} | CTC: ${it.ctc || 'N/A'} | Time: ${it.time} | Batch: ${it.batch}`);
    });
  }

  process.exit(0);
}

listFirstHalf();
