"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const dns_1 = __importDefault(require("dns"));
dns_1.default.setServers(['8.8.8.8', '8.8.4.4']);
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ipoms_db';
async function run() {
    await mongoose_1.default.connect(MONGODB_URI);
    const db = mongoose_1.default.connection.db;
    // Fetch all colleges
    const colleges = await db.collection('colleges').find({}).toArray();
    const collegeMap = new Map();
    colleges.forEach((c) => {
        collegeMap.set(c._id.toString(), {
            name: c.college_name || c.name || 'Unknown',
            code: c.college_code || c.code || '',
        });
    });
    // Helper for company normalization
    const normalize = (name) => (name || '').trim().toLowerCase().replace(/\s+/g, ' ');
    console.log('=====================================================================');
    console.log('📊 ACCURATE AUDIT: DEDUPLICATED POSITIVES & JD RECEIVED PER COLLEGE');
    console.log('=====================================================================\n');
    // Fetch from daily_leads
    const dailyLeads = await db.collection('daily_leads').find({ is_deleted: { $ne: true } }).toArray();
    const positives = dailyLeads.filter((l) => l.lead_type === 'positive');
    const jdReceived = dailyLeads.filter((l) => l.lead_type === 'jd_received');
    console.log(`📌 Raw Records in daily_leads:`);
    console.log(`- Positives: ${positives.length}`);
    console.log(`- JD Received: ${jdReceived.length}`);
    console.log(`- Total: ${dailyLeads.length}\n`);
    // Overall unique Positives
    const overallUniquePositives = new Set();
    const positiveCompanyNames = new Map(); // normalized -> original
    positives.forEach((p) => {
        const raw = (p.company_name || '').trim();
        const n = normalize(raw);
        if (n) {
            overallUniquePositives.add(n);
            if (!positiveCompanyNames.has(n))
                positiveCompanyNames.set(n, raw);
        }
    });
    // Overall unique JD Received
    const overallUniqueJD = new Set();
    const jdCompanyNames = new Map(); // normalized -> original
    jdReceived.forEach((j) => {
        const raw = (j.company_name || '').trim();
        const n = normalize(raw);
        if (n) {
            overallUniqueJD.add(n);
            if (!jdCompanyNames.has(n))
                jdCompanyNames.set(n, raw);
        }
    });
    // Check overlap between Positives and JD Received
    const overlap = [...overallUniqueJD].filter((c) => overallUniquePositives.has(c));
    console.log(`=====================================================================`);
    console.log(`🌟 OVERALL UNIQUE TOTALS (ACROSS ALL COLLEGES):`);
    console.log(`- ⚡ Total Unique POSITIVE Companies:     ${overallUniquePositives.size}`);
    console.log(`- 🔥 Total Unique JD RECEIVED Companies:  ${overallUniqueJD.size}`);
    console.log(`- 🔄 Overlap (In both JD and Positives):  ${overlap.length} companies`);
    console.log(`- 🌟 Total Distinct Unique Companies:     ${new Set([...overallUniquePositives, ...overallUniqueJD]).size}`);
    console.log(`=====================================================================\n`);
    // Breakdown per college
    console.log(`🏫 BREAKDOWN BY COLLEGE (WITH EXACT COUNTS):`);
    console.log(`---------------------------------------------------------------------`);
    // Get distinct college_ids from daily_leads and also from colleges collection
    const collegeStats = [];
    for (const c of colleges) {
        const cid = c._id.toString();
        const cName = c.college_name || c.name;
        const cCode = c.college_code || c.code;
        // Filter leads for this college
        const colPos = positives.filter((p) => p.college_id && p.college_id.toString() === cid);
        const colJd = jdReceived.filter((j) => j.college_id && j.college_id.toString() === cid);
        const uPos = new Set(colPos.map((p) => normalize(p.company_name)).filter(Boolean));
        const uJd = new Set(colJd.map((j) => normalize(j.company_name)).filter(Boolean));
        if (colPos.length > 0 || colJd.length > 0) {
            collegeStats.push({
                id: cid,
                name: cName,
                code: cCode,
                rawPos: colPos.length,
                uniquePos: uPos.size,
                rawJd: colJd.length,
                uniqueJd: uJd.size,
                totalUnique: new Set([...uPos, ...uJd]).size,
            });
        }
    }
    // Sort by highest unique JD Received first, then unique Positives
    collegeStats.sort((a, b) => b.uniqueJd - a.uniqueJd || b.uniquePos - a.uniquePos);
    collegeStats.forEach((st, idx) => {
        console.log(`${idx + 1}. ${st.name} [${st.code || 'NO-CODE'}]`);
        console.log(`   🔥 JD Received: ${st.uniqueJd} unique companies (from ${st.rawJd} records)`);
        console.log(`   ⚡ Positives:   ${st.uniquePos} unique companies (from ${st.rawPos} records)`);
        console.log(`   📦 Combined Distinct: ${st.totalUnique} companies`);
        console.log(`---------------------------------------------------------------------`);
    });
    // Any unassigned / missing college_id?
    const unassignedPos = positives.filter((p) => !p.college_id);
    const unassignedJd = jdReceived.filter((j) => !j.college_id);
    if (unassignedPos.length > 0 || unassignedJd.length > 0) {
        const uUnPos = new Set(unassignedPos.map((p) => normalize(p.company_name)).filter(Boolean));
        const uUnJd = new Set(unassignedJd.map((j) => normalize(j.company_name)).filter(Boolean));
        console.log(`⚠️ Unassigned College (No college_id linked):`);
        console.log(`   🔥 JD Received: ${uUnJd.size} unique companies (${unassignedJd.length} raw)`);
        console.log(`   ⚡ Positives:   ${uUnPos.size} unique companies (${unassignedPos.length} raw)`);
        console.log(`---------------------------------------------------------------------`);
    }
    // Colleges with 0 leads
    const collegesWithLeads = new Set(collegeStats.map((s) => s.id));
    const zeroLeadsColleges = colleges.filter((c) => !collegesWithLeads.has(c._id.toString()));
    if (zeroLeadsColleges.length > 0) {
        console.log(`\nℹ️ Colleges with 0 Daily Leads recorded (${zeroLeadsColleges.length} colleges):`);
        console.log(zeroLeadsColleges.map((c) => c.college_name || c.name).join(', '));
    }
    await mongoose_1.default.disconnect();
}
run().catch((err) => {
    console.error(err);
    process.exit(1);
});
