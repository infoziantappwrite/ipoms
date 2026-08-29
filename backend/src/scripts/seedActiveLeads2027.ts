import { connectDatabase, disconnectDatabase } from '../config/database';
import { ActiveLead } from '../models/ActiveLead';
import { User } from '../models/User';

const LEADS_2027 = [
  {
    company_name: 'Strategy',
    role: 'Multiple Tech Roles',
    ctc: '7-9 LPA',
    status: 'Hiring' as const,
    academic_year: '2027' as const,
    followup_month: '' as const,
  },
  {
    company_name: 'ZeAI Soft Pvt Ltd',
    role: 'AI & ML Developer / Web Developer',
    ctc: '5–8 LPA',
    status: 'Hiring' as const,
    academic_year: '2027' as const,
    followup_month: '' as const,
  },
  {
    company_name: 'Tactive',
    role: 'Project Executive- M.com Only',
    ctc: '5 LPA',
    status: 'Hiring' as const,
    academic_year: '2027' as const,
    followup_month: '' as const,
  },
  {
    company_name: 'Aptean - Cart Rabbit',
    role: 'Digital Marketing Executive',
    ctc: '4–5 LPA',
    status: 'Hiring' as const,
    academic_year: '2027' as const,
    followup_month: '' as const,
  },
  {
    company_name: 'TCNOM Engineers Private Limited',
    role: 'Assistant Engineer',
    ctc: '3–5 LPA',
    status: 'Hiring' as const,
    academic_year: '2027' as const,
    followup_month: '' as const,
  },
  {
    company_name: "SURYA'S MiB Enterprises",
    role: 'PCB Design Engineer',
    ctc: '3.6 LPA',
    status: 'Hiring' as const,
    academic_year: '2027' as const,
    followup_month: '' as const,
  },
  {
    company_name: 'Robolog Automation',
    role: 'Multiple Roles for Automation',
    ctc: '3.6 LPA',
    status: 'Hiring' as const,
    academic_year: '2027' as const,
    followup_month: '' as const,
  },
  {
    company_name: 'Mindgraph',
    role: 'Cyber Security Analyst',
    ctc: '3- 4 LPA',
    status: 'Hiring' as const,
    academic_year: '2027' as const,
    followup_month: '' as const,
  },
  {
    company_name: 'AquaAirX',
    role: 'Electrical & Embedded Systems Intern, Design Engineer (Mechanical), CAE Engineer/Software Development Intern',
    ctc: '3.5–4 LPA',
    status: 'Hiring' as const,
    academic_year: '2027' as const,
    followup_month: '' as const,
  },
  {
    company_name: 'InCoBAN',
    role: 'GET',
    ctc: '3 LPA',
    status: 'Hiring' as const,
    academic_year: '2027' as const,
    followup_month: '' as const,
  },
  {
    company_name: 'Avinya Infinity Solutions Pvt Ltd',
    role: 'Electrical Technical Engineer',
    ctc: '3 LPA',
    status: 'Hiring' as const,
    academic_year: '2027' as const,
    followup_month: '' as const,
  },
  {
    company_name: 'SPK Power Infra Pvt Ltd',
    role: 'Junior Engineer',
    ctc: '3 LPA',
    status: 'Hiring' as const,
    academic_year: '2027' as const,
    followup_month: '' as const,
  },
  {
    company_name: 'Dongah Electric India Pvt Ltd',
    role: 'GET',
    ctc: '3 LPA',
    status: 'Hiring' as const,
    academic_year: '2027' as const,
    followup_month: '' as const,
  },
  {
    company_name: 'GridSync Services Private Limited',
    role: 'Protection Engineer (EEE) & Automation Engineer (ECE) (Testing & Commissioning Engineer)',
    ctc: '3 LPA',
    status: 'Hiring' as const,
    academic_year: '2027' as const,
    followup_month: '' as const,
  },
  {
    company_name: 'Espint',
    role: 'GET, NATS Trainee',
    ctc: '2.5 LPA',
    status: 'Hiring' as const,
    academic_year: '2027' as const,
    followup_month: '' as const,
  },
  {
    company_name: 'Kyungshin Industrial Motherson (KIML)',
    role: 'GET',
    ctc: '2.5 LPA',
    status: 'Hiring' as const,
    academic_year: '2027' as const,
    followup_month: '' as const,
  },
  {
    company_name: 'Cad Macro Design & Solutions Pvt. Ltd.',
    role: 'Software Engineer',
    ctc: '2.4 LPA',
    status: 'Hiring' as const,
    academic_year: '2027' as const,
    followup_month: '' as const,
  },
];

async function seedActiveLeads2027() {
  try {
    await connectDatabase();

    const coordinator = await User.findOne({ official_email: 'megaladevi@infoziant.com' }) || await User.findOne({});
    const coordinatorId = coordinator?._id;

    console.log(`Clearing existing 2027 active leads to avoid duplicates...`);
    await ActiveLead.deleteMany({ academic_year: '2027' });

    console.log(`Inserting ${LEADS_2027.length} active leads for 2027 batch...`);
    for (const item of LEADS_2027) {
      await ActiveLead.create({
        ...item,
        coordinator_id: coordinatorId,
        is_deleted: false,
      });
      console.log(`  ✓ Added: ${item.company_name} | ${item.role} | ${item.ctc}`);
    }

    const total2027 = await ActiveLead.countDocuments({ academic_year: '2027', is_deleted: false });
    console.log(`\n🎉 Success: ${total2027} Active Leads currently loaded for 2027 batch!`);

    await disconnectDatabase();
    process.exit(0);
  } catch (err: any) {
    console.error('Error seeding active leads:', err);
    process.exit(1);
  }
}

seedActiveLeads2027();
