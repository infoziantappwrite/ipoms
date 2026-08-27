const mongoose = require('mongoose');

const rawData = `
CALL POSTIVES - 08/03/2026						
SI.NO	Time Stamp	COMPANY NAME	ROLE	CTC	ELIGIBLE BATCH	COLLEGE NAME
1	4:04 PM	Ramboll	Graduate Detailing Engineer	4 - 6 LPA	2027	KLU 
2	4:23 PM	UBS Bglr	 Financial Analyst, and Operations roles	9.5 - 15.6 LPA	2027	KLU 
3	3:36 PM	Ramboll India Private Limited	GET	6 LPA	2027	PSNA
						
						
CALL POSTIVES - 08/04/2026						
SI.NO	Time Stamp	COMPANY NAME	ROLE	CTC	ELIGIBLE BATCH	COLLEGE NAME
1	5:00 PM	Changepond	Software Developer, Software Tester, Programmer Analyst Trainee, and Engineer Trainee	4 - 5 LPA	2027	KLU 
2	5:25 PM	iNube solutions	Software Engineer, Software Engineer, Associate Business Analyst	6 - 7 LPA	2027	KLU 
3	12:30 PM	DongAh Electric India Pvt. Ltd.	GET	3.5 LPA	2027	NPR
4	4:13 PM	UBS Bglr	 Financial Analyst, and Operations roles	9.5 - 15.6 LPA	2027	PSNA
						
						
CALL POSTIVES - 08/05/2026						
SI.NO	Time Stamp	COMPANY NAME	ROLE	CTC	ELIGIBLE BATCH	COLLEGE NAME
1	4:35 PM	FristineTech	AI Engineer Intern	3-5 LPA	2027	KIOT
2	12:20 PM	Perfint Healthcare Ltd	Junior Test Engineer, Software Engineer	5.5 - 7.9 LPA	2027	KLU 
3	1:54 PM	bhive technologies	AI Coder	5 - 6.5 LPA	2027	KLU 
4	4:22 PM	Gestamp	Production Engineer, Manufacturing Operator	3.5 - 4.5 LPA	2027	KLU 
5	5:00 PM	Kriti labs	Production / Soldering / Assembly, Project / Field Engineer, Junior / Fresher Java Developer, Layout Design / Specialized Trainee	4 - 4.5 LPA	2027	KLU 
						
						
CALL POSTIVES - 08/06/2026						
SI.NO	Time Stamp	COMPANY NAME	ROLE	CTC	ELIGIBLE BATCH	COLLEGE NAME
1	1:30 PM	Visteon	Software Engineer	6.5 - 7.5 LPA	2027	KLU 
2	3:17 PM	Quark Global	Associate Software Engineer, Business Development / Operations, Trainee roles	5.5 - 7.7 LPA	2027	KLU 
3	4:52	Espint	GET	4 LPA	2027	PSNA
						
						
CALL POSTIVES - 08/07/2026						
SI.NO	Time Stamp	COMPANY NAME	ROLE	CTC	ELIGIBLE BATCH	COLLEGE NAME
1	4:48 PM	Hunger Box	Tech Roles	6 - 7 LPA	2027	KLU 
2	12:56 PM	IOTA Diagnostic Pvt. Ltd	SDE	3 LPA	2027	PSNA
3	3:25 PM	Aero360	Multiple roles	4 LPA	2027	KIOT
4	3:50 PM	CSCS	SDE	6 LPA	2027	KIOT
						
						
						
CALL POSTIVES - 08/10/2026						
SI.NO	Time Stamp	COMPANY NAME	ROLE	CTC	ELIGIBLE BATCH	COLLEGE NAME
1	11:50 AM	V max Health Tech	Multiple Roles	4 - 5 LPA	2027	KLU 
2	1:11 PM	Fanucindia	GET	5 LPA	2027	KLU 
3	3:45 PM	Voltech Events	Field Engineer (EEE)	3-5 LPA	2027	KLU 
						
						
CALL POSTIVES - 08/11/2026						
SI.NO	Time Stamp	COMPANY NAME	ROLE	CTC	ELIGIBLE BATCH	COLLEGE NAME
1	11.55 AM	Loyalty Juggernaut India Pvt. Ltd.	Software Engineer 	3-4 LPA	2027	PSNA
2	3.46 PM	BIBUS India Private Limited	Design Engineer	4 LPA	2026 & 2027	PSNA
3	3.50 PM	Bigcat Wireless Private Limited	Embedded Software Engineer	5 LPA	2027	PSNA
4	12.40 PM	iNube Solutions Pvt. Ltd.	Software Engineer 	4–6 LPA	2027	SMVEC
5	12.54 PM	V Max Health Tech Pvt. Ltd.	Software Engineer 	3–5 LPA	2027	SMVEC
6	1:43 PM	Axxelent	Multiple Roles	3 LPA	2027	KLU 
7	2:22 PM	ITSS Global	Junior Technical Consultant, Associate Technical Consultant, Software Developer / Junior Developer	5 - 6 LPA	2027	KLU 
8	4:21 PM	GE Vernova	SDE	4-5 LPA	2027	NPR
9	1:16 PM	iNube Solutions Pvt. Ltd.	Software Engineer 	4-5 LPA	2027	KIOT
						
						
						
CALL POSTIVES - 08/12/2026						
SI.NO	Time Stamp	COMPANY NAME	ROLE	CTC	ELIGIBLE BATCH	COLLEGE NAME
1	1:41 PM	ShareSoft Technology	Web Developer	3.5 - 4.5 LPA	2027	KLU 
2	3:48 PM	Cashfree	Associate Software Engineer	9.5 - 10 LPA	2027	KLU 
3	5:33 PM	MBit wireless	GET	6 - 8 LPA	2027	KLU 
4	11:41 AM	FORVIA FAURECIA	Graduate Engineer Trainee	4–6 LPA	2027	PSNA
5	11:49 AM	DRIBLET PRIVATE LIMITED	Robotics Engineer	4–6 LPA	2027	PSNA
6	11:51 AM	DSRL	Embedded Engineer	3–5 LPA	2027	PSNA
7	11:55 AM	Eco Saathi Green India Private Limited	Data Analyst	3–5 LPA	2027	PSNA
8	11:57 AM	Ecochoice Naturals Private Limited	Quality Analyst	3–5 LPA	2027	PSNA
9	3:31 PM	Encamp Tourism Private Limited	Operations Executive	3–5 LPA	2027	DSU
10	3:46 PM	GE Vernova	Graduate Engineer Trainee	4–7 LPA	2027	DSU
11	4:04 PM	Loyalty Juggernaut	Software Engineer 	3-5 LPA	2027	KIOT
12	3:21 PM	V Max Health Tech Pvt. Ltd.	Software Engineer 	3–5 LPA	2027	NPR
13	4:04 PM	Aero360	Multiple roles	4 LPA	2027	AIHT
14	4:16 PM	FristineTech	AI Engineer Intern	3-5 LPA	2027	AIHT
15	4:24 PM	Ramboll India Private Limited	GET	4-5 LPA	2027	AIHT
16	4:36 PM	AquaAirX Private Limited	AI Interns	15K/month	2027	AIHT
17	4:53 PM	ITSS Global	Software Developer / Junior Developer	4-5 LPA	2027	AIHT
18	5:23 PM	Resnet Solutions 	SDE	3-5 LPA	2027	AIHT
19	5:31 PM	VLSI Technology	Multiple Roles	4-5 LPA	2027	AIHT
						
						
						
CALL POSTIVES - 08/13/2026						
SI.NO	Time Stamp	COMPANY NAME	ROLE	CTC	ELIGIBLE BATCH	COLLEGE NAME
1	1:04 PM	Mitsogo - Hexnode	Associate Software Engineer	4 - 6 LPA	2027	KLU 
2	1:25 PM	GE vernova	GET	8 - 15 LPA	2027	KLU 
3	3:01 PM	Jayam Autos	Assistant Engineer	3 - 4.5 LPA	2027	KLU 
4	3:38 PM	L&T Tech	GET	4 - 6 LPA	2027	KLU 
5	4:25 PM	Optum	Software Engineer 	11 - 16 LPA	2027	KLU 
6	3:41 PM	FinanceKART (Renaissance)	Software Developer	4–6 LPA	2027	PSNA
7	4.08 pm	Explorica	GET	3–5 LPA	2027	DSU
8	11:13 AM	BIBUS India Private Limited	Design Engineer	4 LPA	2027	KIOT
9	11:25 AM	Bigcat Wireless Private Limited	Embedded Software Engineer	4 LPA	2027	KIOT
10	1:11 PM	BIBUS India Private Limited	Design Engineer	4 LPA	2027	KPR
						
						
						
CALL POSTIVES - 08/14/2026						
SI.NO	Time Stamp	COMPANY NAME	ROLE	CTC	ELIGIBLE BATCH	COLLEGE NAME
1	11:10 AM	Mercedes Benz	GET	11 - 14 LPA	2027	KLU 
2	12:23 PM	Tiger Analytics	Associate Data Engineer	6.5 - 7.5 LPA	2027	KLU 
3	1:45 PM	Blue yonder	Associate Software Engineer	10 - 12 LPA	2027	KLU 
4	2:26 PM	Evobi	Android Developer	6 -7 LPA	2027	KLU 
5	3:48 PM	DSRL	Design Engineer	3 - 5 LPA	2027	KLU 
6	5:21 PM	Eco Saathi Green India Private	Quality Analyst	3 - 5 LPA	2027	KLU 
						
						
CALL POSTIVES - 08/17/2026						
SI.NO	Time Stamp	COMPANY NAME	ROLE	CTC	ELIGIBLE BATCH	COLLEGE NAME
1	12:35 PM	Crawl Corp India	AI Engineer 	4 LPA	2027	AIHT
2	12:56pm	Modulus Housing	Architect Engineer	3 LPA	2027	AIHT
3	1:30 PM	Agnitech Forge Pvt. Lmt.	CNC Machine Operator, Electrical Enginer 	2.8-3.5 LPA	2027	AIHT
4	5:25pm	AgentAnalytics.AI	Agentic AI engineer	5-8 LPA	2027	AIHT
5	5:35PM	LLM APPLIANCES PRIVATE LIMITED	Production Trainerr (Mech)	3.12 LPA	2027	AIHT
6	5:55pm	RunLoyal	Web Developer	3 - 4 LPA	2027	AIHT
7	1:02 PM	RunLoyal	Web Developer	3 - 4 LPA	2027	KIOT
8	3:34 PM	Crawl Corp India	AI Engineer 	4 LPA	2027	KIOT
9	12:35 PM	Modulus Housing	Architect Engineer	3 LPA	2027	KIOT
10	3.39 pm	PWC	GET	4 LPA	2027	PSNA
11	3.48 pm	Modulus Housing	Architect Engineer	3 LPA	2027	PSNA
12	5:55 PM	Hunger Box	Multiple roles	4-5 LPA	2027	ACEW
13	5:06 PM	Cartrabbit	SEO Specialist / Analyst (MBA Graduates)	4 - 5 LPA	2027	ACEW
14	3:46 PM	Run Loyal	Software Developer	5 - 6.5 LPA	2027	KLU 
15	4:13 PM	Crawl Corp India 	 Flutter Developer	4 LPA	2027	KLU 
16	4:58 PM	Modulus Housing	Structural Design Trainee	4.5 LPA	2027	KLU 
17	5:15 PM	Crawl Corp India	AI Engineer 	4 LPA	2027	HITS
18	5:26 PM	Modulus Housing	Architect Engineer	3 LPA	2027	HITS
19	5:35 PM	Hunger Box	Multiple roles	4-5 LPA	2027	HITS
20	5:28 PM	RunLoyal	Web Developer	3 - 4 LPA	2027	NEHRU
21	5:31 PM	Modulus Housing	Architect Engineer	3 LPA	2027	NEHRU
22	5:37 PM	PWC	GET	4 LPA	2027	NEHRU
						
						
						
						
CALL POSTIVES - 08/18/2026						
SI.NO	Time Stamp	COMPANY NAME	ROLE	CTC	ELIGIBLE BATCH	COLLEGE NAME
1	12.26 pm	Crawl Corp India	Software Developer	3–5 LPA	2027	PSNA
2	3.18 pm	Innovease India Private Limited	Software Engineer	3–5 LPA	2027	DSU
3	12.53 pm	Agnitech Forge Pvt. Ltd.	Data Analyst	3–5 LPA	2027	SMVEC
4	1:14 PM	PWC	GET	4 LPA	2027	HITS
5	2:21 PM	Agnitech Forge Pvt. Lmt.	Data Analyst	3–5 LPA	2027	HITS
6	3:03 PM	AgentAnalytics.AI	AI/ML & Agentic Engineer	4-6 LPA	2027	HITS
7	3:28 PM	Mercedes Benz	Test / Analytics Engineer	9-10 LPA	2027	HITS
8	11:31 PM	Photom Technologies	Mechanical Design Engineer	3-4 LPA	2027	NEHRU
9	12:17 PM	Eco Saathi Green India Private	Quality Analyst	3–5 LPA	2027	NEHRU
10	12:28 PM	Explorica	GET	3–5 LPA	2027	NEHRU
11	1:12 PM	AgentAnalytics.AI	AI/ML & Agentic Engineer	4-6 LPA	2027	NEHRU
12	1:17 PM	Loyalty Juggernaut India Pvt. Ltd.	Software Engineer 	3-4 LPA	2027	NPR
13	1:57 PM	Agnitech Forge Pvt. Ltd.	Electrical Enginer 	3-4 LPA	2027	NPR
14	11:47 AM	Merlin Automation	Junior Design Engineer	4 - 7 LPA	2027	NGCE
15	2:26 PM	sasken	Software Engineer	5 LPA	2027	NGCE
						
						
						
CALL POSTIVES - 08/19/2026						
SI.NO	Time Stamp	COMPANY NAME	ROLE	CTC	ELIGIBLE BATCH	COLLEGE NAME
1	4.40 pm	RunLoyal	Web Developer	3 - 4 LPA	2027	SMVEC
2	5:26 PM	Agnitech Forge Pvt. Ltd.	Electrical Enginer 	3-4 LPA	2027	KIOT
3	5:20 PM	AgentAnalytics.AI	AI/ML & Agentic Engineer	4-5 LPA	2027	NPR
4	3:36 PM	Avinya Infinity Solutions Pvt Ltd	Technical Support, Hardware Assembly, Product Design Roles	3.5 - 4 LPA	2027	NGCE
5	4:48 PM	BIBUS India	Junior Internal Support, Executive Accountant / Operations	4 LPA	2027	NGCE
6	12:15 PM	Flipr	Software Engineer 	4.5 LPA	2027	KLU 
7	1:16 PM	Planys	Multiple roles for Mech&ECE, SCM, Civil Engineering	3.6 LPA	2027	KLU 
8	11:16 AM	Kinaxis	Software Engineer Trainee	6 LPA	2027	HITS
9	12:22 PM	Hashiraworks	Software Developer 	10 - 12 LPA	2027	HITS
10	2:14 PM	Valeo	Graduate Engineer Trainee	3 - 5 LPA	2027	HITS
11	3:10 PM	Care Edge	Software  / AI Engineer	3 LPA	2027	HITS
12	3:17 PM	Colan Infotech	Software Developer	4 LPA	2027	HITS
13	11:22 AM	Sasken	Software Engineer	5 LPA	2027	NEHRU
14	12:26 PM	Merlin Automation	Junior Design Engineer	4 - 7 LPA	2027	NEHRU
15	12:45 PM	Evobi	Android Developer	6 -7 LPA	2027	NEHRU
16	3:22 PM	Tiger Analytics	Multiple IT Roles	6 - 8 LPA	2027	NEHRU
						
						
CALL POSTIVES - 08/20/2026						
SI.NO	Time Stamp	COMPANY NAME	ROLE	CTC	ELIGIBLE BATCH	COLLEGE NAME
1	12:15 PM	Brakes India 	GET	15k/month - Intern, 3.80 - 5.82 LPA	2027	HITS
2	12:45 PM	Rishabh Enterprises	GET	3-4 LPA	2027	HITS
3	4:15 PM	Planys Tech	Mechanical, Electrical & Manufacturing Intern	15k/month	2027	HITS
4	2:11 PM	DSRL	Embedded Engineer	3 - 5 LPA	2027	NEHRU
5	2:46 PM	Driblet Pvt Ltd	Robotics Engineer	4 - 6 LPA	2027	NEHRU
6	3:10 PM	Agnitech Forge Pvt. Lmt.	Data Analyst	3–5 LPA	2027	NEHRU
7	4:30 PM	Crawl Corp India	AI Engineer 	4 LPA	2027	NEHRU
8	5:36 PM	Flipr Innovation Labs	Software Engineer 	4.5 LPA	2027	NEHRU
						
						
						
CALL POSTIVES - 08/24/2026						
SI.NO	Time Stamp	COMPANY NAME	ROLE	CTC	ELIGIBLE BATCH	COLLEGE NAME
1	4:12 PM	Kyungshin Industrial Motherson(KIML)	GET	3 - 4 LPA	2027	KLU
2	5:00 PM	Lawlytics	Tech Support Roles	13 - 15 LPA	2027	KLU
3	5:32 PM	DRIBLET PRIVATE LIMITED	Robotics Engineer	4–5 LPA	2027	NPR
4	2:40PM	SSHRD GROUP	Techical trainer	3 LPA	2027	NGCE
5	3:18 PM	DEEPFACTS	Software Engineer	3.7-4.1 LPA	2027	NGCE
						
						
						
CALL POSTIVES - 08/25/2026						
SI.NO	Time Stamp	COMPANY NAME	ROLE	CTC	ELIGIBLE BATCH	COLLEGE NAME
1	3:02 PM	Lincoln Electric	GET	3 LPA	2027	DSU
2	3:17 PM	Sew-Eurodrive India Pvt Ltd	GET	4 LPA	2027	DSU
3	2:37PM	Belzabar Software	SOFTWARE DEVELOPER INTERN	7LPA	2027	KAMARAJ
4	4:15 PM	PHILIPS	Multiple Roles	4-10 LPA	2027	KAMARAJ
5	4:06 PM	Think41	GET	3 LPA	2027	NPR
6	12:24 PM	Crawl Corp India	AI Engineer 	4 LPA	2027	ACEW
7	12:27 PM	BIBUS India Private Limited	Design Engineer	4 LPA	2027	ACEW
8	12:31 PM	VLSI Technology	Multiple Roles	4-5 LPA	2027	ACEW
9	4:00 PM	IQOL Technologies Pvt. Ltd	BDO, Operations Executives	4 LPA	2027	KLU
10	4:36 PM	Axxela	Multiple IT Roles	12 LPA	2027	KLU
11	5:10 PM	Value Creed	 Procurement Operations Associate	8.2 LPA	2027	KLU
12	12:45 PM	Lawlytics	Tech Support Roles	13 - 15 LPA	2027	HITS
13	3:11 PM	DeepFacts Pvt Ltd	Software Engineer	3 - 4 LPA	2027	HITS
14	2:22 PM	Loyal Wingman	Graduate Engineer Trainee	3 LPA	2027	NEHRU
15	3:45 PM	Planys Technologies	Multiple Intern Roles	15k/month - Intern	2027	NEHRU
`;

const COLLEGE_CODE_MAP = {
  KLU: 'KLU',
  PSNA: 'PSNA',
  NPR: 'NPR',
  KIOT: 'KIOT',
  SMVEC: 'SMVEC',
  DSU: 'DSU',
  AIHT: 'AIHT',
  KPR: 'KPR',
  ACEW: 'ACEW',
  HITS: 'HITS',
  NEHRU: 'NEHRU',
  NGCE: 'NGCE',
  KAMARAJ: 'KAMARAJ',
};

const COLLEGE_NAMES_FALLBACK = {
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

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/ipoms_db');
  console.log('Connected to MongoDB');
  const db = mongoose.connection.db;

  // 1. Fetch or create Colleges
  const collegesCollection = db.collection('colleges');
  const existingColleges = await collegesCollection.find().toArray();
  const collegeMap = new Map(); // code -> _id

  for (const c of existingColleges) {
    if (c.college_code) {
      collegeMap.set(c.college_code.toUpperCase().trim(), c._id);
    }
  }

  // Ensure all referenced colleges exist
  for (const code of Object.keys(COLLEGE_CODE_MAP)) {
    const upper = code.toUpperCase();
    if (!collegeMap.has(upper)) {
      const inserted = await collegesCollection.insertOne({
        college_code: upper,
        college_name: COLLEGE_NAMES_FALLBACK[upper] || upper,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });
      console.log(`Created missing college: ${upper} (${inserted.insertedId})`);
      collegeMap.set(upper, inserted.insertedId);
    }
  }

  // 2. Parse Raw Data by Section
  const lines = rawData.split('\n');
  let currentDate = null;
  const parsedRows = [];

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    // Check for date header e.g. "CALL POSTIVES - 08/03/2026"
    const dateMatch = line.match(/CALL\s+POSTIVES\s*-\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/i);
    if (dateMatch) {
      const month = dateMatch[1].padStart(2, '0');
      const day = dateMatch[2].padStart(2, '0');
      const year = dateMatch[3];
      // Store in YYYY-MM-DD format
      currentDate = `${year}-${month}-${day}`;
      continue;
    }

    // Skip table header
    if (line.includes('SI.NO') && line.includes('COMPANY NAME')) continue;

    // Split row by tabs
    const parts = line.split('\t').map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 6) {
      // SI.NO | Time Stamp | COMPANY NAME | ROLE | CTC | ELIGIBLE BATCH | COLLEGE NAME
      // Check if parts[0] is a number (SI.NO)
      let idx = 0;
      if (/^\d+$/.test(parts[0])) {
        idx = 1;
      }
      const timeStamp = parts[idx] || '';
      const companyName = parts[idx + 1] || '';
      const role = parts[idx + 2] || '';
      const ctc = parts[idx + 3] || '';
      const eligibleBatch = parts[idx + 4] || '2027';
      const collegeCode = (parts[idx + 5] || '').toUpperCase().trim();

      if (companyName && currentDate) {
        parsedRows.push({
          date: currentDate,
          time: timeStamp,
          company_name: companyName,
          role: role,
          ctc: ctc,
          batch: eligibleBatch,
          college_code: collegeCode,
        });
      }
    }
  }

  console.log(`Parsed ${parsedRows.length} positive rows across all dates.`);

  // 3. Insert into DailyLeads (with deduplication)
  const dailyLeadsCol = db.collection('dailyleads');
  let insertedCount = 0;
  let skippedCount = 0;

  for (const row of parsedRows) {
    const targetDate = new Date(`${row.date}T00:00:00.000Z`);
    const nextDate = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);
    const collegeId = collegeMap.get(row.college_code) || null;

    const escapedName = row.company_name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Check if duplicate exists for same date, lead_type, company, and college
    const query = {
      lead_type: 'positive',
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
        lead_type: 'positive',
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

  console.log(`\nImport Summary:`);
  console.log(`- Total Parsed: ${parsedRows.length}`);
  console.log(`- Successfully Inserted: ${insertedCount}`);
  console.log(`- Skipped Duplicates: ${skippedCount}`);

  process.exit(0);
}

run().catch((err) => {
  console.error('Import error:', err);
  process.exit(1);
});
