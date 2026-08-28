"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const College_1 = require("../models/College");
const CompanyMetadata_1 = require("../models/CompanyMetadata");
const User_1 = require("../models/User");
const WeeklyTracker_1 = require("../models/WeeklyTracker");
async function updateAiht() {
    await (0, database_1.connectDatabase)();
    const college = await College_1.College.findOne({
        $or: [
            { college_code: 'AIHT' },
            { college_name: /Anand Institute of Higher Technology/i },
        ],
    });
    if (!college) {
        console.error('❌ AIHT college not found in database.');
        await (0, database_1.disconnectDatabase)();
        return;
    }
    console.log(`Found college: ${college.college_name} (${college.college_code}, ID: ${college._id})`);
    let coordinator = await User_1.User.findOne({
        $or: [{ username: 'megaladevi' }, { role_codes: 'PLACEMENT_COORDINATOR' }],
    });
    if (!coordinator)
        coordinator = await User_1.User.findOne();
    // Remove existing AIHT 2026 weekly tracker rows to cleanly place the user's updated rows
    await WeeklyTracker_1.WeeklyTracker.deleteMany({
        college_id: college._id,
        academic_year: 2026,
    });
    const inProgressList = [
        {
            company_name: 'Fristine Infotech Pvt. Ltd.',
            job_role: 'Zoho Developer , Buisness Analsyt , Data Engineer',
            ctc_lpa: '3-5 LPA',
            status: 'HR requested a date to conduct Pre-Placement talk , awaiting date from TPO',
        },
        {
            company_name: 'Crawl Corp India',
            job_role: 'Software Associate Trainee',
            ctc_lpa: '8-12k / month',
            status: 'Drive will be scheduled by the third week of September',
        },
        {
            company_name: 'AquaAirX',
            job_role: 'Sourcing & Procurement',
            ctc_lpa: '10k/month',
            status: 'Student DB yet to share',
        },
        {
            company_name: 'Dronix Technologies Private Limited',
            job_role: 'Design Engineers , System Engineer',
            ctc_lpa: '15k/month',
            status: 'Awaiting TPO approval to proceed with this company',
        },
    ];
    const pipelineList = [
        {
            company_name: 'Modulus Housing',
            job_role: 'Architect Engineer',
            ctc_lpa: '3 LPA',
            status: 'Invite mail shared with HR',
            follow_up_date: '2026-08-28',
        },
        {
            company_name: 'Agnitech Forge Pvt. Lmt.',
            job_role: 'CNC Machine Operator, Electrical Enginer',
            ctc_lpa: '2.8-3.5 LPA',
            status: 'Invite mail shared with HR',
            follow_up_date: '2026-08-28',
        },
        {
            company_name: 'AgentAnalytics.AI',
            job_role: 'Agentic AI engineer',
            ctc_lpa: '5-8 LPA',
            status: 'Invite mail shared with HR',
            follow_up_date: '2026-08-28',
        },
        {
            company_name: 'LLM APPLIANCES PRIVATE LIMITED',
            job_role: 'Production Trainerr (Mech)',
            ctc_lpa: '3.12 LPA',
            status: 'Invite mail shared with HR , expecting 2 positions from Mechanical Male candidates',
            follow_up_date: '2026-08-28',
        },
        {
            company_name: 'RunLoyal',
            job_role: 'Web Developer',
            ctc_lpa: '3 - 4 LPA',
            status: 'Invite mail shared with HR',
            follow_up_date: '2026-08-28',
        },
        {
            company_name: 'Merlin Automation',
            job_role: 'Engineer Intern( MECH , EEE, ECE)',
            ctc_lpa: '3 LPA',
            status: 'Invite mail shared with HR and they requested for students count from the respective department',
            follow_up_date: '2026-08-28',
        },
    ];
    for (const item of inProgressList) {
        let compMeta = await CompanyMetadata_1.CompanyMetadata.findOne({
            company_name: new RegExp(`^${item.company_name.trim()}$`, 'i'),
        });
        if (!compMeta) {
            compMeta = await CompanyMetadata_1.CompanyMetadata.create({
                company_name: item.company_name.trim(),
                company_type: 'software',
                industry_sector: 'Information Technology',
            });
        }
        await WeeklyTracker_1.WeeklyTracker.create({
            academic_year: 2026,
            college_id: college._id,
            coordinator_id: coordinator?._id,
            company_id: compMeta._id,
            company_name: item.company_name.trim(),
            job_role: item.job_role.trim(),
            ctc_lpa: item.ctc_lpa.trim(),
            eligible_batch: '2026 Batch',
            pipeline_section: 'in_progress',
            is_pinned_top: false,
            current_status_text: item.status.trim(),
            selected_count: 0,
            registered_count: 0,
            shortlisted_count: 0,
            is_deleted: false,
        });
    }
    for (const item of pipelineList) {
        let compMeta = await CompanyMetadata_1.CompanyMetadata.findOne({
            company_name: new RegExp(`^${item.company_name.trim()}$`, 'i'),
        });
        if (!compMeta) {
            compMeta = await CompanyMetadata_1.CompanyMetadata.create({
                company_name: item.company_name.trim(),
                company_type: 'software',
                industry_sector: 'Information Technology',
            });
        }
        await WeeklyTracker_1.WeeklyTracker.create({
            academic_year: 2026,
            college_id: college._id,
            coordinator_id: coordinator?._id,
            company_id: compMeta._id,
            company_name: item.company_name.trim(),
            job_role: item.job_role.trim(),
            ctc_lpa: item.ctc_lpa.trim(),
            eligible_batch: '2026 Batch',
            pipeline_section: 'pipeline',
            is_pinned_top: false,
            current_status_text: item.status.trim(),
            follow_up_date: item.follow_up_date,
            selected_count: 0,
            registered_count: 0,
            shortlisted_count: 0,
            is_deleted: false,
        });
    }
    console.log(`✅ Successfully updated AIHT Weekly Tracker with ${inProgressList.length} In-Progress and ${pipelineList.length} Pipeline rows.`);
    await (0, database_1.disconnectDatabase)();
}
updateAiht().catch(console.error);
