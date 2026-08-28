'use client';

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export interface GenericExportColumn<T> {
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render: (item: T, index: number) => string;
}

export interface UniversalExportOptions<T> {
  title: string;
  subtitle?: string;
  badgeText?: string;
  data: T[];
  columns: GenericExportColumn<T>[];
  filenamePrefix?: string;
}

/**
 * Universal PDF Print & Export Generator
 * Formats a clean, multi-page printable document with Infoziant branding, custom columns, and footer.
 */
export function exportUniversalPdf<T>({
  title,
  subtitle = 'Infoziant Placement Operations Management System (iPOMS)',
  badgeText,
  data,
  columns,
}: UniversalExportOptions<T>) {
  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to open and export the PDF.');
    return;
  }

  const thHtml = columns
    .map(
      (col) =>
        `<th style="${col.width ? `width: ${col.width};` : ''} text-align: ${col.align || 'left'};">${escapeHtml(
          col.header
        )}</th>`
    )
    .join('');

  const trHtml = data
    .map(
      (item, idx) => `
    <tr>
      ${columns
        .map(
          (col) =>
            `<td style="text-align: ${col.align || 'left'}; ${
              col.align === 'center' ? 'color: #64748b;' : col.align === 'right' ? 'font-weight: 700;' : ''
            }">${escapeHtml(col.render(item, idx))}</td>`
        )
        .join('')}
    </tr>
  `
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 14mm 14mm 18mm 14mm;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
    }
    * {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 9.5pt;
    }
    .header-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2.5px solid #1e3a8a;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .brand-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo-img {
      width: 44px;
      height: 44px;
      object-fit: contain;
    }
    .title-group h1 {
      margin: 0;
      font-size: 16pt;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
    }
    .title-group p {
      margin: 2px 0 0 0;
      font-size: 8.5pt;
      color: #64748b;
      font-weight: 600;
    }
    .meta-right {
      text-align: right;
      font-size: 8.5pt;
      color: #475569;
    }
    .meta-badge {
      display: inline-block;
      background: #eff6ff;
      color: #1e40af;
      border: 1px solid #bfdbfe;
      padding: 2.5px 8px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 8pt;
      margin-top: 3px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
      page-break-inside: auto;
    }
    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
    thead {
      display: table-header-group;
    }
    th {
      background-color: #1e3a8a !important;
      color: #ffffff !important;
      font-weight: 700;
      font-size: 8.5pt;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 8px 9px;
      border: 1px solid #1e3a8a;
    }
    td {
      padding: 6.5px 9px;
      border: 1px solid #e2e8f0;
      font-size: 8.5pt;
      line-height: 1.35;
    }
    tbody tr:nth-child(even) {
      background-color: #f8fafc !important;
    }
    .footer-bar {
      margin-top: 20px;
      border-top: 1px solid #cbd5e1;
      padding-top: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8pt;
      color: #64748b;
    }
    .footer-brand {
      font-weight: 700;
      color: #1e3a8a;
    }
  </style>
</head>
<body>
  <div class="header-card">
    <div class="brand-left">
      <img src="${window.location.origin}/infoziant-head.png" class="logo-img" alt="Infoziant" onerror="this.style.display='none'" />
      <div class="title-group">
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(subtitle)}</p>
      </div>
    </div>
    <div class="meta-right">
      <div>Generated: <strong>${dateStr}</strong></div>
      <div class="meta-badge">${escapeHtml(badgeText || `${data.length} Records`)}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        ${thHtml}
      </tr>
    </thead>
    <tbody>
      ${trHtml}
    </tbody>
  </table>

  <div class="footer-bar">
    <div>
      <span class="footer-brand">Prepared by Infoziant</span>
      <span style="display: block; font-size: 7.2pt; color: #94a3b8; margin-top: 1.5px;">© 2026 Infoziant. All rights reserved.</span>
    </div>
    <span>iPOMS Report • Page 1</span>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 350);
    };
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

/**
 * Universal High-Resolution PNG Image Exporter
 * Draws branded header, 4-6 columns table, alternating zebra stripes, and Infoziant footer onto a Canvas.
 */
export async function exportUniversalImage<T>({
  title,
  subtitle = 'Infoziant Placement Operations Management System (iPOMS)',
  badgeText,
  data,
  columns,
  filenamePrefix = 'iPOMS_Export',
}: UniversalExportOptions<T>): Promise<void> {
  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = 1200;
  const padding = 40;
  const headerHeight = 110;
  const tableHeaderHeight = 44;
  const rowHeight = 36;
  const footerHeight = 60;
  const totalRows = Math.max(data.length, 1);
  const totalHeight = padding * 2 + headerHeight + tableHeaderHeight + totalRows * rowHeight + footerHeight;

  // Set 2x Scaling for Retina display crispness
  const scale = 2;
  canvas.width = width * scale;
  canvas.height = totalHeight * scale;
  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, totalHeight);

  // Load Logo
  let logoImg: HTMLImageElement | null = null;
  try {
    logoImg = await new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = '/infoziant-head.png';
    });
  } catch {}

  // ── Draw Header ──────────────────────────────────────────────
  let headerTextX = padding;
  if (logoImg) {
    ctx.drawImage(logoImg, padding, padding, 48, 48);
    headerTextX = padding + 60;
  }

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(title, headerTextX, padding + 24);

  ctx.fillStyle = '#64748B';
  ctx.font = '500 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(subtitle, headerTextX, padding + 44);

  // Right Date & Count Badge
  ctx.textAlign = 'right';
  ctx.fillStyle = '#475569';
  ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`Date: ${dateStr}`, width - padding, padding + 22);

  ctx.fillStyle = '#EFF6FF';
  ctx.strokeStyle = '#BFDBFE';
  ctx.lineWidth = 1;
  const badgeWidth = 150;
  const badgeHeight = 24;
  const badgeX = width - padding - badgeWidth;
  const badgeY = padding + 30;
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#1E40AF';
  ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(badgeText || `${data.length} Total Records`, width - padding - 14, badgeY + 16);
  ctx.textAlign = 'left';

  // Divider Line
  const headerBottomY = padding + headerHeight - 15;
  ctx.strokeStyle = '#1E3A8A';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(padding, headerBottomY);
  ctx.lineTo(width - padding, headerBottomY);
  ctx.stroke();

  // ── Calculate Column Layout ─────────────────────────────────
  const tableY = headerBottomY + 15;
  const usableWidth = width - padding * 2;
  const colCount = columns.length;

  // Calculate widths: give explicit px where specified, and distribute remaining evenly
  let explicitWidthTotal = 0;
  let unassignedCount = 0;
  columns.forEach((col) => {
    if (col.width?.includes('px')) {
      explicitWidthTotal += parseInt(col.width, 10);
    } else {
      unassignedCount++;
    }
  });

  const remainingWidth = Math.max(usableWidth - explicitWidthTotal, 100);
  const defaultColWidth = unassignedCount > 0 ? remainingWidth / unassignedCount : usableWidth / colCount;

  const colWidths: number[] = columns.map((col) => {
    if (col.width?.includes('px')) return parseInt(col.width, 10);
    return defaultColWidth;
  });

  const colPositions: number[] = [];
  let accumX = padding;
  for (let i = 0; i < colCount; i++) {
    colPositions.push(accumX);
    accumX += colWidths[i];
  }

  // ── Draw Table Header ───────────────────────────────────────
  ctx.fillStyle = '#1E3A8A';
  ctx.beginPath();
  ctx.roundRect(padding, tableY, usableWidth, tableHeaderHeight, [6, 6, 0, 0]);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 11.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  columns.forEach((col, i) => {
    const colX = colPositions[i];
    const colW = colWidths[i];
    const align = col.align || 'left';

    if (align === 'center') {
      ctx.textAlign = 'center';
      ctx.fillText(col.header.toUpperCase(), colX + colW / 2, tableY + 27);
    } else if (align === 'right') {
      ctx.textAlign = 'right';
      ctx.fillText(col.header.toUpperCase(), colX + colW - 14, tableY + 27);
    } else {
      ctx.textAlign = 'left';
      ctx.fillText(col.header.toUpperCase(), colX + 12, tableY + 27);
    }
  });

  // ── Draw Table Rows ─────────────────────────────────────────
  let currentY = tableY + tableHeaderHeight;
  ctx.font = '11.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  data.forEach((item, idx) => {
    // Row background (zebra stripe)
    ctx.fillStyle = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
    ctx.fillRect(padding, currentY, usableWidth, rowHeight);

    // Row bottom border
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, currentY + rowHeight);
    ctx.lineTo(width - padding, currentY + rowHeight);
    ctx.stroke();

    columns.forEach((col, i) => {
      const colX = colPositions[i];
      const colW = colWidths[i];
      const align = col.align || 'left';
      const rawText = col.render(item, idx) || '—';
      const text = rawText.length > 38 ? rawText.substring(0, 35) + '…' : rawText;

      if (align === 'center') {
        ctx.textAlign = 'center';
        ctx.fillStyle = '#64748B';
        ctx.font = '600 11.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(text, colX + colW / 2, currentY + 23);
      } else if (align === 'right') {
        ctx.textAlign = 'right';
        ctx.fillStyle = '#1E3A8A';
        ctx.font = 'bold 11.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(text, colX + colW - 14, currentY + 23);
      } else {
        ctx.textAlign = 'left';
        ctx.fillStyle = i === 1 ? '#0F172A' : '#334155';
        ctx.font = i === 1 ? 'bold 11.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' : '500 11.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(text, colX + 12, currentY + 23);
      }
    });

    currentY += rowHeight;
  });

  // Table Outer Border
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1;
  ctx.strokeRect(padding, tableY, usableWidth, tableHeaderHeight + totalRows * rowHeight);

  // ── Draw Footer ─────────────────────────────────────────────
  const footerY = currentY + 30;
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, footerY);
  ctx.lineTo(width - padding, footerY);
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#1E3A8A';
  ctx.font = 'bold 11.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Prepared by Infoziant', padding, footerY + 18);
  ctx.fillStyle = '#94A3B8';
  ctx.font = '500 9.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('© 2026 Infoziant. All rights reserved.', padding, footerY + 31);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#64748B';
  ctx.font = '500 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`iPOMS • ${title}`, width - padding, footerY + 22);

  // Trigger Download
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filenamePrefix}_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 'image/png');
}
