"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.disconnectDatabase = exports.connectDatabase = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ipoms_db';
const connectDatabase = async () => {
    try {
        console.log(`🔌 [MongoDB] Connecting to ${MONGODB_URI}...`);
        const connection = await mongoose_1.default.connect(MONGODB_URI, {
            autoIndex: true, // Build compound indexes automatically in development
            serverSelectionTimeoutMS: 5000,
        });
        console.log(`✅ [MongoDB] Successfully connected to database: "${connection.connection.name}"`);
        console.log(`📍 [MongoDB] Host: ${connection.connection.host}:${connection.connection.port}`);
        mongoose_1.default.connection.on('error', (err) => {
            console.error('❌ [MongoDB] Runtime connection error:', err);
        });
        mongoose_1.default.connection.on('disconnected', () => {
            console.warn('⚠️ [MongoDB] Lost connection. Attempting to reconnect...');
        });
        return connection;
    }
    catch (error) {
        console.error('❌ [MongoDB] Fatal connection error on startup:', error);
        process.exit(1);
    }
};
exports.connectDatabase = connectDatabase;
const disconnectDatabase = async () => {
    await mongoose_1.default.disconnect();
    console.log('🔌 [MongoDB] Disconnected gracefully.');
};
exports.disconnectDatabase = disconnectDatabase;
