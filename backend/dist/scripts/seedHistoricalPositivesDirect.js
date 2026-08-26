"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const database_1 = require("../config/database");
const seedHistoricalPositives_1 = require("../lib/seedHistoricalPositives");
async function main() {
    console.log('🚀 Connecting to database to seed historical positives...');
    await (0, database_1.connectDatabase)();
    console.log('🌱 Starting historical call positives seed...');
    await (0, seedHistoricalPositives_1.seedHistoricalCallPositives)();
    console.log('✅ Completed historical call positives seed successfully!');
    process.exit(0);
}
main().catch((err) => {
    console.error('❌ Failed to seed historical positives:', err);
    process.exit(1);
});
