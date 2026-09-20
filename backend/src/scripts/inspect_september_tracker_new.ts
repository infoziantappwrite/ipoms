import ExcelJS from 'exceljs';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { College } from '../models/College';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

const FILE_PATH = 'C:\\Users\\admin\\Downloads\\September Tracker 2026 (1).xlsx';

async function main() {
  await connectDatabase();

  const allColleges = await College.find({ is_deleted: { $ne: true } }).lean();
  console.log(`=== REGISTERED COLLEGES IN DB: ${allColleges.length} ===`);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(FILE_PATH);

  console.log(`=== TOTAL SHEETS IN WORKBOOK: ${workbook.worksheets.length} ===\n`);

  const results: any[] = [];

  for (const sheet of workbook.worksheets) {
    const sheetName = sheet.name.trim();
    const isHidden = sheet.state === 'hidden' || sheet.state === 'veryHidden';
    
    // Check skip patterns: POSITIVES, JD RECEIVED, TRACKER, HIDDEN
    const upper = sheetName.toUpperCase();
    const isSpecial =
      upper.includes('POSITIVE') ||
      upper.includes('JD RECEIVED') ||
      upper.includes('JD_RECEIVED') ||
      upper === 'TRACKER' ||
      upper.endsWith(' TRACKER') ||
      upper.startsWith('TRACKER') ||
      isHidden;

    // Scan rows
    let headerRowIndex = -1;
    let headers: string[] = [];
    let filledRowCount = 0;
    const sampleRows: any[] = [];

    sheet.eachRow((row, rowNumber) => {
      const values = (row.values as any[]).slice(1).map((v) => (v != null ? String(v).trim() : ''));
      const hasContent = values.some((v) => v !== '' && v !== 'undefined');

      if (hasContent) {
        if (headerRowIndex === -1) {
          // Check if this looks like a header row
          const joined = values.join(' ').toLowerCase();
          if (
            joined.includes('company') ||
            joined.includes('s.no') ||
            joined.includes('s no') ||
            joined.includes('hr') ||
            joined.includes('mobile') ||
            joined.includes('contact')
          ) {
            headerRowIndex = rowNumber;
            headers = values.filter(Boolean);
          }
        } else {
          // Data row
          const rowObj: Record<string, string> = {};
          values.forEach((val, idx) => {
            const h = headers[idx] || `Col_${idx + 1}`;
            rowObj[h] = val;
          });
          // Check if row has at least company name or mobile or outcome
          const rowText = values.join(' ').trim();
          if (rowText.length > 0) {
            filledRowCount++;
            if (sampleRows.length < 3) {
              sampleRows.push({ rowNumber, values: values.slice(0, 8) });
            }
          }
        }
      }
    });

    // Try matching to DB college
    const matchedCollege = allColleges.find((c: any) => {
      const cName = c.college_name.toLowerCase();
      const cCode = c.college_code.toLowerCase();
      const sName = sheetName.toLowerCase();
      return (
        sName === cName ||
        sName === cCode ||
        sName.includes(cCode) ||
        cName.includes(sName) ||
        sName.replace(/[^a-z0-9]/g, '') === cName.replace(/[^a-z0-9]/g, '')
      );
    });

    results.push({
      sheetName,
      state: sheet.state,
      isHidden,
      isSpecial,
      headerRowIndex,
      headersCount: headers.length,
      headers: headers.slice(0, 10),
      filledRowCount,
      matchedCollege: matchedCollege ? `${matchedCollege.college_name} (${matchedCollege.college_code})` : 'NO_MATCH',
      matchedCollegeId: matchedCollege ? String(matchedCollege._id) : null,
      sampleRows,
    });
  }

  console.log('--- SHEET ANALYSIS SUMMARY ---');
  let eligibleCount = 0;
  let skippedCount = 0;
  let emptyCount = 0;

  for (const r of results) {
    let status = 'ELIGIBLE';
    if (r.isSpecial) {
      status = `SKIPPED (Special/Hidden: ${r.sheetName})`;
      skippedCount++;
    } else if (r.filledRowCount === 0) {
      status = `SKIPPED (Empty: 0 data rows)`;
      emptyCount++;
    } else {
      eligibleCount++;
    }

    console.log(`\nSheet: "${r.sheetName}" [${r.state}] ➔ ${status}`);
    console.log(`  - Matched College: ${r.matchedCollege}`);
    console.log(`  - Header Row: ${r.headerRowIndex} | Headers: ${r.headers.join(', ')}`);
    console.log(`  - Filled Data Rows: ${r.filledRowCount}`);
    if (r.sampleRows.length > 0) {
      console.log(`  - Sample Row 1:`, JSON.stringify(r.sampleRows[0]));
    }
  }

  console.log('\n=============================================');
  console.log(`Total Sheets: ${results.length}`);
  console.log(`Eligible College Sheets with Data: ${eligibleCount}`);
  console.log(`Skipped Special/Hidden Sheets: ${skippedCount}`);
  console.log(`Skipped Empty Sheets: ${emptyCount}`);
  console.log('=============================================\n');

  await disconnectDatabase();
}

main().catch(console.error);
