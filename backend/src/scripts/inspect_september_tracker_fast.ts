import * as XLSX from 'xlsx';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { College } from '../models/College';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

const FILE_PATH = 'C:\\Users\\admin\\Downloads\\September Tracker 2026 (1).xlsx';

async function main() {
  await connectDatabase();

  const allColleges = await College.find({ is_deleted: { $ne: true } }).lean();
  console.log(`=== REGISTERED COLLEGES IN DB: ${allColleges.length} ===`);

  const workbook = XLSX.readFile(FILE_PATH, { cellDates: true });
  console.log(`=== TOTAL SHEETS IN WORKBOOK: ${workbook.SheetNames.length} ===\n`);

  const results: any[] = [];

  for (const sheetName of workbook.SheetNames) {
    const trimmed = sheetName.trim();
    const upper = trimmed.toUpperCase();

    // Check hidden sheets (Workbook.Workbook.Sheets contains hidden flags)
    const sheetMeta = workbook.Workbook?.Sheets?.find((s: any) => s.name === sheetName);
    const isHidden = sheetMeta?.Hidden === 1 || sheetMeta?.Hidden === 2;

    const isSpecial =
      upper.includes('POSITIVE') ||
      upper.includes('JD RECEIVED') ||
      upper.includes('JD_RECEIVED') ||
      upper === 'TRACKER' ||
      upper.endsWith(' TRACKER') ||
      upper.startsWith('TRACKER') ||
      isHidden;

    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];

    let headerRowIdx = -1;
    let headers: string[] = [];
    let filledRows: any[] = [];

    for (let r = 0; r < rawData.length; r++) {
      const row = rawData[r].map((v) => (v != null ? String(v).trim() : ''));
      const text = row.join(' ').trim();
      if (!text) continue;

      if (headerRowIdx === -1) {
        const lower = text.toLowerCase();
        if (
          lower.includes('company') ||
          lower.includes('s.no') ||
          lower.includes('s no') ||
          lower.includes('hr') ||
          lower.includes('mobile') ||
          lower.includes('contact') ||
          lower.includes('start time') ||
          lower.includes('call status') ||
          lower.includes('status')
        ) {
          headerRowIdx = r;
          headers = row;
        }
      } else {
        // Count as data row if it has non-empty company name or contact or call status
        if (row.some((cell) => cell.length > 0)) {
          filledRows.push({ rowIdx: r + 1, data: row });
        }
      }
    }

    // Match college
    const matched = allColleges.find((c: any) => {
      const cName = c.college_name.toLowerCase();
      const cCode = c.college_code.toLowerCase();
      const sName = trimmed.toLowerCase();
      return (
        sName === cName ||
        sName === cCode ||
        sName.includes(cCode) ||
        cName.includes(sName) ||
        sName.replace(/[^a-z0-9]/g, '') === cName.replace(/[^a-z0-9]/g, '')
      );
    });

    results.push({
      sheetName: trimmed,
      isHidden,
      isSpecial,
      headerRowIdx,
      headers: headers.filter(Boolean),
      filledRowCount: filledRows.length,
      matchedCollege: matched ? `${matched.college_name} (${matched.college_code})` : 'NO_MATCH',
      matchedCollegeId: matched ? String(matched._id) : null,
      sampleRows: filledRows.slice(0, 2),
    });
  }

  let eligible = 0;
  let skippedSpecial = 0;
  let skippedEmpty = 0;

  console.log('--- SHEET BY SHEET BREAKDOWN ---');
  for (const r of results) {
    let status = '✅ ELIGIBLE FOR IMPORT';
    if (r.isSpecial) {
      status = `⏭️ SKIPPED (Special/Hidden: "${r.sheetName}")`;
      skippedSpecial++;
    } else if (r.filledRowCount === 0) {
      status = `⚠️ SKIPPED (Empty Sheet - 0 Rows)`;
      skippedEmpty++;
    } else {
      eligible++;
    }

    console.log(`\n📄 Sheet: "${r.sheetName}" ➔ ${status}`);
    console.log(`   - Matched DB College: ${r.matchedCollege}`);
    console.log(`   - Header Row: ${r.headerRowIdx >= 0 ? r.headerRowIdx + 1 : 'Not Found'} | Columns: [${r.headers.join(' | ')}]`);
    console.log(`   - Data Rows Count: ${r.filledRowCount}`);
    if (r.sampleRows.length > 0) {
      console.log(`   - Sample Data 1:`, r.sampleRows[0].data.slice(0, 7));
    }
  }

  console.log('\n=============================================');
  console.log(`📊 TOTAL SHEETS: ${results.length}`);
  console.log(`✅ ELIGIBLE SHEETS WITH DATA: ${eligible}`);
  console.log(`⏭️ SKIPPED (Positives/JD Received/Hidden/Tracker): ${skippedSpecial}`);
  console.log(`⚠️ SKIPPED (Empty Sheets): ${skippedEmpty}`);
  console.log('=============================================\n');

  await disconnectDatabase();
}

main().catch(console.error);
