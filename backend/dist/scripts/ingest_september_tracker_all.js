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
const DailyTracker_1 = require("../models/DailyTracker");
const CompanyMetadata_1 = require("../models/CompanyMetadata");
const dns_1 = __importDefault(require("dns"));
dns_1.default.setServers(['8.8.8.8', '1.1.1.1']);
const FILE_PATH = 'C:\\Users\\admin\\Downloads\\September Tracker 2026 (1).xlsx';
// ── Call Outcome Normalization ───────────────────────────────────────────────
function normalizeCallOutcome(rawStatus, comments) {
    const s = (rawStatus || '').trim().toLowerCase();
    const c = (comments || '').trim().toLowerCase();
    // Check invite mail
    if (s.includes('invite') ||
        s.includes('send invite') ||
        s.includes('requirement mail') ||
        s.includes('3 positions')) {
        return { outcome: 'invite_mail' };
    }
    // Check hiring
    if (s === 'hiring' ||
        (s.includes('hiring') &&
            !s.includes('not') &&
            !s.includes('completed') &&
            !s.includes('over') &&
            !s.includes('freeze'))) {
        return { outcome: 'hiring' };
    }
    // Check hiring completed
    if (s.includes('hiring completed') || s.includes('hiring over')) {
        return { outcome: 'hiring_completed' };
    }
    // Check drive completed
    if (s.includes('drive completed')) {
        return { outcome: 'drive_completed' };
    }
    // Check follow up / call back
    if (s.includes('follow') ||
        s.includes('call back') ||
        s.includes('get back') ||
        s.includes('remainder') ||
        s.includes('reschedule') ||
        s.includes('end of sept')) {
        return { outcome: 'follow_up', followUpMonth: 'September' };
    }
    // Check no response
    if (s.includes('no response') ||
        s === 'nr' ||
        s.includes('not connected') ||
        s.includes('busy') ||
        s.includes('switched off') ||
        s.includes('voicemail') ||
        s.includes('forwarded') ||
        s.includes('didnt pock')) {
        return { outcome: 'no_response' };
    }
    // Check invalid
    if (s.includes('invalid') ||
        s.includes('wrong number') ||
        s.includes('wrong contact') ||
        s.includes('not an hr') ||
        s.includes('call not allowed')) {
        return { outcome: 'invalid' };
    }
    // Check in connect
    if (s.includes('in connect') ||
        s.includes('asking for tpo') ||
        s.includes('given other hr') ||
        s.includes('hr changed')) {
        return { outcome: 'in_connect' };
    }
    // Check not hiring
    if (s.includes('not hiring') ||
        s.includes('not looking') ||
        s.includes('upcoming year') ||
        s.includes('in future') ||
        s.includes('hospitality') ||
        s.includes('bpo') ||
        s.includes('permanently closed')) {
        return { outcome: 'not_hiring' };
    }
    if (s.length > 0) {
        return { outcome: 'in_connect' };
    }
    return { outcome: 'no_response' };
}
// ── Phone and HR Name Cleaner (with swap auto-detection) ──────────────────────
function cleanPhoneAndName(rawContact, rawHr) {
    let contact = (rawContact || '').trim();
    let hr = (rawHr || '').trim();
    const phoneRegex = /(?:\+?91[\-\s]?)?[6-9]\d{9}/;
    const contactHasPhone = phoneRegex.test(contact.replace(/[\s\-\(\)]/g, ''));
    const hrHasPhone = phoneRegex.test(hr.replace(/[\s\-\(\)]/g, ''));
    if (!contactHasPhone && hrHasPhone) {
        const temp = contact;
        contact = hr;
        hr = temp;
    }
    const digits = contact.replace(/\D/g, '');
    let mobile = '';
    if (digits.length === 10) {
        mobile = digits;
    }
    else if (digits.length === 12 && digits.startsWith('91')) {
        mobile = digits.slice(2);
    }
    else if (digits.length > 10) {
        mobile = digits.slice(-10);
    }
    else {
        mobile = digits;
    }
    return {
        mobile,
        hrName: hr || 'HR Contact',
    };
}
// ── Date Parser ─────────────────────────────────────────────────────────────
function parseRowDate(rawDate) {
    const defaultDate = new Date(Date.UTC(2026, 8, 1, 0, 0, 0, 0));
    if (!rawDate) {
        return { year: 2026, month: 9, day: 1, sessionDate: defaultDate };
    }
    if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
        const istOffsetMs = (5 * 60 + 30) * 60 * 1000;
        const ist = new Date(rawDate.getTime() + istOffsetMs);
        const y = ist.getUTCFullYear() || 2026;
        const m = ist.getUTCMonth() + 1 || 9;
        const d = ist.getUTCDate() || 1;
        return { year: y, month: m, day: d, sessionDate: new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0)) };
    }
    const str = String(rawDate).trim();
    if (/sep\s*(\d{1,2})/i.test(str)) {
        const match = str.match(/sep\s*(\d{1,2})/i);
        const day = match ? parseInt(match[1], 10) : 1;
        return { year: 2026, month: 9, day, sessionDate: new Date(Date.UTC(2026, 8, day, 0, 0, 0, 0)) };
    }
    if (/(\d{1,2})\s*sep/i.test(str)) {
        const match = str.match(/(\d{1,2})\s*sep/i);
        const day = match ? parseInt(match[1], 10) : 1;
        return { year: 2026, month: 9, day, sessionDate: new Date(Date.UTC(2026, 8, day, 0, 0, 0, 0)) };
    }
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
        const y = parsed.getFullYear() || 2026;
        const m = parsed.getMonth() + 1 || 9;
        const d = parsed.getDate() || 1;
        return { year: y, month: m, day: d, sessionDate: new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0)) };
    }
    return { year: 2026, month: 9, day: 1, sessionDate: defaultDate };
}
function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}
async function main() {
    await (0, database_1.connectDatabase)();
    const allColleges = await College_1.College.find({ is_deleted: { $ne: true } }).lean();
    const allUsers = await User_1.User.find({ is_deleted: { $ne: true } }).lean();
    // Find admin user as fallback coordinator
    const adminUser = allUsers.find((u) => u.username === 'placement_management' || u.role_codes?.includes('ADMIN')) || allUsers[0];
    const workbook = XLSX.readFile(FILE_PATH, { cellDates: true });
    console.log(`=== STARTING INGESTION FOR ALL ELIGIBLE SHEETS IN WORKBOOK ===\n`);
    let totalInsertedAllSheets = 0;
    let highestSerialDoc = await CompanyMetadata_1.CompanyMetadata.findOne({ serial_number: { $gt: 0 } })
        .sort({ serial_number: -1 })
        .select('serial_number');
    let currentSerial = highestSerialDoc?.serial_number || 0;
    const summaryReport = [];
    for (const sheetName of workbook.SheetNames) {
        const trimmed = sheetName.trim();
        const upper = trimmed.toUpperCase();
        // Check hidden sheets
        const sheetMeta = workbook.Workbook?.Sheets?.find((s) => s.name === sheetName);
        const isHidden = sheetMeta?.Hidden === 1 || sheetMeta?.Hidden === 2;
        const isSpecial = upper.includes('POSITIVE') ||
            upper.includes('JD RECEIVED') ||
            upper.includes('JD_RECEIVED') ||
            upper === 'TRACKER' ||
            upper.endsWith(' TRACKER') ||
            upper.startsWith('TRACKER') ||
            isHidden;
        if (isSpecial) {
            console.log(`⏭️ Skipping Special / Summary / Hidden Sheet: "${sheetName}"`);
            continue;
        }
        const sheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        // Find header row
        let headerRowIdx = -1;
        let headers = [];
        for (let r = 0; r < Math.min(10, rawData.length); r++) {
            const row = rawData[r].map((v) => (v != null ? String(v).trim() : ''));
            const text = row.join(' ').toLowerCase();
            if ((text.includes('company') || text.includes('s.no') || text.includes('contact') || text.includes('mobile')) &&
                row.filter(Boolean).length >= 4) {
                headerRowIdx = r;
                headers = row.map((h) => h.trim());
                break;
            }
        }
        if (headerRowIdx === -1) {
            console.log(`⚠️ Skipping sheet with no recognizable headers: "${sheetName}"`);
            continue;
        }
        // Match college
        const college = allColleges.find((c) => {
            const cName = c.college_name.toLowerCase();
            const cCode = c.college_code.toLowerCase();
            const sName = trimmed.toLowerCase();
            return (sName === cName ||
                sName === cCode ||
                sName.includes(cCode) ||
                cName.includes(sName) ||
                sName.replace(/[^a-z0-9]/g, '') === cName.replace(/[^a-z0-9]/g, ''));
        });
        if (!college) {
            console.log(`⚠️ Skipping sheet: No matching college in DB for "${sheetName}"`);
            continue;
        }
        // Match assigned coordinator or fallback to admin
        const assignedCoordinator = allUsers.find((u) => u.assigned_college_ids?.some((id) => String(id) === String(college._id))) ||
            adminUser;
        const compHeader = headers.find((h) => /company/i.test(h)) || '';
        const dateHeader = headers.find((h) => /date/i.test(h)) || '';
        const timeHeader = headers.find((h) => /time/i.test(h)) || '';
        const contactHeader = headers.find((h) => /contact|mobile|phone/i.test(h)) || '';
        const hrHeader = headers.find((h) => /hr/i.test(h)) || '';
        const emailHeader = headers.find((h) => /mail|email/i.test(h)) || '';
        const statusHeader = headers.find((h) => /status|response/i.test(h)) || '';
        const followMonthHeader = headers.find((h) => /month/i.test(h)) || '';
        const commentsHeader = headers.find((h) => /comment|remark/i.test(h)) || '';
        const toInsert = [];
        const seenRowKeys = new Set();
        for (let r = headerRowIdx + 1; r < rawData.length; r++) {
            const row = rawData[r];
            if (!row || row.every((c) => c == null || String(c).trim() === ''))
                continue;
            const rowObj = {};
            headers.forEach((h, idx) => {
                if (h)
                    rowObj[h] = row[idx] != null ? row[idx] : '';
            });
            const rawComp = String(rowObj[compHeader] || '').trim();
            // Skip date section headers or empty
            if (!rawComp || /^\d+(st|nd|rd|th)?\s*(september|sep|august|aug)/i.test(rawComp)) {
                continue;
            }
            const rawDate = rowObj[dateHeader];
            const rawTime = String(rowObj[timeHeader] || '').trim();
            const rawContact = String(rowObj[contactHeader] || '').trim();
            const rawHr = String(rowObj[hrHeader] || '').trim();
            const rawEmail = String(rowObj[emailHeader] || '').trim();
            const rawStatus = String(rowObj[statusHeader] || '').trim();
            const rawFollowMonth = String(rowObj[followMonthHeader] || '').trim();
            const rawComments = String(rowObj[commentsHeader] || '').trim();
            const { mobile, hrName } = cleanPhoneAndName(rawContact, rawHr);
            const email = rawEmail ? rawEmail.toLowerCase().split(/[,;/]+/)[0].trim() : '';
            const { year, month, day, sessionDate } = parseRowDate(rawDate);
            const { outcome, followUpMonth: defaultFollowMonth } = normalizeCallOutcome(rawStatus, rawComments);
            const followUpMonth = rawFollowMonth || defaultFollowMonth || null;
            // Find or create CompanyMetadata
            let company = await CompanyMetadata_1.CompanyMetadata.findOne({
                company_name: { $regex: new RegExp(`^${escapeRegex(rawComp)}$`, 'i') },
                is_deleted: false,
            });
            if (!company) {
                currentSerial++;
                company = await CompanyMetadata_1.CompanyMetadata.create({
                    serial_number: currentSerial,
                    company_name: rawComp,
                    hr_name: hrName,
                    primary_mobile: mobile || '',
                    mobile_numbers: mobile ? [mobile] : [],
                    primary_email: email || '',
                    email_ids: email ? [email] : [],
                    notes: `Imported via September Tracker 2026 for ${college.college_name}`,
                });
            }
            const dedupeKey = `${rawComp.toLowerCase()}_${mobile}_${year}_${month}_${day}`;
            if (seenRowKeys.has(dedupeKey))
                continue;
            seenRowKeys.add(dedupeKey);
            toInsert.push({
                coordinator_id: assignedCoordinator._id,
                college_id: college._id,
                company_id: company._id,
                company_name: rawComp,
                hr_name: hrName,
                mobile_number: mobile || '',
                email_id: email || '',
                outcome_status: outcome,
                follow_up_month: outcome === 'follow_up' ? followUpMonth : null,
                comments: rawComments || '',
                year,
                month,
                day,
                session_date: sessionDate,
                is_skipped: false,
                is_promoted_to_weekly: false,
                is_finalized: false,
                save_count: 1,
                duplicate_acknowledged: false,
                created_at: new Date(),
                updated_at: new Date(),
            });
        }
        if (toInsert.length === 0) {
            console.log(`⚠️ Sheet "${sheetName}" has 0 clean data rows. Skipped.`);
            continue;
        }
        // Remove any previous daily tracker rows for this college in September 2026 to guarantee clean idempotent reload
        const deleteResult = await DailyTracker_1.DailyTracker.deleteMany({
            college_id: college._id,
            year: 2026,
            month: 9,
        });
        const insertResult = await DailyTracker_1.DailyTracker.insertMany(toInsert, { ordered: false });
        totalInsertedAllSheets += insertResult.length;
        console.log(`✅ [${sheetName}] ➔ ${college.college_name}: Loaded ${insertResult.length} rows (replaced ${deleteResult.deletedCount} prior test rows)`);
        summaryReport.push({
            sheetName,
            collegeName: college.college_name,
            collegeCode: college.college_code,
            coordinator: assignedCoordinator.full_name,
            rowsLoaded: insertResult.length,
        });
    }
    console.log('\n===============================================================');
    console.log('🎉 INGESTION COMPLETE SUMMARY');
    console.log(`Total Sheets Ingested: ${summaryReport.length}`);
    console.log(`Total Daily Tracker Records Inserted: ${totalInsertedAllSheets}`);
    console.log('===============================================================\n');
    console.table(summaryReport);
    await (0, database_1.disconnectDatabase)();
}
main().catch(console.error);
