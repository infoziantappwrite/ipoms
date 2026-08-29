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
exports.generateMissingMobilesExcel = generateMissingMobilesExcel;
const xlsx = __importStar(require("xlsx"));
const CompanyMetadata_1 = require("../models/CompanyMetadata");
async function generateMissingMobilesExcel() {
    const emptyFilter = {
        is_deleted: false,
        $or: [
            { primary_mobile: { $exists: false } },
            { primary_mobile: null },
            { primary_mobile: '' },
            { primary_mobile: { $regex: '^[\\s\\-\\.]*$' } },
        ],
    };
    const companies = await CompanyMetadata_1.CompanyMetadata.find(emptyFilter)
        .sort({ serial_number: 1, _id: 1 })
        .lean();
    const excelRows = companies.map((c) => ({
        'S.No': c.serial_number ?? '',
        'Company Name': c.company_name ?? '',
        'HR Contact Person': c.hr_name ?? '',
        'HR Designation': c.hr_designation ?? '',
        'Mobile Numbers': c.primary_mobile || (Array.isArray(c.mobile_numbers) ? c.mobile_numbers.join(', ') : ''),
        'Email ID(s)': c.primary_email || (Array.isArray(c.email_ids) ? c.email_ids.join(', ') : ''),
        'Industry Type': c.company_type ?? 'other',
        'Location': c.location ?? '',
        'Notes': c.notes ?? '',
    }));
    const worksheet = xlsx.utils.json_to_sheet(excelRows);
    // Set column widths for clean readability
    worksheet['!cols'] = [
        { wch: 8 }, // S.No
        { wch: 38 }, // Company Name
        { wch: 28 }, // HR Contact Person
        { wch: 20 }, // HR Designation
        { wch: 18 }, // Mobile Numbers
        { wch: 35 }, // Email ID(s)
        { wch: 18 }, // Industry Type
        { wch: 22 }, // Location
        { wch: 30 }, // Notes
    ];
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Missing Mobiles');
    const outputPath = 'C:\\Projects\\iPOMS\\missing.xlsx';
    xlsx.writeFile(workbook, outputPath);
    return {
        success: true,
        filePath: outputPath,
        totalCount: companies.length,
        message: `Generated missing.xlsx with ${companies.length} records successfully.`,
    };
}
