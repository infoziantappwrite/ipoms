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
const XLSX = __importStar(require("xlsx"));
const FILE_PATH = "C:\\Users\\admin\\Downloads\\September Tracker 2026 (1).xlsx";
const wb = XLSX.readFile(FILE_PATH, { cellDates: true, dense: true });
const sheets = ['MCET', 'MEC', 'ACET', 'KAMARAJ', 'NGP', 'MAR EPHRAEM', 'KIOT', 'ACEW', 'NPR', 'KLU', 'SMVEC', 'DSU', 'PSNA', 'SONA'];
sheets.forEach(sheetName => {
    const sheet = wb.Sheets[sheetName];
    if (!sheet)
        return;
    const json = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    json.slice(2).forEach((r, idx) => {
        const rawCompany = String(r[3] || '').trim();
        const hasAny = r.some((c) => String(c || '').trim() !== '');
        if (!rawCompany && hasAny) {
            console.log(`Sheet [${sheetName}] Row ${idx + 3}:`, JSON.stringify(r));
        }
    });
});
