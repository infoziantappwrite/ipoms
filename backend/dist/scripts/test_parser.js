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
Object.defineProperty(exports, "__esModule", { value: true });
const XLSX = __importStar(require("xlsx"));
function parseDateCell(val, defaultYear = 2026, defaultMonth = 9) {
    if (val === null || val === undefined || val === '')
        return null;
    if (typeof val === 'number') {
        // Excel date serial
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
        // If it's a Date object from xlsx cellDates
        // Convert to IST representation: add 5.5 hours to UTC
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
    // e.g. "Sep 18" or "18 Sep" or "18-Sep" or "Sep-18"
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
    // YYYY-MM-DD
    const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (isoMatch) {
        const yr = parseInt(isoMatch[1], 10);
        const mo = parseInt(isoMatch[2], 10);
        const dy = parseInt(isoMatch[3], 10);
        const sessionDate = new Date(Date.UTC(yr, mo - 1, dy, 0, 0, 0, 0));
        return { sessionDate, year: yr, month: mo, day: dy };
    }
    // DD-MM-YYYY
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
        // Fraction of a day in Excel (e.g. 0.5 = 12:00 PM)
        const totalMinutes = Math.round(val * 24 * 60);
        hours = Math.floor(totalMinutes / 60) % 24;
        minutes = totalMinutes % 60;
    }
    else if (val instanceof Date) {
        // If parsed as Date (often around 1899-12-30 or current date)
        // Add 5.5 hours for IST adjustment
        const ist = new Date(val.getTime() + 5.5 * 3600 * 1000);
        hours = ist.getUTCHours();
        minutes = ist.getUTCMinutes();
    }
    else {
        const str = String(val).trim();
        if (!str)
            return null;
        // Matches "3:00pm", "11:21AM", "15:41 PM", "3:40 pm"
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
    // Construct call_start_time by combining baseDate (midnight UTC) with hours/minutes
    // Note: in IST, session_date at midnight UTC + (hours * 60 + minutes - 330) minutes UTC = that IST time
    // Or simple UTC time on baseDate:
    const result = new Date(baseDate);
    result.setUTCHours(hours, minutes, 0, 0);
    return result;
}
console.log('Testing " Sep 18":', parseDateCell(" Sep 18"));
console.log('Testing 46266:', parseDateCell(46266));
console.log('Testing "3:00pm":', parseTimeCell("3:00pm", new Date('2026-09-18T00:00:00.000Z')));
console.log('Testing "11:21AM":', parseTimeCell("11:21AM", new Date('2026-09-18T00:00:00.000Z')));
