"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KLU_POSITIVES_DATA = void 0;
exports.seedKluCallPositives = seedKluCallPositives;
const mongoose_1 = require("mongoose");
const DailyLead_1 = require("../models/DailyLead");
const College_1 = require("../models/College");
const User_1 = require("../models/User");
const CompanyMetadata_1 = require("../models/CompanyMetadata");
exports.KLU_POSITIVES_DATA = [
    // 08/03/2026
    { date: '2026-08-03', time: '04:04 PM', company: 'Ramboll', role: 'Graduate Detailing Engineer', ctc: '4 - 6 LPA', batch: '2027' },
    { date: '2026-08-03', time: '04:23 PM', company: 'UBS Bglr', role: 'Financial Analyst, and Operations roles', ctc: '9.5 - 15.6 LPA', batch: '2027' },
    // 08/04/2026
    { date: '2026-08-04', time: '05:00 PM', company: 'Changepond', role: 'Software Developer, Software Tester, Programmer Analyst Trainee, and Engineer Trainee', ctc: '4 - 5 LPA', batch: '2027' },
    { date: '2026-08-04', time: '05:25 PM', company: 'iNube solutions', role: 'Software Engineer, Software Engineer, Associate Business Analyst', ctc: '6 - 7 LPA', batch: '2027' },
    // 08/05/2026
    { date: '2026-08-05', time: '12:20 PM', company: 'Perfint Healthcare Ltd', role: 'Junior Test Engineer, Software Engineer', ctc: '5.5 - 7.9 LPA', batch: '2027' },
    { date: '2026-08-05', time: '01:54 PM', company: 'bhive technologies', role: 'AI Coder', ctc: '5 - 6.5 LPA', batch: '2027' },
    { date: '2026-08-05', time: '04:22 PM', company: 'Gestamp', role: 'Production Engineer, Manufacturing Operator', ctc: '3.5 - 4.5 LPA', batch: '2027' },
    { date: '2026-08-05', time: '05:00 PM', company: 'Kriti labs', role: 'Production / Soldering / Assembly, Project / Field Engineer, Junior / Fresher Java Developer, Layout Design / Specialized Trainee', ctc: '4 - 4.5 LPA', batch: '2027' },
    // 08/06/2026
    { date: '2026-08-06', time: '01:30 PM', company: 'Visteon', role: 'Software Engineer', ctc: '6.5 - 7.5 LPA', batch: '2027' },
    { date: '2026-08-06', time: '03:17 PM', company: 'Quark Global', role: 'Associate Software Engineer, Business Development / Operations, Trainee roles', ctc: '5.5 - 7.7 LPA', batch: '2027' },
    // 08/07/2026
    { date: '2026-08-07', time: '04:48 PM', company: 'Hunger Box', role: 'Tech Roles', ctc: '6 - 7 LPA', batch: '2027' },
    // 08/10/2026
    { date: '2026-08-10', time: '11:50 AM', company: 'V max Health Tech', role: 'Multiple Roles', ctc: '4 - 5 LPA', batch: '2027' },
    { date: '2026-08-10', time: '01:11 PM', company: 'Fanucindia', role: 'GET', ctc: '5 LPA', batch: '2027' },
    { date: '2026-08-10', time: '03:45 PM', company: 'Voltech Events', role: 'Field Engineer (EEE)', ctc: '3-5 LPA', batch: '2027' },
    // 08/11/2026
    { date: '2026-08-11', time: '01:43 PM', company: 'Axxelent', role: 'Multiple Roles', ctc: '3 LPA', batch: '2027' },
    { date: '2026-08-11', time: '02:22 PM', company: 'ITSS Global', role: 'Junior Technical Consultant, Associate Technical Consultant, Software Developer / Junior Developer', ctc: '5 - 6 LPA', batch: '2027' },
    // 08/12/2026
    { date: '2026-08-12', time: '01:41 PM', company: 'ShareSoft Technology', role: 'Web Developer', ctc: '3.5 - 4.5 LPA', batch: '2027' },
    { date: '2026-08-12', time: '03:48 PM', company: 'Cashfree', role: 'Associate Software Engineer', ctc: '9.5 - 10 LPA', batch: '2027' },
    { date: '2026-08-12', time: '05:33 PM', company: 'MBit wireless', role: 'GET', ctc: '6 - 8 LPA', batch: '2027' },
    // 08/13/2026
    { date: '2026-08-13', time: '01:04 PM', company: 'Mitsogo - Hexnode', role: 'Associate Software Engineer', ctc: '4 - 6 LPA', batch: '2027' },
    { date: '2026-08-13', time: '01:25 PM', company: 'GE vernova', role: 'GET', ctc: '8 - 15 LPA', batch: '2027' },
    { date: '2026-08-13', time: '03:01 PM', company: 'Jayam Autos', role: 'Assistant Engineer', ctc: '3 - 4.5 LPA', batch: '2027' },
    { date: '2026-08-13', time: '03:38 PM', company: 'L&T Tech', role: 'GET', ctc: '4 - 6 LPA', batch: '2027' },
    { date: '2026-08-13', time: '04:25 PM', company: 'Optum', role: 'Software Engineer', ctc: '11 - 16 LPA', batch: '2027' },
    // 08/14/2026
    { date: '2026-08-14', time: '11:10 AM', company: 'Mercedes Benz', role: 'GET', ctc: '11 - 14 LPA', batch: '2027' },
    { date: '2026-08-14', time: '12:23 PM', company: 'Tiger Analytics', role: 'Associate Data Engineer', ctc: '6.5 - 7.5 LPA', batch: '2027' },
    { date: '2026-08-14', time: '01:45 PM', company: 'Blue yonder', role: 'Associate Software Engineer', ctc: '10 - 12 LPA', batch: '2027' },
    { date: '2026-08-14', time: '02:26 PM', company: 'Evobi', role: 'Android Developer', ctc: '6 -7 LPA', batch: '2027' },
    { date: '2026-08-14', time: '03:48 PM', company: 'DSRL', role: 'Design Engineer', ctc: '3 - 5 LPA', batch: '2027' },
    { date: '2026-08-14', time: '05:21 PM', company: 'Eco Saathi Green India Private', role: 'Quality Analyst', ctc: '3 - 5 LPA', batch: '2027' },
    // 08/17/2026
    { date: '2026-08-17', time: '03:46 PM', company: 'Run Loyal', role: 'Software Developer', ctc: '5 - 6.5 LPA', batch: '2027' },
    { date: '2026-08-17', time: '04:13 PM', company: 'Crawl Corp India', role: 'Flutter Developer', ctc: '4 LPA', batch: '2027' },
    { date: '2026-08-17', time: '04:58 PM', company: 'Modulus Housing', role: 'Structural Design Trainee', ctc: '4.5 LPA', batch: '2027' },
    // 08/19/2026
    { date: '2026-08-19', time: '12:15 PM', company: 'Flipr', role: 'Software Engineer', ctc: '4.5 LPA', batch: '2027' },
    { date: '2026-08-19', time: '01:16 PM', company: 'Planys', role: 'Multiple roles for Mech&ECE, SCM, Civil Engineering', ctc: '3.6 LPA', batch: '2027' },
    // 08/24/2026 (Today - exactly 2 positives)
    { date: '2026-08-24', time: '04:12 PM', company: 'Kyungshin Industrial Motherson(KIML)', role: 'GET', ctc: '3 - 4 LPA', batch: '2027' },
    { date: '2026-08-24', time: '05:00 PM', company: 'Lawlytics', role: 'Tech Support Roles', ctc: '13 - 15 LPA', batch: '2027' },
];
async function seedKluCallPositives() {
    try {
        // 1. Find or create KLU college
        let klu = await College_1.College.findOne({
            $or: [
                { college_code: 'KLU' },
                { college_name: { $regex: 'Kalasalingam|KLU', $options: 'i' } },
            ],
            is_deleted: { $ne: true },
        });
        if (!klu) {
            klu = await College_1.College.create({
                college_name: 'Kalasalingam Academy of Research and Education',
                college_code: 'KLU',
                location: 'Virudhunagar, Tamil Nadu',
                departments: ['CSE', 'IT', 'AI & DS', 'ECE', 'MECH'],
                is_deleted: false,
            });
        }
        // 2. Clear old positive leads for KLU to ensure exact match without duplicates
        await DailyLead_1.DailyLead.deleteMany({
            college_id: klu._id,
            lead_type: 'positive',
        });
        // 3. Find default coordinator
        const defaultCoordinator = (await User_1.User.findOne({ account_status: 'active', is_deleted: { $ne: true }, role_codes: 'PLACEMENT_COORDINATOR' })) ||
            (await User_1.User.findOne({ account_status: 'active', is_deleted: { $ne: true } })) ||
            (await User_1.User.findOne({ is_deleted: { $ne: true } })) ||
            (await User_1.User.findOne({}));
        const coordinatorId = defaultCoordinator ? defaultCoordinator._id : new mongoose_1.Types.ObjectId();
        // 4. Insert KLU positives
        let inserted = 0;
        for (const item of exports.KLU_POSITIVES_DATA) {
            const parts = item.date.split('-');
            const leadDate = new Date(Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 0, 0, 0, 0));
            let meta = await CompanyMetadata_1.CompanyMetadata.findOne({
                company_name: { $regex: `^${item.company.trim()}$`, $options: 'i' },
            });
            await DailyLead_1.DailyLead.create({
                lead_type: 'positive',
                college_id: klu._id,
                coordinator_id: coordinatorId,
                company_id: meta?._id || new mongoose_1.Types.ObjectId(),
                company_name: item.company.trim(),
                job_role: item.role.trim(),
                ctc: item.ctc.trim(),
                eligible_batch: item.batch.trim(),
                event_time: item.time.trim(),
                lead_date: leadDate,
                remarks: '',
                is_moved_to_jd: false,
                is_finalized: true,
                is_deleted: false,
            });
            inserted++;
        }
        console.log(`✅ [Seed KLU Positives] Successfully inserted ${inserted} positives specifically for KLU College.`);
    }
    catch (err) {
        console.error('❌ [Seed KLU Positives] Error seeding KLU positives:', err);
    }
}
