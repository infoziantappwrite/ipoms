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
exports.parseSheetData = parseSheetData;
exports.importWeeklySheetForCollege = importWeeklySheetForCollege;
const fs = __importStar(require("fs"));
const xlsx = __importStar(require("xlsx"));
const College_1 = require("../models/College");
const CompanyMetadata_1 = require("../models/CompanyMetadata");
const User_1 = require("../models/User");
const WeeklyTracker_1 = require("../models/WeeklyTracker");
const SECTION_HEADERS_MAP = [
    { pattern: /companies\s+completed/i, section: 'completed' },
    { pattern: /companies\s+in\s+progress/i, section: 'in_progress' },
    { pattern: /companies\s+in\s+pipeline/i, section: 'pipeline' },
    { pattern: /top\s+companies/i, section: 'top_companies' },
    { pattern: /companies\s+on\s+hold\s+by\s+hr|rejected\s+companies/i, section: 'rejected_by_hr' },
    { pattern: /companies\s+on\s+hold\s+by\s+college|rejected\s+by\s+college/i, section: 'rejected_by_college' },
];
function parseSheetData(sheet) {
    const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    const entries = [];
    let currentSection = null;
    let isHeaderRow = false;
    let headerMap = {};
    for (let r = 0; r < rawRows.length; r++) {
        const row = rawRows[r];
        if (!row || row.length === 0)
            continue;
        // Convert row cells to strings
        const strRow = row.map((cell) => (cell !== undefined && cell !== null ? String(cell).trim() : ''));
        const joinedRow = strRow.join(' ').trim();
        if (!joinedRow)
            continue;
        // Check if row is a Section Header
        let detectedSection = null;
        for (const mapping of SECTION_HEADERS_MAP) {
            if (mapping.pattern.test(joinedRow)) {
                detectedSection = mapping.section;
                break;
            }
        }
        if (detectedSection) {
            currentSection = detectedSection;
            isHeaderRow = true;
            headerMap = {};
            continue;
        }
        // Check if row is the Column Definition Header row (e.g. S.No, Company Name, Role, CTC...)
        if (strRow.some((c) => /s\.?\s*no|si\.?\s*no/i.test(c)) &&
            strRow.some((c) => /company/i.test(c))) {
            headerMap = {};
            strRow.forEach((colName, colIdx) => {
                const lower = colName.toLowerCase().trim();
                if (/s\.?\s*no|si\.?\s*no/i.test(lower))
                    headerMap['sNo'] = colIdx;
                else if (/company\s*name|company/i.test(lower))
                    headerMap['companyName'] = colIdx;
                else if (/role/i.test(lower))
                    headerMap['role'] = colIdx;
                else if (/ctc/i.test(lower))
                    headerMap['ctc'] = colIdx;
                else if (/status/i.test(lower))
                    headerMap['status'] = colIdx;
                else if (/offers|no\s+of\s+offers/i.test(lower))
                    headerMap['offers'] = colIdx;
                else if (/follow\s*up/i.test(lower))
                    headerMap['followUp'] = colIdx;
                else if (/batch/i.test(lower))
                    headerMap['batch'] = colIdx;
            });
            continue;
        }
        // Skip summary / stats table at bottom
        if (/status\s+count|total\s+status|in\s+progress\s+count|pipeline\s+count|completed\s+count/i.test(joinedRow)) {
            continue;
        }
        // If we are in a section, parse data row
        if (currentSection) {
            const sNoVal = headerMap['sNo'] !== undefined ? strRow[headerMap['sNo']] : strRow[0];
            const companyVal = headerMap['companyName'] !== undefined ? strRow[headerMap['companyName']] : strRow[1];
            const roleVal = headerMap['role'] !== undefined ? strRow[headerMap['role']] : strRow[2];
            const ctcVal = headerMap['ctc'] !== undefined ? strRow[headerMap['ctc']] : strRow[3];
            const statusVal = headerMap['status'] !== undefined ? strRow[headerMap['status']] : strRow[4];
            const offersVal = headerMap['offers'] !== undefined ? strRow[headerMap['offers']] : '';
            const followUpVal = headerMap['followUp'] !== undefined ? strRow[headerMap['followUp']] : '';
            const batchVal = headerMap['batch'] !== undefined ? strRow[headerMap['batch']] : '';
            // Must have a valid company name
            const cleanCompany = (companyVal || '').replace(/[\t\r\n]+/g, ' ').trim();
            if (!cleanCompany || cleanCompany === '#VALUE!' || cleanCompany.length < 2) {
                continue;
            }
            // Clean role
            const cleanRole = (roleVal || 'Graduate Trainee').replace(/[\t\r\n]+/g, ' ').trim();
            const lowerRole = cleanRole.toLowerCase();
            // Ignore noise rows
            const lowerComp = cleanCompany.toLowerCase();
            if (lowerComp === 'status' ||
                lowerComp === 'count' ||
                lowerComp === 'total' ||
                lowerComp === 's.no' ||
                lowerComp === 'si.no' ||
                lowerComp === 'company name' ||
                lowerComp === 'role' ||
                lowerComp === 'ctc' ||
                lowerComp === 'in progress' ||
                lowerComp === 'pipeline' ||
                lowerComp === 'completed' ||
                lowerComp === 'top companies' ||
                lowerRole === 'count' ||
                lowerRole === 'role' ||
                lowerComp.startsWith('status count') ||
                lowerComp.startsWith('total status') ||
                lowerComp.startsWith('in progress count') ||
                lowerComp.startsWith('pipeline count') ||
                lowerComp.startsWith('completed count')) {
                continue;
            }
            // Parse offers count
            let offersNum = 0;
            if (offersVal && !isNaN(Number(offersVal))) {
                offersNum = Number(offersVal);
            }
            // Clean CTC
            let cleanCtc = (ctcVal || '').replace(/[\t\r\n]+/g, ' ').trim();
            if (cleanCtc.toLowerCase() === 'not mentioned' || cleanCtc === '-') {
                cleanCtc = '';
            }
            // Clean Status
            const cleanStatus = (statusVal || 'In discussion with HR').replace(/[\t\r\n]+/g, ' ').trim();
            // Parse follow-up date
            let parsedFollowUpDate = '';
            if (followUpVal) {
                const num = Number(followUpVal);
                if (!isNaN(num) && num > 40000 && num < 60000) {
                    // Excel serial date to YYYY-MM-DD
                    const d = new Date(Math.round((num - 25569) * 86400 * 1000));
                    parsedFollowUpDate = d.toISOString().split('T')[0];
                }
                else {
                    parsedFollowUpDate = String(followUpVal).trim();
                }
            }
            entries.push({
                section: currentSection,
                sNo: Number(sNoVal) || entries.length + 1,
                companyName: cleanCompany,
                role: cleanRole || 'Graduate Trainee',
                ctc: cleanCtc,
                status: cleanStatus,
                offersReceived: offersNum,
                followUpDate: parsedFollowUpDate,
                batch: batchVal || '2026 Batch',
            });
        }
    }
    return entries;
}
async function importWeeklySheetForCollege(sheetName) {
    const candidatePaths = [
        'C:\\Users\\admin\\Downloads\\Weekly .xlsx',
        'C:\\Users\\admin\\Downloads\\Weekly Report 2027 BATCH (1).xlsx',
        'C:\\Users\\admin\\Downloads\\Weekly Report 2027 BATCH.xlsx',
        'C:\\Users\\admin\\Downloads\\Weekly Report.xlsx',
    ];
    const filePath = candidatePaths.find((p) => fs.existsSync(p)) || candidatePaths[0];
    const workbook = xlsx.readFile(filePath);
    const matchedSheetKey = workbook.SheetNames.find((s) => s.trim().toLowerCase() === sheetName.trim().toLowerCase());
    if (!matchedSheetKey) {
        throw new Error(`Sheet '${sheetName}' not found in workbook. Available sheets: ${workbook.SheetNames.join(', ')}`);
    }
    const sheet = workbook.Sheets[matchedSheetKey];
    const parsedEntries = parseSheetData(sheet);
    // Match College in DB
    const normalizedKey = sheetName.trim().toUpperCase();
    let college = await College_1.College.findOne({
        $or: [
            { college_code: normalizedKey },
            { college_code: new RegExp(`^${normalizedKey}$`, 'i') },
            { college_name: new RegExp(normalizedKey, 'i') },
        ],
    });
    if (!college) {
        // Try alias mappings
        const ALIAS_MAP = {
            ACHARIYA: 'ACET',
            KARPAGAM: 'KARPAGAM',
            'MAR EPHRAEM': 'MAR',
            EGS: 'EGS',
        };
        const mappedCode = ALIAS_MAP[normalizedKey];
        if (mappedCode) {
            college = await College_1.College.findOne({ college_code: mappedCode });
        }
    }
    if (!college) {
        // If not found, create or pick first matching
        college = await College_1.College.findOne();
    }
    if (!college) {
        throw new Error(`No college record found for sheet '${sheetName}'.`);
    }
    // Find Coordinator
    let coordinator = await User_1.User.findOne({
        $or: [{ username: 'megaladevi' }, { role_codes: 'PLACEMENT_COORDINATOR' }],
    });
    if (!coordinator) {
        coordinator = await User_1.User.findOne();
    }
    // Remove existing entries for this college to prevent duplicate entries
    await WeeklyTracker_1.WeeklyTracker.deleteMany({
        college_id: college._id,
        academic_year: 2026,
    });
    const sectionsBreakdown = {
        completed: 0,
        in_progress: 0,
        pipeline: 0,
        top_companies: 0,
        rejected_by_hr: 0,
        rejected_by_college: 0,
    };
    for (const entry of parsedEntries) {
        // Find or create company metadata
        let compMeta = await CompanyMetadata_1.CompanyMetadata.findOne({
            company_name: new RegExp(`^${entry.companyName.trim()}$`, 'i'),
        });
        if (!compMeta) {
            compMeta = await CompanyMetadata_1.CompanyMetadata.create({
                company_name: entry.companyName.trim(),
                company_type: 'software',
                industry_sector: 'Information Technology',
            });
        }
        // Create WeeklyTracker row
        await WeeklyTracker_1.WeeklyTracker.create({
            academic_year: 2026,
            college_id: college._id,
            coordinator_id: coordinator?._id,
            company_id: compMeta._id,
            company_name: entry.companyName.trim(),
            job_role: entry.role || 'Graduate Trainee',
            ctc_lpa: entry.ctc || '',
            eligible_batch: entry.batch?.includes('Batch') ? entry.batch : `${entry.batch || 2026} Batch`,
            pipeline_section: entry.section,
            is_pinned_top: entry.section === 'top_companies',
            current_status_text: entry.status || 'Active engagement',
            selected_count: entry.offersReceived || 0,
            registered_count: entry.offersReceived ? entry.offersReceived * 10 : 0,
            shortlisted_count: entry.offersReceived ? entry.offersReceived * 2 : 0,
            is_deleted: false,
        });
        sectionsBreakdown[entry.section] = (sectionsBreakdown[entry.section] || 0) + 1;
    }
    return {
        success: true,
        sheetName: matchedSheetKey,
        collegeName: college.college_name,
        totalInserted: parsedEntries.length,
        sectionsBreakdown,
        entries: parsedEntries,
    };
}
