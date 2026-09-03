"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rebuildActiveLeads = rebuildActiveLeads;
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const dns_1 = __importDefault(require("dns"));
dns_1.default.setServers(['8.8.8.8', '1.1.1.1']);
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
const ActiveLead_1 = require("../models/ActiveLead");
const DailyLead_1 = require("../models/DailyLead");
function normalizeCompanyName(name) {
    return name.trim().toLowerCase().replace(/\s+/g, ' ');
}
async function rebuildActiveLeads() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        throw new Error('MONGODB_URI is not defined in .env');
    }
    await mongoose_1.default.connect(uri);
    console.log('🔄 Rebuilding Active Leads from JD Received and Positives...');
    // 1. Fetch JD Received leads
    const jdLeads = await DailyLead_1.DailyLead.find({ lead_type: 'jd_received', is_deleted: false })
        .sort({ createdAt: -1 })
        .select('company_name job_role ctc eligible_batch college_id coordinator_id');
    // 2. Fetch Positive leads
    const posLeads = await DailyLead_1.DailyLead.find({ lead_type: 'positive', is_deleted: false })
        .sort({ createdAt: -1 })
        .select('company_name job_role ctc eligible_batch college_id coordinator_id');
    const companyMap = new Map();
    // A. Process JD Received FIRST
    let jdAdded = 0;
    let jdDupes = 0;
    for (const row of jdLeads) {
        const raw = (row.company_name || '').trim();
        if (!raw)
            continue;
        const key = normalizeCompanyName(raw);
        if (!companyMap.has(key)) {
            companyMap.set(key, {
                company_name: raw,
                role: (row.job_role || '').trim() || 'Graduate Trainee',
                ctc: (row.ctc || '').trim(),
                academic_year: (row.eligible_batch || '').trim() || '2027',
                source: 'jd_received',
                college_id: row.college_id,
                coordinator_id: row.coordinator_id,
            });
            jdAdded++;
        }
        else {
            jdDupes++;
        }
    }
    // B. Append Positives SECOND (skipping already present companies)
    let posAppended = 0;
    let posSkippedDupes = 0;
    for (const row of posLeads) {
        const raw = (row.company_name || '').trim();
        if (!raw)
            continue;
        const key = normalizeCompanyName(raw);
        if (!companyMap.has(key)) {
            companyMap.set(key, {
                company_name: raw,
                role: (row.job_role || '').trim() || 'Graduate Trainee',
                ctc: (row.ctc || '').trim(),
                academic_year: (row.eligible_batch || '').trim() || '2027',
                source: 'positive',
                college_id: row.college_id,
                coordinator_id: row.coordinator_id,
            });
            posAppended++;
        }
        else {
            posSkippedDupes++;
        }
    }
    console.log(`📊 Deduplication Results:`);
    console.log(`   - JD Received rows scanned: ${jdLeads.length} -> Unique added: ${jdAdded} (${jdDupes} intra-JD duplicates skipped)`);
    console.log(`   - Positives rows scanned: ${posLeads.length} -> Unique appended: ${posAppended} (${posSkippedDupes} duplicate/already-in-JD skipped)`);
    console.log(`   - Total unique companies to insert: ${companyMap.size}`);
    // 3. Clear existing Active Leads (190 records)
    const deletedResult = await ActiveLead_1.ActiveLead.deleteMany({});
    console.log(`🗑️ Deleted ${deletedResult.deletedCount} old ActiveLead records.`);
    // 4. Insert new deduplicated Active Leads
    const docsToInsert = Array.from(companyMap.values()).map((entry) => ({
        company_name: entry.company_name,
        role: entry.role,
        ctc: entry.ctc,
        status: 'Hiring',
        followup_month: '',
        academic_year: entry.academic_year.includes('202') ? entry.academic_year.split(',')[0].trim() : '2027',
        coordinator_id: entry.coordinator_id || null,
        college_id: entry.college_id || null,
        is_deleted: false,
    }));
    const inserted = await ActiveLead_1.ActiveLead.insertMany(docsToInsert);
    console.log(`✅ Successfully inserted ${inserted.length} unique companies into Active Leads Management.`);
    // 5. Final verification check for duplicate company names
    const allCurrent = await ActiveLead_1.ActiveLead.find({ is_deleted: false }).select('company_name');
    const seen = new Set();
    const duplicatesFound = [];
    for (const item of allCurrent) {
        const key = normalizeCompanyName(item.company_name);
        if (seen.has(key)) {
            duplicatesFound.push(item.company_name);
        }
        seen.add(key);
    }
    if (duplicatesFound.length === 0) {
        console.log(`✨ Zero duplicates confirmed! All ${allCurrent.length} active leads are unique.`);
    }
    else {
        console.warn(`⚠️ Warning: Found duplicates:`, duplicatesFound);
    }
    await mongoose_1.default.disconnect();
    return {
        deleted: deletedResult.deletedCount,
        inserted: inserted.length,
        duplicatesCount: duplicatesFound.length,
    };
}
if (require.main === module) {
    rebuildActiveLeads()
        .then((res) => {
        console.log('Result:', res);
        process.exit(0);
    })
        .catch((err) => {
        console.error(err);
        process.exit(1);
    });
}
