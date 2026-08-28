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
exports.reloadMetaDatabaseFromFile = reloadMetaDatabaseFromFile;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const xlsx = __importStar(require("xlsx"));
const CompanyMetadata_1 = require("../models/CompanyMetadata");
const cleanString = (val) => {
    if (val === undefined || val === null)
        return '';
    return String(val).trim();
};
const parsePhoneNumbers = (val) => {
    const raw = cleanString(val);
    if (!raw)
        return [];
    return raw
        .split(/[,;\/\n\r|]+/)
        .map((p) => p.replace(/[^\d+]/g, '').trim())
        .filter((p) => p.length >= 7);
};
const parseEmails = (val) => {
    const raw = cleanString(val);
    if (!raw)
        return [];
    return raw
        .split(/[,;\/\s\n\r|]+/)
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.includes('@') && e.includes('.'));
};
const detectCompanyType = (companyName) => {
    const name = companyName.toLowerCase();
    if (name.includes('construction') || name.includes('builder') || name.includes('infra') || name.includes('estate'))
        return 'construction';
    if (name.includes('pharma') || name.includes('health') || name.includes('biotech') || name.includes('medical') || name.includes('hospital'))
        return 'pharma';
    if (name.includes('bank') || name.includes('finance') || name.includes('fintech') || name.includes('capital') || name.includes('invest'))
        return 'banking';
    if (name.includes('edtech') || name.includes('academy') || name.includes('learning') || name.includes('school'))
        return 'edtech';
    if (name.includes('ai ') || name.includes('robotics') || name.includes('analytics') || name.includes('intelligence'))
        return 'ai';
    if (name.includes('tech') || name.includes('soft') || name.includes('info') || name.includes('solution') || name.includes('digital') || name.includes('cloud') || name.includes('system') || name.includes('cyber'))
        return 'software';
    if (name.includes('auto') || name.includes('motor') || name.includes('engineer') || name.includes('steel') || name.includes('power'))
        return 'core_engineering';
    if (name.includes('bpo') || name.includes('consulting') || name.includes('service'))
        return 'consulting';
    return 'other';
};
async function reloadMetaDatabaseFromFile(customPath) {
    const possiblePaths = [
        customPath,
        'C:\\Users\\admin\\Downloads\\Meta Database.xlsx',
        path_1.default.resolve(__dirname, '../../../Meta Database.xlsx'),
        path_1.default.resolve(__dirname, '../../Meta Database.xlsx'),
    ].filter(Boolean);
    let targetPath = '';
    for (const p of possiblePaths) {
        if (fs_1.default.existsSync(p)) {
            targetPath = p;
            break;
        }
    }
    if (!targetPath) {
        console.warn('⚠️ [Meta Database Reload] File not found at C:\\Users\\admin\\Downloads\\Meta Database.xlsx. Skipping.');
        return {
            success: false,
            totalImported: 0,
            filePath: '',
            message: 'Meta Database file not found in Downloads.',
        };
    }
    console.log(`\n=============================================================`);
    console.log(`🚀 [Meta Database Reload] Loading workbook from: ${targetPath}`);
    console.log(`=============================================================\n`);
    const workbook = xlsx.readFile(targetPath);
    const sheetName = workbook.SheetNames.includes('Meta Database')
        ? 'Meta Database'
        : workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawRows = xlsx.utils.sheet_to_json(worksheet, { defval: '' });
    console.log(`📊 [Meta Database Reload] Found ${rawRows.length} rows in sheet "${sheetName}".`);
    if (rawRows.length === 0) {
        return {
            success: false,
            totalImported: 0,
            filePath: targetPath,
            message: `No rows found in sheet "${sheetName}".`,
        };
    }
    // 1. Erase everything from CompanyMetadata collection as requested
    const deleteResult = await CompanyMetadata_1.CompanyMetadata.deleteMany({});
    console.log(`🗑️ [Meta Database Reload] Cleared ${deleteResult.deletedCount} old records from CompanyMetadata.`);
    // 2. Parse and batch insert
    const documentsToInsert = [];
    for (let i = 0; i < rawRows.length; i++) {
        const row = rawRows[i];
        const serialNumber = Number(row['Serial Number'] || row['S.No'] || row['SNo'] || row['S. No'] || row['Sl No'] || (i + 1));
        const companyName = cleanString(row['Company Name'] || row['Company'] || row['company_name'] || row['Organization']);
        const hrName = cleanString(row['HR Name'] || row['Contact Person'] || row['hr_name'] || row['Name'] || row['HR']);
        const rawMobile = row['Mobile Number'] || row['Phone Number'] || row['Mobile'] || row['Contact Number'] || row['Phone'];
        const rawEmail = row['Email ID'] || row['Email'] || row['Official Email'] || row['Email Address'] || row['Mail'];
        if (!companyName || companyName === '#VALUE!' || companyName.length < 2) {
            continue;
        }
        const mobileNumbers = parsePhoneNumbers(rawMobile);
        const emailIds = parseEmails(rawEmail);
        const primaryMobile = mobileNumbers.length > 0 ? mobileNumbers[0] : '';
        const primaryEmail = emailIds.length > 0 ? emailIds[0] : '';
        documentsToInsert.push({
            serial_number: serialNumber || (documentsToInsert.length + 1),
            company_name: companyName,
            hr_name: hrName,
            primary_mobile: primaryMobile,
            mobile_numbers: mobileNumbers,
            primary_email: primaryEmail,
            email_ids: emailIds,
            company_type: detectCompanyType(companyName),
            industry_sector: detectCompanyType(companyName) === 'software' ? 'Information Technology' : 'General Corporate',
            notes: cleanString(row['Notes'] || row['Remarks'] || ''),
            is_deleted: false,
            created_at: new Date(),
            updated_at: new Date(),
        });
    }
    if (documentsToInsert.length > 0) {
        const CHUNK_SIZE = 1000;
        for (let i = 0; i < documentsToInsert.length; i += CHUNK_SIZE) {
            const chunk = documentsToInsert.slice(i, i + CHUNK_SIZE);
            await CompanyMetadata_1.CompanyMetadata.insertMany(chunk, { ordered: false });
        }
    }
    console.log(`🎉 [Meta Database Reload] Successfully uploaded ${documentsToInsert.length} contacts into Meta Database.`);
    return {
        success: true,
        totalImported: documentsToInsert.length,
        filePath: targetPath,
        message: `Successfully loaded ${documentsToInsert.length} contacts into Meta Database. Old data erased.`,
    };
}
