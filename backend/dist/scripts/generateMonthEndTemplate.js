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
const xlsx = __importStar(require("xlsx"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
function createMonthEndTemplate() {
    const outputDir = path_1.default.resolve(__dirname, '../../../frontend/public/templates');
    if (!fs_1.default.existsSync(outputDir)) {
        fs_1.default.mkdirSync(outputDir, { recursive: true });
    }
    const outputPath = path_1.default.join(outputDir, 'Month_End_Report_Template.xlsx');
    const wb = xlsx.utils.book_new();
    // Sheet 1: Company Conversions
    const conversionsData = [
        {
            'S.No': 1,
            'Company Name': 'Zoho Corporation',
            'Role': 'Software Development Engineer',
            'CTC': '8.5 LPA',
            'College Name': 'Dr. Mahalingam College of Engineering and Technology',
            'JD Received Date': '2026-08-12',
        },
        {
            'S.No': 2,
            'Company Name': 'TCS (Tata Consultancy Services)',
            'Role': 'Ninja & Digital Developer',
            'CTC': '7.2 LPA',
            'College Name': 'Knowledge Institute of Technology',
            'JD Received Date': '2026-08-18',
        },
        {
            'S.No': 3,
            'Company Name': 'LTIMindtree',
            'Role': 'Graduate Engineer Trainee',
            'CTC': '6.0 LPA',
            'College Name': 'KPR Institute of Engineering and Technology',
            'JD Received Date': '2026-08-22',
        },
    ];
    const ws1 = xlsx.utils.json_to_sheet(conversionsData);
    ws1['!cols'] = [{ wch: 6 }, { wch: 30 }, { wch: 30 }, { wch: 15 }, { wch: 45 }, { wch: 18 }];
    xlsx.utils.book_append_sheet(wb, ws1, '1. Company Conversions');
    // Sheet 2: Company Drives Scheduled
    const drivesData = [
        {
            'S.No': 1,
            'Company Name': 'Zoho Corporation',
            'College Name': 'Dr. Mahalingam College of Engineering and Technology',
            'Scheduled Date': '2026-08-28',
            'Offer Count': 14,
        },
        {
            'S.No': 2,
            'Company Name': 'TCS (Tata Consultancy Services)',
            'College Name': 'Knowledge Institute of Technology',
            'Scheduled Date': '2026-08-30',
            'Offer Count': 28,
        },
        {
            'S.No': 3,
            'Company Name': 'Cognizant Technology Solutions',
            'College Name': 'Kalasalingam Academy of Research and Education',
            'Scheduled Date': '2026-09-04',
            'Offer Count': 0,
        },
    ];
    const ws2 = xlsx.utils.json_to_sheet(drivesData);
    ws2['!cols'] = [{ wch: 6 }, { wch: 30 }, { wch: 45 }, { wch: 18 }, { wch: 15 }];
    xlsx.utils.book_append_sheet(wb, ws2, '2. Drives Scheduled');
    // Sheet 3: Guide & Month End Deadlines
    const guideData = [
        { 'Parameter': 'Report Type', 'Value': 'Month-End Report (Individual Coordinator Submission)' },
        { 'Parameter': 'Submission Cadence', 'Value': 'Every Month-End (e.g. 30th, 31st, or 28th/29th Feb)' },
        { 'Parameter': 'Top KPI Cards', 'Value': '1. Colleges Handled | 2. Conversions Count | 3. Drives Scheduled | 4. Offers Moved' },
        { 'Parameter': 'Table 1', 'Value': 'Company Conversions (Company, Role, CTC, College Name, JD Received Date)' },
        { 'Parameter': 'Table 2', 'Value': 'Company Drives Scheduled (Company, College Name, Scheduled Date, Offer Count)' },
        { 'Parameter': 'Export Format', 'Value': 'Direct A4 PDF Export & Excel Spreadsheet' },
    ];
    const ws3 = xlsx.utils.json_to_sheet(guideData);
    ws3['!cols'] = [{ wch: 25 }, { wch: 70 }];
    xlsx.utils.book_append_sheet(wb, ws3, 'Instructions & Guide');
    xlsx.writeFile(wb, outputPath);
    console.log(`✅ Template created at: ${outputPath}`);
}
createMonthEndTemplate();
