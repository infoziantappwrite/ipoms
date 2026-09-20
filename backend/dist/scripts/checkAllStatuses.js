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
async function main() {
    await (0, database_1.connectDatabase)();
    const colleges = await College_1.College.find({ is_deleted: { $ne: true } }).lean();
    const activeCodes = new Set(colleges.map(c => c.college_code.trim().toUpperCase()));
    const wb = XLSX.readFile(FILE_PATH, { cellDates: true, dense: true });
    const sheetProps = (wb.Workbook && wb.Workbook.Sheets) ? wb.Workbook.Sheets : [];
    const allStatuses = new Map();
    for (let i = 0; i < wb.SheetNames.length; i++) {
        const sheetName = wb.SheetNames[i];
        const prop = sheetProps[i];
        const isHidden = prop && (prop.Hidden === 1 || prop.Hidden === 2);
        if (isHidden)
            continue;
        const trimmed = sheetName.trim().toUpperCase();
        if (['POSITIVES', 'JD RECEIVED', 'TRACKER', 'SUMMARY'].includes(trimmed))
            continue;
        if (!activeCodes.has(trimmed)) {
            // Check if it matches any college code
            const found = Array.from(activeCodes).find(code => trimmed.includes(code) || code.includes(trimmed));
            if (!found)
                continue;
        }
        const sheet = wb.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        for (let r = 2; r < json.length; r++) {
            const row = json[r];
            // Column index for response status is usually column 7 (index 7)
            const rawStatus = String(row[7] || '').trim();
            if (rawStatus) {
                allStatuses.set(rawStatus, (allStatuses.get(rawStatus) || 0) + 1);
            }
        }
    }
    console.log('\n=== ALL UNIQUE RESPONSE STATUSES ACROSS ACTIVE COLLEGE SHEETS ===');
    const sorted = Array.from(allStatuses.entries()).sort((a, b) => b[1] - a[1]);
    sorted.forEach(([status, count]) => {
        console.log(`"${status}": ${count}`);
    });
    await (0, database_1.disconnectDatabase)();
}
main().catch(err => {
    console.error(err);
    process.exit(1);
});
