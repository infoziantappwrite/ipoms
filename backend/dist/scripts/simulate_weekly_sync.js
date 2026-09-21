"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const ActiveLead_1 = require("../models/ActiveLead");
const WeeklyTracker_1 = require("../models/WeeklyTracker");
const dns_1 = __importDefault(require("dns"));
dns_1.default.setServers(['8.8.8.8', '1.1.1.1']);
function isValidCtc(ctc) {
    if (!ctc)
        return false;
    const t = ctc.trim().toLowerCase();
    if (!t || t === '-' || t === 'null' || t === 'undefined' || t === 'tbd' || t === 'na' || t === 'n/a' || t === '—') {
        return false;
    }
    return true;
}
function normalizeKey(str) {
    return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}
async function simulate() {
    await (0, database_1.connectDatabase)();
    console.log('=== SIMULATING FULL SYNC & CLEANUP ===\n');
    // Step 1: Find existing leads and identify pipeline without CTC
    const allActive = await ActiveLead_1.ActiveLead.find({ is_deleted: { $ne: true } }).lean();
    const pipelineWithoutCtc = allActive.filter(l => l.lead_type === 'pipeline' && !isValidCtc(l.ctc));
    console.log(`1. Found ${pipelineWithoutCtc.length} Pipeline leads without CTC that will be removed.`);
    const remainingActive = allActive.filter(l => !(l.lead_type === 'pipeline' && !isValidCtc(l.ctc)));
    console.log(`2. Remaining clean Active Leads: ${remainingActive.length}`);
    // Build active lookup map of normalized company names
    const existingNames = new Set();
    for (const lead of remainingActive) {
        if (lead.company_name) {
            existingNames.add(normalizeKey(lead.company_name));
        }
    }
    // Step 2: Query Weekly Tracker
    const allWeekly = await WeeklyTracker_1.WeeklyTracker.find({ is_deleted: { $ne: true } }).lean();
    // Weekly Pipeline Rows
    const weeklyPipeline = allWeekly.filter(w => (w.pipeline_section || '').toLowerCase() === 'pipeline');
    // Weekly JD Rows
    const weeklyJd = allWeekly.filter(w => ['in_progress', 'companies_in_drive', 'in_drive', 'upcoming_drives', 'drive_in_progress', 'completed'].includes((w.pipeline_section || '').toLowerCase()));
    let newPipelineSynced = 0;
    let pipelineSkippedNoCtc = 0;
    let pipelineSkippedDuplicate = 0;
    const newLeadsToInsert = [];
    // A. Process Pipeline first
    for (const w of weeklyPipeline) {
        if (!w.company_name || !w.company_name.trim())
            continue;
        const norm = normalizeKey(w.company_name);
        if (!isValidCtc(w.ctc_lpa)) {
            pipelineSkippedNoCtc++;
            continue;
        }
        if (existingNames.has(norm)) {
            pipelineSkippedDuplicate++;
            continue;
        }
        // Add new pipeline lead
        existingNames.add(norm);
        newPipelineSynced++;
        newLeadsToInsert.push({
            company_name: w.company_name.trim(),
            role: w.job_role || 'Graduate Trainee',
            ctc: w.ctc_lpa?.trim() || '',
            lead_type: 'pipeline',
            pipeline_section: 'pipeline',
            academic_year: w.eligible_batch || '2027',
            college_id: w.college_id || null,
            coordinator_id: w.coordinator_id || null,
        });
    }
    // B. Process JD Received next
    let newJdSynced = 0;
    let jdSkippedDuplicate = 0;
    for (const w of weeklyJd) {
        if (!w.company_name || !w.company_name.trim())
            continue;
        const norm = normalizeKey(w.company_name);
        if (existingNames.has(norm)) {
            jdSkippedDuplicate++;
            continue;
        }
        let mappedSec = 'in_progress';
        const sec = (w.pipeline_section || '').toLowerCase();
        if (sec === 'completed')
            mappedSec = 'completed';
        else if (sec === 'drive_in_progress')
            mappedSec = 'drive_in_progress';
        else if (sec.includes('drive') || sec.includes('upcoming'))
            mappedSec = 'upcoming_drive';
        else
            mappedSec = 'in_progress';
        existingNames.add(norm);
        newJdSynced++;
        newLeadsToInsert.push({
            company_name: w.company_name.trim(),
            role: w.job_role || 'Graduate Engineer Trainee',
            ctc: w.ctc_lpa?.trim() || '',
            lead_type: 'jd_received',
            pipeline_section: mappedSec,
            academic_year: w.eligible_batch || '2027',
            college_id: w.college_id || null,
            coordinator_id: w.coordinator_id || null,
        });
    }
    console.log('\n=== SYNC SIMULATION RESULTS ===');
    console.log(`Pipeline Section Sync:`);
    console.log(`  ├─ Newly Synced: ${newPipelineSynced}`);
    console.log(`  ├─ Skipped (Already in Pipeline or JD): ${pipelineSkippedDuplicate}`);
    console.log(`  └─ Skipped (Missing CTC): ${pipelineSkippedNoCtc}`);
    console.log(`JD Received Section Sync:`);
    console.log(`  ├─ Newly Synced: ${newJdSynced}`);
    console.log(`  └─ Skipped (Already in Pipeline or JD): ${jdSkippedDuplicate}`);
    console.log(`Total New Leads to Insert: ${newLeadsToInsert.length}`);
    console.log(`Total Projected Active Leads in DB: ${remainingActive.length + newLeadsToInsert.length}`);
    await (0, database_1.disconnectDatabase)();
}
simulate().catch(console.error);
