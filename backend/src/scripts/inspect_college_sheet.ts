import * as XLSX from 'xlsx';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { College } from '../models/College';
import { User } from '../models/User';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

const FILE_PATH = "C:\\Users\\admin\\Downloads\\September Tracker 2026 (1).xlsx";

async function main() {
  await connectDatabase();

  const wb = XLSX.readFile(FILE_PATH, { cellDates: true, dense: true });
  
  const testSheets = ['KARPAGAM ', 'MCET', 'MEC', 'ACET', 'DSU'];

  for (const sheetName of testSheets) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;
    const json: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    console.log(`\n================ Sheet: "${sheetName}" (Total raw rows: ${json.length}) ================`);
    console.log('Row 0 (Header/Handled By):', JSON.stringify(json[0]));
    console.log('Row 1 (Columns):', JSON.stringify(json[1]));

    const nonBlankRows: { rowIdx: number; data: any }[] = [];
    for (let r = 2; r < json.length; r++) {
      const row = json[r];
      // Check if row has company or date or contact
      const hasContent = row.some((cell: any) => String(cell || '').trim() !== '');
      if (hasContent) {
        nonBlankRows.push({ rowIdx: r, data: row });
      }
    }

    console.log(`Found ${nonBlankRows.length} non-blank data rows.`);
    console.log('Sample first 5 non-blank rows:');
    nonBlankRows.slice(0, 5).forEach(r => {
      console.log(`[Excel Row ${r.rowIdx + 1}]`, JSON.stringify(r.data));
    });
    console.log('Sample last 3 non-blank rows:');
    nonBlankRows.slice(-3).forEach(r => {
      console.log(`[Excel Row ${r.rowIdx + 1}]`, JSON.stringify(r.data));
    });

    // Check unique Response Status values in this sheet
    const statuses = new Set<string>();
    nonBlankRows.forEach(r => {
      const status = String(r.data[7] || '').trim();
      if (status) statuses.add(status);
    });
    console.log('Unique Response Statuses:', Array.from(statuses));
  }

  await disconnectDatabase();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
