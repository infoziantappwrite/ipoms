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
const xlsx = __importStar(require("xlsx"));
const database_1 = require("../config/database");
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
function parseWeeklySheet(sheet) {
    const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    const entries = [];
    let currentSection = null;
    let headerMap = {};
    for (let r = 0; r < rawRows.length; r++) {
        const row = rawRows[r];
        if (!row || row.length === 0)
            continue;
        const strRow = row.map((cell) => (cell !== undefined && cell !== null ? String(cell).trim() : ''));
        const joinedRow = strRow.join(' ').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
        if (!joinedRow)
            continue;
        let detectedSection = null;
        for (const mapping of SECTION_HEADERS_MAP) {
            if (mapping.pattern.test(joinedRow)) {
                detectedSection = mapping.section;
                break;
            }
        }
        if (detectedSection) {
            currentSection = detectedSection;
            headerMap = {};
            continue;
        }
        if (strRow.some((c) => /s\.?\s*no|si\.?\s*no/i.test(c)) &&
            strRow.some((c) => /company/i.test(c))) {
            headerMap = {};
            strRow.forEach((colName, colIdx) => {
                const lower = colName.toLowerCase().replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
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
        if (/status\s+count|total\s+status|in\s+progress\s+count|pipeline\s+count|completed\s+count/i.test(joinedRow)) {
            continue;
        }
        if (currentSection) {
            const sNoVal = headerMap['sNo'] !== undefined ? strRow[headerMap['sNo']] : strRow[0];
            const companyVal = headerMap['companyName'] !== undefined ? strRow[headerMap['companyName']] : strRow[1];
            const roleVal = headerMap['role'] !== undefined ? strRow[headerMap['role']] : strRow[2];
            const ctcVal = headerMap['ctc'] !== undefined ? strRow[headerMap['ctc']] : strRow[3];
            const statusVal = headerMap['status'] !== undefined ? strRow[headerMap['status']] : strRow[4];
            const offersVal = headerMap['offers'] !== undefined ? strRow[headerMap['offers']] : '';
            const followUpVal = headerMap['followUp'] !== undefined ? strRow[headerMap['followUp']] : '';
            const batchVal = headerMap['batch'] !== undefined ? strRow[headerMap['batch']] : '';
            const cleanCompany = (companyVal || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
            if (!cleanCompany || cleanCompany === '#VALUE!' || cleanCompany.length < 2) {
                continue;
            }
            const cleanRole = (roleVal || 'Graduate Trainee').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
            const lowerComp = cleanCompany.toLowerCase();
            const lowerRole = cleanRole.toLowerCase();
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
            let offersNum = 0;
            if (offersVal && !isNaN(Number(offersVal))) {
                offersNum = Number(offersVal);
            }
            let cleanCtc = (ctcVal || '').replace(/[\t\r\n]+/g, ' ').trim();
            if (cleanCtc.toLowerCase() === 'not mentioned' || cleanCtc === '-') {
                cleanCtc = '';
            }
            const cleanStatus = (statusVal || 'In discussion with HR').replace(/[\t\r\n]+/g, ' ').trim();
            let parsedFollowUpDate = '';
            if (followUpVal) {
                const num = Number(followUpVal);
                if (!isNaN(num) && num > 40000 && num < 60000) {
                    const d = new Date(Math.round((num - 25569) * 86400 * 1000));
                    parsedFollowUpDate = d.toISOString().split('T')[0];
                }
                else {
                    parsedFollowUpDate = String(followUpVal).trim();
                }
            }
            let finalSection = currentSection;
            if (currentSection === 'rejected_by_hr' &&
                /rejected by (the )?college|response from (the )?college|college in connect|low package|bda role|tpo|no\s+m\.com/i.test(cleanStatus)) {
                finalSection = 'rejected_by_college';
            }
            entries.push({
                section: finalSection,
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
async function run() {
    await (0, database_1.connectDatabase)();
    const filePath = 'C:\\Users\\admin\\Downloads\\Weekly Report.xlsx';
    const workbook = xlsx.readFile(filePath);
    const allSheets = workbook.SheetNames;
    console.log('Available sheets in workbook:', allSheets);
    const dbColleges = await College_1.College.find({ is_deleted: { $ne: true } });
    console.log(`Found ${dbColleges.length} colleges in DB.`);
    let coordinator = await User_1.User.findOne({
        $or: [{ username: 'megaladevi' }, { role_codes: 'PLACEMENT_COORDINATOR' }],
    });
    if (!coordinator)
        coordinator = await User_1.User.findOne();
    // Alias Map for sheets that might have variations
    const ALIAS_MAP = {
        ACHARIYA: 'ACET',
        KAMARAJ: 'KCET',
        AIHT: 'AIHT',
        KPR: 'KPR',
        KARPAGAM: 'KCE',
        MKCE: 'MKCE',
        SONA: 'SONA',
        SMVEC: 'SMVEC',
        DSU: 'DSU',
        PSNA: 'PSNA',
        NPR: 'NPR',
        KGISL: 'KGiSL',
        AAA: 'AAA',
        EGS: 'EGS',
        KARUNYA: 'KU',
        NEHRU: 'NICE',
        HITS: 'HITS',
        NGCE: 'NGCE',
        'MAR EPHRAEM': 'MAR',
        ACEW: 'ACEW',
    };
    const results = [];
    for (const sheetName of allSheets) {
        if (sheetName.trim().toUpperCase() === 'PENDING') {
            console.log(`⏭️  Skipping sheet '${sheetName}' (Pending list)`);
            continue;
        }
        if (sheetName.trim().toUpperCase() === 'KIOT' || sheetName.trim().toUpperCase() === 'KLU') {
            console.log(`ℹ️  Sheet '${sheetName}' was already seeded previously.`);
        }
        const sheet = workbook.Sheets[sheetName];
        if (!sheet)
            continue;
        const parsedEntries = parseWeeklySheet(sheet);
        if (parsedEntries.length === 0) {
            console.log(`⚠️ Sheet '${sheetName}' has 0 valid parsed rows.`);
            continue;
        }
        // Match College
        const upperSheet = sheetName.trim().toUpperCase();
        let college = dbColleges.find((c) => c.college_code?.toUpperCase() === upperSheet || c.college_name?.toUpperCase().includes(upperSheet));
        if (!college && ALIAS_MAP[upperSheet]) {
            const targetCode = ALIAS_MAP[upperSheet].toUpperCase();
            college = dbColleges.find((c) => c.college_code?.toUpperCase() === targetCode);
        }
        if (!college) {
            // Find closest fuzzy match
            college = dbColleges.find((c) => c.college_name.toLowerCase().includes(sheetName.toLowerCase()) ||
                sheetName.toLowerCase().includes(c.college_code.toLowerCase()));
        }
        if (!college) {
            // Create college if missing
            console.log(`Creating new College record for sheet '${sheetName}'...`);
            college = await College_1.College.create({
                college_name: `${sheetName} College of Engineering & Technology`,
                college_code: sheetName.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8),
                location: 'Tamil Nadu',
                is_active: true,
            });
            dbColleges.push(college);
        }
        // Remove existing records for 2026 for this college
        await WeeklyTracker_1.WeeklyTracker.deleteMany({
            college_id: college._id,
            academic_year: 2026,
        });
        const breakdown = {
            completed: 0,
            in_progress: 0,
            pipeline: 0,
            top_companies: 0,
            rejected_by_hr: 0,
            rejected_by_college: 0,
        };
        for (const entry of parsedEntries) {
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
            breakdown[entry.section] = (breakdown[entry.section] || 0) + 1;
        }
        const totalRows = Object.values(breakdown).reduce((a, b) => a + b, 0);
        console.log(`✅ [${sheetName}] Seeded ${totalRows} rows -> College: ${college.college_name} (${college.college_code})`);
        results.push({
            sheetName,
            collegeName: college.college_name,
            collegeCode: college.college_code,
            total: totalRows,
            breakdown,
        });
    }
    console.log('\n=================== IMPORT SUMMARY ===================');
    console.table(results.map((r) => ({
        Sheet: r.sheetName,
        College: r.collegeCode,
        Completed: r.breakdown.completed,
        InProgress: r.breakdown.in_progress,
        Pipeline: r.breakdown.pipeline,
        Top: r.breakdown.top_companies,
        RejHR: r.breakdown.rejected_by_hr,
        RejCollege: r.breakdown.rejected_by_college,
        Total: r.total,
    })));
    await (0, database_1.disconnectDatabase)();
}
run().catch(console.error);
