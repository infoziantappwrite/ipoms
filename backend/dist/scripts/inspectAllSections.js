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
const filePath = 'C:\\Users\\admin\\Downloads\\Weekly .xlsx';
const wb = xlsx.readFile(filePath);
console.log('=== SECTION HEADERS DETECTED ACROSS ALL SHEETS ===\n');
for (const sheetName of wb.SheetNames) {
    if (sheetName.toUpperCase() === 'PENDING')
        continue;
    const sheet = wb.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    const detectedSections = [];
    rows.forEach((r, idx) => {
        const joined = r.join(' ').trim();
        if (/companies\s+completed/i.test(joined))
            detectedSections.push(`Completed (Row ${idx + 1})`);
        else if (/companies\s+in\s+progress/i.test(joined))
            detectedSections.push(`In Progress (Row ${idx + 1})`);
        else if (/companies\s+in\s+pipeline/i.test(joined))
            detectedSections.push(`Pipeline (Row ${idx + 1})`);
        else if (/top\s+companies/i.test(joined))
            detectedSections.push(`Top Companies (Row ${idx + 1})`);
        else if (/rejected\s+companies|rejected\s+by\s+hr/i.test(joined))
            detectedSections.push(`Rejected by HR (Row ${idx + 1})`);
        else if (/companies\s+on\s+hold\s+by\s+college|on\s+hold\s+by\s+college/i.test(joined))
            detectedSections.push(`Hold by College (Row ${idx + 1})`);
        else if (/companies\s+on\s+hold\s+by\s+hr|on\s+hold\s+by\s+hr/i.test(joined))
            detectedSections.push(`Hold by HR (Row ${idx + 1})`);
    });
    console.log(`Sheet: "${sheetName}" (Rows: ${rows.length}) -> Sections: [${detectedSections.join(', ')}]`);
}
