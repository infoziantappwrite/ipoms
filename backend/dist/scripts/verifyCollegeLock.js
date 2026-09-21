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
const mongoose_1 = __importStar(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const User_1 = require("../models/User");
const College_1 = require("../models/College");
const server_1 = require("../server");
async function testLockFocus() {
    await mongoose_1.default.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ipoms');
    console.log('Connected to MongoDB');
    await (0, server_1.syncActiveCollegesRoster)();
    const allColleges = await College_1.College.find({ status: 'active' });
    console.log(`Active colleges count: ${allColleges.length}`);
    const testCases = [
        { email: 'sujitha_s@infoziant.com', colleges: ['HITS', 'NEHRU', 'KPR', 'SONA'] },
        { email: 'mohanaradha_a@infoziant.com', colleges: ['col_karpagam', 'col_aiht', 'col_acet', 'col_kpr'] },
        { email: 'thirisha_r@infoziant.com', colleges: ['col_psna', 'col_dsu', 'col_smvec'] },
        { email: 'malavika_ramesh@infoziant.com', colleges: ['KLU', 'NGCE'] },
        { email: 'lizenya_r@infoziant.com', colleges: ['col_npr', 'KIOT', 'col_acew'] },
        { email: 'megaladevi_ps@infoziant.com', colleges: ['NGP', 'KAMARAJ'] },
        { email: 'seshmitha_tamil@icl.today', colleges: ['col_mcet', 'MEC'] },
    ];
    for (const tc of testCases) {
        const user = await User_1.User.findOne({ official_email: tc.email.toLowerCase() });
        if (!user) {
            console.log(`❌ User not found: ${tc.email}`);
            continue;
        }
        // Test resolving IDs (the same logic as in /api/v1/colleges/lock-focus)
        const resolvedDocs = [];
        for (const rawItem of tc.colleges) {
            const itemStr = String(rawItem).trim();
            let foundDoc = null;
            if (mongoose_1.Types.ObjectId.isValid(itemStr)) {
                foundDoc = allColleges.find((c) => String(c._id) === itemStr);
            }
            if (!foundDoc) {
                const cleanedCode = itemStr.replace(/^col_/i, '').toUpperCase();
                foundDoc = allColleges.find((c) => c.college_code?.toUpperCase() === cleanedCode);
            }
            if (!foundDoc) {
                const nameClean = itemStr.toLowerCase();
                foundDoc = allColleges.find((c) => c.college_name?.toLowerCase() === nameClean);
            }
            if (foundDoc && !resolvedDocs.some((d) => String(d._id) === String(foundDoc._id))) {
                resolvedDocs.push(foundDoc);
            }
        }
        console.log(`✅ ${user.full_name} (${tc.email}): Successfully resolved ${resolvedDocs.length}/${tc.colleges.length} colleges: ${resolvedDocs.map((d) => d.college_code).join(', ')}`);
    }
    console.log('🎉 Verification completed successfully!');
    await mongoose_1.default.disconnect();
}
testLockFocus().catch(console.error);
