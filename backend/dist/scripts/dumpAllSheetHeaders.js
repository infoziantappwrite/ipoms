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
    const collegeMap = new Map();
    colleges.forEach(c => {
        collegeMap.set(c.college_code.trim().toUpperCase(), c);
        collegeMap.set(c.college_name.trim().toUpperCase(), c);
    });
    const wb = XLSX.readFile(FILE_PATH, { cellDates: true, dense: true });
    const sheetProps = (wb.Workbook && wb.Workbook.Sheets) ? wb.Workbook.Sheets : [];
    console.log(`\nWorkbook contains ${wb.SheetNames.length} sheets.`);
    for (let i = 0; i < wb.SheetNames.length; i++) {
        const sheetName = wb.SheetNames[i];
        const prop = sheetProps[i];
        const isHidden = prop && (prop.Hidden === 1 || prop.Hidden === 2);
        const sheet = wb.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        const trimmedSheet = sheetName.trim().toUpperCase();
        const matchedCollege = collegeMap.get(trimmedSheet);
        const nonBlankRows = json.slice(2).filter((r) => r.some(c => String(c || '').trim() !== ''));
        console.log(`\n[Sheet ${i + 1}] "${sheetName}" -> Hidden: ${isHidden ? 'YES' : 'NO'}, Matched College: ${matchedCollege ? matchedCollege.college_code + ' (' + matchedCollege.college_name + ')' : 'NONE'}, Non-blank data rows: ${nonBlankRows.length}`);
        if (json.length > 0) {
            console.log(`  Row 0: ${JSON.stringify(json[0]?.slice(0, 5))}`);
        }
        if (json.length > 1) {
            console.log(`  Row 1: ${JSON.stringify(json[1]?.slice(0, 8))}`);
        }
        if (nonBlankRows.length > 0) {
            console.log(`  Sample Row: ${JSON.stringify(nonBlankRows[0]?.slice(0, 8))}`);
        }
    }
    await (0, database_1.disconnectDatabase)();
}
main().catch(err => {
    console.error(err);
    process.exit(1);
});
