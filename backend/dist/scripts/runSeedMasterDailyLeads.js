"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const seedMasterDailyLeads_1 = require("../lib/seedMasterDailyLeads");
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../.env') });
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ipoms';
async function main() {
    try {
        console.log('Connecting to MongoDB at:', MONGODB_URI);
        await mongoose_1.default.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        const res = await (0, seedMasterDailyLeads_1.seedMasterDailyLeads)();
        console.log('🎉 Done! Result:', res);
        await mongoose_1.default.disconnect();
        process.exit(0);
    }
    catch (err) {
        console.error('❌ Error seeding master daily leads:', err);
        process.exit(1);
    }
}
main();
