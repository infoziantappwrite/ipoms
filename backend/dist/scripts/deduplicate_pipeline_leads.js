"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const ActiveLead_1 = require("../models/ActiveLead");
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ipoms';
function cleanName(s) {
    return (s || '')
        .toLowerCase()
        .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
function stripCorporateSuffixes(s) {
    let n = cleanName(s);
    const suffixes = [
        'private limited', 'pvt ltd', 'pvt limited', 'private ltd', 'pvtltd',
        'limited', 'ltd', 'inc', 'corporation', 'corp', 'llc', 'llp',
        'technologies', 'technology', 'tech', 'solutions', 'solution',
        'infotech', 'services', 'service', 'systems', 'system',
        'enterprises', 'enterprise', 'studios', 'studio', 'group of companies', 'group',
        'consultancy', 'consulting', 'consultants', 'software solutions', 'software', 'soft',
        'digital', 'global service', 'global', 'international llc', 'international', 'india pvt ltd', 'india private limited', 'india ltd', 'india', 'labs', 'lab'
    ];
    let changed = true;
    while (changed) {
        changed = false;
        for (const suf of suffixes) {
            const regex = new RegExp(`\\b${suf}\\b`, 'gi');
            const before = n;
            n = n.replace(regex, ' ').replace(/\s+/g, ' ').trim();
            if (n !== before)
                changed = true;
        }
    }
    return n || cleanName(s);
}
function normalizeRole(r) {
    return (r || '')
        .toLowerCase()
        .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
function areRolesEquivalent(r1, r2) {
    const n1 = normalizeRole(r1);
    const n2 = normalizeRole(r2);
    if (n1 === n2)
        return true;
    if (!n1 || !n2)
        return true;
    if (n1 === 'graduate trainee' || n2 === 'graduate trainee')
        return true;
    if (n1 === 'get' && (n2.includes('get') || n2.includes('graduate engineer trainee')))
        return true;
    if (n2 === 'get' && (n1.includes('get') || n1.includes('graduate engineer trainee')))
        return true;
    if ((n1 === 'sde' || n1 === 'software engineer' || n1 === 'software developer') &&
        (n2 === 'sde' || n2 === 'software engineer' || n2 === 'software developer'))
        return true;
    if (n1.includes(n2) || n2.includes(n1))
        return true;
    return false;
}
function pickBestName(names) {
    // Sort by presence of proper TitleCase and reasonable length
    return names.sort((a, b) => {
        // Prefer names with nice capitalization
        const isUpperA = a === a.toUpperCase() && a.length > 5;
        const isUpperB = b === b.toUpperCase() && b.length > 5;
        if (isUpperA && !isUpperB)
            return 1;
        if (!isUpperA && isUpperB)
            return -1;
        return b.length - a.length;
    })[0];
}
async function runDeduplication() {
    await mongoose_1.default.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    const allPipeline = await ActiveLead_1.ActiveLead.find({ lead_type: 'pipeline', is_deleted: false }).lean();
    console.log(`Current Total Pipeline Leads before dedup: ${allPipeline.length}`);
    // 1. Create a timestamped backup
    const backupDir = path_1.default.join(__dirname, '../../backups');
    if (!fs_1.default.existsSync(backupDir))
        fs_1.default.mkdirSync(backupDir, { recursive: true });
    const backupPath = path_1.default.join(backupDir, `pipeline_leads_backup_${Date.now()}.json`);
    fs_1.default.writeFileSync(backupPath, JSON.stringify(allPipeline, null, 2));
    console.log(`Backup saved to ${backupPath}`);
    // 2. Group by stripped core name
    const groups = new Map();
    for (const lead of allPipeline) {
        const coreKey = stripCorporateSuffixes(lead.company_name);
        if (!groups.has(coreKey))
            groups.set(coreKey, []);
        groups.get(coreKey).push(lead);
    }
    let deletedCount = 0;
    let updatedCount = 0;
    let multiRoleTracksPreserved = 0;
    for (const [coreKey, group] of groups.entries()) {
        if (group.length <= 1)
            continue;
        // Pick canonical company name
        const canonicalName = pickBestName(group.map(g => g.company_name));
        // Group items by role distinctiveness
        const roleBuckets = [];
        for (const item of group) {
            let matchedBucket = false;
            for (const bucket of roleBuckets) {
                if (areRolesEquivalent(bucket.primary.role, item.role)) {
                    bucket.duplicates.push(item);
                    matchedBucket = true;
                    break;
                }
            }
            if (!matchedBucket) {
                roleBuckets.push({ primary: item, duplicates: [] });
            }
        }
        if (roleBuckets.length > 1) {
            console.log(`\n[MULTI-ROLE PRESERVED] Core: "${coreKey}" -> Kept ${roleBuckets.length} distinct roles:`);
            roleBuckets.forEach(b => {
                console.log(`   - Role: "${b.primary.role}" | CTC: "${b.primary.ctc}" (from "${b.primary.company_name}")`);
            });
            multiRoleTracksPreserved += (roleBuckets.length - 1);
        }
        // For each bucket, pick the best representative lead and delete the duplicates
        for (const bucket of roleBuckets) {
            const allInBucket = [bucket.primary, ...bucket.duplicates];
            // Sort to find the best lead to keep
            // Criteria: 1) Has status (e.g. "Invite Email" / "Follow Up" / "Hiring"), 2) 2027 batch or best CTC, 3) Longest role description
            allInBucket.sort((a, b) => {
                const aHasStatus = a.status ? 1 : 0;
                const bHasStatus = b.status ? 1 : 0;
                if (aHasStatus !== bHasStatus)
                    return bHasStatus - aHasStatus;
                const aIs2027 = (a.academic_year === '2027') ? 1 : 0;
                const bIs2027 = (b.academic_year === '2027') ? 1 : 0;
                if (aIs2027 !== bIs2027)
                    return bIs2027 - aIs2027;
                return (b.role?.length || 0) - (a.role?.length || 0);
            });
            const leadToKeep = allInBucket[0];
            const leadsToDelete = allInBucket.slice(1);
            // Merge data into leadToKeep: preserve status if any duplicate had one
            let needsUpdate = false;
            const updates = {};
            if (leadToKeep.company_name !== canonicalName) {
                updates.company_name = canonicalName;
                needsUpdate = true;
            }
            // If leadToKeep has no status but a duplicate had one, carry it over
            if (!leadToKeep.status) {
                const withStatus = allInBucket.find(l => l.status);
                if (withStatus) {
                    updates.status = withStatus.status;
                    if (withStatus.followup_month)
                        updates.followup_month = withStatus.followup_month;
                    needsUpdate = true;
                }
            }
            // If leadToKeep has placeholder role but a duplicate had a specific role, carry it over
            if ((!leadToKeep.role || leadToKeep.role === 'Graduate Trainee') && allInBucket.some(l => l.role && l.role !== 'Graduate Trainee')) {
                const withRole = allInBucket.find(l => l.role && l.role !== 'Graduate Trainee');
                if (withRole) {
                    updates.role = withRole.role;
                    needsUpdate = true;
                }
            }
            if (needsUpdate) {
                await ActiveLead_1.ActiveLead.findByIdAndUpdate(leadToKeep._id, { $set: updates });
                updatedCount++;
            }
            // Soft-delete the duplicate items
            for (const del of leadsToDelete) {
                await ActiveLead_1.ActiveLead.findByIdAndUpdate(del._id, {
                    $set: { is_deleted: true, deleted_at: new Date() }
                });
                deletedCount++;
            }
        }
    }
    const remainingPipeline = await ActiveLead_1.ActiveLead.countDocuments({ lead_type: 'pipeline', is_deleted: false });
    const remainingJd = await ActiveLead_1.ActiveLead.countDocuments({ lead_type: 'jd_received', is_deleted: false });
    const totalActive = await ActiveLead_1.ActiveLead.countDocuments({ is_deleted: false });
    console.log(`\n================ DEDUPLICATION SUMMARY ================`);
    console.log(`- Redundant Duplicate Records Removed: ${deletedCount}`);
    console.log(`- Canonical Name/Status Merged Updates: ${updatedCount}`);
    console.log(`- Multi-Role Distinct Tracks Preserved: ${multiRoleTracksPreserved}`);
    console.log(`- Final Remaining Pipeline Leads: ${remainingPipeline}`);
    console.log(`- Final Remaining JD Received Leads: ${remainingJd}`);
    console.log(`- Total Active Leads in Database: ${totalActive}`);
    console.log(`=======================================================`);
    await mongoose_1.default.disconnect();
}
runDeduplication().catch(console.error);
