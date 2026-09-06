import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';

dotenv.config();

// Ensure Atlas SRV records resolve reliably on Windows / Node.js
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch {
  // Ignore in environments where setServers might be restricted
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ipoms_db';

const sanitizeMongoUri = (uri: string): string => {
  return uri.replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)([^@]+)(@.+)/i, '$1****$3');
};

export const connectDatabase = async (): Promise<typeof mongoose> => {
  try {
    console.log(`🔌 [MongoDB] Connecting to ${sanitizeMongoUri(MONGODB_URI)}...`);
    
    const connection = await mongoose.connect(MONGODB_URI, {
      autoIndex: true, // Build compound indexes automatically in development
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
    });

    console.log(`✅ [MongoDB] Successfully connected to database: "${connection.connection.name}"`);
    console.log(`📍 [MongoDB] Host: ${connection.connection.host}:${connection.connection.port}`);

    mongoose.connection.on('error', (err) => {
      console.error('❌ [MongoDB] Runtime connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ [MongoDB] Lost connection. Attempting to reconnect...');
    });

    return connection;
  } catch (error) {
    console.error('❌ [MongoDB] Fatal connection error on startup:', error);
    process.exit(1);
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  await mongoose.disconnect();
  console.log('🔌 [MongoDB] Disconnected gracefully.');
};
