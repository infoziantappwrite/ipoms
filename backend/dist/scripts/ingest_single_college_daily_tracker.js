"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const XLSX = __importStar(require("xlsx"));
const database_1 = require("../config/database");
const College_1 = require("../models/College");
const User_1 = require("../models/User");
const CompanyMetadata_1 = require("../models/CompanyMetadata");
const DailyTracker_1 = require("../models/DailyTracker");
const activeLeadRoutes_1 = require("../lib/activeLeadRoutes");
const dns_1 = __importDefault(require("dns"));
dns_1.default.setServers(['8.8.8.8', '1.1.1.1']);
const FILE_PATH = "C:\\Users\\admin\\Downloads\\September Tracker 2026 (1).xlsx";
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function parseDateCell(val, defaultYear = 2026, defaultMonth = 9) {
    if (val === null || val === undefined || val === '')
        return null;
    if (typeof val === 'number') {
        const parsed = XLSX.SSF.parse_date_code(val);
        if (parsed) {
            const yr = parsed.y || defaultYear;
            const mo = parsed.m || defaultMonth;
            const dy = parsed.d || 1;
            const sessionDate = new Date(Date.UTC(yr, mo - 1, dy, 0, 0, 0, 0));
            return { sessionDate, year: yr, month: mo, day: dy };
        }
    }
    if (val instanceof Date) {
        const istTime = new Date(val.getTime() + 5.5 * 3600 * 1000);
        const yr = istTime.getUTCFullYear();
        const mo = istTime.getUTCMonth() + 1;
        const dy = istTime.getUTCDate();
        const sessionDate = new Date(Date.UTC(yr, mo - 1, dy, 0, 0, 0, 0));
        return { sessionDate, year: yr, month: mo, day: dy };
    }
    const str = String(val).trim();
    if (!str)
        return null;
    const monthNames = {
        jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
        jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
        january: 1, february: 2, march: 3, april: 4, june: 6,
        july: 7, august: 8, september: 9, october: 10, november: 11, december: 12
    };
    const matchAlphaNum = str.match(/([a-zA-Z]+)[ -]?(\d{1,2})/);
    if (matchAlphaNum) {
        const mStr = matchAlphaNum[1].toLowerCase();
        const dNum = parseInt(matchAlphaNum[2], 10);
        if (monthNames[mStr]) {
            const yr = defaultYear;
            const mo = monthNames[mStr];
            const dy = dNum;
            const sessionDate = new Date(Date.UTC(yr, mo - 1, dy, 0, 0, 0, 0));
            return { sessionDate, year: yr, month: mo, day: dy };
        }
    }
    const matchNumAlpha = str.match(/(\d{1,2})[ -]?([a-zA-Z]+)/);
    if (matchNumAlpha) {
        const dNum = parseInt(matchNumAlpha[1], 10);
        const mStr = matchNumAlpha[2].toLowerCase();
        if (monthNames[mStr]) {
            const yr = defaultYear;
            const mo = monthNames[mStr];
            const dy = dNum;
            const sessionDate = new Date(Date.UTC(yr, mo - 1, dy, 0, 0, 0, 0));
            return { sessionDate, year: yr, month: mo, day: dy };
        }
    }
    const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (isoMatch) {
        const yr = parseInt(isoMatch[1], 10);
        const mo = parseInt(isoMatch[2], 10);
        const dy = parseInt(isoMatch[3], 10);
        const sessionDate = new Date(Date.UTC(yr, mo - 1, dy, 0, 0, 0, 0));
        return { sessionDate, year: yr, month: mo, day: dy };
    }
    const ddmmyyyy = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (ddmmyyyy) {
        const dy = parseInt(ddmmyyyy[1], 10);
        const mo = parseInt(ddmmyyyy[2], 10);
        const yr = parseInt(ddmmyyyy[3], 10);
        const sessionDate = new Date(Date.UTC(yr, mo - 1, dy, 0, 0, 0, 0));
        return { sessionDate, year: yr, month: mo, day: dy };
    }
    return null;
}
function parseTimeCell(val, baseDate) {
    if (val === null || val === undefined || val === '')
        return null;
    let hours = 0;
    let minutes = 0;
    if (typeof val === 'number') {
        const totalMinutes = Math.round(val * 24 * 60);
        hours = Math.floor(totalMinutes / 60) % 24;
        minutes = totalMinutes % 60;
    }
    else if (val instanceof Date) {
        const ist = new Date(val.getTime() + 5.5 * 3600 * 1000);
        hours = ist.getUTCHours();
        minutes = ist.getUTCMinutes();
    }
    else {
        const str = String(val).trim();
        if (!str)
            return null;
        const match = str.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
        if (match) {
            let h = parseInt(match[1], 10);
            const m = parseInt(match[2], 10);
            const ampm = match[3] ? match[3].toLowerCase() : null;
            if (ampm === 'pm' && h < 12)
                h += 12;
            if (ampm === 'am' && h === 12)
                h = 0;
            hours = h;
            minutes = m;
        }
        else {
            return null;
        }
    }
    const result = new Date(baseDate);
    result.setUTCHours(hours, minutes, 0, 0);
    return result;
}
function normalizeOutcome(raw) {
    if (!raw || !raw.trim())
        return { outcome: null };
    const s = raw.trim().toLowerCase();
    if (s.includes('invite') || s.includes('requirement') || s.includes('send invite')) {
        return { outcome: 'invite_mail' };
    }
    if (s.includes('no response') || s.includes('no resoponse') || s.includes('not connected') || s === 'nr' || s.includes('busy') || s.includes('switched off') || s.includes('forwarded') || s.includes('not allowed') || s.includes('didnt')) {
        return { outcome: 'no_response' };
    }
    if (s.includes('not hiring') || s.includes('not looking') || s.includes('hospitality') || s.includes('arts')) {
        return { outcome: 'not_hiring' };
    }
    if (s.includes('hiring completed') || s.includes('hiring over')) {
        return { outcome: 'hiring_completed' };
    }
    if (s.includes('hiring freezed')) {
        return { outcome: 'hiring_freezed' };
    }
    if (s.includes('drive completed')) {
        return { outcome: 'drive_completed' };
    }
    if (s.includes('call back') || s.includes('get back') || s.includes('cal back')) {
        return { outcome: 'call_back' };
    }
    if (s.includes('follow') || s.includes('remainder') || s.includes('future') || s.includes('upcoming') || s.includes('next year') || s.includes('yet  to start') || s.includes('waiting for')) {
        return { outcome: 'follow_up' };
    }
    if (s.includes('in connect') || s.includes('in_connect')) {
        return { outcome: 'in_connect' };
    }
    if (s.includes('invalid') || s.includes('wrong') || s.includes('closed') || s.includes('not an hr') || s.includes('changed')) {
        return { outcome: 'invalid' };
    }
    if (s.includes('jd received') || s.includes('jd_received')) {
        return { outcome: 'jd_received' };
    }
    if (s.includes('hiring')) {
        return { outcome: 'hiring' };
    }
    return { outcome: null };
}
async function main() {
    await (0, database_1.connectDatabase)();
    const targetCollegeCode = 'ACET';
    const college = await College_1.College.findOne({ college_code: targetCollegeCode, is_deleted: { $ne: true } });
    if (!college) {
        console.error(`College ${targetCollegeCode} not found in database!`);
        await (0, database_1.disconnectDatabase)();
        return;
    }
    console.log(`\n🏫 Target College: [${college.college_code}] ${college.college_name} (ID: ${college._id})`);
    // Find coordinator
    // Mohana / A.Mohanaradha
    const coordinator = await User_1.User.findOne({
        $or: [
            { official_email: 'mohanaradha_a@infoziant.com' },
            { full_name: /mohanaradha/i },
            { username: 'mohanaradha' }
        ]
    });
    if (!coordinator) {
        console.error('Coordinator Mohana not found in database!');
        await (0, database_1.disconnectDatabase)();
        return;
    }
    console.log(`👤 Coordinator: ${coordinator.full_name} (${coordinator.official_email}, ID: ${coordinator._id})`);
    const wb = XLSX.readFile(FILE_PATH, { cellDates: true, dense: true });
    const sheet = wb.Sheets[targetCollegeCode];
    if (!sheet) {
        console.error(`Sheet ${targetCollegeCode} not found in workbook!`);
        await (0, database_1.disconnectDatabase)();
        return;
    }
    const json = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    console.log(`\n📄 Sheet "${targetCollegeCode}" loaded with ${json.length} total rows.`);
    let lastParsedDate = {
        sessionDate: new Date(Date.UTC(2026, 8, 18, 0, 0, 0, 0)),
        year: 2026,
        month: 9,
        day: 18,
    };
    await DailyTracker_1.DailyTracker.deleteMany({ college_id: college._id });
    console.log(`Cleaned previous DailyTracker entries for ${targetCollegeCode}`);
    const processedRows = [];
    let insertedCount = 0;
    let updatedCount = 0;
    for (let r = 2; r < json.length; r++) {
        const row = json[r];
        const sNo = row[0];
        const rawDate = row[1];
        const rawTime = row[2];
        const rawCompany = String(row[3] || '').trim();
        const rawContact = String(row[4] || '').trim();
        const rawHr = String(row[5] || '').trim();
        const rawEmail = String(row[6] || '').trim().toLowerCase();
        const rawStatus = String(row[7] || '').trim();
        const rawFollowUpMonth = String(row[8] || '').trim();
        const rawComments = String(row[9] || '').trim();
        const rawCompanyType = String(row[10] || '').trim();
        if (!rawCompany && !rawContact && !rawHr) {
            continue; // Skip empty row
        }
        // Parse date or carry forward
        const dateObj = parseDateCell(rawDate);
        if (dateObj) {
            lastParsedDate = dateObj;
        }
        const { sessionDate, year, month, day } = lastParsedDate;
        // Parse time
        const callStartTime = parseTimeCell(rawTime, sessionDate);
        // Normalize Outcome
        const { outcome, followUpMonth: inferredMonth } = normalizeOutcome(rawStatus);
        const finalFollowUpMonth = rawFollowUpMonth || inferredMonth || (outcome === 'follow_up' ? 'September' : null);
        // Find or create CompanyMetadata
        let company = await CompanyMetadata_1.CompanyMetadata.findOne({
            company_name: { $regex: new RegExp(`^${escapeRegex(rawCompany)}$`, 'i') },
            is_deleted: false,
        });
        const mobList = rawContact ? rawContact.split(/[,;/]+/).map(s => s.trim()).filter(Boolean) : [];
        const emailList = rawEmail ? rawEmail.split(/[,;/]+/).map(s => s.trim().toLowerCase()).filter(Boolean) : [];
        if (!company) {
            const highestDoc = await CompanyMetadata_1.CompanyMetadata.findOne({ serial_number: { $gt: 0 } })
                .sort({ serial_number: -1 })
                .select('serial_number');
            const nextSerial = (highestDoc?.serial_number || 0) + 1;
            company = await CompanyMetadata_1.CompanyMetadata.create({
                serial_number: nextSerial,
                company_name: rawCompany,
                hr_name: rawHr || 'HR Contact',
                primary_mobile: mobList[0] || '',
                mobile_numbers: mobList,
                primary_email: emailList[0] || '',
                email_ids: emailList,
                company_type: rawCompanyType ? rawCompanyType.toLowerCase().replace(/\s+/g, '_') : 'other',
                notes: `Imported from ${targetCollegeCode} September Tracker on ${new Date().toLocaleDateString('en-IN')}`,
            });
        }
        else {
            let metaUpdated = false;
            if (rawHr && rawHr !== company.hr_name && (!company.hr_name || company.hr_name === 'HR Contact')) {
                company.hr_name = rawHr;
                metaUpdated = true;
            }
            for (const mob of mobList) {
                if (!company.mobile_numbers.includes(mob)) {
                    company.mobile_numbers.push(mob);
                    metaUpdated = true;
                }
            }
            if (!company.primary_mobile && mobList[0]) {
                company.primary_mobile = mobList[0];
                metaUpdated = true;
            }
            for (const em of emailList) {
                if (!company.email_ids.includes(em)) {
                    company.email_ids.push(em);
                    metaUpdated = true;
                }
            }
            if (!company.primary_email && emailList[0]) {
                company.primary_email = emailList[0];
                metaUpdated = true;
            }
            if (metaUpdated) {
                await company.save();
            }
        }
        // Prepare DailyTracker entry
        const mobileNumToSave = rawContact || company.primary_mobile || (mobList[0] || 'Not Provided');
        const existingTracker = await DailyTracker_1.DailyTracker.findOne({
            college_id: college._id,
            coordinator_id: coordinator._id,
            company_name: rawCompany,
            mobile_number: mobileNumToSave,
            session_date: sessionDate,
        });
        if (existingTracker) {
            existingTracker.hr_name = rawHr || company.hr_name || 'HR Contact';
            existingTracker.mobile_number = mobileNumToSave;
            existingTracker.email_id = rawEmail || company.primary_email || '';
            existingTracker.call_start_time = callStartTime || existingTracker.call_start_time;
            existingTracker.outcome_status = outcome || existingTracker.outcome_status;
            existingTracker.follow_up_month = finalFollowUpMonth;
            existingTracker.comments = rawComments || existingTracker.comments;
            await existingTracker.save();
            updatedCount++;
            processedRows.push({
                _id: existingTracker._id,
                sNo: sNo || processedRows.length + 1,
                company_name: rawCompany,
                contact: mobileNumToSave,
                hr_name: existingTracker.hr_name,
                email: existingTracker.email_id,
                date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
                time: rawTime || '-',
                outcome: outcome || 'Pending / Uncalled',
                comments: rawComments || '-',
                status: 'UPDATED'
            });
        }
        else {
            const newTracker = await DailyTracker_1.DailyTracker.create({
                coordinator_id: coordinator._id,
                college_id: college._id,
                company_id: company._id,
                company_name: rawCompany,
                hr_name: rawHr || company.hr_name || 'HR Contact',
                mobile_number: mobileNumToSave,
                email_id: rawEmail || company.primary_email || '',
                call_start_time: callStartTime,
                outcome_status: outcome,
                follow_up_month: finalFollowUpMonth,
                comments: rawComments,
                year,
                month,
                day,
                session_date: sessionDate,
                is_skipped: false,
                is_promoted_to_weekly: false,
                is_finalized: false,
                save_count: 0,
                duplicate_acknowledged: false,
            });
            if (newTracker.outcome_status && newTracker.company_name) {
                (0, activeLeadRoutes_1.syncLeadFromDailyTracker)({
                    company_name: newTracker.company_name,
                    call_outcome: newTracker.outcome_status,
                    remarks: newTracker.comments,
                    coordinator_id: newTracker.coordinator_id,
                    college_id: newTracker.college_id,
                    daily_tracker_id: newTracker._id,
                }).catch(e => console.error('Lead sync warning:', e));
            }
            insertedCount++;
            processedRows.push({
                _id: newTracker._id,
                sNo: sNo || processedRows.length + 1,
                company_name: rawCompany,
                contact: mobileNumToSave,
                hr_name: newTracker.hr_name,
                email: newTracker.email_id,
                date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
                time: rawTime || '-',
                outcome: outcome || 'Pending / Uncalled',
                comments: rawComments || '-',
                status: 'INSERTED'
            });
        }
    }
    console.log(`\n================ INGESTION SUMMARY FOR ${targetCollegeCode} ================`);
    console.log(`Total rows processed: ${processedRows.length}`);
    console.log(`Inserted: ${insertedCount}`);
    console.log(`Updated: ${updatedCount}`);
    console.log('\n--- Ingested Records Breakdown ---');
    console.table(processedRows.map(r => ({
        '#': r.sNo,
        'Company': r.company_name,
        'HR Name': r.hr_name,
        'Contact': r.contact,
        'Date': r.date,
        'Time': r.time,
        'Outcome': r.outcome,
    })));
    await (0, database_1.disconnectDatabase)();
}
main().catch(err => {
    console.error(err);
    process.exit(1);
});
