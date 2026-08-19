"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Notification_1 = require("../models/Notification");
const College_1 = require("../models/College");
const User_1 = require("../models/User");
const database_1 = require("../config/database");
async function inspectNotificationsDatabase() {
    console.log('\n===============================================================');
    console.log('🔍 DIRECT MONGODB DATABASE INSPECTION: "notifications" Collection');
    console.log('===============================================================\n');
    await (0, database_1.connectDatabase)();
    const _ = [College_1.College.modelName, User_1.User.modelName];
    const count = await Notification_1.Notification.countDocuments({});
    console.log(`📊 Total Documents in 'notifications' collection: ${count}\n`);
    const notifications = await Notification_1.Notification.find({})
        .sort({ created_at: -1 })
        .limit(5)
        .populate('sender_id', 'full_name official_email')
        .populate('target_college_id', 'college_name college_code');
    notifications.forEach((n, idx) => {
        console.log(`[Notification #${idx + 1}]`);
        console.log(`  ID             : ${n._id}`);
        console.log(`  Type           : ${n.notification_type}`);
        console.log(`  Title          : "${n.title}"`);
        console.log(`  Sender         : ${n.sender_id?.full_name} (${n.sender_role})`);
        console.log(`  Audience       : ${n.audience_type} ${n.target_college_id ? `[${n.target_college_id.college_code}]` : ''}`);
        console.log(`  Priority       : ${n.priority.toUpperCase()}`);
        console.log(`  Requires Ack   : ${n.requires_acknowledgment}`);
        console.log(`  Recipients     : ${n.recipient_statuses.length} tracked`);
        console.log(`  Is Deleted     : ${n.is_deleted}`);
        console.log(`  Created At     : ${n.created_at.toISOString()}`);
        console.log('---------------------------------------------------------------');
    });
    await (0, database_1.disconnectDatabase)();
    console.log('\n✅ Notifications database inspection verified successfully!\n');
}
inspectNotificationsDatabase().catch(console.error);
