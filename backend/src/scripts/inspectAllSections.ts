import * as xlsx from 'xlsx';

const filePath = 'C:\\Users\\admin\\Downloads\\Weekly .xlsx';
const wb = xlsx.readFile(filePath);

console.log('=== SECTION HEADERS DETECTED ACROSS ALL SHEETS ===\n');

for (const sheetName of wb.SheetNames) {
  if (sheetName.toUpperCase() === 'PENDING') continue;
  const sheet = wb.Sheets[sheetName];
  const rows: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  
  const detectedSections: string[] = [];
  rows.forEach((r, idx) => {
    const joined = r.join(' ').trim();
    if (/companies\s+completed/i.test(joined)) detectedSections.push(`Completed (Row ${idx + 1})`);
    else if (/companies\s+in\s+progress/i.test(joined)) detectedSections.push(`In Progress (Row ${idx + 1})`);
    else if (/companies\s+in\s+pipeline/i.test(joined)) detectedSections.push(`Pipeline (Row ${idx + 1})`);
    else if (/top\s+companies/i.test(joined)) detectedSections.push(`Top Companies (Row ${idx + 1})`);
    else if (/rejected\s+companies|rejected\s+by\s+hr/i.test(joined)) detectedSections.push(`Rejected by HR (Row ${idx + 1})`);
    else if (/companies\s+on\s+hold\s+by\s+college|on\s+hold\s+by\s+college/i.test(joined)) detectedSections.push(`Hold by College (Row ${idx + 1})`);
    else if (/companies\s+on\s+hold\s+by\s+hr|on\s+hold\s+by\s+hr/i.test(joined)) detectedSections.push(`Hold by HR (Row ${idx + 1})`);
  });

  console.log(`Sheet: "${sheetName}" (Rows: ${rows.length}) -> Sections: [${detectedSections.join(', ')}]`);
}
