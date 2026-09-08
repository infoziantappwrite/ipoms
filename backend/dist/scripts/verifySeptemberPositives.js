"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const dns_1 = __importDefault(require("dns"));
dns_1.default.setServers(['8.8.8.8', '1.1.1.1']);
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
const DailyLead_1 = require("../models/DailyLead");
const College_1 = require("../models/College");
async function verify() {
    await mongoose_1.default.connect(process.env.MONGODB_URI);
    const _initCollege = College_1.College.modelName; // ensures College is registered in mongoose connection
    const d3 = new Date(Date.UTC(2026, 8, 3));
    const d4 = new Date(Date.UTC(2026, 8, 4));
    const count3 = await DailyLead_1.DailyLead.countDocuments({ lead_type: 'positive', lead_date: d3, is_deleted: false });
    const count4 = await DailyLead_1.DailyLead.countDocuments({ lead_type: 'positive', lead_date: d4, is_deleted: false });
    console.log(`✅ Sept 3 Positives count in Atlas: ${count3} (Expected: 27)`);
    console.log(`✅ Sept 4 Positives count in Atlas: ${count4} (Expected: 23)`);
    const leads3 = await DailyLead_1.DailyLead.find({ lead_type: 'positive', lead_date: d3, is_deleted: false }).populate('college_id', 'college_code college_name');
    console.log('\n--- 09/03/2026 Summary ---');
    leads3.forEach((l, idx) => {
        console.log(`${idx + 1}. [${l.college_id?.college_code}] ${l.company_name} | ${l.job_role} | ${l.ctc} | ${l.event_time}`);
    });
    const leads4 = await DailyLead_1.DailyLead.find({ lead_type: 'positive', lead_date: d4, is_deleted: false }).populate('college_id', 'college_code college_name');
    console.log('\n--- 09/04/2026 Summary ---');
    leads4.forEach((l, idx) => {
        console.log(`${idx + 1}. [${l.college_id?.college_code}] ${l.company_name} | ${l.job_role} | ${l.ctc} | ${l.event_time}`);
    });
    await mongoose_1.default.disconnect();
}
verify();
