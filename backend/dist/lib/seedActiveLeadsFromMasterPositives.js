"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedActiveLeadsFromMasterPositives = seedActiveLeadsFromMasterPositives;
const mongoose_1 = require("mongoose");
const ActiveLead_1 = require("../models/ActiveLead");
const College_1 = require("../models/College");
const User_1 = require("../models/User");
const seedMasterDailyLeads_1 = require("./seedMasterDailyLeads");
/**
 * Seeds unique companies from the master call positives into Active Leads Management,
 * removing all old / stale active leads.
 */
async function seedActiveLeadsFromMasterPositives() {
    try {
        console.log('🌱 [Seed Active Leads] Removing older active leads and loading unique master positives...');
        // 1. Resolve default coordinator
        const defaultCoordinator = (await User_1.User.findOne({ account_status: 'active', is_deleted: { $ne: true }, role_codes: 'PLACEMENT_COORDINATOR' })) ||
            (await User_1.User.findOne({ account_status: 'active', is_deleted: { $ne: true } })) ||
            (await User_1.User.findOne({ is_deleted: { $ne: true } })) ||
            (await User_1.User.findOne({}));
        const coordinatorId = defaultCoordinator ? defaultCoordinator._id : new mongoose_1.Types.ObjectId();
        // 2. Resolve / Cache Colleges
        const collegeIdMap = new Map();
        for (const [code, meta] of Object.entries(seedMasterDailyLeads_1.COLLEGE_META_MAP)) {
            const college = await College_1.College.findOne({
                $or: [
                    { college_code: code },
                    { college_code: { $in: meta.aliases } },
                    { college_name: meta.name },
                ],
            });
            if (college) {
                collegeIdMap.set(code, college._id);
                for (const alias of meta.aliases) {
                    collegeIdMap.set(alias, college._id);
                }
            }
        }
        // 3. Clear ALL older active leads
        await ActiveLead_1.ActiveLead.deleteMany({});
        console.log('🗑️  Cleared all old Active Leads.');
        // 4. Deduplicate companies by normalized company name (Primary Key)
        const companyMap = new Map();
        for (const item of seedMasterDailyLeads_1.MASTER_POSITIVES_DATA) {
            const rawName = item.company.trim();
            if (!rawName)
                continue;
            // Key normalized by trimming and case-insensitivity
            const normalizedKey = rawName.toLowerCase();
            if (!companyMap.has(normalizedKey)) {
                companyMap.set(normalizedKey, {
                    company_name: rawName,
                    role: item.role.trim() || 'Graduate Trainee',
                    ctc: item.ctc.trim() || '',
                    collegeCode: item.collegeCode.trim(),
                    batch: item.batch.trim() || '2027',
                });
            }
            else {
                // If company already exists, prefer the richer role or higher/detailed composite CTC if available
                const existing = companyMap.get(normalizedKey);
                if (item.ctc && item.ctc.length > existing.ctc.length) {
                    existing.ctc = item.ctc.trim();
                }
                if (item.role && item.role.length > existing.role.length) {
                    existing.role = item.role.trim();
                }
            }
        }
        // 5. Build bulk insertion documents
        const activeLeadsToInsert = [];
        for (const [, entry] of companyMap.entries()) {
            const collegeId = collegeIdMap.get(entry.collegeCode.toUpperCase()) || null;
            activeLeadsToInsert.push({
                company_name: entry.company_name,
                role: entry.role,
                ctc: entry.ctc,
                status: 'Hiring',
                followup_month: '',
                academic_year: '2027',
                coordinator_id: coordinatorId,
                college_id: collegeId,
                is_deleted: false,
            });
        }
        if (activeLeadsToInsert.length > 0) {
            await ActiveLead_1.ActiveLead.insertMany(activeLeadsToInsert);
            console.log(`✅ [Seed Active Leads] Successfully loaded ${activeLeadsToInsert.length} unique active leads into Active Leads Management!`);
        }
        return { success: true, count: activeLeadsToInsert.length };
    }
    catch (error) {
        console.error('❌ [Seed Active Leads] Error:', error);
        throw error;
    }
}
if (require.main === module) {
    const { connectDatabase } = require('../config/database');
    connectDatabase().then(async () => {
        await seedActiveLeadsFromMasterPositives();
        process.exit(0);
    });
}
