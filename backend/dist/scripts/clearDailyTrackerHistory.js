"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const DailyTracker_1 = require("../models/DailyTracker");
dotenv_1.default.config();
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ipoms_db';
async function clearDailyTracker() {
    try {
        console.log(`🔌 Connecting to MongoDB: ${MONGODB_URI}`);
        await mongoose_1.default.connect(MONGODB_URI);
        const countBefore = await DailyTracker_1.DailyTracker.countDocuments({});
        console.log(`📊 Found ${countBefore} total daily tracker records across all colleges.`);
        const result = await DailyTracker_1.DailyTracker.deleteMany({});
        console.log(`✅ Successfully cleared ${result.deletedCount} daily tracker records.`);
        await mongoose_1.default.disconnect();
        console.log('🔌 Disconnected.');
    }
    catch (err) {
        console.error('❌ Error clearing daily tracker:', err);
        process.exit(1);
    }
}
clearDailyTracker();
