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
const fs_1 = __importDefault(require("fs"));
const candidatePaths = [
    'C:\\Users\\admin\\Downloads\\Weekly.xlsx',
    'C:\\Users\\admin\\Downloads\\Weekly .xlsx',
    'C:\\Users\\admin\\Downloads\\Weekly Report.xlsx',
];
const resolvedPath = candidatePaths.find(p => fs_1.default.existsSync(p));
console.log('Resolved Path:', resolvedPath);
if (resolvedPath) {
    const wb = xlsx.readFile(resolvedPath);
    console.log('Sheet Names:', wb.SheetNames);
    const pendingSheet = wb.Sheets['PENDING'];
    if (pendingSheet) {
        const rawRows = xlsx.utils.sheet_to_json(pendingSheet, { header: 1, defval: '' });
        console.log(`\n=== PENDING SHEET ROW COUNT: ${rawRows.length} ===`);
        rawRows.forEach((r, idx) => {
            if (r.some(c => c !== '')) {
                console.log(`[Row ${idx + 1}]`, JSON.stringify(r));
            }
        });
    }
    else {
        console.log('Sheet PENDING not found in workbook!');
    }
}
else {
    console.log('None of candidatePaths found!');
}
