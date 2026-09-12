import { getCollegeLogoUrl } from '@/lib/collegeLogo';

function getCleanPeriod(period?: string): string {
  if (!period) return '';
  const trimmed = String(period).trim();
  if (
    !trimmed ||
    trimmed.toLowerCase() === 'cumulative' ||
    trimmed.toLowerCase() === 'all dates (cumulative)' ||
    trimmed.toLowerCase() === 'all dates' ||
    trimmed.toLowerCase().includes('cumulative')
  ) {
    return '';
  }
  if (trimmed.includes(': ')) {
    const parts = trimmed.split(': ');
    const last = parts[parts.length - 1].trim();
    if (last.toLowerCase() === 'cumulative' || last.toLowerCase().includes('cumulative')) return '';
    return last;
  }
  if (trimmed.includes('(') && trimmed.includes(')')) {
    const match = trimmed.match(/\((.*?)\)/);
    if (match && match[1]) {
      const inside = match[1].trim();
      if (inside.toLowerCase() === 'cumulative' || inside.toLowerCase().includes('cumulative')) return '';
      return inside;
    }
  }
  return trimmed;
}

export function getReportExportBaseFileName(report: any): string {
  const sanitize = (str?: string) =>
    (str || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  const dateStr = new Date().toISOString().split('T')[0];
  const collegePart = report.is_multi_college
    ? 'consolidated-all-colleges'
    : sanitize(report.branding?.college_code || report.branding?.college_name || 'placement');

  const titlePart = sanitize(report.report_title || report.template_type || 'report');
  return `${collegePart}-${titlePart}-${dateStr}`;
}

export async function generateReportCanvas(report: any): Promise<HTMLCanvasElement | null> {
  if (!report) return null;

  const collegeName = report.branding?.college_name || 'Consolidated Partner Institutions';
  const collegeCode = (report.branding?.college_code || 'iPOMS').toUpperCase();
  const isConsolidated = !collegeCode || collegeCode === 'IPOMS';
  const collegeLogoUrl = getCollegeLogoUrl(collegeCode, collegeName, report.branding?.college_logo);

  const W = 860;
  const PADDING = 30;
  const CONTENT_W = W - PADDING * 2; // 800px
  const SCALE = 2.5; // High-DPI output resolution

  const loadImg = (url: string): Promise<HTMLImageElement | null> => {
    return new Promise((resolve) => {
      if (!url) return resolve(null);
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    });
  };

  const [infoziantImg, collegeImg] = await Promise.all([
    loadImg('/infoziant-head.png'),
    loadImg(collegeLogoUrl),
  ]);

  let totalH = 30; // Top padding
  const headerH = 74;
  totalH += headerH + 16;
  const metaH = 34;
  totalH += metaH + 16;

  const activeKpis = report.included_kpi_cards || report.included_sections?.kpi_cards || {};
  const hasKpis = report.template_type !== 'pending_tasks' && report.included_sections?.kpi_summary && report.kpi_summary;
  let kpiCards: Array<{ label: string; val: any; color: string; bg?: string; border?: string; labelColor?: string; key?: string }> = [];
  if (hasKpis) {
    if (report.template_type === 'month_end') {
      kpiCards = [
        { label: 'Total Conversions', val: report.kpi_summary.total_conversion_count || 0, color: '#059669', bg: '#ecfdf5', border: '#6ee7b7', labelColor: '#065f46', key: 'total_conversion_count' },
        { label: 'Companies Scheduled', val: report.kpi_summary.total_companies_scheduled || 0, color: '#d97706', bg: '#fffbeb', border: '#fcd34d', labelColor: '#92400e', key: 'total_companies_scheduled' },
        { label: 'Offers Received', val: report.kpi_summary.total_offers_moved || 0, color: '#7c3aed', bg: '#faf5ff', border: '#d8b4fe', labelColor: '#6b21a8', key: 'total_offers_moved' },
      ];
    } else if (report.template_type === 'active_leads' || report.kpi_summary.total_leads !== undefined) {
      kpiCards = [
        { label: 'Total Active Leads', val: report.kpi_summary.total_leads || 0, color: '#2563eb', bg: '#eff6ff', border: '#93c5fd', labelColor: '#1e40af', key: 'total_leads' },
        { label: 'Graduating Batch', val: report.kpi_summary.graduating_year || '2027', color: '#059669', bg: '#ecfdf5', border: '#6ee7b7', labelColor: '#065f46', key: 'graduating_year' },
      ];
    } else if (report.is_multi_college) {
      kpiCards = [
        { label: 'Colleges Included', val: report.kpi_summary?.total_colleges || report.colleges_data?.length || 0, color: '#1e3a8a', bg: '#eff6ff', border: '#bfdbfe', labelColor: '#1e40af', key: 'total_colleges' },
        { label: 'Drives Completed', val: report.kpi_summary?.drives_completed || 0, color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', labelColor: '#065f46', key: 'drives_completed' },
        { label: 'In Progress', val: report.kpi_summary?.drives_in_progress || 0, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', labelColor: '#1e40af', key: 'drives_in_progress' },
        { label: 'Offers Placed', val: report.kpi_summary?.total_offers || 0, color: '#7c3aed', bg: '#faf5ff', border: '#e9d5ff', labelColor: '#6b21a8', key: 'total_offers' },
      ];
    } else {
      kpiCards = [
        { label: 'Total Calls Made', val: report.kpi_summary.total_calls || 0, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', labelColor: '#1e40af', key: 'total_calls' },
        { label: 'Positives', val: report.kpi_summary.positive_responses || 0, color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', labelColor: '#065f46', key: 'positive_responses' },
        { label: 'Not Hiring', val: report.kpi_summary.not_hiring || 0, color: '#e11d48', bg: '#fff1f2', border: '#fecdd3', labelColor: '#9f1239', key: 'not_hiring' },
        { label: 'JD Received', val: report.kpi_summary.jds_received || 0, color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc', labelColor: '#155e75', key: 'jds_received' },
      ];
    }
    kpiCards = kpiCards.filter((c: any) => activeKpis[c.key] !== false);
    if (kpiCards.length > 0) {
      totalH += 58 + 18;
    }
  }

  const measureTextLines = (
    measureCtx: CanvasRenderingContext2D,
    text: string,
    maxW: number,
    font: string
  ): string[] => {
    if (!text || text.trim() === '' || text.trim() === '—' || text.trim() === '-') {
      return ['—'];
    }
    measureCtx.font = font;
    const words = text.trim().split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testW = measureCtx.measureText(testLine).width;
      if (testW <= maxW) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          if (measureCtx.measureText(word).width <= maxW) {
            currentLine = word;
          } else {
            let partial = '';
            for (const ch of word) {
              if (measureCtx.measureText(partial + ch + '-').width <= maxW) {
                partial += ch;
              } else {
                if (partial) lines.push(partial + '-');
                partial = ch;
              }
            }
            currentLine = partial;
          }
        } else {
          let partial = '';
          for (const ch of word) {
            if (measureCtx.measureText(partial + ch + '-').width <= maxW) {
              partial += ch;
            } else {
              if (partial) lines.push(partial + '-');
              partial = ch;
            }
          }
          currentLine = partial;
        }
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
    return lines.length > 0 ? lines : ['—'];
  };

  interface MeasuredCell {
    lines: string[];
    font: string;
    fillStyle: string;
  }

  interface MeasuredRow {
    cells: MeasuredCell[];
    height: number;
    bg?: string;
  }

  interface SectionDef {
    title: string;
    badge: string;
    accentBg: string;
    accentBorder: string;
    accentText: string;
    headers: string[];
    colWidths: number[];
    measuredRows: MeasuredRow[];
  }

  const sectionsToDraw: SectionDef[] = [];
  const scratchCanvas = document.createElement('canvas');
  const scratchCtx = scratchCanvas.getContext('2d')!;

  // 1. Pending Tasks (Section-wise 3 Tables)
  if (report.included_sections?.pending_tasks && report.sections?.pending_tasks) {
    const allTasks = report.sections.pending_tasks;
    const sec1 =
      report.sections?.drive_in_progress && report.sections.drive_in_progress.length > 0
        ? report.sections.drive_in_progress
        : allTasks.filter((t: any) => t.task_section === 'drive_in_progress');
    const sec2 =
      report.sections?.companies_in_drive && report.sections.companies_in_drive.length > 0
        ? report.sections.companies_in_drive
        : allTasks.filter((t: any) => t.task_section === 'companies_in_drive');
    const sec3 =
      report.sections?.company_in_progress && report.sections.company_in_progress.length > 0
        ? report.sections.company_in_progress
        : allTasks.filter(
            (t: any) =>
              t.task_section === 'company_in_progress' ||
              (!t.task_section && !sec1.includes(t) && !sec2.includes(t))
          );

    const pendingSections = [
      { key: 'drive_in_progress', title: 'DRIVE IN PROGRESS', list: sec1, accentBg: '#fffbeb', accentBorder: '#fde68a' },
      { key: 'companies_in_drive', title: 'COMPANIES IN DRIVE', list: sec2, accentBg: '#eef2ff', accentBorder: '#c7d2fe' },
      { key: 'company_in_progress', title: 'COMPANY IN PROGRESS', list: sec3, accentBg: '#eff6ff', accentBorder: '#bfdbfe' },
    ].filter((s) => s.list.length > 0);

    const headers = ['#', 'Company Name', 'Role', 'CTC', 'Status'];
    const colWidths = [36, 210, 160, 100, 294];

    pendingSections.forEach((sec, secIdx) => {
      const rawRows = sec.list.map((r: any, idx: number) => {
        const roleVal = String(r.role || r.job_role || '—');
        const ctcVal = String(r.ctc || r.ctc_lpa || r.package_details || '—');
        const statusVal = String(
          r.status ||
          r.current_status_text ||
          r.action_to_be_taken ||
          r.current_status ||
          r.remarks ||
          '—'
        );
        return [
          String(idx + 1),
          String(r.company_name || '—'),
          roleVal,
          ctcVal,
          statusVal,
        ];
      });

      const measuredRows: MeasuredRow[] = rawRows.map((row: string[], rIdx: number) => {
        const taskObj = sec.list[rIdx];
        const isHl = Boolean(taskObj?.is_highlighted);
        const hlColor = taskObj?.highlight_color || '#fef08a';
        let maxLines = 1;
        const cells: MeasuredCell[] = row.map((cellText, cIdx) => {
          const colW = colWidths[cIdx];
          const maxCellW = colW - 14;
          const font = cIdx === 1
            ? 'bold 12.5px system-ui, -apple-system, sans-serif'
            : cIdx === 0 || cIdx === 3
            ? '600 12px monospace'
            : '500 12px system-ui, -apple-system, sans-serif';
          const fillStyle = cIdx === 1
            ? (isHl ? '#09090b' : '#0a2540')
            : cIdx === 0
            ? (isHl ? '#27272a' : '#007791')
            : (isHl ? '#18181b' : '#334155');

          const lines = measureTextLines(scratchCtx, cellText, maxCellW, font);
          if (lines.length > maxLines) maxLines = lines.length;
          return { lines, font, fillStyle };
        });
        const height = Math.max(38, maxLines * 17 + 16);
        return { cells, height, bg: isHl ? hlColor : undefined };
      });

      sectionsToDraw.push({
        title: `${secIdx + 1}. ${sec.title}`,
        badge: `${sec.list.length} Companies`,
        accentBg: sec.accentBg,
        accentBorder: sec.accentBorder,
        accentText: '#0a2540',
        headers,
        colWidths,
        measuredRows,
      });
    });
  }

  // 2. Multi-College Consolidated Weekly Placement
  if (report.is_multi_college && Array.isArray(report.colleges_data)) {
    report.colleges_data.forEach((colData: any, cIdx: number) => {
      // Completed
      if (report.included_sections?.completed_companies !== false && colData.completed_companies && colData.completed_companies.length > 0) {
        const compRows = colData.completed_companies;
        const headers = ['#', 'Company Name', 'Role', 'CTC', 'Status', 'Offers'];
        const colWidths = [36, 204, 180, 100, 180, 100];
        const rawRows = compRows.map((r: any) => [
          String(r.s_no || ''),
          String(r.company_name || '—'),
          String(r.job_role || r.role || '—'),
          String(r.ctc_lpa || r.ctc || '—'),
          String(r.current_status_text || r.status || 'Drive Completed'),
          String(r.selected_count || 0),
        ]);

        const measuredRows: MeasuredRow[] = rawRows.map((row: string[]) => {
          let maxLines = 1;
          const cells: MeasuredCell[] = row.map((cellText, cIdx2) => {
            const colW = colWidths[cIdx2];
            const maxCellW = colW - 14;
            const font = cIdx2 === 1
              ? 'bold 12px system-ui, -apple-system, sans-serif'
              : cIdx2 === 0
              ? '600 12px monospace'
              : (cIdx2 === 3 || cIdx2 === 5)
              ? 'bold 12px system-ui, -apple-system, sans-serif'
              : '500 12px system-ui, -apple-system, sans-serif';
            const fillStyle = cIdx2 === 1
              ? '#0a2540'
              : cIdx2 === 0
              ? '#007791'
              : (cIdx2 === 3)
              ? '#007791'
              : (cIdx2 === 5)
              ? '#059669'
              : '#334155';

            const lines = measureTextLines(scratchCtx, cellText, maxCellW, font);
            if (lines.length > maxLines) maxLines = lines.length;
            return { lines, font, fillStyle };
          });
          const height = Math.max(38, maxLines * 17 + 16);
          return { cells, height };
        });

        sectionsToDraw.push({
          title: `${cIdx + 1}. ${colData.college_name.toUpperCase()} — COMPLETED`,
          badge: `${compRows.length} Drives`,
          accentBg: '#ecfdf5',
          accentBorder: '#a7f3d0',
          accentText: '#0a2540',
          headers,
          colWidths,
          measuredRows,
        });
      }

      // Drive in progress
      const dipRows = colData.drive_in_progress || colData.drive_in_progress_companies;
      if (report.included_sections?.drive_in_progress !== false && dipRows && dipRows.length > 0) {
        const headers = ['#', 'Company Name', 'Role', 'CTC', 'Status / Follow-up'];
        const colWidths = [36, 224, 200, 110, 230];
        const rawRows = dipRows.map((r: any) => [
          String(r.s_no || ''),
          String(r.company_name || '—'),
          String(r.job_role || r.role || '—'),
          String(r.ctc_lpa || r.ctc || 'Competitive'),
          String(r.current_status_text || r.status || 'Drive in progress'),
        ]);

        const measuredRows: MeasuredRow[] = rawRows.map((row: string[]) => {
          let maxLines = 1;
          const cells: MeasuredCell[] = row.map((cellText, cIdx2) => {
            const colW = colWidths[cIdx2];
            const maxCellW = colW - 14;
            const font = cIdx2 === 1
              ? 'bold 12px system-ui, -apple-system, sans-serif'
              : cIdx2 === 0
              ? '600 12px monospace'
              : (cIdx2 === 3)
              ? 'bold 12px system-ui, -apple-system, sans-serif'
              : '500 12px system-ui, -apple-system, sans-serif';
            const fillStyle = cIdx2 === 1
              ? '#0a2540'
              : cIdx2 === 0
              ? '#007791'
              : (cIdx2 === 3)
              ? '#007791'
              : '#334155';

            const lines = measureTextLines(scratchCtx, cellText, maxCellW, font);
            if (lines.length > maxLines) maxLines = lines.length;
            return { lines, font, fillStyle };
          });
          const height = Math.max(38, maxLines * 17 + 16);
          return { cells, height };
        });

        sectionsToDraw.push({
          title: `${cIdx + 1}. ${colData.college_name.toUpperCase()} — DRIVE IN PROGRESS`,
          badge: `${dipRows.length} Drives`,
          accentBg: '#fffbeb',
          accentBorder: '#fde68a',
          accentText: '#0a2540',
          headers,
          colWidths,
          measuredRows,
        });
      }

      // Upcoming drives
      const upRows = colData.upcoming_drives || colData.companies_in_drive;
      if (report.included_sections?.upcoming_drives !== false && report.included_sections?.companies_in_drive !== false && upRows && upRows.length > 0) {
        const headers = ['#', 'Company Name', 'Role', 'CTC', 'Status / Drive Date'];
        const colWidths = [36, 224, 200, 110, 230];
        const rawRows = upRows.map((r: any) => [
          String(r.s_no || ''),
          String(r.company_name || '—'),
          String(r.job_role || r.role || '—'),
          String(r.ctc_lpa || r.ctc || 'Competitive'),
          String(r.current_status_text || r.status || 'Upcoming Drive'),
        ]);

        const measuredRows: MeasuredRow[] = rawRows.map((row: string[]) => {
          let maxLines = 1;
          const cells: MeasuredCell[] = row.map((cellText, cIdx2) => {
            const colW = colWidths[cIdx2];
            const maxCellW = colW - 14;
            const font = cIdx2 === 1
              ? 'bold 12px system-ui, -apple-system, sans-serif'
              : cIdx2 === 0
              ? '600 12px monospace'
              : (cIdx2 === 3)
              ? 'bold 12px system-ui, -apple-system, sans-serif'
              : '500 12px system-ui, -apple-system, sans-serif';
            const fillStyle = cIdx2 === 1
              ? '#0a2540'
              : cIdx2 === 0
              ? '#007791'
              : (cIdx2 === 3)
              ? '#007791'
              : '#334155';

            const lines = measureTextLines(scratchCtx, cellText, maxCellW, font);
            if (lines.length > maxLines) maxLines = lines.length;
            return { lines, font, fillStyle };
          });
          const height = Math.max(38, maxLines * 17 + 16);
          return { cells, height };
        });

        sectionsToDraw.push({
          title: `${cIdx + 1}. ${colData.college_name.toUpperCase()} — UPCOMING DRIVES`,
          badge: `${upRows.length} Drives`,
          accentBg: '#eef2ff',
          accentBorder: '#c7d2fe',
          accentText: '#0a2540',
          headers,
          colWidths,
          measuredRows,
        });
      }

      // In progress
      if (report.included_sections?.in_progress !== false && colData.in_progress && colData.in_progress.length > 0) {
        const ipRows = colData.in_progress;
        const headers = ['#', 'Company Name', 'Role', 'CTC', 'Status'];
        const colWidths = [36, 224, 200, 110, 230];
        const rawRows = ipRows.map((r: any) => [
          String(r.s_no || ''),
          String(r.company_name || '—'),
          String(r.job_role || r.role || '—'),
          String(r.ctc_lpa || r.ctc || '—'),
          String(r.current_status_text || r.status || 'In Progress'),
        ]);

        const measuredRows: MeasuredRow[] = rawRows.map((row: string[]) => {
          let maxLines = 1;
          const cells: MeasuredCell[] = row.map((cellText, cIdx2) => {
            const colW = colWidths[cIdx2];
            const maxCellW = colW - 14;
            const font = cIdx2 === 1
              ? 'bold 12px system-ui, -apple-system, sans-serif'
              : cIdx2 === 0
              ? '600 12px monospace'
              : (cIdx2 === 3)
              ? 'bold 12px system-ui, -apple-system, sans-serif'
              : '500 12px system-ui, -apple-system, sans-serif';
            const fillStyle = cIdx2 === 1
              ? '#0a2540'
              : cIdx2 === 0
              ? '#007791'
              : (cIdx2 === 3)
              ? '#007791'
              : '#334155';

            const lines = measureTextLines(scratchCtx, cellText, maxCellW, font);
            if (lines.length > maxLines) maxLines = lines.length;
            return { lines, font, fillStyle };
          });
          const height = Math.max(38, maxLines * 17 + 16);
          return { cells, height };
        });

        sectionsToDraw.push({
          title: `${cIdx + 1}. ${colData.college_name.toUpperCase()} — IN PROGRESS`,
          badge: `${ipRows.length} Drives`,
          accentBg: '#eff6ff',
          accentBorder: '#bfdbfe',
          accentText: '#0a2540',
          headers,
          colWidths,
          measuredRows,
        });
      }
    });
  }

  // 3. Single-College Weekly Placement (Sections 1-9)
  if (!report.is_multi_college && report.template_type !== 'month_end' && report.template_type !== 'active_leads' && report.template_type !== 'pending_tasks') {
    // 1. Completed
    if (report.included_sections?.completed_companies && report.sections?.completed_companies) {
      const cRows = report.sections.completed_companies;
      const headers = ['#', 'Company Name', 'Role', 'CTC', 'Status', 'Offers Received'];
      const colWidths = [36, 200, 174, 90, 180, 120];
      const rawRows = cRows.map((r: any) => [
        String(r.s_no || ''),
        String(r.company_name || '—'),
        String(r.job_role || '—'),
        String(r.ctc_lpa || '—'),
        String(r.current_status_text || '—'),
        String(r.selected_count || 0),
      ]);

      const measuredRows: MeasuredRow[] = rawRows.map((row: string[]) => {
        let maxLines = 1;
        const cells: MeasuredCell[] = row.map((cellText, cIdx) => {
          const colW = colWidths[cIdx];
          const maxCellW = colW - 14;
          const font = cIdx === 1 || cIdx === 5
            ? 'bold 12px system-ui, -apple-system, sans-serif'
            : cIdx === 0
            ? '600 12px monospace'
            : (cIdx === 3)
            ? 'bold 12px system-ui, -apple-system, sans-serif'
            : '500 12px system-ui, -apple-system, sans-serif';
          const fillStyle = cIdx === 1
            ? '#0a2540'
            : cIdx === 0
            ? '#007791'
            : (cIdx === 3)
            ? '#007791'
            : (cIdx === 5)
            ? '#059669'
            : '#334155';

          const lines = measureTextLines(scratchCtx, cellText, maxCellW, font);
          if (lines.length > maxLines) maxLines = lines.length;
          return { lines, font, fillStyle };
        });
        const height = Math.max(38, maxLines * 17 + 16);
        return { cells, height };
      });

      sectionsToDraw.push({
        title: '1. COMPANIES COMPLETED',
        badge: `${cRows.length} Drives`,
        accentBg: '#ecfdf5',
        accentBorder: '#a7f3d0',
        accentText: '#0a2540',
        headers,
        colWidths,
        measuredRows,
      });
    }

    // 2. Drive In Progress
    if (report.included_sections?.drive_in_progress !== false && report.sections?.drive_in_progress && report.sections.drive_in_progress.length > 0) {
      const dipRows = report.sections.drive_in_progress;
      const headers = ['#', 'Company Name', 'Role', 'CTC', 'Status / Follow-up'];
      const colWidths = [36, 224, 200, 110, 230];
      const rawRows = dipRows.map((r: any) => [
        String(r.s_no || ''),
        String(r.company_name || '—'),
        String(r.job_role || r.role || '—'),
        String(r.ctc_lpa || r.ctc || '—'),
        String(r.current_status_text || r.status || 'Drive in progress'),
      ]);

      const measuredRows: MeasuredRow[] = rawRows.map((row: string[]) => {
        let maxLines = 1;
        const cells: MeasuredCell[] = row.map((cellText, cIdx) => {
          const colW = colWidths[cIdx];
          const maxCellW = colW - 14;
          const font = cIdx === 1
            ? 'bold 12px system-ui, -apple-system, sans-serif'
            : cIdx === 0
            ? '600 12px monospace'
            : (cIdx === 3)
            ? 'bold 12px system-ui, -apple-system, sans-serif'
            : '500 12px system-ui, -apple-system, sans-serif';
          const fillStyle = cIdx === 1
            ? '#0a2540'
            : cIdx === 0
            ? '#007791'
            : (cIdx === 3)
            ? '#007791'
            : '#334155';

          const lines = measureTextLines(scratchCtx, cellText, maxCellW, font);
          if (lines.length > maxLines) maxLines = lines.length;
          return { lines, font, fillStyle };
        });
        const height = Math.max(38, maxLines * 17 + 16);
        return { cells, height };
      });

      sectionsToDraw.push({
        title: '2. DRIVE IN PROGRESS',
        badge: `${dipRows.length} Drives`,
        accentBg: '#fffbeb',
        accentBorder: '#fde68a',
        accentText: '#0a2540',
        headers,
        colWidths,
        measuredRows,
      });
    }

    // 3. Upcoming Drives
    const upCanvasRows = report.sections?.companies_in_drive || report.sections?.upcoming_drives;
    if (report.included_sections?.companies_in_drive !== false && upCanvasRows && upCanvasRows.length > 0) {
      const cidRows = upCanvasRows;
      const headers = ['#', 'Company Name', 'Role', 'CTC', 'Status / Drive Date'];
      const colWidths = [36, 224, 200, 110, 230];
      const rawRows = cidRows.map((r: any) => [
        String(r.s_no || ''),
        String(r.company_name || '—'),
        String(r.job_role || r.role || '—'),
        String(r.ctc_lpa || r.ctc || '—'),
        String(r.current_status_text || r.status || 'Upcoming Drive'),
      ]);

      const measuredRows: MeasuredRow[] = rawRows.map((row: string[]) => {
        let maxLines = 1;
        const cells: MeasuredCell[] = row.map((cellText, cIdx) => {
          const colW = colWidths[cIdx];
          const maxCellW = colW - 14;
          const font = cIdx === 1
            ? 'bold 12px system-ui, -apple-system, sans-serif'
            : cIdx === 0
            ? '600 12px monospace'
            : (cIdx === 3)
            ? 'bold 12px system-ui, -apple-system, sans-serif'
            : '500 12px system-ui, -apple-system, sans-serif';
          const fillStyle = cIdx === 1
            ? '#0a2540'
            : cIdx === 0
            ? '#007791'
            : (cIdx === 3)
            ? '#007791'
            : '#334155';

          const lines = measureTextLines(scratchCtx, cellText, maxCellW, font);
          if (lines.length > maxLines) maxLines = lines.length;
          return { lines, font, fillStyle };
        });
        const height = Math.max(38, maxLines * 17 + 16);
        return { cells, height };
      });

      sectionsToDraw.push({
        title: '3. UPCOMING DRIVES',
        badge: `${cidRows.length} Drives`,
        accentBg: '#eef2ff',
        accentBorder: '#c7d2fe',
        accentText: '#0a2540',
        headers,
        colWidths,
        measuredRows,
      });
    }

    // 4. In Progress Drives
    if (report.included_sections?.in_progress && report.sections?.in_progress) {
      const ipRows = report.sections.in_progress;
      const headers = ['#', 'Company Name', 'Role', 'CTC', 'Status'];
      const colWidths = [36, 224, 200, 110, 230];
      const rawRows = ipRows.map((r: any) => [
        String(r.s_no || ''),
        String(r.company_name || '—'),
        String(r.job_role || '—'),
        String(r.ctc_lpa || '—'),
        String(r.current_status_text || '—'),
      ]);

      const measuredRows: MeasuredRow[] = rawRows.map((row: string[]) => {
        let maxLines = 1;
        const cells: MeasuredCell[] = row.map((cellText, cIdx) => {
          const colW = colWidths[cIdx];
          const maxCellW = colW - 14;
          const font = cIdx === 1
            ? 'bold 12px system-ui, -apple-system, sans-serif'
            : cIdx === 0
            ? '600 12px monospace'
            : (cIdx === 3)
            ? 'bold 12px system-ui, -apple-system, sans-serif'
            : '500 12px system-ui, -apple-system, sans-serif';
          const fillStyle = cIdx === 1
            ? '#0a2540'
            : cIdx === 0
            ? '#007791'
            : (cIdx === 3)
            ? '#007791'
            : '#334155';

          const lines = measureTextLines(scratchCtx, cellText, maxCellW, font);
          if (lines.length > maxLines) maxLines = lines.length;
          return { lines, font, fillStyle };
        });
        const height = Math.max(38, maxLines * 17 + 16);
        return { cells, height };
      });

      sectionsToDraw.push({
        title: '4. COMPANIES IN PROGRESS',
        badge: `${ipRows.length} Drives`,
        accentBg: '#eff6ff',
        accentBorder: '#bfdbfe',
        accentText: '#0a2540',
        headers,
        colWidths,
        measuredRows,
      });
    }

    // 5. Pipeline
    if (report.included_sections?.pipeline && report.sections?.pipeline) {
      const pRows = report.sections.pipeline;
      const headers = ['#', 'Company Name', 'Role', 'CTC', 'Status'];
      const colWidths = [36, 224, 200, 110, 230];
      const rawRows = pRows.map((r: any) => [
        String(r.s_no || ''),
        String(r.company_name || '—'),
        String(r.job_role || '—'),
        String(r.ctc_lpa || '—'),
        String(r.current_status_text || '—'),
      ]);

      const measuredRows: MeasuredRow[] = rawRows.map((row: string[]) => {
        let maxLines = 1;
        const cells: MeasuredCell[] = row.map((cellText, cIdx) => {
          const colW = colWidths[cIdx];
          const maxCellW = colW - 14;
          const font = cIdx === 1
            ? 'bold 12px system-ui, -apple-system, sans-serif'
            : cIdx === 0
            ? '600 12px monospace'
            : (cIdx === 3)
            ? 'bold 12px system-ui, -apple-system, sans-serif'
            : '500 12px system-ui, -apple-system, sans-serif';
          const fillStyle = cIdx === 1
            ? '#0a2540'
            : cIdx === 0
            ? '#007791'
            : (cIdx === 3)
            ? '#007791'
            : '#334155';

          const lines = measureTextLines(scratchCtx, cellText, maxCellW, font);
          if (lines.length > maxLines) maxLines = lines.length;
          return { lines, font, fillStyle };
        });
        const height = Math.max(38, maxLines * 17 + 16);
        return { cells, height };
      });

      sectionsToDraw.push({
        title: '5. COMPANIES IN PIPELINE',
        badge: `${pRows.length} Leads`,
        accentBg: '#ecfeff',
        accentBorder: '#a5f3fc',
        accentText: '#0a2540',
        headers,
        colWidths,
        measuredRows,
      });
    }

    // 6. Top Companies
    if (report.included_sections?.top_companies && report.sections?.top_companies) {
      const topRows = report.sections.top_companies;
      const headers = ['#', 'Company Name', 'Role', 'CTC', 'Status'];
      const colWidths = [36, 224, 200, 110, 230];
      const rawRows = topRows.map((r: any) => [
        String(r.s_no || ''),
        String(r.company_name || '—'),
        String(r.job_role || '—'),
        String(r.ctc_lpa || '—'),
        String(r.current_status_text || '—'),
      ]);

      const measuredRows: MeasuredRow[] = rawRows.map((row: string[]) => {
        let maxLines = 1;
        const cells: MeasuredCell[] = row.map((cellText, cIdx) => {
          const colW = colWidths[cIdx];
          const maxCellW = colW - 14;
          const font = cIdx === 1
            ? 'bold 12px system-ui, -apple-system, sans-serif'
            : cIdx === 0
            ? '600 12px monospace'
            : (cIdx === 3)
            ? 'bold 12px system-ui, -apple-system, sans-serif'
            : '500 12px system-ui, -apple-system, sans-serif';
          const fillStyle = cIdx === 1
            ? '#0a2540'
            : cIdx === 0
            ? '#007791'
            : (cIdx === 3)
            ? '#007791'
            : '#334155';

          const lines = measureTextLines(scratchCtx, cellText, maxCellW, font);
          if (lines.length > maxLines) maxLines = lines.length;
          return { lines, font, fillStyle };
        });
        const height = Math.max(38, maxLines * 17 + 16);
        return { cells, height };
      });

      sectionsToDraw.push({
        title: '6. TOP COMPANIES',
        badge: `${topRows.length} Companies`,
        accentBg: '#fefce8',
        accentBorder: '#fef08a',
        accentText: '#0a2540',
        headers,
        colWidths,
        measuredRows,
      });
    }

    // 7. Rejected Companies
    const rejRows = report.sections?.rejected_companies || report.sections?.rejected_by_hr;
    if ((report.included_sections?.rejected_companies || report.included_sections?.rejected_by_hr) && rejRows && rejRows.length > 0) {
      const headers = ['#', 'Company Name', 'Role', 'CTC', 'Status / Reason'];
      const colWidths = [36, 224, 200, 110, 230];
      const rawRows = rejRows.map((r: any) => [
        String(r.s_no || ''),
        String(r.company_name || '—'),
        String(r.job_role || '—'),
        String(r.ctc_lpa || '—'),
        String(r.current_status_text || '—'),
      ]);

      const measuredRows: MeasuredRow[] = rawRows.map((row: string[]) => {
        let maxLines = 1;
        const cells: MeasuredCell[] = row.map((cellText, cIdx) => {
          const colW = colWidths[cIdx];
          const maxCellW = colW - 14;
          const font = cIdx === 1
            ? 'bold 12px system-ui, -apple-system, sans-serif'
            : cIdx === 0
            ? '600 12px monospace'
            : (cIdx === 3)
            ? 'bold 12px system-ui, -apple-system, sans-serif'
            : '500 12px system-ui, -apple-system, sans-serif';
          const fillStyle = cIdx === 1
            ? '#0a2540'
            : cIdx === 0
            ? '#007791'
            : (cIdx === 3)
            ? '#007791'
            : '#334155';

          const lines = measureTextLines(scratchCtx, cellText, maxCellW, font);
          if (lines.length > maxLines) maxLines = lines.length;
          return { lines, font, fillStyle };
        });
        const height = Math.max(38, maxLines * 17 + 16);
        return { cells, height };
      });

      sectionsToDraw.push({
        title: '7. REJECTED COMPANIES',
        badge: `${rejRows.length} Companies`,
        accentBg: '#fff1f2',
        accentBorder: '#fecdd3',
        accentText: '#0a2540',
        headers,
        colWidths,
        measuredRows,
      });
    }

    // 8. On Hold by College
    const holdCollegeRows = report.sections?.on_hold_by_college || report.sections?.rejected_by_college;
    if ((report.included_sections?.on_hold_by_college || report.included_sections?.rejected_by_college) && holdCollegeRows && holdCollegeRows.length > 0) {
      const headers = ['#', 'Company Name', 'Role', 'CTC', 'Status / Reason'];
      const colWidths = [36, 224, 200, 110, 230];
      const rawRows = holdCollegeRows.map((r: any) => [
        String(r.s_no || ''),
        String(r.company_name || '—'),
        String(r.job_role || '—'),
        String(r.ctc_lpa || '—'),
        String(r.current_status_text || '—'),
      ]);

      const measuredRows: MeasuredRow[] = rawRows.map((row: string[]) => {
        let maxLines = 1;
        const cells: MeasuredCell[] = row.map((cellText, cIdx) => {
          const colW = colWidths[cIdx];
          const maxCellW = colW - 14;
          const font = cIdx === 1
            ? 'bold 12px system-ui, -apple-system, sans-serif'
            : cIdx === 0
            ? '600 12px monospace'
            : (cIdx === 3)
            ? 'bold 12px system-ui, -apple-system, sans-serif'
            : '500 12px system-ui, -apple-system, sans-serif';
          const fillStyle = cIdx === 1
            ? '#0a2540'
            : cIdx === 0
            ? '#007791'
            : (cIdx === 3)
            ? '#007791'
            : '#334155';

          const lines = measureTextLines(scratchCtx, cellText, maxCellW, font);
          if (lines.length > maxLines) maxLines = lines.length;
          return { lines, font, fillStyle };
        });
        const height = Math.max(38, maxLines * 17 + 16);
        return { cells, height };
      });

      sectionsToDraw.push({
        title: '8. COMPANIES ON HOLD BY COLLEGE',
        badge: `${holdCollegeRows.length} Companies`,
        accentBg: '#fffbeb',
        accentBorder: '#fde68a',
        accentText: '#0a2540',
        headers,
        colWidths,
        measuredRows,
      });
    }

    // 9. On Hold by HR
    if (report.included_sections?.on_hold_by_hr && report.sections?.on_hold_by_hr && report.sections.on_hold_by_hr.length > 0) {
      const holdHrRows = report.sections.on_hold_by_hr;
      const headers = ['#', 'Company Name', 'Role', 'CTC', 'Status / Reason'];
      const colWidths = [36, 224, 200, 110, 230];
      const rawRows = holdHrRows.map((r: any) => [
        String(r.s_no || ''),
        String(r.company_name || '—'),
        String(r.job_role || '—'),
        String(r.ctc_lpa || '—'),
        String(r.current_status_text || '—'),
      ]);

      const measuredRows: MeasuredRow[] = rawRows.map((row: string[]) => {
        let maxLines = 1;
        const cells: MeasuredCell[] = row.map((cellText, cIdx) => {
          const colW = colWidths[cIdx];
          const maxCellW = colW - 14;
          const font = cIdx === 1
            ? 'bold 12px system-ui, -apple-system, sans-serif'
            : cIdx === 0
            ? '600 12px monospace'
            : (cIdx === 3)
            ? 'bold 12px system-ui, -apple-system, sans-serif'
            : '500 12px system-ui, -apple-system, sans-serif';
          const fillStyle = cIdx === 1
            ? '#0a2540'
            : cIdx === 0
            ? '#007791'
            : (cIdx === 3)
            ? '#007791'
            : '#334155';

          const lines = measureTextLines(scratchCtx, cellText, maxCellW, font);
          if (lines.length > maxLines) maxLines = lines.length;
          return { lines, font, fillStyle };
        });
        const height = Math.max(38, maxLines * 17 + 16);
        return { cells, height };
      });

      sectionsToDraw.push({
        title: '9. COMPANIES ON HOLD BY HR',
        badge: `${holdHrRows.length} Companies`,
        accentBg: '#fff1f2',
        accentBorder: '#fecdd3',
        accentText: '#0a2540',
        headers,
        colWidths,
        measuredRows,
      });
    }
  }

  // 4. Active Leads
  if (report.template_type === 'active_leads' && report.included_sections?.active_leads && report.sections?.active_leads) {
    const alRows = report.sections.active_leads;
    const headers = ['#', 'Company Name', 'Role', 'CTC'];
    const colWidths = [36, 270, 304, 190];
    const rawRows = alRows.map((r: any) => [
      String(r.s_no || ''),
      String(r.company_name || '—'),
      String(r.role || '—'),
      String(r.ctc || '—'),
    ]);

    const measuredRows: MeasuredRow[] = rawRows.map((row: string[]) => {
      let maxLines = 1;
      const cells: MeasuredCell[] = row.map((cellText, cIdx) => {
        const colW = colWidths[cIdx];
        const maxCellW = colW - 14;
        const font = cIdx === 1
          ? 'bold 12px system-ui, -apple-system, sans-serif'
          : cIdx === 0
          ? '600 12px monospace'
          : (cIdx === 3)
          ? 'bold 12px system-ui, -apple-system, sans-serif'
          : '500 12px system-ui, -apple-system, sans-serif';
        const fillStyle = cIdx === 1
          ? '#0a2540'
          : cIdx === 0
          ? '#007791'
          : (cIdx === 3)
          ? '#007791'
          : '#334155';

        const lines = measureTextLines(scratchCtx, cellText, maxCellW, font);
        if (lines.length > maxLines) maxLines = lines.length;
        return { lines, font, fillStyle };
      });
      const height = Math.max(38, maxLines * 17 + 16);
      return { cells, height };
    });

    const canvasTitle = `ACTIVE CORPORATE LEADS — ${String(report.kpi_summary?.graduating_year || report.academic_year || '2027').toUpperCase()}`;
    sectionsToDraw.push({
      title: canvasTitle,
      badge: `${alRows.length} Leads`,
      accentBg: '#ecfdf5',
      accentBorder: '#a7f3d0',
      accentText: '#0a2540',
      headers,
      colWidths,
      measuredRows,
    });
  }

  // 5. Month-End Sections
  if (report.template_type === 'month_end') {
    // 1. Completed
    if (report.included_sections?.completed_companies && report.sections?.completed_companies) {
      const compRows = report.sections.completed_companies;
      const headers = ['#', 'Company Name', 'Role', 'CTC', 'Status', 'Offers'];
      const colWidths = [36, 204, 180, 100, 180, 100];
      const rawRows = compRows.map((r: any) => [
        String(r.s_no || ''),
        String(r.company_name || '—'),
        String(r.role || r.job_role || '—'),
        String(r.ctc || r.ctc_lpa || '—'),
        String(r.status || r.current_status_text || 'Drive Completed'),
        String(r.offers_received ?? r.selected_count ?? '0'),
      ]);

      const measuredRows: MeasuredRow[] = rawRows.map((row: string[]) => {
        let maxLines = 1;
        const cells: MeasuredCell[] = row.map((cellText, cIdx) => {
          const colW = colWidths[cIdx];
          const maxCellW = colW - 14;
          const font = cIdx === 1
            ? 'bold 12px system-ui, -apple-system, sans-serif'
            : cIdx === 0
            ? '600 12px monospace'
            : (cIdx === 3 || cIdx === 5)
            ? 'bold 12px system-ui, -apple-system, sans-serif'
            : '500 12px system-ui, -apple-system, sans-serif';
          const fillStyle = cIdx === 1
            ? '#0a2540'
            : cIdx === 0
            ? '#007791'
            : (cIdx === 3)
            ? '#007791'
            : (cIdx === 5)
            ? '#059669'
            : '#334155';

          const lines = measureTextLines(scratchCtx, cellText, maxCellW, font);
          if (lines.length > maxLines) maxLines = lines.length;
          return { lines, font, fillStyle };
        });
        const height = Math.max(38, maxLines * 17 + 16);
        return { cells, height };
      });

      sectionsToDraw.push({
        title: '1. COMPANIES COMPLETED',
        badge: `${compRows.length} Companies`,
        accentBg: '#ecfdf5',
        accentBorder: '#a7f3d0',
        accentText: '#0a2540',
        headers,
        colWidths,
        measuredRows,
      });
    }

    // 2. JD Received
    if (report.included_sections?.company_conversions && report.sections?.company_conversions) {
      const convRows = report.sections.company_conversions;
      const headers = ['#', 'Company Name', 'Role', 'CTC', 'JD Received Date'];
      const colWidths = [36, 234, 210, 110, 210];
      const rawRows = convRows.map((r: any) => [
        String(r.s_no || ''),
        String(r.company_name || '—'),
        String(r.role || '—'),
        String(r.ctc || '—'),
        String(r.jd_received_date || '—'),
      ]);

      const measuredRows: MeasuredRow[] = rawRows.map((row: string[]) => {
        let maxLines = 1;
        const cells: MeasuredCell[] = row.map((cellText, cIdx) => {
          const colW = colWidths[cIdx];
          const maxCellW = colW - 14;
          const font = cIdx === 1
            ? 'bold 12px system-ui, -apple-system, sans-serif'
            : cIdx === 0
            ? '600 12px monospace'
            : (cIdx === 3)
            ? 'bold 12px system-ui, -apple-system, sans-serif'
            : '500 12px system-ui, -apple-system, sans-serif';
          const fillStyle = cIdx === 1
            ? '#0a2540'
            : cIdx === 0
            ? '#007791'
            : (cIdx === 3)
            ? '#007791'
            : '#334155';

          const lines = measureTextLines(scratchCtx, cellText, maxCellW, font);
          if (lines.length > maxLines) maxLines = lines.length;
          return { lines, font, fillStyle };
        });
        const height = Math.max(38, maxLines * 17 + 16);
        return { cells, height };
      });

      sectionsToDraw.push({
        title: '2. JD RECEIVED COMPANIES',
        badge: `${convRows.length} Companies`,
        accentBg: '#ecfdf5',
        accentBorder: '#a7f3d0',
        accentText: '#0a2540',
        headers,
        colWidths,
        measuredRows,
      });
    }

    // 3. In Drive
    const inDriveCanvasRows = report.sections?.companies_in_drive || report.sections?.company_drives_scheduled;
    if ((report.included_sections?.companies_in_drive || report.included_sections?.company_drives_scheduled) && inDriveCanvasRows) {
      const headers = ['#', 'Company Name', 'Role', 'CTC', 'Status'];
      const colWidths = [36, 224, 200, 110, 230];
      const rawRows = inDriveCanvasRows.map((r: any) => [
        String(r.s_no || ''),
        String(r.company_name || '—'),
        String(r.role || '—'),
        String(r.ctc || '—'),
        String(r.status || r.current_status_text || '—'),
      ]);

      const measuredRows: MeasuredRow[] = rawRows.map((row: string[]) => {
        let maxLines = 1;
        const cells: MeasuredCell[] = row.map((cellText, cIdx) => {
          const colW = colWidths[cIdx];
          const maxCellW = colW - 14;
          const font = cIdx === 1
            ? 'bold 12px system-ui, -apple-system, sans-serif'
            : cIdx === 0
            ? '600 12px monospace'
            : (cIdx === 3)
            ? 'bold 12px system-ui, -apple-system, sans-serif'
            : '500 12px system-ui, -apple-system, sans-serif';
          const fillStyle = cIdx === 1
            ? '#0a2540'
            : cIdx === 0
            ? '#007791'
            : (cIdx === 3)
            ? '#007791'
            : '#334155';

          const lines = measureTextLines(scratchCtx, cellText, maxCellW, font);
          if (lines.length > maxLines) maxLines = lines.length;
          return { lines, font, fillStyle };
        });
        const height = Math.max(38, maxLines * 17 + 16);
        return { cells, height };
      });

      sectionsToDraw.push({
        title: '3. COMPANIES IN DRIVE',
        badge: `${inDriveCanvasRows.length} Companies`,
        accentBg: '#eef2ff',
        accentBorder: '#c7d2fe',
        accentText: '#0a2540',
        headers,
        colWidths,
        measuredRows,
      });
    }

    // 4. On Hold by TPO
    if (report.included_sections?.on_hold_by_college && report.sections?.on_hold_by_college && report.sections.on_hold_by_college.length > 0) {
      const holdRows = report.sections.on_hold_by_college;
      const headers = ['#', 'Company Name', 'Role', 'CTC', 'Status / Remarks'];
      const colWidths = [36, 224, 200, 110, 230];
      const rawRows = holdRows.map((r: any) => [
        String(r.s_no || ''),
        String(r.company_name || '—'),
        String(r.role || '—'),
        String(r.ctc || '—'),
        String(r.status || r.remarks || '—'),
      ]);

      const measuredRows: MeasuredRow[] = rawRows.map((row: string[]) => {
        let maxLines = 1;
        const cells: MeasuredCell[] = row.map((cellText, cIdx) => {
          const colW = colWidths[cIdx];
          const maxCellW = colW - 14;
          const font = cIdx === 1
            ? 'bold 12px system-ui, -apple-system, sans-serif'
            : cIdx === 0
            ? '600 12px monospace'
            : (cIdx === 3)
            ? 'bold 12px system-ui, -apple-system, sans-serif'
            : '500 12px system-ui, -apple-system, sans-serif';
          const fillStyle = cIdx === 1
            ? '#0a2540'
            : cIdx === 0
            ? '#007791'
            : (cIdx === 3)
            ? '#007791'
            : '#334155';

          const lines = measureTextLines(scratchCtx, cellText, maxCellW, font);
          if (lines.length > maxLines) maxLines = lines.length;
          return { lines, font, fillStyle };
        });
        const height = Math.max(38, maxLines * 17 + 16);
        return { cells, height };
      });

      sectionsToDraw.push({
        title: '4. COMPANIES ON HOLD BY TPO',
        badge: `${holdRows.length} Companies`,
        accentBg: '#fffbeb',
        accentBorder: '#fde68a',
        accentText: '#0a2540',
        headers,
        colWidths,
        measuredRows,
      });
    }

    // 5. On Hold by HR
    if (report.included_sections?.on_hold_by_hr && report.sections?.on_hold_by_hr && report.sections.on_hold_by_hr.length > 0) {
      const holdHrRows = report.sections.on_hold_by_hr;
      const headers = ['#', 'Company Name', 'Role', 'CTC', 'Status / Remarks'];
      const colWidths = [36, 224, 200, 110, 230];
      const rawRows = holdHrRows.map((r: any) => [
        String(r.s_no || ''),
        String(r.company_name || '—'),
        String(r.role || '—'),
        String(r.ctc || '—'),
        String(r.status || r.remarks || '—'),
      ]);

      const measuredRows: MeasuredRow[] = rawRows.map((row: string[]) => {
        let maxLines = 1;
        const cells: MeasuredCell[] = row.map((cellText, cIdx) => {
          const colW = colWidths[cIdx];
          const maxCellW = colW - 14;
          const font = cIdx === 1
            ? 'bold 12px system-ui, -apple-system, sans-serif'
            : cIdx === 0
            ? '600 12px monospace'
            : (cIdx === 3)
            ? 'bold 12px system-ui, -apple-system, sans-serif'
            : '500 12px system-ui, -apple-system, sans-serif';
          const fillStyle = cIdx === 1
            ? '#0a2540'
            : cIdx === 0
            ? '#007791'
            : (cIdx === 3)
            ? '#007791'
            : '#334155';

          const lines = measureTextLines(scratchCtx, cellText, maxCellW, font);
          if (lines.length > maxLines) maxLines = lines.length;
          return { lines, font, fillStyle };
        });
        const height = Math.max(38, maxLines * 17 + 16);
        return { cells, height };
      });

      sectionsToDraw.push({
        title: '5. COMPANIES ON HOLD BY HR',
        badge: `${holdHrRows.length} Companies`,
        accentBg: '#fff1f2',
        accentBorder: '#fecdd3',
        accentText: '#0a2540',
        headers,
        colWidths,
        measuredRows,
      });
    }
  }

  // Calculate total sections height
  sectionsToDraw.forEach((sec) => {
    totalH += 34; // Section title bar
    totalH += 34; // Table header
    if (sec.measuredRows.length === 0) {
      totalH += 34; // Empty row
    } else {
      sec.measuredRows.forEach((r) => {
        totalH += r.height;
      });
    }
    totalH += 22; // Margin bottom between sections
  });

  // Observations Box
  const hasObservations = Boolean(
    report.included_sections?.remarks !== false &&
    report.included_sections?.remarks &&
    (report.remarks || report.observations)?.trim()
  );
  const obsText = hasObservations ? (report.remarks || report.observations || '').trim() : '';
  let obsLines: string[] = [];
  let obsBoxH = 75;
  if (hasObservations) {
    obsLines = measureTextLines(
      scratchCtx,
      obsText,
      CONTENT_W - 32,
      '500 12px system-ui, -apple-system, sans-serif'
    );
    obsBoxH = Math.max(68, obsLines.length * 19 + 38);
    totalH += obsBoxH + 18;
  }

  // Footer
  const hasFooter = report.include_prepared_by !== false;
  if (hasFooter) {
    totalH += 40 + 20;
  }

  totalH += PADDING; // Bottom padding

  // Create High-Res Canvas
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(W * SCALE);
  canvas.height = Math.round(totalH * SCALE);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.scale(SCALE, SCALE);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Helper: Round Rectangle
  const drawRoundRect = (
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    fill?: string,
    stroke?: string,
    lineWidth = 1
  ) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }
  };

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, totalH);

  let currentY = PADDING;

  // Header Logos & Title
  const logoBoxW = 154;
  const logoBoxH = 66;
  if (infoziantImg) {
    const aspect = infoziantImg.width / infoziantImg.height;
    const imgH = 56;
    const imgW = Math.min(150, imgH * aspect);
    ctx.drawImage(infoziantImg, PADDING, currentY + (logoBoxH - imgH) / 2, imgW, imgH);
  } else {
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Infoziant', PADDING, currentY + 39);
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 18.5px system-ui, -apple-system, sans-serif';
  let rawTitle =
    report.report_title ||
    (report.template_type === 'month_end'
      ? `${report.report_period?.split(' ')[0] || 'August'} Month Placement Operations Report`
      : report.template_type === 'pending_tasks'
      ? 'Pending Task Placement Report'
      : report.template_type === 'active_leads'
      ? 'Active Leads Pipeline Report'
      : 'Weekly Placement Report');
  
  if (/pending\s*task/i.test(rawTitle)) {
    rawTitle = 'Pending Task Placement Report';
  }
  ctx.fillText(rawTitle, W / 2, currentY + 32);

  if (collegeName && collegeName !== 'Consolidated Partner Institutions' && report.template_type !== 'active_leads') {
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 13.5px system-ui, -apple-system, sans-serif';
    ctx.fillText(collegeName, W / 2, currentY + 55);
  }

  if (!report.is_multi_college && !isConsolidated) {
    if (collegeImg) {
      const aspect = collegeImg.width / collegeImg.height;
      const imgH = 56;
      const imgW = Math.min(150, imgH * aspect);
      ctx.drawImage(collegeImg, W - PADDING - imgW, currentY + (logoBoxH - imgH) / 2, imgW, imgH);
    } else {
      ctx.fillStyle = '#0284c7';
      ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(collegeCode, W - PADDING, currentY + 39);
    }
  }

  currentY += headerH;
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.moveTo(PADDING, currentY);
  ctx.lineTo(W - PADDING, currentY);
  ctx.stroke();

  currentY += 14;

  // Metadata Strip
  drawRoundRect(PADDING, currentY, CONTENT_W, metaH, 6, '#f8fafc', '#e2e8f0', 1);
  ctx.fillStyle = '#334155';
  ctx.font = '500 12px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';

  let metaText = '';
  const cleanPeriod = getCleanPeriod(report.report_period);
  if (report.template_type === 'weekly_placement' && cleanPeriod) {
    metaText = `Period: ${cleanPeriod}         Generated Date: ${report.generated_date || new Date().toLocaleDateString('en-IN')}`;
  } else {
    metaText = `Generated Date: ${report.generated_date || new Date().toLocaleDateString('en-IN')}`;
  }
  ctx.fillText(metaText, W / 2, currentY + 21);

  currentY += metaH + 16;

  // KPI Summary Cards
  if (hasKpis && kpiCards.length > 0) {
    const kpiCount = kpiCards.length;
    const kpiGap = 12;
    const kpiCardW = (CONTENT_W - (kpiCount - 1) * kpiGap) / kpiCount;

    kpiCards.forEach((kpi, kIdx) => {
      const cardX = PADDING + kIdx * (kpiCardW + kpiGap);
      drawRoundRect(cardX, currentY, kpiCardW, 58, 8, kpi.bg || '#f8fafc', kpi.border || '#e2e8f0', 1);

      ctx.textAlign = 'center';
      ctx.fillStyle = kpi.labelColor || '#475569';
      ctx.font = 'bold 9.5px system-ui, -apple-system, sans-serif';
      ctx.fillText(kpi.label.toUpperCase(), cardX + kpiCardW / 2, currentY + 20);

      ctx.fillStyle = kpi.color;
      ctx.font = 'bold 17px system-ui, -apple-system, monospace';
      ctx.fillText(String(kpi.val), cardX + kpiCardW / 2, currentY + 46);
    });
    currentY += 58 + 18;
  }

  // Render Section Tables
  sectionsToDraw.forEach((sec) => {
    // Title
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0a2540';
    ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
    ctx.fillText(sec.title, PADDING, currentY + 16);

    // Accent line
    ctx.fillStyle = '#007791';
    ctx.fillRect(PADDING, currentY + 23, CONTENT_W, 2.5);

    currentY += 34;
    const tableTopY = currentY;
    const tableHeaderH = 34;

    // Header Background
    ctx.fillStyle = '#0a2540';
    ctx.fillRect(PADDING, currentY, CONTENT_W, tableHeaderH);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';

    let curColX = PADDING;
    sec.headers.forEach((hName, hIdx) => {
      const colW = sec.colWidths[hIdx];
      const maxCellW = colW - 12;
      let hLines: string[];
      const upper = hName.trim().toUpperCase();

      if (upper === 'JD RECEIVED DATE') {
        hLines = ['JD RECEIVED', 'DATE'];
      } else if (upper === 'DB SHARED DATE') {
        hLines = ['DB SHARED', 'DATE'];
      } else if (upper === 'REMARKS / NEXT ACTION' && maxCellW < 180) {
        hLines = ['REMARKS /', 'NEXT ACTION'];
      } else if (upper === 'CURRENT STATUS' && maxCellW < 95) {
        hLines = ['CURRENT', 'STATUS'];
      } else if (upper === 'OFFERS RECEIVED' && maxCellW < 110) {
        hLines = ['OFFERS', 'RECEIVED'];
      } else if (upper === 'STATUS / REASON' && maxCellW < 130) {
        hLines = ['STATUS /', 'REASON'];
      } else {
        hLines = measureTextLines(scratchCtx, upper, maxCellW, 'bold 11px system-ui, -apple-system, sans-serif');
      }

      const hLineHeight = 13;
      const totalTextH = hLines.length * hLineHeight;
      const startY = currentY + (tableHeaderH - totalTextH) / 2 + hLineHeight * 0.76;

      ctx.textAlign = 'center';
      hLines.forEach((line, lIdx) => {
        ctx.fillText(line, curColX + colW / 2, startY + lIdx * hLineHeight);
      });

      curColX += colW;
    });

    currentY += tableHeaderH;

    // Rows
    if (sec.measuredRows.length === 0) {
      const emptyH = 34;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(PADDING, currentY, CONTENT_W, emptyH);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'italic 11.5px system-ui, -apple-system, sans-serif';
      ctx.fillText('No records found for this section.', W / 2, currentY + 21);
      currentY += emptyH;
    } else {
      sec.measuredRows.forEach((mRow, rIdx) => {
        const rowBg = mRow.bg || (report.template_type === 'pending_tasks' ? '#ffffff' : (rIdx % 2 === 0 ? '#f0f7f9' : '#ffffff'));
        const rowH = mRow.height;
        ctx.fillStyle = rowBg;
        ctx.fillRect(PADDING, currentY, CONTENT_W, rowH);

        let rowColX = PADDING;
        mRow.cells.forEach((cell, cIdx) => {
          const colW = sec.colWidths[cIdx];
          const hNameUpper = (sec.headers[cIdx] || '').toUpperCase();

          ctx.textAlign = 'center';

          if (!mRow.bg) {
            if (cIdx === 0) {
              ctx.fillStyle = '#007791';
              ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
            } else if (cIdx === 1) {
              ctx.fillStyle = '#0a2540';
              ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
            } else if (hNameUpper === 'CTC') {
              ctx.fillStyle = '#007791';
              ctx.font = 'bold 11.5px system-ui, -apple-system, sans-serif';
            } else if (hNameUpper.includes('OFFERS')) {
              ctx.fillStyle = '#059669';
              ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
            } else {
              ctx.fillStyle = cell.fillStyle || '#334155';
              ctx.font = cell.font || '500 11.5px system-ui, -apple-system, sans-serif';
            }
          } else {
            ctx.fillStyle = cell.fillStyle;
            ctx.font = cell.font;
          }

          const lineHeight = 17;
          const totalTextH = cell.lines.length * lineHeight;
          const startY = currentY + (rowH - totalTextH) / 2 + lineHeight * 0.76;

          cell.lines.forEach((line, lineIdx) => {
            ctx.fillText(line, rowColX + colW / 2, startY + lineIdx * lineHeight);
          });

          rowColX += colW;
        });

        currentY += rowH;
      });
    }

    // Dividers
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;

    let rowYTracker = tableTopY + tableHeaderH;
    if (sec.measuredRows.length > 0) {
      sec.measuredRows.forEach((mRow) => {
        rowYTracker += mRow.height;
        ctx.beginPath();
        ctx.moveTo(PADDING, rowYTracker);
        ctx.lineTo(PADDING + CONTENT_W, rowYTracker);
        ctx.stroke();
      });
    }

    currentY += 22;
  });

  // Observations Box
  if (hasObservations) {
    drawRoundRect(PADDING, currentY, CONTENT_W, obsBoxH, 6, '#f8fafc', '#e2e8f0', 1);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
    const obsHeader = report.template_type === 'active_leads' ? 'Notes' : 'Key Placement Observations';
    ctx.fillText(obsHeader, PADDING + 16, currentY + 24);

    ctx.fillStyle = '#475569';
    ctx.font = '500 12px system-ui, -apple-system, sans-serif';
    obsLines.forEach((line, lIdx) => {
      ctx.fillText(line, PADDING + 16, currentY + 46 + lIdx * 19);
    });

    currentY += obsBoxH + 18;
  }

  // Footer
  if (hasFooter) {
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PADDING, currentY);
    ctx.lineTo(W - PADDING, currentY);
    ctx.stroke();

    currentY += 22;
    ctx.fillStyle = '#64748b';
    ctx.font = '500 11.5px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('© 2026 Infoziant. All rights reserved.', PADDING, currentY);

    if (Boolean(report.generated_by || report.branding?.prepared_by)) {
      ctx.textAlign = 'right';
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 11.5px system-ui, -apple-system, sans-serif';
      ctx.fillText(`Prepared by: ${report.generated_by || report.branding?.prepared_by}`, W - PADDING, currentY);
    }
  }

  return canvas;
}

export async function exportReportAsImage(report: any): Promise<void> {
  const canvas = await generateReportCanvas(report);
  if (!canvas) return;

  const fileName = getReportExportBaseFileName(report);
  canvas.toBlob(
    (blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    'image/png'
  );
}
