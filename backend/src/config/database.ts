import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ipoms_db';

export const connectDatabase = async (): Promise<typeof mongoose> => {
  try {
    console.log(`🔌 [MongoDB] Connecting to ${MONGODB_URI}...`);
    
    const connection = await mongoose.connect(MONGODB_URI, {
      autoIndex: true, // Build compound indexes automatically in development
      serverSelectionTimeoutMS: 5000,
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
