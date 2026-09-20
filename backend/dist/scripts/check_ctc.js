"use strict";
const mongoose = require('mongoose');
const dns = require('dns');
const dotenv = require('dotenv');
const path = require('path');
dns.setServers(['8.8.8.8', '1.1.1.1']);
dotenv.config({ path: path.join(__dirname, '../../.env') });
async function checkCtc() {
    await mongoose.connect(process.env.MONGODB_URI);
    const rows = await mongoose.connection.collection('weekly_tracker').find({}).project({ ctc_lpa: 1 }).toArray();
    const uniqueCtcs = Array.from(new Set(rows.map(r => r.ctc_lpa).filter(Boolean)));
    console.log(`Unique CTC values found in DB (count: ${uniqueCtcs.length}):`);
    uniqueCtcs.sort().forEach(c => console.log(` - ${JSON.stringify(c)}`));
    await mongoose.disconnect();
}
checkCtc().catch(console.error);
