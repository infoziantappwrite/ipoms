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
    const normalize = (name) => (name || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const dailyLeads = await db.collection('daily_leads').find({ is_deleted: { $ne: true } }).toArray();
    const jdLeads = dailyLeads.filter((l) => l.lead_type === 'jd_received');
    const posLeads = dailyLeads.filter((l) => l.lead_type === 'positive');
    // Map of JD companies
    const jdCompanyMap = new Map();
    jdLeads.forEach((j) => {
        const raw = (j.company_name || '').trim();
        const key = normalize(raw);
        if (!key)
            return;
        if (!jdCompanyMap.has(key)) {
            jdCompanyMap.set(key, {
                rawName: raw,
                role: (j.job_role || '').trim() || 'Graduate Trainee',
                ctc: (j.ctc || '').trim() || 'Competitive',
                count: 1,
            });
        }
        else {
            jdCompanyMap.get(key).count++;
        }
    });
    // Map of Positive companies
    const posCompanyMap = new Map();
    posLeads.forEach((p) => {
        const raw = (p.company_name || '').trim();
        const key = normalize(raw);
        if (!key)
            return;
        if (!posCompanyMap.has(key)) {
            posCompanyMap.set(key, {
                rawName: raw,
                role: (p.job_role || '').trim() || 'Graduate Trainee',
                ctc: (p.ctc || '').trim() || 'Competitive',
                count: 1,
            });
        }
        else {
            posCompanyMap.get(key).count++;
        }
    });
    // Overlap: companies present in both JD Received AND Positive Leads
    const overlappingKeys = [...jdCompanyMap.keys()].filter((k) => posCompanyMap.has(k));
    // Net Positives: Positives minus any company present in JD Received
    const netPositiveKeys = [...posCompanyMap.keys()].filter((k) => !jdCompanyMap.has(k));
    console.log('========================================================================');
    console.log('🎯 EXACT AUDIT & MATHEMATICAL DE-DUPLICATION (JD PRIORITY RULE)');
    console.log('========================================================================\n');
    console.log(`1. Total Unique JD Received Companies (Top Hot Leads): ${jdCompanyMap.size}`);
    console.log(`2. Total Unique Positive Companies (Gross):           ${posCompanyMap.size}`);
    console.log(`3. Companies present in BOTH JD Received & Positives: ${overlappingKeys.length}`);
    console.log(`4. Net Unique Positive Companies (After MINUSING JDs): ${netPositiveKeys.length}`);
    console.log(`------------------------------------------------------------------------`);
    console.log(`🏆 TOTAL UNIQUE COMPANIES (38 JD Received + 176 Net Positives) = ${jdCompanyMap.size + netPositiveKeys.length}`);
    console.log('========================================================================\n');
    console.log(`🔥 THE 19 OVERLAPPING COMPANIES (Promoted to JD Received, removed from Positives):`);
    overlappingKeys.sort().forEach((k, i) => {
        const jdInfo = jdCompanyMap.get(k);
        const posInfo = posCompanyMap.get(k);
        console.log(`   ${i + 1}. ${jdInfo.rawName} (Appears in JD: ${jdInfo.count}x, in Positives: ${posInfo.count}x)`);
    });
    console.log(`\n🔥 ALL 38 JD RECEIVED COMPANIES (The Final Hot Leads):`);
    const sortedJDs = [...jdCompanyMap.values()].sort((a, b) => a.rawName.localeCompare(b.rawName));
    sortedJDs.forEach((j, i) => {
        console.log(`   ${i + 1}. ${j.rawName} | Role: ${j.role} | CTC: ${j.ctc}`);
    });
    // Check existing ActiveLead collection
    const currentActiveLeads = await db.collection('activeleads').find({ is_deleted: { $ne: true } }).toArray();
    const alMap = new Set(currentActiveLeads.map(a => normalize(a.company_name)));
    const jdInAl = [...jdCompanyMap.keys()].filter(k => alMap.has(k)).length;
    const posInAl = netPositiveKeys.filter(k => alMap.has(k)).length;
    console.log(`\n------------------------------------------------------------------------`);
    console.log(`📋 ActiveLead Collection currently has: ${currentActiveLeads.length} records`);
    console.log(`   - JD Received companies present in ActiveLeads: ${jdInAl} / 38`);
    console.log(`   - Net Positive companies present in ActiveLeads: ${posInAl} / 176`);
    console.log(`   - Total from this 214 roster present in ActiveLeads: ${jdInAl + posInAl} / 214`);
    console.log(`------------------------------------------------------------------------`);
    await mongoose_1.default.disconnect();
}
run().catch(console.error);
