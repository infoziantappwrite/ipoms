const mongoose = require('mongoose');

const rawJdData = `
4-aug-2026					
SI.NO	COMPANY NAME	ROLE	CTC	COLLEGE NAME	ELIGIBLE BATCH	
1	Fristine Infotech Private Limited	Zoho Developer / Business Analyst / Data Engineer- Intern	Not Mentioned	PSNA	2027	
						
						
			5-Aug-26			
						
SI.NO	Time Stamp	COMPANY NAME	ROLE	CTC	COLLEGE NAME	ELIGIBLE BATCH
1	11:00 AM	Tridots	Business Analyst	4 - 4.5	KLU	2027
						
						
						
			6-Aug-26			
						
SI.NO	Time Stamp	COMPANY NAME	ROLE	CTC	COLLEGE NAME	ELIGIBLE BATCH
1	4:00 PM	Perfint Healthcare Ltd	QARA- Engineer, Intern - SDE	5 - 6 LPA	KLU	2027
2	10:54 AM	InCoban	Multiple Roles	3 LPA	DSU	2027
						
						
						
			7-Aug-26			
						
SI.NO	Time Stamp	COMPANY NAME	ROLE	CTC	COLLEGE NAME	ELIGIBLE BATCH
1	1:08 PM	Fristine Infotech Private Limited	Zoho Developer / Business Analyst / Data Engineer- Intern	Not Mentioned	KIOT	2027
						
						
			11-Aug-26			
						
SI.NO	Time Stamp	COMPANY NAME	ROLE	CTC	COLLEGE NAME	ELIGIBLE BATCH
1	2:19 PM	Integra	Production Editor Trainee	3 - 4 LPA	KLU	2027
2	4:18 PM	V max Health Tech	Multiple Roles	3 LPA	KLU	2027
						
			12-Aug-26			
						
SI.NO	Time Stamp	COMPANY NAME	ROLE	CTC	COLLEGE NAME	ELIGIBLE BATCH
1	2:27 PM	Resnet Solutions 	ML Developer 	8 - 12 LPA	PSNA	2027
2	2:23 PM	Resnet Solutions 	ML Developer 	8 - 12 LPA	NGCE	2027
3	2:20 PM	Resnet Solutions 	ML Developer 	8 - 12 LPA	NEHRU	2027
						
						
			13-Aug-26			
						
SI.NO	Time Stamp	COMPANY NAME	ROLE	CTC	COLLEGE NAME	ELIGIBLE BATCH
1	12:05 PM	BIBUS INDIA PVT LTD	Design Engineer	Not Mentioned 	PSNA	2027
2	4:27PM	Kritilabs	Mechanical Engineering- Intern	14k/M	ACET	2027
						
						
			14-Aug-26			
						
SI.NO	Time Stamp	COMPANY NAME	ROLE	CTC	COLLEGE NAME	ELIGIBLE BATCH
1	10:46 AM	BIBUS INDIA PVT LTD	Design Engineer, Internal Coordinator	3 LPA	KPR	2027
2	9:58 AM	BIBUS INDIA PVT LTD	Design Engineer, Internal Coordinator	3 LPA	ACET	2027
3	2:36 PM	Voltech 	GTE (EEE)	25,997/M	ACET	2027
4	10:05 AM	BIBUS INDIA PVT LTD	Design Engineer, Internal Coordinator	3 LPA	NEHRU	2027
5	10:02 AM	BIBUS INDIA PVT LTD	Design Engineer, Internal Coordinator	3 LPA	HITS	2027
						
						
			18-Aug-26			
						
SI.NO	Time Stamp	COMPANY NAME	ROLE	CTC	COLLEGE NAME	ELIGIBLE BATCH
1	12:30 PM	Voltech Group	Graduate Trainee Engineer	3.12 LPA	NEHRU	2027
2	9:45 AM	CartRabbit	Digital Marketing/Product Support/Sales	3 LPA	NGCE	2027
3	9:47 AM	CartRabbit	Digital Marketing Intern	3 LPA	ACEW	2027
						
						
			19-Aug-26			
						
SI.NO	Time Stamp	COMPANY NAME	ROLE	CTC	COLLEGE NAME	ELIGIBLE BATCH
1	2.37 PM	Rishabh Enterprises	GET	3 -4 LPA	PSNA	2027
						
						
						
			20-Aug-26			
						
SI.NO	Time Stamp	COMPANY NAME	ROLE	CTC	COLLEGE NAME	ELIGIBLE BATCH
1	12:26 PM	Brakes India Pvt Ltd	Graduate Engineer Trainee	3.80 - 5.82 LPA	HITS	2027
2	10:14 AM	Fristine Infotech Pvt Ltd	Zoho Developer/Business Analyst/Data Engineer	3 - 6 LPA	NEHRU	2027
						
						
						
						
			21-Aug-26			
						
SI.NO	Time Stamp	COMPANY NAME	ROLE	CTC	COLLEGE NAME	ELIGIBLE BATCH
1	12:02 PM	Loyal Wingman Technologies Pvt. Ltd.	GET	Not Mentioned	PSNA	2026 & 2027
2	4:27 PM	Loyal Wingman Technologies Pvt. Ltd.	GET	Not Mentioned	SMVEC	2026 & 2027
						
						
						
			24-Aug-26			
						
SI.NO	Time Stamp	COMPANY NAME	ROLE	CTC	COLLEGE NAME	ELIGIBLE BATCH
1	11:19 AM	Crawl Crop India Pvt Ltd	Software Associate Trainee	3.5 - 4 LPA	HITS	2027
2	12:41 PM	AquaAirX	Sourcing & Procurement Intern	10k/month	HITS	2027
3	11:19 AM	Crawl Crop India Pvt Ltd	Software Associate Trainee	3.5 - 4 LPA	NEHRU	2027
4	12:43 PM	AquaAirX	Sourcing & Procurement Intern	10k/month	NEHRU	2027
5	3:16 PM	Pepagora	Inside Sales Associate/BDA	10k/month & 4 LPA	HITS	2027
6	11:17 AM	Crawl Crop India Pvt Ltd	Software Associate Trainee	3.5 - 4 LPA	KIOT	2027
7	12:39 PM	AquaAirX	Sourcing & Procurement Intern	10k/month	SMVEC	2027
8	12:39 PM	AquaAirX	Sourcing & Procurement Intern	10k/month	ACEW	2027
9	11:19 AM	Crawl Crop India Pvt Ltd	Software Associate Trainee	3.5 - 4 LPA	PSNA	2027
10	12:38 PM	AquaAirX	Sourcing & Procurement Intern	10k/month	DSU	2027
11	1:05 PM	Fristine Infotech Pvt Ltd	Zoho Developer/Business Analyst/Data Engineer	3 - 6 LPA	SMVEC	2027
12	11:17 AM	Crawl Crop India Pvt Ltd	Software Associate Trainee	3.5 - 4 LPA	AIHT	2027
13	12:42 AM	AquaAirX	Sourcing & Procurement Intern	10k/month	ACEW	2027
						
						
			25-Aug-26			
						
SI.NO	Time Stamp	COMPANY NAME	ROLE	CTC	COLLEGE NAME	ELIGIBLE BATCH
1	2:01 PM	VLSI India	Multiple Roles	5 - 30 LPA	NEHRU	2027
2	4:29 PM	VLSI India	Multiple Roles	5 - 30 LPA	HITS	2027
3	4:26 PM	VLSI India	Multiple Roles	5 - 30 LPA	SMVEC	2027
4	12:39 PM	AquaAirX	Sourcing & Procurement Intern	10k/month	SMVEC	2027
5	12:26 PM	AquaAirX	Sourcing & Procurement Intern	10k/month	SONA	2027
6	2:05 PM	Loyal Wingman	Graduate Engineer Trainee	3 LPA	SMVEC	2027
7	4:51 PM	VLSI India	Multiple Roles	5 - 30 LPA	SMVEC	2027
`;

const COLLEGE_NAMES_FALLBACK = {
  SONA: 'Sona College of Technology (SONA)',
  ACET: 'Akshaya College of Engineering and Technology (ACET)',
  KLU: 'Kalasalingam Academy of Research and Education (KLU)',
  PSNA: 'PSNA College of Engineering and Technology',
  NPR: 'NPR College of Engineering & Technology',
  KIOT: 'Knowledge Institute of Technology (KIOT)',
  SMVEC: 'Sri Manakula Vinayagar Engineering College (SMVEC)',
  DSU: 'Dayananda Sagar University (DSU)',
  AIHT: 'Anand Institute of Higher Technology (AIHT)',
  KPR: 'KPR Institute of Engineering and Technology (KPR)',
  ACEW: 'Adhiyamaan College of Engineering - Women (ACEW)',
  HITS: 'Hindustan Institute of Technology and Science (HITS)',
  NEHRU: 'Nehru College of Educational and Charitable Trust (NEHRU)',
  NGCE: 'Nandha Group of Institutions / NGCE',
  KAMARAJ: 'Kamaraj College of Engineering and Technology (KAMARAJ)',
};

function parseDateHeader(str) {
  // Matches "4-aug-2026", "5-Aug-26", "08/04/2026", etc.
  const cleaned = str.replace(/[_\t\r]/g, ' ').trim();
  const m1 = cleaned.match(/(\d{1,2})-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d{2,4})/i);
  if (m1) {
    const day = m1[1].padStart(2, '0');
    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const month = String(monthNames.indexOf(m1[2].toLowerCase()) + 1).padStart(2, '0');
    let year = m1[3];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${month}-${day}`;
  }
  const m2 = cleaned.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m2) {
    const month = m2[1].padStart(2, '0');
    const day = m2[2].padStart(2, '0');
    const year = m2[3];
    return `${year}-${month}-${day}`;
  }
  return null;
}

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/ipoms_db');
  console.log('Connected to MongoDB');
  const db = mongoose.connection.db;

  // 1. Fetch / Create Colleges
  const collegesCol = db.collection('colleges');
  const existingColleges = await collegesCol.find().toArray();
  const collegeMap = new Map();

  for (const c of existingColleges) {
    if (c.college_code) {
      collegeMap.set(c.college_code.toUpperCase().trim(), c._id);
    }
  }

  for (const [code, name] of Object.entries(COLLEGE_NAMES_FALLBACK)) {
    const upper = code.toUpperCase();
    if (!collegeMap.has(upper)) {
      const ins = await collegesCol.insertOne({
        college_code: upper,
        college_name: name,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });
      console.log(`Created college: ${upper} (${ins.insertedId})`);
      collegeMap.set(upper, ins.insertedId);
    }
  }

  // 2. Parse Raw Data
  const lines = rawJdData.split('\n');
  let currentDate = null;
  let hasTimestampCol = true;
  const parsedRows = [];

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    // Check if date header
    const parsedDate = parseDateHeader(line);
    if (parsedDate) {
      currentDate = parsedDate;
      hasTimestampCol = true; // default
      continue;
    }

    if (line.includes('SI.NO') && line.includes('COMPANY NAME')) {
      hasTimestampCol = line.includes('Time Stamp');
      continue;
    }

    const parts = line.split('\t').map((p) => p.trim().replace(/\u00a0/g, ' ')).filter(Boolean);
    if (parts.length < 4) continue;

    let timeStamp = '10:00 AM';
    let companyName = '';
    let role = '';
    let ctc = '';
    let collegeCode = '';
    let eligibleBatch = '2027';

    if (!hasTimestampCol) {
      // SI.NO | COMPANY NAME | ROLE | CTC | COLLEGE NAME | ELIGIBLE BATCH
      let idx = /^\d+$/.test(parts[0]) ? 1 : 0;
      companyName = parts[idx] || '';
      role = parts[idx + 1] || '';
      ctc = parts[idx + 2] || '';
      collegeCode = (parts[idx + 3] || '').toUpperCase().trim();
      eligibleBatch = parts[idx + 4] || '2027';
    } else {
      // SI.NO | Time Stamp | COMPANY NAME | ROLE | CTC | COLLEGE NAME | ELIGIBLE BATCH
      let idx = /^\d+$/.test(parts[0]) ? 1 : 0;
      timeStamp = parts[idx] || '10:00 AM';
      companyName = parts[idx + 1] || '';
      role = parts[idx + 2] || '';
      ctc = parts[idx + 3] || '';
      collegeCode = (parts[idx + 4] || '').toUpperCase().trim();
      eligibleBatch = parts[idx + 5] || '2027';
    }

    // Filter out rows that are purely empty or numbers
    if (companyName && currentDate && !/^\d+$/.test(companyName)) {
      parsedRows.push({
        date: currentDate,
        time: timeStamp,
        company_name: companyName,
        role: role,
        ctc: ctc === 'Not Mentioned' ? '' : ctc,
        batch: eligibleBatch,
        college_code: collegeCode,
      });
    }
  }

  console.log(`Parsed ${parsedRows.length} JD Received records.`);

  // 3. Insert into DailyLeads (with deduplication)
  const dailyLeadsCol = db.collection('dailyleads');
  let insertedCount = 0;
  let skippedCount = 0;

  for (const row of parsedRows) {
    const targetDate = new Date(`${row.date}T00:00:00.000Z`);
    const nextDate = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);
    const collegeId = collegeMap.get(row.college_code) || null;

    const escapedName = row.company_name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const query = {
      lead_type: 'jd_received',
      company_name: { $regex: `^${escapedName}$`, $options: 'i' },
      lead_date: { $gte: targetDate, $lt: nextDate },
      is_deleted: { $ne: true },
    };
    if (collegeId) {
      query.college_id = collegeId;
    }

    const existing = await dailyLeadsCol.findOne(query);

    if (existing) {
      skippedCount++;
    } else {
      await dailyLeadsCol.insertOne({
        lead_type: 'jd_received',
        event_time: row.time,
        lead_date: targetDate,
        company_name: row.company_name,
        job_role: row.role,
        ctc: row.ctc,
        eligible_batch: row.batch.includes('Batch') ? row.batch : `${row.batch} Batch`,
        college_id: collegeId,
        is_deleted: false,
        created_at: new Date(),
        updated_at: new Date(),
      });
      insertedCount++;
    }
  }

  console.log(`\nJD Received Import Summary:`);
  console.log(`- Total Parsed: ${parsedRows.length}`);
  console.log(`- Successfully Inserted: ${insertedCount}`);
  console.log(`- Skipped Duplicates: ${skippedCount}`);

  // 4. Verify breakdown
  const aggr = await dailyLeadsCol.aggregate([
    { $match: { lead_type: 'jd_received', is_deleted: { $ne: true } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$lead_date' } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]).toArray();

  console.log('\nJD Received count per date:');
  console.table(aggr);

  process.exit(0);
}

run().catch((err) => {
  console.error('Import error:', err);
  process.exit(1);
});
