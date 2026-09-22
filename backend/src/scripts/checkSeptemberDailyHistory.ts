import { connectDatabase, disconnectDatabase } from '../config/database';
import { DailyTracker } from '../models/DailyTracker';
import { College } from '../models/College';
import { User } from '../models/User';
import dns from 'dns';
import fs from 'fs';
import path from 'path';

dns.setServers(['8.8.8.8', '1.1.1.1']);

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

async function run() {
  await connectDatabase();
  void User;

  const colleges = await College.find({ status: { $ne: 'deleted' } }).sort({ college_code: 1 }).lean();

  const septemberStart = new Date(Date.UTC(2026, 8, 1, 0, 0, 0)); // Sept 1 2026
  const septemberEnd = new Date(Date.UTC(2026, 8, 30, 23, 59, 59, 999)); // Sept 30 2026

  const report: any[] = [];
  const weekendRecords: any[] = [];

  for (const c of colleges) {
    const rows = await DailyTracker.find({
      $and: [
        {
          $or: [
            { college_id: c._id },
            { college_id: String(c._id) },
          ],
        },
        { is_skipped: { $ne: true } },
        {
          $or: [
            { session_date: { $gte: septemberStart, $lte: septemberEnd } },
            { created_at: { $gte: septemberStart, $lte: septemberEnd } },
            { year: 2026, month: 9 },
          ],
        },
      ],
    })
      .populate('coordinator_id', 'full_name official_email username')
      .lean();

    const dateMap = new Map<string, { calls: number; coordinators: Set<string>; dayOfWeek: string; isWeekend: boolean }>();

    for (const r of rows) {
      let dStr = '';
      let dateObj: Date | null = null;

      if (r.session_date) {
        const dt = new Date(r.session_date);
        if (!isNaN(dt.getTime())) {
          dateObj = dt;
          const ist = new Date(dt.getTime() + IST_OFFSET_MS);
          const y = ist.getUTCFullYear();
          const m = String(ist.getUTCMonth() + 1).padStart(2, '0');
          const d = String(ist.getUTCDate()).padStart(2, '0');
          if (y === 2026 && m === '09') {
            dStr = `${y}-${m}-${d}`;
          }
        }
      }

      if (!dStr && typeof r.day === 'number' && r.day >= 1 && r.day <= 30) {
        if ((!r.year || r.year === 2026) && (!r.month || r.month === 9)) {
          const d = String(r.day).padStart(2, '0');
          dStr = `2026-09-${d}`;
          dateObj = new Date(Date.UTC(2026, 8, r.day));
        }
      }

      if (!dStr && r.created_at) {
        const cd = new Date(r.created_at);
        if (!isNaN(cd.getTime())) {
          dateObj = cd;
          const ist = new Date(cd.getTime() + IST_OFFSET_MS);
          const y = ist.getUTCFullYear();
          const m = String(ist.getUTCMonth() + 1).padStart(2, '0');
          const d = String(ist.getUTCDate()).padStart(2, '0');
          if (y === 2026 && m === '09') {
            dStr = `${y}-${m}-${d}`;
          }
        }
      }

      if (dStr) {
        const dayNum = parseInt(dStr.split('-')[2], 10);
        // Sept 2026: Sept 1 is Tuesday.
        // Days of week:
        const parsedD = new Date(Date.UTC(2026, 8, dayNum));
        const dayIdx = parsedD.getUTCDay(); // 0 = Sun, 6 = Sat
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = dayNames[dayIdx];
        const isWeekend = dayIdx === 0 || dayIdx === 6;

        const coordName = (r.coordinator_id as any)?.full_name || (r.coordinator_id as any)?.official_email || 'Unassigned';

        if (!dateMap.has(dStr)) {
          dateMap.set(dStr, { calls: 0, coordinators: new Set<string>(), dayOfWeek: dayName, isWeekend });
        }
        const entry = dateMap.get(dStr)!;
        entry.calls++;
        entry.coordinators.add(coordName);

        if (isWeekend) {
          weekendRecords.push({
            college_code: c.college_code,
            date: dStr,
            day: dayName,
            coordinator: coordName,
            company_name: (r as any).company_name || 'N/A',
          });
        }
      }
    }

    const sortedDates = Array.from(dateMap.keys()).sort();
    const dateDetails = sortedDates.map(date => {
      const info = dateMap.get(date)!;
      return {
        date,
        day_of_month: parseInt(date.split('-')[2], 10),
        day_of_week: info.dayOfWeek,
        is_weekend: info.isWeekend,
        calls_count: info.calls,
        coordinators: Array.from(info.coordinators),
      };
    });

    const allCoords = new Set<string>();
    dateDetails.forEach(d => d.coordinators.forEach(c => allCoords.add(c)));

    report.push({
      college_code: c.college_code === 'MAREPHRA' ? 'MAREPHRAM' : c.college_code,
      college_name: c.college_name,
      total_september_calls: rows.length,
      distinct_calling_days_count: sortedDates.length,
      dates_list: sortedDates,
      date_details: dateDetails,
      coordinators: Array.from(allCoords),
    });
  }

  const outputPath = path.join(__dirname, 'september_call_history_report.json');
  fs.writeFileSync(outputPath, JSON.stringify({ report, weekendRecords }, null, 2));

  console.log(`Generated September report for ${report.length} colleges.`);
  console.log(`Total weekend calls found: ${weekendRecords.length}`);

  await disconnectDatabase();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
