"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const ActiveLead_1 = require("../models/ActiveLead");
const WeeklyTracker_1 = require("../models/WeeklyTracker");
const College_1 = require("../models/College");
const dns_1 = __importDefault(require("dns"));
dns_1.default.setServers(['8.8.8.8', '1.1.1.1']);
// Levenshtein distance for fuzzy matching
function levenshtein(a, b) {
    const an = a ? a.length : 0;
    const bn = b ? b.length : 0;
    if (an === 0)
        return bn;
    if (bn === 0)
        return an;
    const matrix = Array.from({ length: bn + 1 }, () => new Array(an + 1).fill(0));
    for (let i = 0; i <= an; i++)
        matrix[0][i] = i;
    for (let j = 0; j <= bn; j++)
        matrix[j][0] = j;
    for (let j = 1; j <= bn; j++) {
        for (let i = 1; i <= an; i++) {
            if (a[i - 1] === b[j - 1]) {
                matrix[j][i] = matrix[j - 1][i - 1];
            }
            else {
                matrix[j][i] = Math.min(matrix[j - 1][i - 1] + 1, // substitution
                matrix[j][i - 1] + 1, // insertion
                matrix[j - 1][i] + 1 // deletion
                );
            }
        }
    }
    return matrix[bn][an];
}
function stringSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    const longerLength = longer.length;
    if (longerLength === 0)
        return 1.0;
    return (longerLength - levenshtein(longer, shorter)) / longerLength;
}
// Deep clean company name for canonical clustering
function cleanCanonicalName(name) {
    return name
        .toLowerCase()
        .replace(/\b(private\s+limited|pvt\.?\s*ltd\.?|private|limited|ltd\.?|inc\.?|llc|corp\.?|corporation)\b/gi, '')
        .replace(/\b(technologies|technology|tech|solutions|solution|services|service|india|global|software|infotech|systems)\b/gi, '')
        .replace(/[^a-z0-9]/g, '')
        .trim();
}
// Basic normalized name (casing, extra spaces, punctuation stripped)
function basicNormalize(name) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}
async function runAudit() {
    await (0, database_1.connectDatabase)();
    const colleges = await College_1.College.find({ is_deleted: { $ne: true } }).lean();
    const collegeMap = new Map();
    for (const c of colleges) {
        collegeMap.set(String(c._id), c.college_name || c.college_code);
    }
    console.log('\n===============================================================');
    console.log('🔍 DEEP DUPLICATION AUDIT: JD RECEIVED (ACTIVE LEADS & TRACKER)');
    console.log('===============================================================\n');
    // 1. Audit Active Leads JD Received Tab
    const activeJdLeads = await ActiveLead_1.ActiveLead.find({ lead_type: 'jd_received', is_deleted: false }).lean();
    console.log(`📌 TOTAL ACTIVE LEADS IN 'JD THIS YEAR' TAB: ${activeJdLeads.length}\n`);
    // Cluster by basic normalized key
    const basicClusters = new Map();
    for (const lead of activeJdLeads) {
        const key = basicNormalize(lead.company_name);
        if (!basicClusters.has(key))
            basicClusters.set(key, []);
        basicClusters.get(key).push(lead);
    }
    const basicDuplicates = [];
    for (const [key, list] of basicClusters.entries()) {
        if (list.length > 1) {
            basicDuplicates.push({
                key,
                count: list.length,
                names: list.map(l => ({ name: l.company_name, section: l.pipeline_section, role: l.role, ctc: l.ctc })),
            });
        }
    }
    console.log('─── A. CASE & PUNCTUATION/SPACING DUPLICATES IN ACTIVE LEADS (JD RECEIVED) ───');
    if (basicDuplicates.length === 0) {
        console.log('✅ ZERO direct case/punctuation duplicates found inside the Active Leads JD tab.');
    }
    else {
        console.log(`⚠️ Found ${basicDuplicates.length} clusters with exact normalized duplicates:`);
        console.dir(basicDuplicates, { depth: null });
    }
    // Cluster by canonical name (stripping Pvt Ltd, Technologies, Inc, etc.)
    const canonicalClusters = new Map();
    for (const lead of activeJdLeads) {
        const key = cleanCanonicalName(lead.company_name);
        if (!key)
            continue;
        if (!canonicalClusters.has(key))
            canonicalClusters.set(key, []);
        canonicalClusters.get(key).push(lead);
    }
    const suffixDuplicates = [];
    for (const [key, list] of canonicalClusters.entries()) {
        if (list.length > 1) {
            // Check if actual names differ
            const uniqueRaw = new Set(list.map(l => l.company_name.trim().toLowerCase()));
            if (uniqueRaw.size > 1) {
                suffixDuplicates.push({
                    canonicalKey: key,
                    companies: list.map(l => ({
                        id: String(l._id),
                        raw_name: l.company_name,
                        section: l.pipeline_section,
                        role: l.role,
                        ctc: l.ctc,
                    })),
                });
            }
        }
    }
    console.log('\n─── B. SUFFIX / LEGAL ENTITY / VARIATION DUPLICATES (e.g. Pvt Ltd vs Technologies) ───');
    if (suffixDuplicates.length === 0) {
        console.log('✅ No legal suffix / naming variation duplicates detected in Active Leads JD tab.');
    }
    else {
        console.log(`⚠️ Found ${suffixDuplicates.length} potential suffix/entity variations in Active Leads JD tab:`);
        console.dir(suffixDuplicates, { depth: null });
    }
    // Fuzzy matching across all active JD leads
    const fuzzyPairs = [];
    for (let i = 0; i < activeJdLeads.length; i++) {
        for (let j = i + 1; j < activeJdLeads.length; j++) {
            const name1 = activeJdLeads[i].company_name.trim();
            const name2 = activeJdLeads[j].company_name.trim();
            const sim = stringSimilarity(name1.toLowerCase(), name2.toLowerCase());
            if (sim >= 0.78 && sim < 1.0) {
                fuzzyPairs.push({
                    company1: { name: name1, section: activeJdLeads[i].pipeline_section, role: activeJdLeads[i].role },
                    company2: { name: name2, section: activeJdLeads[j].pipeline_section, role: activeJdLeads[j].role },
                    similarity: `${Math.round(sim * 100)}%`,
                });
            }
        }
    }
    console.log('\n─── C. FUZZY / SPELLING / TYPO NEAR-DUPLICATES IN ACTIVE LEADS (JD RECEIVED) ───');
    if (fuzzyPairs.length === 0) {
        console.log('✅ No typo/spelling near-duplicates found in Active Leads JD tab.');
    }
    else {
        console.log(`⚠️ Found ${fuzzyPairs.length} near-duplicate pairs in Active Leads JD tab:`);
        console.dir(fuzzyPairs, { depth: null });
    }
    // 2. Audit RAW Weekly Tracker JD Sections across ALL Colleges
    console.log('\n===============================================================');
    console.log('📊 RAW WEEKLY TRACKER JD SECTIONS (151 ROWS ACROSS 25 COLLEGES)');
    console.log('===============================================================\n');
    const allWeekly = await WeeklyTracker_1.WeeklyTracker.find({ is_deleted: { $ne: true } }).lean();
    const weeklyJd = allWeekly.filter(w => ['in_progress', 'companies_in_drive', 'in_drive', 'upcoming_drives', 'drive_in_progress', 'completed'].includes((w.pipeline_section || '').toLowerCase()));
    console.log(`📌 Total JD rows in Weekly Tracker: ${weeklyJd.length}`);
    // Multi-college occurrences in Weekly Tracker
    const weeklyCompanyOccurrences = new Map();
    for (const w of weeklyJd) {
        const key = basicNormalize(w.company_name);
        const colName = collegeMap.get(String(w.college_id)) || 'Unknown College';
        if (!weeklyCompanyOccurrences.has(key))
            weeklyCompanyOccurrences.set(key, []);
        weeklyCompanyOccurrences.get(key).push({
            college: colName,
            section: w.pipeline_section,
            rawName: w.company_name,
            role: w.job_role || '',
            ctc: w.ctc_lpa || '',
        });
    }
    const multiCollegeJdCompanies = [];
    const spellingVariationsInTracker = [];
    for (const [key, list] of weeklyCompanyOccurrences.entries()) {
        if (list.length > 1) {
            const rawNames = Array.from(new Set(list.map(x => x.rawName)));
            multiCollegeJdCompanies.push({
                normalized_name: key,
                raw_spellings_used: rawNames,
                total_colleges: list.length,
                breakdown: list,
            });
            if (rawNames.length > 1) {
                spellingVariationsInTracker.push({
                    normalized_name: key,
                    different_spellings: rawNames,
                    colleges: list.map(x => `${x.college} (${x.rawName})`),
                });
            }
        }
    }
    console.log(`\n─── D. JD COMPANIES APPEARING IN MULTIPLE COLLEGES (${multiCollegeJdCompanies.length} companies) ───`);
    console.log(`These companies are in progress / completed for multiple partner colleges:`);
    for (const item of multiCollegeJdCompanies) {
        console.log(`\n🏢 ${item.raw_spellings_used.join(' / ')} (${item.total_colleges} colleges):`);
        for (const b of item.breakdown) {
            console.log(`   ├─ ${b.college} [${b.section.toUpperCase()}] Role: ${b.role || 'N/A'}, CTC: ${b.ctc || 'N/A'}`);
        }
    }
    console.log('\n─── E. SPELLING / CASING / SUFFIX DIFFERENCES ACROSS COLLEGES IN TRACKER ───');
    if (spellingVariationsInTracker.length === 0) {
        console.log('✅ All colleges used identical spellings.');
    }
    else {
        console.log(`⚠️ Found ${spellingVariationsInTracker.length} companies spelled differently across colleges:`);
        console.dir(spellingVariationsInTracker, { depth: null });
    }
    // Cross-Tab Check: Are any JD companies ALSO in Pipeline in Active Leads?
    const allActiveLeads = await ActiveLead_1.ActiveLead.find({ is_deleted: false }).lean();
    const pipelineNames = new Map();
    for (const p of allActiveLeads.filter(l => l.lead_type === 'pipeline')) {
        pipelineNames.set(basicNormalize(p.company_name), p);
    }
    const crossTabConflicts = [];
    for (const jd of activeJdLeads) {
        const key = basicNormalize(jd.company_name);
        if (pipelineNames.has(key)) {
            crossTabConflicts.push({
                jdCompany: { name: jd.company_name, section: jd.pipeline_section },
                pipelineCompany: { name: pipelineNames.get(key).company_name, ctc: pipelineNames.get(key).ctc },
            });
        }
    }
    console.log('\n─── F. CROSS-TAB CONFLICTS (COMPANY IN BOTH PIPELINE AND JD RECEIVED) ───');
    if (crossTabConflicts.length === 0) {
        console.log('✅ ZERO cross-tab conflicts! No company is duplicated between Pipeline and JD this year tabs.');
    }
    else {
        console.log(`⚠️ Found ${crossTabConflicts.length} cross-tab conflicts:`);
        console.dir(crossTabConflicts, { depth: null });
    }
    await (0, database_1.disconnectDatabase)();
}
runAudit().catch(console.error);
