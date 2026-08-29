"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const ActiveLead_1 = require("../models/ActiveLead");
const User_1 = require("../models/User");
const LEADS_2027 = [
    {
        company_name: 'Strategy',
        role: 'Multiple Tech Roles',
        ctc: '7-9 LPA',
        status: 'Hiring',
        academic_year: '2027',
        followup_month: '',
    },
    {
        company_name: 'ZeAI Soft Pvt Ltd',
        role: 'AI & ML Developer / Web Developer',
        ctc: '5–8 LPA',
        status: 'Hiring',
        academic_year: '2027',
        followup_month: '',
    },
    {
        company_name: 'Tactive',
        role: 'Project Executive- M.com Only',
        ctc: '5 LPA',
        status: 'Hiring',
        academic_year: '2027',
        followup_month: '',
    },
    {
        company_name: 'Aptean - Cart Rabbit',
        role: 'Digital Marketing Executive',
        ctc: '4–5 LPA',
        status: 'Hiring',
        academic_year: '2027',
        followup_month: '',
    },
    {
        company_name: 'TCNOM Engineers Private Limited',
        role: 'Assistant Engineer',
        ctc: '3–5 LPA',
        status: 'Hiring',
        academic_year: '2027',
        followup_month: '',
    },
    {
        company_name: "SURYA'S MiB Enterprises",
        role: 'PCB Design Engineer',
        ctc: '3.6 LPA',
        status: 'Hiring',
        academic_year: '2027',
        followup_month: '',
    },
    {
        company_name: 'Robolog Automation',
        role: 'Multiple Roles for Automation',
        ctc: '3.6 LPA',
        status: 'Hiring',
        academic_year: '2027',
        followup_month: '',
    },
    {
        company_name: 'Mindgraph',
        role: 'Cyber Security Analyst',
        ctc: '3- 4 LPA',
        status: 'Hiring',
        academic_year: '2027',
        followup_month: '',
    },
    {
        company_name: 'AquaAirX',
        role: 'Electrical & Embedded Systems Intern, Design Engineer (Mechanical), CAE Engineer/Software Development Intern',
        ctc: '3.5–4 LPA',
        status: 'Hiring',
        academic_year: '2027',
        followup_month: '',
    },
    {
        company_name: 'InCoBAN',
        role: 'GET',
        ctc: '3 LPA',
        status: 'Hiring',
        academic_year: '2027',
        followup_month: '',
    },
    {
        company_name: 'Avinya Infinity Solutions Pvt Ltd',
        role: 'Electrical Technical Engineer',
        ctc: '3 LPA',
        status: 'Hiring',
        academic_year: '2027',
        followup_month: '',
    },
    {
        company_name: 'SPK Power Infra Pvt Ltd',
        role: 'Junior Engineer',
        ctc: '3 LPA',
        status: 'Hiring',
        academic_year: '2027',
        followup_month: '',
    },
    {
        company_name: 'Dongah Electric India Pvt Ltd',
        role: 'GET',
        ctc: '3 LPA',
        status: 'Hiring',
        academic_year: '2027',
        followup_month: '',
    },
    {
        company_name: 'GridSync Services Private Limited',
        role: 'Protection Engineer (EEE) & Automation Engineer (ECE) (Testing & Commissioning Engineer)',
        ctc: '3 LPA',
        status: 'Hiring',
        academic_year: '2027',
        followup_month: '',
    },
    {
        company_name: 'Espint',
        role: 'GET, NATS Trainee',
        ctc: '2.5 LPA',
        status: 'Hiring',
        academic_year: '2027',
        followup_month: '',
    },
    {
        company_name: 'Kyungshin Industrial Motherson (KIML)',
        role: 'GET',
        ctc: '2.5 LPA',
        status: 'Hiring',
        academic_year: '2027',
        followup_month: '',
    },
    {
        company_name: 'Cad Macro Design & Solutions Pvt. Ltd.',
        role: 'Software Engineer',
        ctc: '2.4 LPA',
        status: 'Hiring',
        academic_year: '2027',
        followup_month: '',
    },
];
async function seedActiveLeads2027() {
    try {
        await (0, database_1.connectDatabase)();
        const coordinator = await User_1.User.findOne({ official_email: 'megaladevi@infoziant.com' }) || await User_1.User.findOne({});
        const coordinatorId = coordinator?._id;
        console.log(`Clearing existing 2027 active leads to avoid duplicates...`);
        await ActiveLead_1.ActiveLead.deleteMany({ academic_year: '2027' });
        console.log(`Inserting ${LEADS_2027.length} active leads for 2027 batch...`);
        for (const item of LEADS_2027) {
            await ActiveLead_1.ActiveLead.create({
                ...item,
                coordinator_id: coordinatorId,
                is_deleted: false,
            });
            console.log(`  ✓ Added: ${item.company_name} | ${item.role} | ${item.ctc}`);
        }
        const total2027 = await ActiveLead_1.ActiveLead.countDocuments({ academic_year: '2027', is_deleted: false });
        console.log(`\n🎉 Success: ${total2027} Active Leads currently loaded for 2027 batch!`);
        await (0, database_1.disconnectDatabase)();
        process.exit(0);
    }
    catch (err) {
        console.error('Error seeding active leads:', err);
        process.exit(1);
    }
}
seedActiveLeads2027();
