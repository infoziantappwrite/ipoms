import { ActiveLeadItem } from '@/app/active-leads/components/ActiveLeadTable';

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Export Active Leads to a clean, professionally formatted printable/downloadable PDF.
 * Columns (4): S.No, Company Name, Role, CTC.
 * Title: Active Leads List - [Year]
 * Header: Infoziant Logo in corner
 * Footer: Prepared by Infoziant & Page formatting
 */
export function exportActiveLeadsPdf(leads: ActiveLeadItem[], academicYear: string) {
  const currentYear = academicYear && academicYear !== 'all' ? academicYear : new Date().getFullYear().toString();
  const title = `Active Leads List - ${currentYear}`;
  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to open and export the PDF.');
    return;
  }

  const rowsHtml = leads
    .map(
      (lead, idx) => `
    <tr>
      <td class="col-sno">${idx + 1}</td>
      <td class="col-company">${escapeHtml(lead.company_name || '—')}</td>
      <td class="col-role">${escapeHtml(lead.role || '—')}</td>
      <td class="col-ctc">${escapeHtml(lead.ctc || '—')}</td>
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
      font-size: 10pt;
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
      font-size: 17pt;
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
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 8px 10px;
      border: 1px solid #1e3a8a;
    }
    td {
      padding: 7px 10px;
      border: 1px solid #e2e8f0;
      font-size: 8.5pt;
      line-height: 1.35;
    }
    tbody tr:nth-child(even) {
      background-color: #f8fafc !important;
    }
    .col-sno {
      text-align: center;
      width: 50px;
      font-weight: 600;
      color: #64748b;
    }
    .col-company {
      text-align: left;
      font-weight: 700;
      color: #0f172a;
    }
    .col-role {
      text-align: left;
      color: #334155;
      font-weight: 500;
    }
    .col-ctc {
      text-align: right;
      width: 110px;
      font-weight: 800;
      color: #1e3a8a;
      font-family: monospace;
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
      <img src="${window.location.origin}/infoziant-head.png" class="logo-img" alt="Infoziant Logo" onerror="this.style.display='none'" />
      <div class="title-group">
        <h1>${title}</h1>
        <p>Infoziant Placement Operations Management System (iPOMS)</p>
      </div>
    </div>
    <div class="meta-right">
      <div>Generated: <strong>${dateStr}</strong></div>
      <div class="meta-badge">${leads.length} Active Opportunities</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 50px; text-align: center;">S.No</th>
        <th style="text-align: left;">Company Name</th>
        <th style="text-align: left;">Role</th>
        <th style="width: 110px; text-align: right;">CTC</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <div class="footer-bar">
    <div>
      <span class="footer-brand">Prepared by Infoziant</span>
      <span style="display: block; font-size: 7.2pt; color: #94a3b8; margin-top: 1.5px;">© 2026 Infoziant. All rights reserved.</span>
    </div>
    <span>iPOMS Active Leads • Page 1</span>
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
 * Export Active Leads as a high-resolution PNG image.
 * Renders on a canvas with:
 * - 4 Columns: S.No, Company Name, Role, CTC
 * - Title: Active Leads List - [Year]
 * - Logo: Infoziant Mark
 * - Footer: Prepared by Infoziant
 */
export async function exportActiveLeadsImage(leads: ActiveLeadItem[], academicYear: string): Promise<void> {
  const currentYear = academicYear && academicYear !== 'all' ? academicYear : new Date().getFullYear().toString();
  const title = `Active Leads List - ${currentYear}`;
  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = 1200;
  const padding = 40;
  const headerHeight = 110;
  const tableHeaderHeight = 44;
  const rowHeight = 38;
  const footerHeight = 60;
  const totalRows = Math.max(leads.length, 1);
  const totalHeight = padding * 2 + headerHeight + tableHeaderHeight + totalRows * rowHeight + footerHeight;

  // Set high-DPI scaling
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
  ctx.fillText('Infoziant Placement Operations Management System (iPOMS)', headerTextX, padding + 44);

  // Right Date & Count Badge
  ctx.textAlign = 'right';
  ctx.fillStyle = '#475569';
  ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`Date: ${dateStr}`, width - padding, padding + 22);

  ctx.fillStyle = '#EFF6FF';
  ctx.strokeStyle = '#BFDBFE';
  ctx.lineWidth = 1;
  const badgeWidth = 140;
  const badgeHeight = 24;
  const badgeX = width - padding - badgeWidth;
  const badgeY = padding + 30;
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#1E40AF';
  ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`${leads.length} Active Records`, width - padding - 14, badgeY + 16);
  ctx.textAlign = 'left';

  // Divider Line
  const headerBottomY = padding + headerHeight - 15;
  ctx.strokeStyle = '#1E3A8A';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(padding, headerBottomY);
  ctx.lineTo(width - padding, headerBottomY);
  ctx.stroke();

  // ── Draw Table Headers ──────────────────────────────────────
  const tableY = headerBottomY + 15;
  const colSnoWidth = 80;
  const colCtcWidth = 160;
  const colRoleWidth = 320;
  const colCompanyWidth = width - padding * 2 - colSnoWidth - colCtcWidth - colRoleWidth;

  const colSnoX = padding;
  const colCompanyX = colSnoX + colSnoWidth;
  const colRoleX = colCompanyX + colCompanyWidth;
  const colCtcX = colRoleX + colRoleWidth;

  // Header Background
  ctx.fillStyle = '#1E3A8A';
  ctx.beginPath();
  ctx.roundRect(padding, tableY, width - padding * 2, tableHeaderHeight, [6, 6, 0, 0]);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  // S.No
  ctx.textAlign = 'center';
  ctx.fillText('S.NO', colSnoX + colSnoWidth / 2, tableY + 27);

  // Company Name
  ctx.textAlign = 'left';
  ctx.fillText('COMPANY NAME', colCompanyX + 14, tableY + 27);

  // Role
  ctx.fillText('ROLE', colRoleX + 14, tableY + 27);

  // CTC
  ctx.textAlign = 'right';
  ctx.fillText('CTC', colCtcX + colCtcWidth - 16, tableY + 27);

  // ── Draw Table Rows ─────────────────────────────────────────
  let currentY = tableY + tableHeaderHeight;
  ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  leads.forEach((lead, idx) => {
    // Row background (zebra stripe)
    ctx.fillStyle = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
    ctx.fillRect(padding, currentY, width - padding * 2, rowHeight);

    // Row bottom border
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, currentY + rowHeight);
    ctx.lineTo(width - padding, currentY + rowHeight);
    ctx.stroke();

    // S.No
    ctx.textAlign = 'center';
    ctx.fillStyle = '#64748B';
    ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(String(idx + 1), colSnoX + colSnoWidth / 2, currentY + 24);

    // Company Name
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const compText = lead.company_name || '—';
    ctx.fillText(compText.length > 42 ? compText.substring(0, 39) + '…' : compText, colCompanyX + 14, currentY + 24);

    // Role
    ctx.fillStyle = '#334155';
    ctx.font = '500 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const roleText = lead.role || '—';
    ctx.fillText(roleText.length > 34 ? roleText.substring(0, 31) + '…' : roleText, colRoleX + 14, currentY + 24);

    // CTC
    ctx.textAlign = 'right';
    ctx.fillStyle = '#1E3A8A';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(lead.ctc || '—', colCtcX + colCtcWidth - 16, currentY + 24);

    currentY += rowHeight;
  });

  // Table Outer Border
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1;
  ctx.strokeRect(padding, tableY, width - padding * 2, tableHeaderHeight + totalRows * rowHeight);

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
  ctx.fillText(`iPOMS Active Leads • ${title}`, width - padding, footerY + 22);

  // Trigger Download
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Active_Leads_List_${currentYear}_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 'image/png');
}
