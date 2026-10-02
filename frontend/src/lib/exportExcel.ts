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

  if (typeof window !== 'undefined') {
    try {
      // Browser-safe download using Blob and ObjectURL (bypasses Node.js fs checks in Next.js bundle)
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = finalName;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 200);
      return;
    } catch (err) {
      console.warn('[exportToXlsx] Blob export fallback triggered:', err);
    }
  }

  // Fallback for non-browser environment
  XLSX.writeFile(wb, finalName);
}
