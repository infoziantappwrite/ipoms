"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const ActiveLead_1 = require("../models/ActiveLead");
const dns_1 = __importDefault(require("dns"));
dns_1.default.setServers(['8.8.8.8', '1.1.1.1']);
// Canonical key: remove legal suffixes, tech/solutions suffixes, punctuation, spaces
function cleanCanonicalName(name) {
    return name
        .toLowerCase()
        .replace(/\b(private\s+limited|pvt\.?\s*ltd\.?|private|limited|ltd\.?|inc\.?|llc|corp\.?|corporation)\b/gi, '')
        .replace(/\b(technologies|technology|tech|solutions|solution|services|service|india|global|software|infotech|systems)\b/gi, '')
        .replace(/[^a-z0-9]/g, '')
        .trim();
}
function normalizeRole(role) {
    return role
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .trim();
}
async function analyze() {
    await (0, database_1.connectDatabase)();
    const jdLeads = await ActiveLead_1.ActiveLead.find({ lead_type: 'jd_received', is_deleted: false }).lean();
    console.log(`Total JD Received Leads: ${jdLeads.length}\n`);
    const clusters = new Map();
    for (const lead of jdLeads) {
        const key = cleanCanonicalName(lead.company_name);
        if (!clusters.has(key))
            clusters.set(key, []);
        clusters.get(key).push(lead);
    }
    const multiEntryClusters = [];
    for (const [key, list] of clusters.entries()) {
        if (list.length > 1) {
            multiEntryClusters.push({
                canonicalKey: key,
                count: list.length,
                entries: list.map(l => ({
                    id: String(l._id),
                    company_name: l.company_name,
                    role: l.role,
                    ctc: l.ctc,
                    section: l.pipeline_section,
                    academic_year: l.academic_year,
                })),
            });
        }
    }
    console.log(`Found ${multiEntryClusters.length} clusters with multiple entries for the same company:\n`);
    for (const c of multiEntryClusters) {
        console.log(`=======================================================`);
        console.log(`🏢 Cluster: "${c.canonicalKey}" (${c.count} records)`);
        console.log(`=======================================================`);
        c.entries.forEach((e, idx) => {
            console.log(`  [${idx + 1}] ID: ${e.id}`);
            console.log(`      Company Name: "${e.company_name}"`);
            console.log(`      Role:         "${e.role}"`);
            console.log(`      CTC:          "${e.ctc}"`);
            console.log(`      Section:      "${e.section}"`);
        });
        console.log('');
    }
    await (0, database_1.disconnectDatabase)();
}
analyze().catch(console.error);
