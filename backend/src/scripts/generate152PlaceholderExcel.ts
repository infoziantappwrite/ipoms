import path from 'path';
import fs from 'fs';
import ExcelJS from 'exceljs';
import mongoose from 'mongoose';
import { CompanyMetadata } from '../models/CompanyMetadata';
import { connectDatabase, disconnectDatabase } from '../config/database';

async function generateExcel() {
  console.log('\n===============================================================');
  console.log('📊 GENERATING EXCEL TEMPLATE FOR 152 MISSING PLACEHOLDERS');
  console.log('===============================================================\n');

  await connectDatabase();

  const emptyFilter = {
    is_deleted: false,
    serial_number: { $gte: 3807, $lte: 3998 },
    $and: [
      {
        $or: [
          { primary_mobile: { $exists: false } },
          { primary_mobile: null },
          { primary_mobile: '' },
          { primary_mobile: { $regex: '^[\\s\\-\\.]*$' } }
        ]
      },
      {
        $or: [
          { mobile_numbers: { $exists: false } },
          { mobile_numbers: { $size: 0 } },
          { mobile_numbers: null }
        ]
      }
    ]
  };

  const missingPlaceholders = await CompanyMetadata.find(emptyFilter)
    .sort({ serial_number: 1 })
    .lean();

  console.log(`📋 Found ${missingPlaceholders.length} placeholder records missing mobile numbers.`);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Infoziant iPOMS';
  workbook.lastModifiedBy = 'Infoziant iPOMS';
  workbook.created = new Date();
  workbook.modified = new Date();

  const sheet = workbook.addWorksheet('152 Missing Placeholders', {
    views: [{ state: 'frozen', ySplit: 1 }]
  });

  sheet.columns = [
    { header: 'S.No', key: 'sno', width: 10 },
    { header: 'Company Name', key: 'company_name', width: 38 },
    { header: 'HR Name', key: 'hr_name', width: 26 },
    { header: 'HR Designation', key: 'hr_designation', width: 22 },
    { header: 'Mobile Number (Primary)*', key: 'primary_mobile', width: 26 },
    { header: 'Alternate Mobile Numbers', key: 'alt_mobiles', width: 28 },
    { header: 'Email ID (Primary)', key: 'primary_email', width: 32 },
    { header: 'Company Type / Sector', key: 'company_type', width: 24 },
    { header: 'Notes / Remarks', key: 'notes', width: 35 }
  ];

  // Style Header Row (Row 1)
  const headerRow = sheet.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell, colNumber) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' } // Deep Navy Blue
    };
    cell.font = {
      name: 'Calibri',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' }
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: colNumber === 1 ? 'center' : 'left',
      wrapText: true
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };
  });

  // Populate data rows
  missingPlaceholders.forEach((comp: any, idx: number) => {
    const row = sheet.addRow({
      sno: comp.serial_number,
      company_name: comp.company_name,
      hr_name: comp.hr_name || '',
      hr_designation: comp.hr_designation || '',
      primary_mobile: comp.primary_mobile || '',
      alt_mobiles: (comp.mobile_numbers || []).filter((m: string) => m !== comp.primary_mobile).join(', '),
      primary_email: comp.primary_email || '',
      company_type: comp.company_type || 'other',
      notes: comp.notes || ''
    });

    row.height = 22;
    const isEven = idx % 2 === 0;

    row.eachCell((cell, colNumber) => {
      cell.font = {
        name: 'Calibri',
        size: 11,
        color: { argb: 'FF1E293B' },
        bold: colNumber === 1 || colNumber === 2
      };

      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: {
          argb: colNumber === 5
            ? (isEven ? 'FFFFFBEB' : 'FFFEF3C7') // Subtle gold/amber highlight for Mobile Column
            : (isEven ? 'FFFFFFFF' : 'FFF8FAFC') // Clean zebra striping
        }
      };

      cell.alignment = {
        vertical: 'middle',
        horizontal: colNumber === 1 ? 'center' : (colNumber === 5 ? 'center' : 'left')
      };

      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    });
  });

  // Output Paths
  const primaryPath = path.resolve(__dirname, '../../../152_Missing_Placeholder_Companies.xlsx');
  const userDownloadsPath = 'C:\\Users\\admin\\Downloads\\152_Missing_Placeholder_Companies.xlsx';

  await workbook.xlsx.writeFile(primaryPath);
  console.log(`✅ File saved to project: ${primaryPath}`);

  try {
    await workbook.xlsx.writeFile(userDownloadsPath);
    console.log(`✅ File copied to Downloads: ${userDownloadsPath}`);
  } catch (err: any) {
    console.warn(`⚠️ Could not save directly to Downloads (${err.message}). Primary project file is available.`);
  }

  await disconnectDatabase();
  console.log('\n✨ Done! Ready for user data entry.');
}

generateExcel().catch(console.error);
