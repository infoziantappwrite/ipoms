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
const dns_1 = __importDefault(require("dns"));
dns_1.default.setServers(['8.8.8.8', '1.1.1.1']);
const FILE_PATH = "C:\\Users\\admin\\Downloads\\September Tracker 2026 (1).xlsx";
async function main() {
    await (0, database_1.connectDatabase)();
    const wb = XLSX.readFile(FILE_PATH, { cellDates: true, dense: true });
    const testSheets = ['KARPAGAM ', 'MCET', 'MEC', 'ACET', 'DSU'];
    for (const sheetName of testSheets) {
        const sheet = wb.Sheets[sheetName];
        if (!sheet)
            continue;
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        console.log(`\n================ Sheet: "${sheetName}" (Total raw rows: ${json.length}) ================`);
        console.log('Row 0 (Header/Handled By):', JSON.stringify(json[0]));
        console.log('Row 1 (Columns):', JSON.stringify(json[1]));
        const nonBlankRows = [];
        for (let r = 2; r < json.length; r++) {
            const row = json[r];
            // Check if row has company or date or contact
            const hasContent = row.some((cell) => String(cell || '').trim() !== '');
            if (hasContent) {
                nonBlankRows.push({ rowIdx: r, data: row });
            }
        }
        console.log(`Found ${nonBlankRows.length} non-blank data rows.`);
        console.log('Sample first 5 non-blank rows:');
        nonBlankRows.slice(0, 5).forEach(r => {
            console.log(`[Excel Row ${r.rowIdx + 1}]`, JSON.stringify(r.data));
        });
        console.log('Sample last 3 non-blank rows:');
        nonBlankRows.slice(-3).forEach(r => {
            console.log(`[Excel Row ${r.rowIdx + 1}]`, JSON.stringify(r.data));
        });
        // Check unique Response Status values in this sheet
        const statuses = new Set();
        nonBlankRows.forEach(r => {
            const status = String(r.data[7] || '').trim();
            if (status)
                statuses.add(status);
        });
        console.log('Unique Response Statuses:', Array.from(statuses));
    }
    await (0, database_1.disconnectDatabase)();
}
main().catch(err => {
    console.error(err);
    process.exit(1);
});
