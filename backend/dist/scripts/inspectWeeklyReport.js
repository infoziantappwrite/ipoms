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
const filePath = 'C:\\Users\\admin\\Downloads\\Weekly Report.xlsx';
function main() {
    try {
        console.log(`Reading Excel file: ${filePath}`);
        const workbook = xlsx.readFile(filePath);
        console.log('Sheet Names:', workbook.SheetNames);
        workbook.SheetNames.forEach((sheetName) => {
            console.log(`\n========================================`);
            console.log(`SHEET: ${sheetName}`);
            console.log(`========================================`);
            const sheet = workbook.Sheets[sheetName];
            const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
            console.log(`Total Rows: ${data.length}`);
            // Print first 30 rows to see sections, headers, and layout
            data.slice(0, 35).forEach((row, idx) => {
                if (row && row.length > 0 && row.some((cell) => cell !== undefined && cell !== '')) {
                    console.log(`Row ${idx + 1}:`, JSON.stringify(row));
                }
            });
        });
    }
    catch (err) {
        console.error('Error reading excel file:', err);
    }
}
main();
