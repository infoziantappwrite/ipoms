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
const path_1 = __importDefault(require("path"));
const xlsx = __importStar(require("xlsx"));
const database_1 = require("../config/database");
const CompanyMetadata_1 = require("../models/CompanyMetadata");
const cleanString = (val) => {
    if (val === undefined || val === null)
        return '';
    return String(val).trim();
};
const parsePhoneNumbers = (val) => {
    const raw = cleanString(val);
    if (!raw)
        return [];
    // Split by comma, semicolon, slash, or newline
    return raw
        .split(/[,;\/\n\r]+/)
        .map((p) => p.replace(/[^\d+]/g, '').trim())
        .filter((p) => p.length >= 7);
};
const parseEmails = (val) => {
    const raw = cleanString(val);
    if (!raw)
        return [];
    return raw
        .split(/[,;\/\s\n\r]+/)
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.includes('@') && e.includes('.'));
};
const detectCompanyType = (companyName) => {
    const name = companyName.toLowerCase();
    if (name.includes('construction') || name.includes('builder') || name.includes('infra') || name.includes('estate'))
        return 'construction';
    if (name.includes('pharma') || name.includes('health') || name.includes('biotech') || name.includes('medical') || name.includes('hospital'))
        return 'pharma';
    if (name.includes('bank') || name.includes('finance') || name.includes('fintech') || name.includes('capital') || name.includes('invest'))
        return 'banking';
    if (name.includes('edtech') || name.includes('academy') || name.includes('learning') || name.includes('school'))
        return 'edtech';
    if (name.includes('ai ') || name.includes('robotics') || name.includes('analytics') || name.includes('intelligence'))
        return 'ai';
    if (name.includes('tech') || name.includes('soft') || name.includes('info') || name.includes('solution') || name.includes('digital') || name.includes('cloud') || name.includes('system') || name.includes('cyber'))
        return 'software';
    if (name.includes('auto') || name.includes('motor') || name.includes('engineer') || name.includes('steel') || name.includes('power'))
        return 'core_engineering';
    if (name.includes('bpo') || name.includes('consulting') || name.includes('service'))
        return 'consulting';
    return 'other';
};
async function seedMetaDatabase() {
    const startTime = Date.now();
    console.log('\n=============================================================');
    console.log('🚀 INFOZIANT iPOMS — META DATABASE SEEDING ENGINE');
    console.log('=============================================================\n');
    try {
        // 1. Connect to MongoDB
        await (0, database_1.connectDatabase)();
        // 2. Locate and load Meta Database.xlsx or Meta_Database.xlsx
        let excelPath = path_1.default.resolve(__dirname, '../../../Meta Database.xlsx');
        const fs = require('fs');
        if (!fs.existsSync(excelPath)) {
            excelPath = path_1.default.resolve(__dirname, '../../../Meta_Database.xlsx');
        }
        console.log(`📖 [Excel] Reading workbook from: ${excelPath}`);
        const workbook = xlsx.readFile(excelPath);
        const sheetName = workbook.SheetNames.includes('Meta Database')
            ? 'Meta Database'
            : workbook.SheetNames[0];
        console.log(`📄 [Excel] Reading active sheet: "${sheetName}"`);
        const worksheet = workbook.Sheets[sheetName];
        const rawRows = xlsx.utils.sheet_to_json(worksheet, { defval: '' });
        console.log(`📊 [Excel] Total raw rows found in Excel: ${rawRows.length}`);
        if (rawRows.length === 0) {
            console.warn('⚠️ [Excel] No data rows found to import.');
            await (0, database_1.disconnectDatabase)();
            return;
        }
        // 3. Clear existing collection to ensure clean idempotent state
        console.log('🧹 [MongoDB] Resetting company_metadata collection...');
        await CompanyMetadata_1.CompanyMetadata.deleteMany({});
        console.log('✅ [MongoDB] Existing records cleared.');
        // 4. Transform and prepare records for high-speed batch insertion
        console.log('⚙️ [Parser] Transforming and validating Excel records...');
        const documentsToInsert = [];
        for (let i = 0; i < rawRows.length; i++) {
            const row = rawRows[i];
            // Accommodate possible header variations
            const serialNumber = Number(row['Serial Number'] || row['S.No'] || row['SNo'] || (i + 1));
            const companyName = cleanString(row['Company Name'] || row['Company'] || row['company_name']);
            const hrName = cleanString(row['HR Name'] || row['Contact Person'] || row['hr_name']);
            const rawMobile = row['Mobile Number'] || row['Phone Number'] || row['Mobile'] || row['Contact Number'];
            const rawEmail = row['Email ID'] || row['Email'] || row['Official Email'];
            if (!companyName) {
                continue; // Skip blank company lines
            }
            const mobileNumbers = parsePhoneNumbers(rawMobile);
            const emailIds = parseEmails(rawEmail);
            const primaryMobile = mobileNumbers.length > 0 ? mobileNumbers[0] : '';
            const primaryEmail = emailIds.length > 0 ? emailIds[0] : '';
            const companyType = detectCompanyType(companyName);
            documentsToInsert.push({
                serial_number: isNaN(serialNumber) ? (i + 1) : serialNumber,
                company_name: companyName,
                hr_name: hrName,
                primary_mobile: primaryMobile,
                mobile_numbers: mobileNumbers,
                primary_email: primaryEmail,
                email_ids: emailIds,
                company_type: companyType,
                is_deleted: false,
            });
        }
        console.log(`📦 [Parser] Validated ${documentsToInsert.length} documents ready for insertion.`);
        // 5. Bulk insert into MongoDB in batches
        console.log('💾 [MongoDB] Inserting records into MongoDB collection...');
        const batchSize = 1000;
        let insertedCount = 0;
        for (let i = 0; i < documentsToInsert.length; i += batchSize) {
            const batch = documentsToInsert.slice(i, i + batchSize);
            const result = await CompanyMetadata_1.CompanyMetadata.insertMany(batch, { ordered: false });
            insertedCount += result.length;
            console.log(`   ➔ Inserted batch ${Math.floor(i / batchSize) + 1} (${insertedCount} / ${documentsToInsert.length} records)...`);
        }
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log('\n=============================================================');
        console.log(`🎉 [SUCCESS] Successfully inserted ${insertedCount} companies into MongoDB!`);
        console.log(`⏱️ [BENCHMARK] Total Time Elapsed: ${duration} seconds`);
        console.log('=============================================================\n');
        // 6. Run a live sub-millisecond search test
        console.log('🔍 [Live Search Verification] Querying companies starting with "10"...');
        const searchStart = Date.now();
        const sampleResults = await CompanyMetadata_1.CompanyMetadata.find({
            company_name: { $regex: '^10', $options: 'i' },
            is_deleted: false,
        })
            .limit(5)
            .select('serial_number company_name hr_name primary_mobile primary_email company_type');
        const searchDuration = Date.now() - searchStart;
        console.log(`⚡ [Index Benchmark] Query returned ${sampleResults.length} records in ${searchDuration}ms:`);
        console.table(sampleResults.map((doc) => doc.toObject()));
        console.log('\n✅ Database is live, populated, and fully indexed!');
    }
    catch (error) {
        console.error('❌ [ERROR] Failed to seed metadata database:', error);
    }
    finally {
        await (0, database_1.disconnectDatabase)();
        process.exit(0);
    }
}
seedMetaDatabase();
