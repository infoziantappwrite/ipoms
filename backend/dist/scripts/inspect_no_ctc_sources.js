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
async function inspect() {
    await (0, database_1.connectDatabase)();
    const allActive = await ActiveLead_1.ActiveLead.find({ is_deleted: { $ne: true } }).lean();
    const pipelineNoCtc = allActive.filter(l => l.lead_type === 'pipeline' && !isValidCtc(l.ctc));
    const allWeekly = await WeeklyTracker_1.WeeklyTracker.find({ is_deleted: { $ne: true } }).lean();
    const weeklyMap = new Map();
    for (const w of allWeekly) {
        if (w.company_name) {
            weeklyMap.set(normalizeKey(w.company_name), w);
        }
    }
    let inWeeklyWithCtc = 0;
    let inWeeklyNoCtc = 0;
    let notInWeekly = 0;
    for (const l of pipelineNoCtc) {
        const norm = normalizeKey(l.company_name);
        const weeklyMatch = weeklyMap.get(norm);
        if (weeklyMatch) {
            if (isValidCtc(weeklyMatch.ctc_lpa)) {
                inWeeklyWithCtc++;
            }
            else {
                inWeeklyNoCtc++;
            }
        }
        else {
            notInWeekly++;
        }
    }
    console.log(`Pipeline leads with no CTC: ${pipelineNoCtc.length}`);
    console.log(`  ├─ Present in Weekly Tracker WITH CTC: ${inWeeklyWithCtc}`);
    console.log(`  ├─ Present in Weekly Tracker WITHOUT CTC: ${inWeeklyNoCtc}`);
    console.log(`  └─ NOT in Weekly Tracker (Daily Tracker only): ${notInWeekly}`);
    await (0, database_1.disconnectDatabase)();
}
inspect().catch(console.error);
