"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const College_1 = require("../models/College");
const DailyLead_1 = require("../models/DailyLead");
const User_1 = require("../models/User");
const mongoose_1 = require("mongoose");
const OFFICIAL_COORDINATOR_COLLEGE_MAP = {
    'mohanaradha_a@infoziant.com': ['KARPAGAM', 'AIHT', 'ACET', 'KPR'],
    'sujitha_s@infoziant.com': ['NEHRU', 'SONA', 'MAREPHRA', 'KPR'],
    'thirisha_r@infoziant.com': ['PSNA', 'DSU', 'SMVEC'],
    'malavika_ramesh@infoziant.com': ['KLU', 'NGCE'],
    'lizenya_r@infoziant.com': ['NPR', 'KIOT', 'ACEW'],
    'megaladevi_ps@infoziant.com': ['NGP', 'KAMARAJ'],
    'seshmitha_tamil@icl.today': ['MCET', 'MEC'],
};
async function reconcileDailyLeads() {
    console.log('🔄 [Daily Leads Reconciliation] Starting coordinator verification for Positives and JD Received...\n');
    await (0, database_1.connectDatabase)();
    // 1. Fetch Colleges
    const allColleges = await College_1.College.find({});
    const collegeCodeMap = new Map();
    const collegeIdMap = new Map();
    for (const c of allColleges) {
        collegeCodeMap.set((c.college_code || '').toUpperCase(), c);
        collegeIdMap.set(String(c._id), c);
    }
    // 2. Fetch Users & build college -> coordinator map
    const allUsers = await User_1.User.find({ account_status: { $nin: ['inactive', 'deactivated', 'blocked'] } });
    const userByEmail = new Map();
    for (const u of allUsers) {
        userByEmail.set((u.official_email || '').toLowerCase(), u);
    }
    const collegeCoordinatorMap = new Map();
    // Primary: Official mapping
    for (const [email, codes] of Object.entries(OFFICIAL_COORDINATOR_COLLEGE_MAP)) {
        const user = userByEmail.get(email.toLowerCase());
        if (user) {
            for (const code of codes) {
                const col = collegeCodeMap.get(code.toUpperCase());
                if (col) {
                    // If already mapped, keep first or assign
                    if (!collegeCoordinatorMap.has(String(col._id))) {
                        collegeCoordinatorMap.set(String(col._id), user);
                    }
                }
            }
        }
    }
    // Secondary: From user.assigned_college_ids
    for (const u of allUsers) {
        if (Array.isArray(u.assigned_college_ids)) {
            for (const cid of u.assigned_college_ids) {
                const cStr = String(cid);
                if (!collegeCoordinatorMap.has(cStr) && !u.role_codes?.includes('ADMINISTRATOR') && !u.role_codes?.includes('ADMIN')) {
                    collegeCoordinatorMap.set(cStr, u);
                }
            }
        }
    }
    // Fallback: For any college still unassigned, assign to Team Lead / Coordinator or Placement Lead
    const fallbackUser = userByEmail.get('sujitha_s@infoziant.com') || allUsers[0];
    for (const c of allColleges) {
        if (!collegeCoordinatorMap.has(String(c._id))) {
            collegeCoordinatorMap.set(String(c._id), fallbackUser);
        }
    }
    console.log('📋 Institutional Coordinator Mapping:');
    for (const c of allColleges) {
        const coord = collegeCoordinatorMap.get(String(c._id));
        console.log(`  - [${c.college_code.padEnd(9)}] ${c.college_name.padEnd(45)} => ${coord ? coord.full_name : '⚠️ UNMAPPED'}`);
    }
    console.log('');
    // 3. Inspect and reconcile all DailyLeads
    const allLeads = await DailyLead_1.DailyLead.find({ is_deleted: false }).populate('coordinator_id', 'full_name official_email');
    console.log(`🔍 Found ${allLeads.length} total active daily leads in database.`);
    let updatedCount = 0;
    let alreadyCorrectCount = 0;
    const statsByCoord = {};
    for (const lead of allLeads) {
        const colId = String(lead.college_id);
        const assignedCoord = collegeCoordinatorMap.get(colId);
        if (!assignedCoord) {
            console.warn(`⚠️ Lead ID ${lead._id} for college ID ${colId} has no assigned coordinator.`);
            continue;
        }
        const currentCoordId = lead.coordinator_id && (typeof lead.coordinator_id === 'object' ? String(lead.coordinator_id._id) : String(lead.coordinator_id));
        const targetCoordId = String(assignedCoord._id);
        if (currentCoordId !== targetCoordId) {
            lead.coordinator_id = new mongoose_1.Types.ObjectId(targetCoordId);
            await lead.save();
            updatedCount++;
        }
        else {
            alreadyCorrectCount++;
        }
        const coordName = assignedCoord.full_name;
        if (!statsByCoord[coordName]) {
            statsByCoord[coordName] = { positives: 0, jds: 0 };
        }
        if (lead.lead_type === 'positive') {
            statsByCoord[coordName].positives++;
        }
        else {
            statsByCoord[coordName].jds++;
        }
    }
    console.log(`\n✅ [Reconciliation Complete]`);
    console.log(`  - Total Leads Analyzed: ${allLeads.length}`);
    console.log(`  - Updated / Reassigned: ${updatedCount}`);
    console.log(`  - Already Correct:      ${alreadyCorrectCount}\n`);
    console.log('📊 Verified Coordinator Breakdown in Daily Leads Module:');
    console.log('----------------------------------------------------------------------');
    console.log('| Coordinator Name               | Positive Leads | JD Received Records |');
    console.log('----------------------------------------------------------------------');
    for (const [name, stats] of Object.entries(statsByCoord)) {
        console.log(`| ${name.padEnd(30)} | ${String(stats.positives).padStart(14)} | ${String(stats.jds).padStart(19)} |`);
    }
    console.log('----------------------------------------------------------------------\n');
    await (0, database_1.disconnectDatabase)();
}
reconcileDailyLeads().catch((err) => {
    console.error('❌ Error reconciling daily leads:', err);
    process.exit(1);
});
