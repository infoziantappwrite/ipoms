import mongoose from 'mongoose';
import { ActiveLead } from '../models/ActiveLead';
import { User } from '../models/User';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ipoms_db';

interface RawLead {
  company_name: string;
  role: string;
  ctc: string;
}

const NEW_LEADS_BATCH: RawLead[] = [
  // Screenshot 1
  {
    company_name: 'Agentanalytics',
    role: 'Agentic AI engineer / AI/ML & Agentic Engineer',
    ctc: '4-6 LPA',
  },
  {
    company_name: 'Agnitech',
    role: 'Electrical Engineer / CNC Machine Operator, Electrical Engineer / Data Analyst',
    ctc: '3–5 LPA',
  },
  {
    company_name: 'AI Health Highway India Pvt. Ltd.',
    role: 'SDE / Software / AI Engineer / GET',
    ctc: '4 – 8 LPA',
  },
  {
    company_name: 'Avinya Infinity Solutions Pvt. Ltd.',
    role: 'EEE , ECE / Technical Support, Hardware Assembly, Product Design Roles / Electrical Technical Engineer',
    ctc: '3.5 - 4 LPA',
  },
  {
    company_name: 'Besmak Components Pvt. Ltd.',
    role: 'GET',
    ctc: '4 LPA',
  },
  {
    company_name: 'BIBUS India Private Limited',
    role: 'Design Engineer / Design Engineer , Internal Coordinator / Design Engineer / Internal Coordinator',
    ctc: '3 - 4 LPA',
  },
  {
    company_name: 'BlackTrader',
    role: 'Multiple IT Roles',
    ctc: '4-6 LPA',
  },
  {
    company_name: 'Crawl Corp India',
    role: 'Software Developer / AI Engineer / Software Developer, AI Engineer, Flutter Developer, and Training Associate',
    ctc: '3–5 LPA, 8-12k / month',
  },
  {
    company_name: 'Dexian India Technologies',
    role: 'Talent Specialist/ Recruiter / GET',
    ctc: '4.35 LPA',
  },
  {
    company_name: 'DongAh Electric India Pvt. Ltd.',
    role: 'GET',
    ctc: '3.5 LPA',
  },
  {
    company_name: 'Eduexpose',
    role: 'Digital marketing , HR Intern',
    ctc: '6 LPA',
  },
  {
    company_name: 'Ericsson',
    role: 'Network Engineer / Integration Engineer',
    ctc: '5 - 7 LPA',
  },
  {
    company_name: 'Espint',
    role: 'GET, NATS Trainee / B.E./B.Tech / Process Associate',
    ctc: '2.5 - 3 LPA',
  },
  {
    company_name: 'Flipr Innovation Labs',
    role: 'Software Developer Intern / Software Engineer / Software Engineer (Intern)',
    ctc: '3.6 - 7.2 LPA',
  },
  {
    company_name: 'Fristine Infotech Private Limited',
    role: 'Data Engineer- Intern / Zoho Developer , Buisness Analyt',
    ctc: 'Not Mentioned',
  },
  {
    company_name: 'Glenwood Systems',
    role: 'Programmer Analyst, Design Engineer Trainee / Software Developer',
    ctc: '3-4 LPA',
  },
  {
    company_name: 'GOAT Robotics Pvt. Ltd.',
    role: 'Mechanical Engineer Intern, Deployment Engineer / Robotics Engineer / Purchase & Stores Assistants, Technical / Client Support Executives',
    ctc: '3 - 4 LPA',
  },
  {
    company_name: 'Hire3X',
    role: 'Graduate Trainee - Developer',
    ctc: '5 - 6 LPA',
  },
  {
    company_name: 'Infac India Private Limited',
    role: 'GET',
    ctc: '18k/m',
  },
  {
    company_name: 'ITC Infotech India',
    role: 'SDE / GET',
    ctc: '3.5 – 6 LPA',
  },
  {
    company_name: 'Ivanti',
    role: 'Software Engineer',
    ctc: '14 LPA',
  },
  {
    company_name: 'Jayam Automobile',
    role: 'Assistant Engineer',
    ctc: '3 - 4.5 LPA',
  },
  {
    company_name: 'Juspay',
    role: 'Software Developer',
    ctc: '6-8 LPA',
  },

  // Screenshot 2
  {
    company_name: 'KritiLabs',
    role: 'Production / Soldering / Assembly, Project / Field Engineer, Junior / Fresher Java Developer, Layout Design / Specialized Trainee / Mechanical Engineering-Intern / Engineering Interns',
    ctc: '4 - 4.5 LPA, 14k/month',
  },
  {
    company_name: 'Kyungshin Industrial Motherson Pvt. Ltd. (KIML)',
    role: 'GET',
    ctc: '3 - 4 LPA',
  },
  {
    company_name: 'LawLytics (Kiprosh)',
    role: 'AI Software Engineer / Tech Support Roles',
    ctc: '13-15 LPA',
  },
  {
    company_name: 'LogBase',
    role: 'Customer Success Executive',
    ctc: '3 LPA',
  },
  {
    company_name: 'Loyalty Juggernaut',
    role: 'Software Engineer / GET',
    ctc: '3-5 LPA',
  },
  {
    company_name: 'Mho Electric',
    role: 'GET ( EEE)',
    ctc: '3 LPA',
  },
  {
    company_name: 'Mindgraph',
    role: 'Cyber Security Analyst / CSE and IT Depts',
    ctc: '3-4 LPA',
  },
  {
    company_name: 'Mitsogo',
    role: 'Software Test Engineer / SDE, QA Engineer / CSE and IT Depts',
    ctc: '3-5 LPA',
  },
  {
    company_name: 'Modulus Housing',
    role: 'Architect Engineer / Production Engineer, Shift Engineer, Structural Design Trainee, and BIM Modeler / Structural Design Trainee',
    ctc: '3 LPA, 4.5 LPA',
  },
  {
    company_name: 'Morphle Labs',
    role: 'Quality Control Intern',
    ctc: '4-5 LPA',
  },
  {
    company_name: 'Mphasis',
    role: 'Associate Software Engineer',
    ctc: '4 - 5 LPA',
  },
  {
    company_name: 'MRF Limited',
    role: 'Lead Trainee',
    ctc: '2.50 LPA',
  },
  {
    company_name: 'Multicoreware',
    role: 'EEE , ECE / Software Engineer / GET',
    ctc: '10 LPA, 4 - 6 LPA',
  },
  {
    company_name: 'Planys Technologies',
    role: 'Mechanical, Electrical & Manufacturing Intern / Mechanical Design Engineer / Multiple roles for Mech&ECE, SCM, Civil Engineering',
    ctc: '15k/month, 4 LPA, 3.6 LPA',
  },
  {
    company_name: 'Puget Sound Steel',
    role: 'Trainee Rebar Detailer / Fabric Designing',
    ctc: '10k/month',
  },
  {
    company_name: 'ResNet Solutions Pvt. Ltd.',
    role: 'ML Developer, SDE / ML Developer , SDE / AI & ML Engineer',
    ctc: '8 - 12 LPA',
  },
  {
    company_name: 'Robolog Automation',
    role: 'Multiple Roles / Junior Automation Engineer, Assembly Maintenance Technician / Multiple Roles For Automation',
    ctc: '3.6 LPA, 4 LPA',
  },
  {
    company_name: 'Runloyal',
    role: 'Web Developer / Customer Onboarding Associate / Junior Specialist, Customer Support Associate, Tech & AI Internships, Software & Developer / Software Developer',
    ctc: '5 - 6.5 LPA',
  },
  {
    company_name: "Surya's MiB Enterprises",
    role: 'PCB Design Engineer / ECE',
    ctc: '5 LPA, 3.6 LPA',
  },
  {
    company_name: 'TCNOM Engineers Private Limited',
    role: 'Assistant Engineer / Mechanical Engineer Intern / Assistant Engineer',
    ctc: '3-5 LPA',
  },

  // Screenshot 3
  {
    company_name: 'Tridots',
    role: 'Business Analyst',
    ctc: '4 - 4.5 LPA',
  },
  {
    company_name: 'V Max Health Tech',
    role: 'Multiple Roles / Software Engineer / GET',
    ctc: '3–5 LPA',
  },
  {
    company_name: 'Visteon',
    role: 'Software Engineer',
    ctc: '6 - 7.5 LPA',
  },
  {
    company_name: 'VLSI Technology',
    role: 'Multiple Roles / IT, Mech, EEE, and ECE Depts',
    ctc: '5-15 LPA',
  },
  {
    company_name: 'Voltech',
    role: 'GET / Field Engineer (EEE) / GET (EEE)',
    ctc: '3-5 LPA',
  },
  {
    company_name: 'Volvo',
    role: 'GET, Associate Engineer, Software Engineer / ASE',
    ctc: '4.2 - 7 LPA',
  },
  {
    company_name: 'Wavicle Data',
    role: 'Junior Data Integration Developer, Business Analyst, Associate Programmer Analyst / Business Analyst / Data Analyst',
    ctc: '4 - 6 LPA',
  },
  {
    company_name: 'Webdesk Solutions',
    role: 'AI Engineer',
    ctc: '5 LPA',
  },
  {
    company_name: 'Wendt India Limited',
    role: 'Apprentice Trainee',
    ctc: '19k/m',
  },
  {
    company_name: 'Xtreme Next',
    role: 'Java Developers, C++ Developers, Application Developers, BDE, Digital Marketing Executives / All Depts',
    ctc: '5 - 6 LPA',
  },
  {
    company_name: 'ZeAI Soft Pvt. Ltd.',
    role: 'AI & ML Developer / web developer / AI, ML & Web Application Developer / Web Application Developer',
    ctc: '5-8 LPA',
  },
  {
    company_name: 'Zepto',
    role: 'AUT / All Depts / Assistant Under Training',
    ctc: '3-5 LPA',
  },
];

// Normalize company name for fuzzy duplicate comparison
function normalizeComp(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(pvt|ltd|limited|private|technologies|solutions|services|enterprises|india|corp|corporation)\b/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

async function checkAndSeed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const coordinator = await User.findOne({ email: 'megaladevi@infoziant.com' }) || await User.findOne({});
    const coordinatorId = coordinator?._id;

    const existingLeads = await ActiveLead.find({ academic_year: '2027', is_deleted: false });
    console.log(`Existing 2027 Active Leads in DB: ${existingLeads.length}`);

    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const lead of NEW_LEADS_BATCH) {
      const normName = normalizeComp(lead.company_name);

      // Find if already exists
      const found = existingLeads.find(
        (ex) => normalizeComp(ex.company_name) === normName || ex.company_name.toLowerCase() === lead.company_name.toLowerCase()
      );

      if (found) {
        // Already in database - update with more comprehensive role and CTC
        found.role = lead.role;
        found.ctc = lead.ctc;
        await found.save();
        updatedCount++;
        console.log(`  🔄 [Updated existing]: "${found.company_name}" -> Role: ${lead.role} | CTC: ${lead.ctc}`);
      } else {
        // Insert new entry
        await ActiveLead.create({
          company_name: lead.company_name,
          role: lead.role,
          ctc: lead.ctc,
          status: 'Hiring',
          followup_month: '',
          academic_year: '2027',
          coordinator_id: coordinatorId,
          is_deleted: false,
        });
        addedCount++;
        console.log(`  ➕ [Added new]: "${lead.company_name}" | Role: ${lead.role} | CTC: ${lead.ctc}`);
      }
    }

    const finalTotal = await ActiveLead.countDocuments({ academic_year: '2027', is_deleted: false });
    console.log(`\n========================================`);
    console.log(`🎉 Quality Check & Seeding Summary:`);
    console.log(`   - Existing updated: ${updatedCount}`);
    console.log(`   - New leads added:  ${addedCount}`);
    console.log(`   - Total 2027 Active Leads in DB: ${finalTotal}`);
    console.log(`========================================\n`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err: any) {
    console.error('Error during seeding:', err);
    process.exit(1);
  }
}

checkAndSeed();
