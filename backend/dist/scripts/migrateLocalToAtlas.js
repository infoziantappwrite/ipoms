"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_1 = require("mongodb");
const dotenv_1 = __importDefault(require("dotenv"));
const dns_1 = __importDefault(require("dns"));
dotenv_1.default.config();
// Ensure Atlas SRV records resolve reliably on Windows / Node.js
try {
    dns_1.default.setServers(['8.8.8.8', '8.8.4.4']);
}
catch {
    // Ignore
}
const LOCAL_URI = 'mongodb://127.0.0.1:27017/ipoms_db';
const ATLAS_URI = process.env.MONGODB_URI;
if (!ATLAS_URI || !ATLAS_URI.includes('mongodb+srv://') && !ATLAS_URI.includes('mongodb://')) {
    console.error('❌ MONGODB_URI in backend/.env is missing or invalid.');
    process.exit(1);
}
const sanitizeUri = (uri) => uri.replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)([^@]+)(@.+)/i, '$1****$3');
async function migrate() {
    console.log('\n=============================================================');
    console.log('🔄 INFOZIANT iPOMS — LOCAL TO ATLAS FULL DATA MIGRATION');
    console.log('=============================================================');
    console.log(`📥 Source (Local) : ${LOCAL_URI}`);
    console.log(`📤 Target (Atlas) : ${sanitizeUri(ATLAS_URI)}\n`);
    const localClient = new mongodb_1.MongoClient(LOCAL_URI);
    const atlasClient = new mongodb_1.MongoClient(ATLAS_URI);
    try {
        await localClient.connect();
        console.log('✅ Connected to Local MongoDB');
        await atlasClient.connect();
        console.log('✅ Connected to MongoDB Atlas\n');
        const localDb = localClient.db('ipoms_db');
        const atlasDb = atlasClient.db('ipoms_db');
        const collections = await localDb.listCollections().toArray();
        console.log(`📦 Found ${collections.length} collections in Local Database to migrate.\n`);
        const summary = [];
        for (const colInfo of collections) {
            const colName = colInfo.name;
            if (colName.startsWith('system.'))
                continue;
            const localCol = localDb.collection(colName);
            const atlasCol = atlasDb.collection(colName);
            const count = await localCol.countDocuments();
            console.log(`⏳ Migrating "${colName}" (${count} documents)...`);
            // Drop existing collection on Atlas to guarantee clean 1:1 overwrite
            try {
                await atlasCol.drop();
            }
            catch (e) {
                // collection might not exist yet in Atlas
            }
            if (count > 0) {
                const docs = await localCol.find({}).toArray();
                // Insert in batches of 1000 to prevent payload limits
                const batchSize = 1000;
                for (let i = 0; i < docs.length; i += batchSize) {
                    const batch = docs.slice(i, i + batchSize);
                    await atlasCol.insertMany(batch);
                }
            }
            // Copy custom indexes (excluding default _id index)
            try {
                const indexes = await localCol.indexes();
                for (const idx of indexes) {
                    if (idx.name === '_id_')
                        continue;
                    const { key, name, unique, sparse, expireAfterSeconds } = idx;
                    const options = { name };
                    if (unique)
                        options.unique = unique;
                    if (sparse)
                        options.sparse = sparse;
                    if (expireAfterSeconds !== undefined)
                        options.expireAfterSeconds = expireAfterSeconds;
                    await atlasCol.createIndex(key, options);
                }
            }
            catch (idxErr) {
                console.warn(`  ⚠️ Could not copy indexes for ${colName}:`, idxErr);
            }
            const verifiedCount = await atlasCol.countDocuments();
            const status = count === verifiedCount ? '✅ MATCH' : '❌ MISMATCH';
            summary.push({
                Collection: colName,
                LocalCount: count,
                AtlasCount: verifiedCount,
                Status: status,
            });
            console.log(`   ➔ Done: ${verifiedCount} / ${count} docs copied into Atlas.`);
        }
        console.log('\n=============================================================');
        console.log('📊 MIGRATION VERIFICATION MATRIX');
        console.log('=============================================================');
        console.table(summary);
        console.log('=============================================================\n');
        console.log('🎉 Full local database successfully mirrored to MongoDB Atlas!\n');
    }
    catch (error) {
        console.error('❌ Migration failed:', error);
    }
    finally {
        await localClient.close();
        await atlasClient.close();
    }
}
migrate();
