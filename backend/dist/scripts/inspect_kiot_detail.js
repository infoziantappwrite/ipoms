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
const mongoose_1 = __importDefault(require("mongoose"));
const dns_1 = __importDefault(require("dns"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const xlsx = __importStar(require("xlsx"));
const College_1 = require("../models/College");
const User_1 = require("../models/User");
dns_1.default.setServers(['8.8.8.8', '1.1.1.1']);
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../.env') });
async function inspectKIOT() {
    await mongoose_1.default.connect(process.env.MONGODB_URI || '');
    console.log('Connected to DB');
    const kiot = await College_1.College.findOne({
        $or: [{ college_code: 'KIOT' }, { college_name: /Knowledge Institute/i }]
    });
    console.log('KIOT College in DB:', kiot);
    if (kiot) {
        const coordinators = await User_1.User.find({ assigned_college_ids: kiot._id });
        console.log('Assigned coordinators for KIOT:', coordinators.map(c => ({ id: c._id, name: c.full_name || c.username, email: c.email })));
    }
    const filePath = "C:\\Users\\admin\\Downloads\\Weekly Report 2027 BATCH.xlsx";
    const wb = xlsx.readFile(filePath);
    const sheet = wb.Sheets['KIOT'];
    const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    console.log('\n--- Full KIOT sheet contents ---');
    rawRows.forEach((r, idx) => {
        const nonBlank = r.some(c => c !== '');
        if (nonBlank) {
            console.log(`Row ${idx + 1}:`, JSON.stringify(r.filter((c, i) => i < 10)));
        }
    });
    await mongoose_1.default.disconnect();
}
inspectKIOT().catch(console.error);
