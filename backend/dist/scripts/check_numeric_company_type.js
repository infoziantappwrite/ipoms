"use strict";
const mongoose = require('mongoose');
const dns = require('dns');
const dotenv = require('dotenv');
const path = require('path');
dns.setServers(['8.8.8.8', '1.1.1.1']);
dotenv.config({ path: path.join(__dirname, '../../.env') });
async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB.');
    const rows = await mongoose.connection.collection('weekly_tracker').find({
        academic_year: 2027,
        $or: [
            { company_type: { $regex: /^\d+$/ } },
            { company_type: '0' },
            { company_type: 0 },
            { company_type: '-' },
        ]
    }).toArray();
    console.log(`Numeric or placeholder-candidate company_type rows found: ${rows.length}`);
    for (const r of rows) {
        console.log(`- [${r.pipeline_section}] ${r.company_name}: company_type = "${r.company_type}"`);
        await mongoose.connection.collection('weekly_tracker').updateOne({ _id: r._id }, { $set: { company_type: '' } });
    }
    // Also check all 2027 rows to see company_type distribution
    const allRows = await mongoose.connection.collection('weekly_tracker').find({ academic_year: 2027 }).toArray();
    const typeCounts = {};
    allRows.forEach(r => {
        const t = r.company_type || '(empty / placeholder)';
        typeCounts[t] = (typeCounts[t] || 0) + 1;
    });
    // Verify NPR
    const college = await mongoose.connection.collection('colleges').findOne({ college_code: 'NPR' });
    if (college) {
        const nprRows = await mongoose.connection.collection('weekly_tracker').find({ college_id: college._id, academic_year: 2027 }).toArray();
        console.log(`\nNPR Total 2027 rows: ${nprRows.length}`);
        const aqua = nprRows.find(r => r.company_name.toLowerCase().includes('aquaairx'));
        console.log('AquaAirX check:', {
            company_name: aqua?.company_name,
            section: aqua?.pipeline_section,
            company_type: aqua?.company_type,
            selected_count: aqua?.selected_count,
        });
    }
    await mongoose.disconnect();
}
check().catch(console.error);
