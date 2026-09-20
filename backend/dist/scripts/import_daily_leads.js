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
exports.importDailyLeads = importDailyLeads;
const XLSX = __importStar(require("xlsx"));
const database_1 = require("../config/database");
const College_1 = require("../models/College");
const User_1 = require("../models/User");
const DailyLead_1 = require("../models/DailyLead");
const CompanyMetadata_1 = require("../models/CompanyMetadata");
const dns_1 = __importDefault(require("dns"));
dns_1.default.setServers(['8.8.8.8', '1.1.1.1']);
const filePath = "C:\\Users\\admin\\Downloads\\September Tracker 2026 (1).xlsx";
function parseDate(dateStr) {
    if (!dateStr)
        return null;
    const clean = dateStr.replace(/CALL\s+POSTIVES\s*-\s*/i, '').replace(/CALL\s+POSITIVES\s*-\s*/i, '').trim();
    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
        return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0));
    }
    const parts = clean.split(/[-/]/);
    if (parts.length >= 2) {
        const day = parseInt(parts[0]);
        const monthStr = parts[1].toLowerCase();
        const months = {
            jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
            jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
        };
        let month = months[monthStr.substring(0, 3)];
        if (month === undefined) {
            month = parseInt(parts[0]) - 1;
        }
        const year = parts.length >= 3 ? (parseInt(parts[2]) < 100 ? 2000 + parseInt(parts[2]) : parseInt(parts[2])) : 2026;
        return new Date(Date.UTC(year, month, day || 1, 0, 0, 0));
    }
    return null;
}
async function importDailyLeads() {
    await (0, database_1.connectDatabase)();
    console.log('🚀 [Import] Starting Daily Leads Import from Excel...');
    const allColleges = await College_1.College.find({ is_deleted: { $ne: true } }).lean();
    const allUsers = await User_1.User.find({ is_deleted: { $ne: true } }).lean();
    const allCompanies = await CompanyMetadata_1.CompanyMetadata.find({ is_deleted: { $ne: true } }).select('_id company_name').lean();
    const collegeByCode = new Map();
    allColleges.forEach(c => collegeByCode.set(c.college_code.toUpperCase(), c));
    const companyMap = new Map();
    allCompanies.forEach(c => {
        if (c.company_name) {
            companyMap.set(c.company_name.toLowerCase().trim(), c._id);
        }
    });
    const collegeAliases = {
        'MAR EPHRAEM': 'MAREPHRA',
        'MAR EPHREAM': 'MAREPHRA',
        'KGISL': 'KGISL',
        'ACET': 'ACET',
        'SONA': 'SONA',
        'KARPAGAM': 'KARPAGAM',
        'SMVEC': 'SMVEC',
        'PSNA': 'PSNA',
        'DSU': 'DSU',
        'KLU': 'KLU',
        'KIOT': 'KIOT',
        'NPR': 'NPR',
        'KPR': 'KPR',
        'AIHT': 'AIHT',
        'ACEW': 'ACEW',
        'HITS': 'HITS',
        'NEHRU': 'NEHRU',
        'NGCE': 'NGCE',
        'NGP': 'NGP',
        'MCET': 'MCET',
        'MEC': 'MEC',
        'MKCE': 'MKCE',
        'KAMARAJ': 'KAMARAJ',
        'KARUNYA': 'KARUNYA',
        'AVS': 'AVS',
        'AAA': 'AAA',
        'SSEI': 'SSEI',
        'EGS': 'EGS',
    };
    const OFFICIAL_MAP = {
        'KARPAGAM': 'mohanaradha_a@infoziant.com',
        'AIHT': 'mohanaradha_a@infoziant.com',
        'ACET': 'mohanaradha_a@infoziant.com',
        'KPR': 'mohanaradha_a@infoziant.com',
        'NEHRU': 'sujitha_s@infoziant.com',
        'SONA': 'sujitha_s@infoziant.com',
        'MAREPHRA': 'sujitha_s@infoziant.com',
        'MKCE': 'sujitha_s@infoziant.com',
        'KARUNYA': 'sujitha_s@infoziant.com',
        'AVS': 'sujitha_s@infoziant.com',
        'AAA': 'sujitha_s@infoziant.com',
        'KGISL': 'sujitha_s@infoziant.com',
        'SSEI': 'sujitha_s@infoziant.com',
        'HITS': 'sujitha_s@infoziant.com',
        'EGS': 'sujitha_s@infoziant.com',
        'PSNA': 'thirisha_r@infoziant.com',
        'DSU': 'thirisha_r@infoziant.com',
        'SMVEC': 'thirisha_r@infoziant.com',
        'KLU': 'malavika_ramesh@infoziant.com',
        'NGCE': 'malavika_ramesh@infoziant.com',
        'NPR': 'lizenya_r@infoziant.com',
        'KIOT': 'lizenya_r@infoziant.com',
        'ACEW': 'lizenya_r@infoziant.com',
        'NGP': 'megaladevi_ps@infoziant.com',
        'KAMARAJ': 'megaladevi_ps@infoziant.com',
        'MCET': 'seshmitha_tamil@icl.today',
        'MEC': 'seshmitha_tamil@icl.today',
    };
    const userByEmail = new Map();
    allUsers.forEach(u => userByEmail.set(u.official_email.toLowerCase(), u));
    const adminUser = allUsers.find(u => u.role_codes?.includes('ADMINISTRATOR')) || allUsers[0];
    function matchCoordinator(coordName, collegeCode) {
        if (coordName) {
            const q = coordName.toLowerCase().trim();
            const matched = allUsers.find(u => {
                const full = u.full_name.toLowerCase();
                const user = u.username.toLowerCase();
                return full.includes(q) || user.includes(q) || q.includes(user) || (q === 'suji' && user.includes('sujitha'));
            });
            if (matched)
                return matched;
        }
        const email = OFFICIAL_MAP[collegeCode];
        if (email && userByEmail.has(email.toLowerCase())) {
            return userByEmail.get(email.toLowerCase());
        }
        return adminUser;
    }
    function parseCollegeAndCoordinator(rawCollegeStr) {
        const cleanStr = (rawCollegeStr || '').trim();
        let coordName = '';
        const match = cleanStr.match(/^([^(]+)(?:\(([^)]+)\))?$/);
        let colNamePart = cleanStr;
        if (match) {
            colNamePart = match[1].trim();
            coordName = (match[2] || '').trim();
        }
        let code = colNamePart.toUpperCase();
        if (collegeAliases[code]) {
            code = collegeAliases[code];
        }
        const collegeObj = collegeByCode.get(code) || null;
        const coordinatorObj = matchCoordinator(coordName, code);
        return { collegeObj, coordinatorObj };
    }
    const workbook = XLSX.readFile(filePath, { cellDates: true });
    // 1. Process POSITIVES (From 19-Aug-2026 / row 405+)
    const posSheet = workbook.Sheets['POSITIVES'] || workbook.Sheets['POSITIVE'];
    const posData = XLSX.utils.sheet_to_json(posSheet, { header: 1, raw: false });
    let currentDate = null;
    const docsToInsert = [];
    for (let i = 0; i < posData.length; i++) {
        const row = posData[i];
        if (!row || row.length === 0)
            continue;
        const firstCell = String(row[0] || '').trim();
        if (firstCell.startsWith('CALL POSTIVES') || firstCell.startsWith('CALL POSITIVES')) {
            currentDate = parseDate(firstCell);
            continue;
        }
        if (firstCell === 'SI.NO')
            continue;
        if (i < 404)
            continue; // Start from 19-Aug-2026
        const companyName = String(row[2] || '').trim();
        if (!companyName)
            continue;
        const role = String(row[3] || '').trim() || 'Graduate Trainee / SDE';
        const ctc = String(row[4] || '').trim() || 'Not Disclosed';
        const batch = String(row[5] || '2027').trim();
        const rawCollege = String(row[6] || '').trim();
        const eventTime = String(row[1] || '').trim() || '10:00 AM';
        const { collegeObj, coordinatorObj } = parseCollegeAndCoordinator(rawCollege);
        if (!collegeObj)
            continue;
        const companyId = companyMap.get(companyName.toLowerCase().trim()) || undefined;
        docsToInsert.push({
            lead_type: 'positive',
            lead_date: currentDate || new Date('2026-08-19'),
            event_time: eventTime,
            company_name: companyName,
            company_id: companyId,
            job_role: role,
            ctc: ctc,
            eligible_batch: batch,
            college_id: collegeObj._id,
            coordinator_id: coordinatorObj._id,
            remarks: `Imported from Positive Tracker — Date: ${currentDate?.toLocaleDateString() || '19-Aug-2026'}`,
            is_moved_to_jd: false,
            is_finalized: false,
            is_deleted: false,
        });
    }
    // 2. Process JD RECEIVED (From Row 151 / 19-Aug-2026+)
    const jdSheet = workbook.Sheets['JD RECEIVED'];
    const jdData = XLSX.utils.sheet_to_json(jdSheet, { header: 1, raw: false });
    let currentJdDate = null;
    for (let i = 0; i < jdData.length; i++) {
        const row = jdData[i];
        if (!row || row.length === 0)
            continue;
        for (let c = 0; c < row.length; c++) {
            const cellVal = String(row[c] || '').trim();
            if (cellVal.startsWith('CALL POSTIVES') || cellVal.match(/^\d{1,2}[-/]\w+[-/]?\d{0,4}$/)) {
                const d = parseDate(cellVal);
                if (d)
                    currentJdDate = d;
            }
        }
        const firstCell = String(row[0] || '').trim();
        if (firstCell === 'SI.NO')
            continue;
        if (i < 150)
            continue; // Start from Row 151 (19-Aug-2026)
        const companyName = String(row[2] || '').trim();
        if (!companyName)
            continue;
        const role = String(row[3] || '').trim() || 'Role / JD Received';
        const ctc = String(row[4] || '').trim() || 'Not Disclosed';
        let colVal = String(row[5] || '').trim();
        let batchVal = String(row[6] || '').trim();
        if (colVal.includes('202') || colVal.includes('Batch')) {
            const temp = colVal;
            colVal = batchVal;
            batchVal = temp;
        }
        const eventTime = String(row[1] || '').trim() || '11:00 AM';
        const { collegeObj, coordinatorObj } = parseCollegeAndCoordinator(colVal);
        if (!collegeObj)
            continue;
        const companyId = companyMap.get(companyName.toLowerCase().trim()) || undefined;
        docsToInsert.push({
            lead_type: 'jd_received',
            lead_date: currentJdDate || new Date('2026-08-19'),
            event_time: eventTime,
            company_name: companyName,
            company_id: companyId,
            job_role: role,
            ctc: ctc,
            eligible_batch: batchVal || '2027',
            college_id: collegeObj._id,
            coordinator_id: coordinatorObj._id,
            remarks: `Imported from JD Received Tracker — Date: ${currentJdDate?.toLocaleDateString() || '19-Aug-2026'}`,
            is_moved_to_jd: true,
            is_finalized: false,
            is_deleted: false,
        });
    }
    console.log(`📦 Prepared ${docsToInsert.length} DailyLead records for insertion.`);
    const inserted = await DailyLead_1.DailyLead.insertMany(docsToInsert);
    console.log(`✅ Successfully inserted ${inserted.length} Daily Leads into MongoDB!`);
    const [posCount, jdCount] = await Promise.all([
        DailyLead_1.DailyLead.countDocuments({ lead_type: 'positive', is_deleted: false }),
        DailyLead_1.DailyLead.countDocuments({ lead_type: 'jd_received', is_deleted: false }),
    ]);
    console.log('\n==============================================');
    console.log(' DATABASE DAILY LEADS STATUS AFTER IMPORT');
    console.log('==============================================');
    console.log(`1. Daily Leads — Positives Tab:   ${posCount} records`);
    console.log(`2. Daily Leads — JD Received Tab: ${jdCount} records`);
    console.log(`3. Total Daily Leads:             ${posCount + jdCount} records`);
    console.log('==============================================');
    await (0, database_1.disconnectDatabase)();
}
if (require.main === module) {
    importDailyLeads()
        .then(() => process.exit(0))
        .catch((err) => {
        console.error('❌ Import failed:', err);
        process.exit(1);
    });
}
