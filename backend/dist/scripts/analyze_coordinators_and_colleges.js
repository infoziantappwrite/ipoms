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
const filePath = "C:\\Users\\admin\\Downloads\\September Tracker 2026 (1).xlsx";
async function main() {
    await (0, database_1.connectDatabase)();
    const colleges = await College_1.College.find({ is_deleted: { $ne: true } }).lean();
    const users = await User_1.User.find({ is_deleted: { $ne: true } }).lean();
    console.log('=== SYSTEM COLLEGES ===');
    colleges.forEach(c => console.log(`[${c.college_code}] ${c.college_name} (ID: ${c._id})`));
    console.log('\n=== SYSTEM USERS / COORDINATORS ===');
    users.forEach(u => console.log(`- ${u.full_name} (@${u.username}) <${u.official_email}> (ID: ${u._id}) - Assigned: ${u.assigned_college_ids?.length || 0} colleges`));
    const workbook = XLSX.readFile(filePath, { cellDates: true });
    // 1. Analyze POSITIVES
    const posSheet = workbook.Sheets['POSITIVES'] || workbook.Sheets['POSITIVE'];
    const posData = XLSX.utils.sheet_to_json(posSheet, { header: 1, raw: false });
    console.log(`\n=== ANALYZING POSITIVES ROWS ===`);
    const posColleges = new Set();
    let posCurrentDate = '';
    let countTotal = 0;
    let countFromAug19 = 0;
    for (let i = 0; i < posData.length; i++) {
        const row = posData[i];
        if (!row || row.length === 0)
            continue;
        const firstCell = String(row[0] || '').trim();
        if (firstCell.startsWith('CALL POSTIVES') || firstCell.startsWith('CALL POSITIVES')) {
            posCurrentDate = firstCell;
            continue;
        }
        if (firstCell === 'SI.NO')
            continue;
        // Check if it's a data row
        const compName = row[2];
        const colName = row[6] || row[5];
        if (compName && colName) {
            countTotal++;
            posColleges.add(String(colName).trim());
            if (i >= 404) { // from row 405 (19-Aug-2026)
                countFromAug19++;
            }
        }
    }
    console.log(`Total data rows in POSITIVES: ${countTotal}`);
    console.log(`Total data rows in POSITIVES from 19-Aug-2026 (row 405+): ${countFromAug19}`);
    console.log(`Unique College strings in POSITIVES:`, Array.from(posColleges));
    // 2. Analyze JD RECEIVED
    const jdSheet = workbook.Sheets['JD RECEIVED'];
    const jdData = XLSX.utils.sheet_to_json(jdSheet, { header: 1, raw: false });
    console.log(`\n=== ANALYZING JD RECEIVED ROWS ===`);
    const jdColleges = new Set();
    let jdCountTotal = 0;
    let jdCountFromRow151 = 0;
    for (let i = 0; i < jdData.length; i++) {
        const row = jdData[i];
        if (!row || row.length === 0)
            continue;
        const firstCell = String(row[0] || '').trim();
        if (firstCell === 'SI.NO')
            continue;
        const compName = row[2];
        const colName = row[5] || row[6];
        if (compName && colName) {
            jdCountTotal++;
            jdColleges.add(String(colName).trim());
            if (i >= 150) { // from row 151
                jdCountFromRow151++;
            }
        }
    }
    console.log(`Total data rows in JD RECEIVED: ${jdCountTotal}`);
    console.log(`Total data rows in JD RECEIVED from Row 151 (19-Aug-2026+): ${jdCountFromRow151}`);
    console.log(`Unique College strings in JD RECEIVED:`, Array.from(jdColleges));
    await (0, database_1.disconnectDatabase)();
}
main().catch(err => {
    console.error(err);
    process.exit(1);
});
