"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const DailyTracker_1 = require("../models/DailyTracker");
const College_1 = require("../models/College");
const dns_1 = __importDefault(require("dns"));
dns_1.default.setServers(['8.8.8.8', '1.1.1.1']);
async function run() {
    await (0, database_1.connectDatabase)();
    const acet = await College_1.College.findOne({ college_code: 'ACET' });
    console.log('ACET College:', acet?._id, acet?.college_name);
    if (acet) {
        const count = await DailyTracker_1.DailyTracker.countDocuments({ college_id: acet._id });
        console.log('Existing DailyTracker count for ACET:', count);
        const sample = await DailyTracker_1.DailyTracker.find({ college_id: acet._id }).limit(5).lean();
        console.log('Sample rows:', sample);
    }
    const totalCount = await DailyTracker_1.DailyTracker.countDocuments({});
    console.log('Total DailyTracker count in DB:', totalCount);
    await (0, database_1.disconnectDatabase)();
}
run().catch(console.error);
