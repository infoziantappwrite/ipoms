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
exports.importFilled152Placeholders = importFilled152Placeholders;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const xlsx = __importStar(require("xlsx"));
const CompanyMetadata_1 = require("../models/CompanyMetadata");
const database_1 = require("../config/database");
function cleanString(val) {
    if (val === undefined || val === null)
        return '';
    return String(val).trim();
}
function parsePhoneNumbers(val) {
    const raw = cleanString(val);
    if (!raw || raw === '—' || raw === '-' || raw === 'N/A' || raw === 'nil')
        return [];
    return raw
        .split(/[,;\/\n\r]+/)
        .map((p) => p.replace(/[^\d+]/g, '').trim())
        .filter((p) => p.length >= 7 && p.length <= 15);
}
function parseEmails(val) {
    const raw = cleanString(val);
    if (!raw || raw === '—' || raw === '-' || raw === 'N/A' || raw === 'nil')
        return [];
    return raw
        .split(/[,;\/\s\n\r]+/)
        .map((e) => e.trim().toLowerCase().replace(/^mailto:/, ''))
        .filter((e) => e.includes('@') && e.includes('.'));
}
async function importFilled152Placeholders(customPath) {
    console.log('\n===============================================================');
    console.log('📥 IMPORTING COMPLETED 152 PLACEHOLDER DATA INTO METADATA');
    console.log('===============================================================\n');
    const possiblePaths = [
        customPath,
        'C:\\Users\\admin\\Downloads\\152_Missing_Placeholder_Companies.xlsx',
        path_1.default.resolve(__dirname, '../../../152_Missing_Placeholder_Companies.xlsx'),
        path_1.default.resolve(__dirname, '../../152_Missing_Placeholder_Companies.xlsx')
    ].filter(Boolean);
    let excelPath = '';
    for (const p of possiblePaths) {
        if (fs_1.default.existsSync(p)) {
            excelPath = p;
            break;
        }
    }
    if (!excelPath) {
        console.error(`❌ Could not locate the filled Excel workbook at any of:\n${possiblePaths.join('\n')}`);
        return;
    }
    console.log(`📖 Loading Filled Workbook: ${excelPath}`);
    const wb = xlsx.readFile(excelPath, { cellDates: true });
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });
    console.log(`📋 Total rows to process: ${rows.length}`);
    await (0, database_1.connectDatabase)();
    let updatedCount = 0;
    let skippedCount = 0;
    for (const row of rows) {
        const snoRaw = row['S.No'] || row['sno'] || row['S.NO'] || row['Serial Number'];
        const sno = parseInt(String(snoRaw).trim(), 10);
        if (!sno || isNaN(sno)) {
            skippedCount++;
            continue;
        }
        const companyName = cleanString(row['Company Name'] || row['company_name']);
        const hrName = cleanString(row['HR Name'] || row['hr_name']);
        const hrDesignation = cleanString(row['HR Designation'] || row['hr_designation']);
        const primaryMobileRaw = cleanString(row['Mobile Number (Primary)*'] || row['primary_mobile'] || row['Mobile Number'] || row['Phone']);
        const altMobilesRaw = cleanString(row['Alternate Mobile Numbers'] || row['alt_mobiles']);
        const primaryEmailRaw = cleanString(row['Email ID (Primary)'] || row['primary_email'] || row['Email ID'] || row['Email']);
        const companyType = cleanString(row['Company Type / Sector'] || row['company_type']);
        const notes = cleanString(row['Notes / Remarks'] || row['notes']);
        const primaryMobiles = parsePhoneNumbers(primaryMobileRaw);
        const altMobiles = parsePhoneNumbers(altMobilesRaw);
        const allMobiles = Array.from(new Set([...primaryMobiles, ...altMobiles]));
        const emails = parseEmails(primaryEmailRaw);
        const targetDoc = await CompanyMetadata_1.CompanyMetadata.findOne({ serial_number: sno, is_deleted: false });
        if (!targetDoc) {
            console.warn(`   ⚠️ Record #${sno} ("${companyName}") not found in DB.`);
            skippedCount++;
            continue;
        }
        const updatePayload = {
            updated_at: new Date()
        };
        if (hrName && hrName !== '—')
            updatePayload.hr_name = hrName;
        if (hrDesignation && hrDesignation !== '—')
            updatePayload.hr_designation = hrDesignation;
        if (allMobiles.length > 0) {
            updatePayload.primary_mobile = allMobiles[0];
            updatePayload.mobile_numbers = Array.from(new Set([...(targetDoc.mobile_numbers || []), ...allMobiles]));
        }
        if (emails.length > 0) {
            updatePayload.primary_email = emails[0];
            updatePayload.email_ids = Array.from(new Set([...(targetDoc.email_ids || []), ...emails]));
        }
        if (companyType && companyType !== 'other' && !targetDoc.company_type) {
            updatePayload.company_type = companyType;
        }
        if (notes) {
            updatePayload.notes = targetDoc.notes ? `${targetDoc.notes} | ${notes}` : notes;
        }
        await CompanyMetadata_1.CompanyMetadata.updateOne({ _id: targetDoc._id }, { $set: updatePayload });
        console.log(`   ✅ Updated #${sno} "${targetDoc.company_name}" -> HR: "${hrName || '—'}", Mobile: "${allMobiles[0] || '—'}", Email: "${emails[0] || '—'}"`);
        updatedCount++;
    }
    console.log('\n===============================================================');
    console.log(`✨ IMPORT SUMMARY: Successfully updated ${updatedCount} records (Skipped: ${skippedCount})`);
    console.log('===============================================================\n');
    await (0, database_1.disconnectDatabase)();
}
if (require.main === module) {
    importFilled152Placeholders().catch(console.error);
}
