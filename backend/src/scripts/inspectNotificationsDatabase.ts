import mongoose from 'mongoose';
import { Notification } from '../models/Notification';
import { College } from '../models/College';
import { User } from '../models/User';
import { connectDatabase, disconnectDatabase } from '../config/database';

async function inspectNotificationsDatabase() {
  console.log('\n===============================================================');
  console.log('🔍 DIRECT MONGODB DATABASE INSPECTION: "notifications" Collection');
  console.log('===============================================================\n');

  await connectDatabase();
  const _ = [College.modelName, User.modelName];

  const count = await Notification.countDocuments({});
  console.log(`📊 Total Documents in 'notifications' collection: ${count}\n`);

  const notifications = await Notification.find({})
    .sort({ created_at: -1 })
    .limit(5)
    .populate('sender_id', 'full_name official_email')
    .populate('target_college_id', 'college_name college_code');

  notifications.forEach((n: any, idx) => {
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

  await disconnectDatabase();
  console.log('\n✅ Notifications database inspection verified successfully!\n');
}

inspectNotificationsDatabase().catch(console.error);
