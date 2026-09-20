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
console.log('=== MEC Rows (First 10) ===');
const mecSheet = wb.Sheets['MEC'];
const mecJson = XLSX.utils.sheet_to_json(mecSheet, { header: 1, defval: '' });
mecJson.slice(0, 10).forEach((r, idx) => console.log(`[MEC Row ${idx}]`, JSON.stringify(r)));
console.log('\n=== KLU Rows (First 20) ===');
const kluSheet = wb.Sheets['KLU'];
const kluJson = XLSX.utils.sheet_to_json(kluSheet, { header: 1, defval: '' });
kluJson.slice(0, 20).forEach((r, idx) => console.log(`[KLU Row ${idx}]`, JSON.stringify(r)));
