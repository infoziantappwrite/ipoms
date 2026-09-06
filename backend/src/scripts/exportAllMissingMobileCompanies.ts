import path from 'path';
import fs from 'fs';
import ExcelJS from 'exceljs';
import mongoose from 'mongoose';
import { CompanyMetadata } from '../models/CompanyMetadata';
import { connectDatabase, disconnectDatabase } from '../config/database';

async function generateAllMissingMobileExcel() {
  console.log('\n===============================================================');
  console.log('📊 GENERATING EXCEL FOR ALL 442 MISSING MOBILE METADATA RECORDS');
  console.log('===============================================================\n');

  await connectDatabase();

  const emptyFilter = {
    is_deleted: false,
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

  const allMissing = await CompanyMetadata.find(emptyFilter)
    .sort({ serial_number: 1 })
    .lean();

  console.log(`📋 Found ${allMissing.length} total records missing mobile numbers.`);

  const category1Legacy = allMissing.filter((c: any) => (c.hr_name && c.hr_name.trim()) || (c.primary_email && c.primary_email.trim()));
  const category2Placeholders = allMissing.filter((c: any) => !(c.hr_name && c.hr_name.trim()) && !(c.primary_email && c.primary_email.trim()));

  console.log(`   • Category 1 (Legacy with HR / Email) : ${category1Legacy.length}`);
  console.log(`   • Category 2 (Pure Placeholders)      : ${category2Placeholders.length}`);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Infoziant iPOMS';
  workbook.lastModifiedBy = 'Infoziant iPOMS';
  workbook.created = new Date();
  workbook.modified = new Date();

  const columns = [
    { header: 'S.No', key: 'sno', width: 10 },
    { header: 'Category', key: 'category', width: 26 },
    { header: 'Company Name', key: 'company_name', width: 38 },
    { header: 'HR Name', key: 'hr_name', width: 28 },
    { header: 'HR Designation', key: 'hr_designation', width: 22 },
    { header: 'Mobile Number (Primary)*', key: 'primary_mobile', width: 26 },
    { header: 'Alternate Mobile Numbers', key: 'alt_mobiles', width: 28 },
    { header: 'Email ID (Primary)', key: 'primary_email', width: 34 },
    { header: 'Alternate Email IDs', key: 'alt_emails', width: 32 },
    { header: 'Company Type / Sector', key: 'company_type', width: 24 },
    { header: 'Notes / Remarks', key: 'notes', width: 35 }
  ];

  function formatSheet(sheet: ExcelJS.Worksheet, data: any[], headerBgHex: string) {
    sheet.columns = columns;
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    // Style Header Row (Row 1)
    const headerRow = sheet.getRow(1);
    headerRow.height = 30;
    headerRow.eachCell((cell, colNumber) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: headerBgHex }
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
    data.forEach((comp: any, idx: number) => {
      const isPlaceholder = !(comp.hr_name && comp.hr_name.trim()) && !(comp.primary_email && comp.primary_email.trim());
      const catLabel = isPlaceholder ? 'Placeholder (Empty)' : 'Legacy (Has HR/Email)';

      const row = sheet.addRow({
        sno: comp.serial_number || idx + 1,
        category: catLabel,
        company_name: comp.company_name,
        hr_name: comp.hr_name || '',
        hr_designation: comp.hr_designation || '',
        primary_mobile: comp.primary_mobile || '',
        alt_mobiles: (comp.mobile_numbers || []).filter((m: string) => m !== comp.primary_mobile).join(', '),
        primary_email: comp.primary_email || '',
        alt_emails: (comp.email_ids || []).filter((e: string) => e !== comp.primary_email).join(', '),
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
          bold: colNumber === 1 || colNumber === 3
        };

        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: {
            argb: colNumber === 6
              ? (isEven ? 'FFFFFBEB' : 'FFFEF3C7') // Gold/Amber highlight for Mobile Column
              : (isEven ? 'FFFFFFFF' : 'FFF8FAFC') // Clean zebra striping
          }
        };

        cell.alignment = {
          vertical: 'middle',
          horizontal: colNumber === 1 || colNumber === 2 ? 'center' : (colNumber === 6 ? 'center' : 'left')
        };

        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
      });
    });
  }

  // Sheet 1: All 442 Missing Records
  const masterSheet = workbook.addWorksheet('All 442 Missing Records');
  formatSheet(masterSheet, allMissing, 'FF1E3A8A'); // Deep Navy Blue

  // Sheet 2: Category 1 - Legacy with HR/Email (291)
  const legacySheet = workbook.addWorksheet('Legacy Contacts (291)');
  formatSheet(legacySheet, category1Legacy, 'FF065F46'); // Emerald Green

  // Sheet 3: Category 2 - Pure Placeholders (151)
  const placeholderSheet = workbook.addWorksheet('Placeholders (151)');
  formatSheet(placeholderSheet, category2Placeholders, 'FF7C2D12'); // Amber / Brown

  // Output Paths
  const primaryPath = path.resolve(__dirname, '../../../442_Missing_Mobile_Metadata_Companies.xlsx');
  const userDownloadsPath = 'C:\\Users\\admin\\Downloads\\442_Missing_Mobile_Metadata_Companies.xlsx';

  await workbook.xlsx.writeFile(primaryPath);
  console.log(`✅ File saved to project: ${primaryPath}`);

  try {
    await workbook.xlsx.writeFile(userDownloadsPath);
    console.log(`✅ File copied to Downloads: ${userDownloadsPath}`);
  } catch (err: any) {
    console.warn(`⚠️ Could not save directly to Downloads (${err.message}). Primary project file is available.`);
  }

  await disconnectDatabase();
  console.log('\n✨ All 442 records successfully exported to Excel!');
}

generateAllMissingMobileExcel().catch(console.error);
