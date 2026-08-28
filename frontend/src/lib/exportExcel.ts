import * as XLSX from 'xlsx';

export interface ExcelSheetData {
  name?: string;
  headers: string[];
  rows: (string | number | boolean | null | undefined)[][];
}

/**
 * Universal client-side Excel (.xlsx) exporter for iPOMS tables & reports
 */
export function exportToXlsx(filename: string, sheets: ExcelSheetData | ExcelSheetData[]) {
  const wb = XLSX.utils.book_new();
  const sheetList = Array.isArray(sheets) ? sheets : [sheets];

  sheetList.forEach((sheet, idx) => {
    const rawName = sheet.name || (sheetList.length === 1 ? 'Sheet1' : `Sheet${idx + 1}`);
    const sheetName = rawName.replace(/[:\\/?*[\]]/g, '').slice(0, 31);
    const data = [sheet.headers, ...sheet.rows];
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Auto-fit column widths
    const colWidths = sheet.headers.map((header, colIdx) => {
      let maxLen = (header || '').length;
      sheet.rows.forEach((row) => {
        const val = row[colIdx];
        if (val !== undefined && val !== null) {
          const len = String(val).length;
          if (len > maxLen) maxLen = len;
        }
      });
      return { wch: Math.min(Math.max(maxLen + 3, 12), 60) };
    });
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  const finalName = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, finalName);
}
