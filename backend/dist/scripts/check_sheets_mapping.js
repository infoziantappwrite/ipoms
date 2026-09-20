"use strict";
const xlsx = require('xlsx');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
dotenv.config({ path: path.join(__dirname, '../../.env') });
const ALIAS_MAP = {
    ACHARIYA: 'ACET',
    KARPAGAM: 'KARPAGAM',
    'KARPAGAM ': 'KARPAGAM',
    'MAR EPHRAEM': 'MAREPHRA',
    MAR: 'MAREPHRA',
    EGS: 'EGS',
    'E.G.S': 'EGS',
    NARAYANAGURU: 'NGCE',
    'ANNAI MIRA': 'ACEW',
    ACEW: 'ACEW',
    KUMARAGURU: 'KCT',
    'K.L.N': 'KLN',
    SHANMUGHA: 'SSEI',
    KARUNYA: 'KITS',
    NGP: 'Dr. N.G.P. Institute of Technology',
    HITS: 'HITS',
    NEHRU: 'NITC',
    DSU: 'DSU',
    SMVEC: 'SMVEC',
    PSNA: 'PSNA',
    MCET: 'MCET',
    MEC: 'MEC',
    MKCE: 'MKCE',
    SONA: 'SONA',
    KGISL: 'KGISL',
    AAA: 'AAA',
    KAMARAJ: 'KCET',
};
async function check() {
    const wb = xlsx.readFile('C:\\Users\\admin\\Downloads\\Weekly Report 2027 BATCH.xlsx');
    await mongoose.connect(process.env.MONGODB_URI);
    const colleges = await mongoose.connection.collection('colleges').find({}).toArray();
    console.log('Total colleges in DB:', colleges.length);
    for (const sheetName of wb.SheetNames) {
        if (sheetName.trim().toUpperCase() === 'PENDING') {
            console.log(`Sheet: "${sheetName}" -> SKIPPED (Pending Sheet)`);
            continue;
        }
        const trimmed = sheetName.trim();
        const upper = trimmed.toUpperCase();
        let match = colleges.find(c => c.college_code.toUpperCase() === upper);
        if (!match && ALIAS_MAP[upper]) {
            const alias = ALIAS_MAP[upper];
            match = colleges.find(c => c.college_code.toUpperCase() === alias.toUpperCase() || c.college_name.toLowerCase().includes(alias.toLowerCase()));
        }
        if (!match) {
            match = colleges.find(c => c.college_name.toUpperCase().includes(upper) || upper.includes(c.college_code.toUpperCase()));
        }
        console.log(`Sheet: "${sheetName}" -> Match: ${match ? `${match.college_name} (${match.college_code}) [_id: ${match._id}]` : '❌ NOT FOUND'}`);
    }
    await mongoose.disconnect();
}
check().catch(console.error);
