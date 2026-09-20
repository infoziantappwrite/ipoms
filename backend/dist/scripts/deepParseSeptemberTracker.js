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
const dns_1 = __importDefault(require("dns"));
dns_1.default.setServers(['8.8.8.8', '1.1.1.1']);
const FILE_PATH = "C:\\Users\\admin\\Downloads\\September Tracker 2026 (1).xlsx";
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
    // e.g. "01st September" or "1st September" or "18th Sep"
    const ordinalMatch = str.match(/(\d{1,2})(?:st|nd|rd|th)?[ -]+([a-zA-Z]+)/i);
    if (ordinalMatch) {
        const dy = parseInt(ordinalMatch[1], 10);
        const mStr = ordinalMatch[2].toLowerCase();
        if (monthNames[mStr]) {
            const yr = defaultYear;
            const mo = monthNames[mStr];
            const sessionDate = new Date(Date.UTC(yr, mo - 1, dy, 0, 0, 0, 0));
            return { sessionDate, year: yr, month: mo, day: dy };
        }
    }
    const alphaFirstMatch = str.match(/([a-zA-Z]+)[ -]+(\d{1,2})(?:st|nd|rd|th)?/i);
    if (alphaFirstMatch) {
        const mStr = alphaFirstMatch[1].toLowerCase();
        const dy = parseInt(alphaFirstMatch[2], 10);
        if (monthNames[mStr]) {
            const yr = defaultYear;
            const mo = monthNames[mStr];
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
        // If it's a number like 1.3 or 2.05 (e.g. in MEC: 1.3 PM or 2.05 PM) or fraction of day
        if (val < 1.0) {
            const totalMinutes = Math.round(val * 24 * 60);
            hours = Math.floor(totalMinutes / 60) % 24;
            minutes = totalMinutes % 60;
        }
        else {
            // Like 1.3 -> 1:30 or 2.05 -> 2:05
            const integerPart = Math.floor(val);
            const decimalPart = Math.round((val - integerPart) * 100);
            hours = integerPart < 12 ? integerPart + 12 : integerPart;
            minutes = decimalPart;
        }
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
        // Handles "3:00pm", "11:21AM", "15:41 PM", "2.05PM", "3.55PM"
        const match = str.match(/(\d{1,2})[:.](\d{2})\s*(am|pm)?/i);
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
async function main() {
    await (0, database_1.connectDatabase)();
    const allColleges = await College_1.College.find({ is_deleted: { $ne: true } }).lean();
    const collegeMap = new Map();
    allColleges.forEach((c) => {
        collegeMap.set(c.college_code.trim().toUpperCase(), c);
        collegeMap.set(c.college_name.trim().toUpperCase(), c);
    });
    if (collegeMap.has('MAREPHRA')) {
        collegeMap.set('MAR EPHRAEM', collegeMap.get('MAREPHRA'));
    }
    const wb = XLSX.readFile(FILE_PATH, { cellDates: true, dense: true });
    const sheetProps = (wb.Workbook && wb.Workbook.Sheets) ? wb.Workbook.Sheets : [];
    let totalValidRowsAcrossWorkbook = 0;
    for (let i = 0; i < wb.SheetNames.length; i++) {
        const sheetName = wb.SheetNames[i];
        const prop = sheetProps[i];
        const isHidden = prop && (prop.Hidden === 1 || prop.Hidden === 2);
        if (isHidden)
            continue;
        const trimmed = sheetName.trim().toUpperCase();
        if (['POSITIVES', 'JD RECEIVED', 'TRACKER', 'SUMMARY'].includes(trimmed))
            continue;
        let college = collegeMap.get(trimmed);
        if (!college) {
            const matchKey = Array.from(collegeMap.keys()).find(k => trimmed.includes(k) || k.includes(trimmed));
            if (matchKey)
                college = collegeMap.get(matchKey);
        }
        if (!college)
            continue;
        const sheet = wb.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        let validRows = 0;
        let lastParsedDate = {
            sessionDate: new Date(Date.UTC(2026, 8, 1, 0, 0, 0, 0)),
            year: 2026,
            month: 9,
            day: 1,
        };
        for (let r = 2; r < json.length; r++) {
            const row = json[r];
            const rawDate = row[1];
            const rawCompany = String(row[3] || '').trim();
            const rawContact = String(row[4] || '').trim();
            const rawHr = String(row[5] || '').trim();
            // Check if it's a section divider row like "01st September"
            if (rawCompany.toLowerCase().includes('september') && !rawContact && !rawHr) {
                const dObj = parseDateCell(rawCompany);
                if (dObj) {
                    lastParsedDate = dObj;
                }
                continue;
            }
            if (!rawCompany && !rawContact && !rawHr)
                continue;
            const dateObj = parseDateCell(rawDate);
            if (dateObj)
                lastParsedDate = dateObj;
            validRows++;
        }
        console.log(`Sheet "${sheetName}" -> College [${college.college_code}] ${college.college_name}: ${validRows} valid rows.`);
        totalValidRowsAcrossWorkbook += validRows;
    }
    console.log(`\nTOTAL VALID DATA ROWS ACROSS ALL ACTIVE COLLEGE SHEETS: ${totalValidRowsAcrossWorkbook}`);
    await (0, database_1.disconnectDatabase)();
}
main().catch(err => {
    console.error(err);
    process.exit(1);
});
