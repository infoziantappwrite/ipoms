import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';
import { CompanyMetadata } from '../models/CompanyMetadata';
import { connectDatabase, disconnectDatabase } from '../config/database';

async function run() {
  const filePath = path.resolve(__dirname, '../../../unique_companies_list.xlsx');
  console.log('Reading file:', filePath);

  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    return;
  }

  const workbook = XLSX.readFile(filePath);
  console.log('Sheet names:', workbook.SheetNames);

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    console.log(`\n--- Sheet: ${sheetName} (Total Rows: ${rows.length}) ---`);
    console.log('First 5 rows:');
    rows.slice(0, 5).forEach((r, i) => console.log(`Row ${i}:`, JSON.stringify(r)));
  }
}

run().catch(console.error);
