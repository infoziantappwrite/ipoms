"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const ActiveLead_1 = require("../models/ActiveLead");
const dns_1 = __importDefault(require("dns"));
dns_1.default.setServers(['8.8.8.8', '1.1.1.1']);
async function deduplicateJdReceived() {
    await (0, database_1.connectDatabase)();
    console.log('🔄 Executing Smart Deduplication on Active Leads JD Received section...');
    const initialCount = await ActiveLead_1.ActiveLead.countDocuments({ lead_type: 'jd_received', is_deleted: false });
    console.log(`Initial JD Received Leads: ${initialCount}`);
    // 1. ELEATION CAE Service (Pvt Ltd vs Pvt. Ltd. - exact same role)
    // Keep: ELEATION CAE Service Pvt Ltd
    await ActiveLead_1.ActiveLead.deleteMany({
        lead_type: 'jd_received',
        company_name: 'ELEATION CAE Service Pvt. Ltd',
    });
    await ActiveLead_1.ActiveLead.updateMany({ lead_type: 'jd_received', company_name: 'ELEATION CAE Service Pvt Ltd' }, { $set: { company_name: 'ELEATION CAE Service Pvt Ltd', role: 'CAE Project Engineer', ctc: '9.6 LPA' } });
    // 2. Fristine Infotech (3 duplicates for Zoho Developer/Business Analyst/Data Engineer)
    // Delete the 2 duplicates with incomplete/redundant info
    await ActiveLead_1.ActiveLead.deleteMany({
        lead_type: 'jd_received',
        company_name: { $in: ['Fristine Infotech Private Limited', 'Fristine Infotech Pvt. Ltd.'] },
    });
    await ActiveLead_1.ActiveLead.updateMany({ lead_type: 'jd_received', company_name: 'Fristine Infotech Pvt Ltd' }, { $set: { company_name: 'Fristine Infotech Pvt Ltd', role: 'Zoho Developer / Business Analyst / Data Engineer', ctc: '3 - 6 LPA' } });
    // 3. AgentAnalytics AI (AgentAnalytics.AI vs AgentAnalytics AI - exact same role)
    // Delete dot duplicate, update clean name with complete CTC
    await ActiveLead_1.ActiveLead.deleteMany({
        lead_type: 'jd_received',
        company_name: 'AgentAnalytics.AI',
    });
    await ActiveLead_1.ActiveLead.updateMany({ lead_type: 'jd_received', company_name: 'AgentAnalytics AI' }, { $set: { company_name: 'AgentAnalytics AI', role: 'Full Stack Developer Intern', ctc: '15 - 20k / Month, 6 - 7 LPA' } });
    // 4. BIBUS India (BIBUS INDIA PVT LTD vs BIBUS India Private Limited - same role)
    await ActiveLead_1.ActiveLead.deleteMany({
        lead_type: 'jd_received',
        company_name: 'BIBUS INDIA PVT LTD',
    });
    await ActiveLead_1.ActiveLead.updateMany({ lead_type: 'jd_received', company_name: 'BIBUS India Private Limited' }, { $set: { company_name: 'BIBUS India Pvt Ltd', role: 'Design Engineer, Internal Coordinator', ctc: '4 LPA' } });
    // 5. Loyal Wingman (Loyal Wingman Technologies Pvt. Ltd. vs Loyal Wingman - same role)
    await ActiveLead_1.ActiveLead.deleteMany({
        lead_type: 'jd_received',
        company_name: 'Loyal Wingman Technologies Pvt. Ltd.',
    });
    await ActiveLead_1.ActiveLead.updateMany({ lead_type: 'jd_received', company_name: 'Loyal Wingman' }, { $set: { company_name: 'Loyal Wingman Technologies', role: 'Graduate Engineer Trainee', ctc: '3 LPA' } });
    // 6. Brakes India (Brakes India Pvt Ltd vs Brakes India - same role)
    await ActiveLead_1.ActiveLead.deleteMany({
        lead_type: 'jd_received',
        company_name: 'Brakes India Pvt Ltd',
    });
    await ActiveLead_1.ActiveLead.updateMany({ lead_type: 'jd_received', company_name: 'Brakes India' }, { $set: { company_name: 'Brakes India', role: 'Graduate Engineer Trainee', ctc: '15k / Month - Intern, 3.80 - 5.82 LPA' } });
    // 7. ResNet Solutions (3 records: merge the 2 duplicate ML Developer/SDE into one)
    await ActiveLead_1.ActiveLead.deleteMany({
        lead_type: 'jd_received',
        company_name: { $in: ['Resnet Solutions', 'ResNet Solution'] },
    });
    await ActiveLead_1.ActiveLead.updateMany({ lead_type: 'jd_received', company_name: 'Resnet Solutions Pvt Ltd' }, { $set: { company_name: 'ResNet Solutions Pvt Ltd', role: 'ML Developer, SDE', ctc: '8 - 12 LPA' } });
    // 8. ZeAI Soft (3 records: 2 are same AI/ML role, 1 is distinct IT intern role)
    // Delete the redundant AI/ML duplicate 'ZeAI-Soft'
    await ActiveLead_1.ActiveLead.deleteMany({
        lead_type: 'jd_received',
        company_name: 'ZeAI Soft Pvt Ltd',
    });
    // Maintain distinct role 1: AI/ML Developer
    await ActiveLead_1.ActiveLead.updateMany({ lead_type: 'jd_received', company_name: 'ZeAI Soft' }, { $set: { company_name: 'ZeAI Soft', role: 'AI/ML/Web Application Developer', ctc: '5 - 8 LPA' } });
    // Maintain distinct role 2: IT Intern Role under standardized company name
    await ActiveLead_1.ActiveLead.updateMany({ lead_type: 'jd_received', company_name: 'ZeAI-Soft' }, { $set: { company_name: 'ZeAI Soft', role: 'IT Intern Roles', ctc: '4 - 6 LPA' } });
    // 9. Kriti Labs (2 distinct roles: Mechanical Engineering Intern vs Engineer Intern All Departments)
    // Standardize both company names to 'Kriti Labs' and preserve both distinct roles!
    await ActiveLead_1.ActiveLead.updateMany({ lead_type: 'jd_received', company_name: 'Kritilabs' }, { $set: { company_name: 'Kriti Labs', role: 'Mechanical Engineering - Intern', ctc: '12k / Month, 3 - 4 LPA' } });
    await ActiveLead_1.ActiveLead.updateMany({ lead_type: 'jd_received', company_name: 'Kriti Labs', role: { $regex: /All departments/i } }, { $set: { company_name: 'Kriti Labs', role: 'Engineer Intern (All Departments)', ctc: '12k / Month, 3 - 4 LPA' } });
    // 10. VMax Health Tech (2 distinct roles: Multiple Roles vs Full Stack Developer)
    // Standardize both company names to 'VMax Health Tech' and preserve both distinct roles!
    await ActiveLead_1.ActiveLead.updateMany({ lead_type: 'jd_received', company_name: 'V max Health Tech' }, { $set: { company_name: 'VMax Health Tech', role: 'Multiple Roles', ctc: '3 LPA' } });
    await ActiveLead_1.ActiveLead.updateMany({ lead_type: 'jd_received', company_name: 'VMax Health Tech', role: { $regex: /Full Stack/i } }, { $set: { company_name: 'VMax Health Tech', role: 'Full Stack Developer (Node.js & React.js)', ctc: '2.16 LPA' } });
    // 11. Crawl Corp India (2 distinct roles: Software Developer vs Associate Trainee)
    // Standardize both company names to 'Crawl Corp India' and preserve both distinct roles!
    await ActiveLead_1.ActiveLead.updateMany({ lead_type: 'jd_received', company_name: 'Crawl Corp India Pvt Ltd' }, { $set: { company_name: 'Crawl Corp India', role: 'Associate Trainee', ctc: '8 - 12k / Month, 3 - 4.5 LPA' } });
    await ActiveLead_1.ActiveLead.updateMany({ lead_type: 'jd_received', company_name: 'Crawl Corp India', role: { $regex: /Software/i } }, { $set: { company_name: 'Crawl Corp India', role: 'Software Developer', ctc: '3 - 5 LPA' } });
    // 12. VLSI Technologies (3 records: merge the duplicate 4-5 LPA records, keep distinct 5-30 LPA track)
    await ActiveLead_1.ActiveLead.deleteMany({
        lead_type: 'jd_received',
        company_name: 'VLSI Technology',
    });
    await ActiveLead_1.ActiveLead.updateMany({ lead_type: 'jd_received', company_name: 'VLSI Technologies' }, { $set: { company_name: 'VLSI Technologies', role: 'Multiple Roles', ctc: '4 - 5 LPA' } });
    await ActiveLead_1.ActiveLead.updateMany({ lead_type: 'jd_received', company_name: 'VLSI India' }, { $set: { company_name: 'VLSI Technologies', role: 'Multiple Roles (High CTC Track)', ctc: '5 - 30 LPA' } });
    const finalCount = await ActiveLead_1.ActiveLead.countDocuments({ lead_type: 'jd_received', is_deleted: false });
    const finalPipelineCount = await ActiveLead_1.ActiveLead.countDocuments({ lead_type: 'pipeline', is_deleted: false });
    const finalTotal = await ActiveLead_1.ActiveLead.countDocuments({ is_deleted: false });
    console.log(`\n🎉 DEDUPLICATION COMPLETE!`);
    console.log(`- Previous JD Received Leads: ${initialCount}`);
    console.log(`- Final JD Received Leads:    ${finalCount} (Removed ${initialCount - finalCount} redundant duplicates)`);
    console.log(`- Distinct Multi-Role Entries Preserved: Kriti Labs (2), VMax Health Tech (2), Crawl Corp India (2), ZeAI Soft (2), VLSI Technologies (2)`);
    console.log(`- Total Active Leads in DB:   ${finalTotal} (${finalPipelineCount} in Pipeline, ${finalCount} in JD Received)`);
    await (0, database_1.disconnectDatabase)();
}
deduplicateJdReceived().catch(console.error);
