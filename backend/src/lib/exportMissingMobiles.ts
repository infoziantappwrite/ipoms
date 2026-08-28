import fs from 'fs';
import path from 'path';
import * as xlsx from 'xlsx';
import { CompanyMetadata } from '../models/CompanyMetadata';

export async function generateMissingMobilesExcel(): Promise<{
  success: boolean;
  filePath: string;
  totalCount: number;
  message: string;
}> {
  const emptyFilter = {
    is_deleted: false,
    $or: [
      { primary_mobile: { $exists: false } },
      { primary_mobile: null },
      { primary_mobile: '' },
      { primary_mobile: { $regex: '^[\\s\\-\\.]*$' } },
    ],
  };

  const companies = await CompanyMetadata.find(emptyFilter)
    .sort({ serial_number: 1, _id: 1 })
    .lean();

  const excelRows = companies.map((c: any) => ({
    'S.No': c.serial_number ?? '',
    'Company Name': c.company_name ?? '',
    'HR Contact Person': c.hr_name ?? '',
    'HR Designation': c.hr_designation ?? '',
    'Mobile Numbers': c.primary_mobile || (Array.isArray(c.mobile_numbers) ? c.mobile_numbers.join(', ') : ''),
    'Email ID(s)': c.primary_email || (Array.isArray(c.email_ids) ? c.email_ids.join(', ') : ''),
    'Industry Type': c.company_type ?? 'other',
    'Location': c.location ?? '',
    'Notes': c.notes ?? '',
  }));

  const worksheet = xlsx.utils.json_to_sheet(excelRows);

  // Set column widths for clean readability
  worksheet['!cols'] = [
    { wch: 8 },   // S.No
    { wch: 38 },  // Company Name
    { wch: 28 },  // HR Contact Person
    { wch: 20 },  // HR Designation
    { wch: 18 },  // Mobile Numbers
    { wch: 35 },  // Email ID(s)
    { wch: 18 },  // Industry Type
    { wch: 22 },  // Location
    { wch: 30 },  // Notes
  ];

  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Missing Mobiles');

  const outputPath = 'C:\\Projects\\iPOMS\\missing.xlsx';
  xlsx.writeFile(workbook, outputPath);

  return {
    success: true,
    filePath: outputPath,
    totalCount: companies.length,
    message: `Generated missing.xlsx with ${companies.length} records successfully.`,
  };
}
