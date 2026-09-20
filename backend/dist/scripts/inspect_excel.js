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
const User_1 = require("../models/User");
const dns_1 = __importDefault(require("dns"));
dns_1.default.setServers(['8.8.8.8', '1.1.1.1']);
const FILE_PATH = "C:\\Users\\admin\\Downloads\\September Tracker 2026 (1).xlsx";
async function main() {
    await (0, database_1.connectDatabase)();
    const colleges = await College_1.College.find({ is_deleted: { $ne: true } }).lean();
    console.log(`Database Active Colleges (${colleges.length}):`);
    colleges.forEach(c => console.log(` - [${c.college_code}] ${c.college_name} (_id: ${c._id})`));
    const users = await User_1.User.find({ is_active: { $ne: false } }).select('full_name official_email role_codes').lean();
    console.log(`\nActive Users (${users.length}):`);
    users.forEach(u => console.log(` - ${u.full_name} (${u.official_email}, roles: ${u.role_codes?.join(', ')})`));
    const wb = XLSX.readFile(FILE_PATH, { cellDates: true, dense: true });
    console.log(`\nWorkbook Sheet Names (${wb.SheetNames.length}):`);
    const sheetProps = (wb.Workbook && wb.Workbook.Sheets) ? wb.Workbook.Sheets : [];
    wb.SheetNames.forEach((name, idx) => {
        const prop = sheetProps[idx];
        const isHidden = prop && (prop.Hidden === 1 || prop.Hidden === 2);
        const sheet = wb.Sheets[name];
        const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
        const rowCount = range.e.r - range.s.r + 1;
        console.log(` [${idx + 1}] "${name}" -> Hidden: ${isHidden ? 'YES (' + prop.Hidden + ')' : 'NO'}, Rows: ${rowCount}`);
    });
    // Pick first college sheet to inspect structure
    for (const name of wb.SheetNames) {
        if (name.toUpperCase().includes('POSITIVE') || name.toUpperCase().includes('JD') || name.toUpperCase().includes('SUMMARY'))
            continue;
        console.log(`\n--- Inspecting First 10 Rows of Sheet: "${name}" ---`);
        const sheet = wb.Sheets[name];
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        for (let r = 0; r < Math.min(10, json.length); r++) {
            console.log(`Row ${r}:`, JSON.stringify(json[r]));
        }
        break;
    }
    await (0, database_1.disconnectDatabase)();
}
main().catch(err => {
    console.error(err);
    process.exit(1);
});
