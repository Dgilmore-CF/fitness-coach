/**
 * Export Center — unified modal for data exports (CSV/JSON) and PDF reports.
 * Migrated from openUnifiedExporter, switchExportTab, selectExportFormat,
 * executeDataExport, exportData, downloadBlob, openReportBuilder,
 * selectReportType, previewPDFReport, fetchReportData, generateReportHTML,
 * renderPreviewCharts, generatePDFReport, renderPDFCharts.
 *
 * Uses the global jsPDF + html2canvas libraries loaded in the HTML shell
 * (unchanged from legacy).
 */

import { html, htmlToElement, raw } from '@core/html';
import { api } from '@core/api';
import { openModal, closeTopModal } from '@ui/Modal';
import { toast } from '@ui/Toast';
import { todayLocal, daysAgoLocal } from '@utils/date';
import { formatWeight, formatDate, formatDuration } from '@utils/formatters';

// ============================================================================
// Download helpers
// ============================================================================

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  a.remove();
}

async function downloadExport(type, { start, end, format }) {
  const params = new URLSearchParams();
  if (start) params.append('start', start);
  if (end) params.append('end', end);
  if (type !== 'all') params.append('format', format);

  const url = `/api/exports/${type}${params.toString() ? `?${params.toString()}` : ''}`;
  const token = localStorage.getItem('token') || '';

  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}`, 'Cf-Access-Jwt-Assertion': token } : {}
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Export failed (${response.status})`);
  }

  const contentType = response.headers.get('content-type') || '';
  const today = todayLocal();

  if (contentType.includes('text/csv')) {
    const blob = await response.blob();
    const cd = response.headers.get('content-disposition') || '';
    const match = cd.match(/filename="(.+)"/);
    downloadBlob(blob, match?.[1] || `${type}_export_${today}.csv`);
  } else {
    const data = await response.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `${type}_export_${today}.json`);
  }
}

// ============================================================================
// PDF Report (keeps legacy HTML template format since jsPDF / html2canvas used)
// ============================================================================

async function fetchReportData(startDate, endDate) {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);

  const [progressData, advancedData, workoutsData, nutritionData, prsData] = await Promise.all([
    api.get(`/analytics/progress?${params.toString()}`).catch(() => ({ data: {} })),
    api.get(`/analytics/advanced?${params.toString()}`).catch(() => ({})),
    api.get(`/workouts?limit=100`).catch(() => ({ workouts: [] })),
    api.get(`/nutrition/logs?limit=30`).catch(() => ({ logs: [] })),
    api.get(`/achievements/prs?limit=20`).catch(() => ({ prs: [] }))
  ]);

  return {
    period: {
      start: startDate || daysAgoLocal(-30),
      end: endDate || todayLocal()
    },
    overview: progressData.overview || {},
    advanced: advancedData.data || {},
    workouts: workoutsData.workouts || [],
    nutrition: nutritionData.logs || [],
    prs: prsData.prs || []
  };
}

function generateReportHTML(data) {
  const overview = data.overview || {};

  const workoutRows = (data.workouts || [])
    .slice(0, 20)
    .map((w) => `
      <tr>
        <td>${formatDate(w.start_time)}</td>
        <td>${w.day_name || '—'}</td>
        <td>${formatDuration(w.total_duration_seconds)}</td>
        <td>${w.total_weight_kg ? formatWeight(w.total_weight_kg) : '—'}</td>
        <td>${w.perceived_exertion ? w.perceived_exertion + '/10' : '—'}</td>
      </tr>
    `)
    .join('');

  const prRows = (data.prs || [])
    .slice(0, 15)
    .map((pr) => `
      <tr>
        <td>${pr.exercise_name}</td>
        <td>${(pr.record_type || '').toUpperCase()}</td>
        <td>${formatWeight(pr.record_value)}</td>
        <td>${formatDate(pr.achieved_at)}</td>
      </tr>
    `)
    .join('');

  return `
    <div style="font-family: 'Inter', sans-serif; color: #1f2937; padding: 40px; max-width: 800px; margin: 0 auto;">
      <div style="border-bottom: 3px solid #2563eb; padding-bottom: 16px; margin-bottom: 32px;">
        <h1 style="margin: 0; color: #2563eb; font-size: 32px;">AI Fitness Coach Report</h1>
        <p style="color: #6b7280; margin-top: 8px;">
          ${formatDate(data.period.start)} to ${formatDate(data.period.end)}
        </p>
      </div>

      <h2 style="color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">Overview</h2>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin: 16px 0;">
        <div style="background: #eff6ff; padding: 16px; border-radius: 8px;">
          <div style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Total Workouts</div>
          <div style="font-size: 28px; font-weight: bold; color: #2563eb;">${overview.total_workouts || 0}</div>
        </div>
        <div style="background: #ecfdf5; padding: 16px; border-radius: 8px;">
          <div style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Total Volume</div>
          <div style="font-size: 28px; font-weight: bold; color: #059669;">${formatWeight(overview.total_volume_kg || 0)}</div>
        </div>
        <div style="background: #fef3c7; padding: 16px; border-radius: 8px;">
          <div style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Total Time</div>
          <div style="font-size: 28px; font-weight: bold; color: #d97706;">${formatDuration(overview.total_time_seconds || 0)}</div>
        </div>
        <div style="background: #ede9fe; padding: 16px; border-radius: 8px;">
          <div style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Avg Duration</div>
          <div style="font-size: 28px; font-weight: bold; color: #7c3aed;">${formatDuration(overview.average_workout_time || 0)}</div>
        </div>
      </div>

      <h2 style="color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">Recent Workouts</h2>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <thead>
          <tr style="background: #f9fafb;">
            <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e5e7eb;">Date</th>
            <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e5e7eb;">Day</th>
            <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e5e7eb;">Duration</th>
            <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e5e7eb;">Volume</th>
            <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e5e7eb;">Effort</th>
          </tr>
        </thead>
        <tbody>
          ${workoutRows || '<tr><td colspan="5" style="padding: 16px; text-align: center; color: #6b7280;">No workouts in this period.</td></tr>'}
        </tbody>
      </table>

      <h2 style="color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">Personal Records</h2>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <thead>
          <tr style="background: #f9fafb;">
            <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e5e7eb;">Exercise</th>
            <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e5e7eb;">Type</th>
            <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e5e7eb;">Value</th>
            <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e5e7eb;">Date</th>
          </tr>
        </thead>
        <tbody>
          ${prRows || '<tr><td colspan="4" style="padding: 16px; text-align: center; color: #6b7280;">No PRs yet.</td></tr>'}
        </tbody>
      </table>

      <div style="margin-top: 48px; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px;">
        Generated by AI Fitness Coach · ${new Date().toLocaleString()}
      </div>
    </div>
  `;
}

async function generatePDF(modalEl) {
  if (!window.jspdf?.jsPDF || !window.html2canvas) {
    toast.error('PDF libraries not loaded');
    return;
  }

  const startDate = modalEl.querySelector('#export-start-date').value;
  const endDate = modalEl.querySelector('#export-end-date').value;

  toast.info('Generating PDF report…');

  try {
    const data = await fetchReportData(startDate, endDate);
    const reportHtml = generateReportHTML(data);

    // Render offscreen
    const holder = document.createElement('div');
    holder.style.cssText = 'position: absolute; left: -9999px; top: 0; width: 800px; background: white;';
    holder.innerHTML = reportHtml;
    document.body.appendChild(holder);

    const canvas = await window.html2canvas(holder.firstElementChild, {
      scale: 2,
      useCORS: true,
      logging: false
    });
    holder.remove();

    const imgData = canvas.toDataURL('image/png');
    const pdf = new window.jspdf.jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    let heightLeft = pdfHeight;
    let position = 0;
    const pageHeight = pdf.internal.pageSize.getHeight();

    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`fitness-report-${todayLocal()}.pdf`);
    toast.success('PDF downloaded');
  } catch (err) {
    console.error('PDF generation failed:', err);
    toast.error(`PDF failed: ${err.message}`);
  }
}

// ============================================================================
// Main modal
// ============================================================================

export function openUnifiedExporter() {
  const today = todayLocal();
  const start = daysAgoLocal(-30);

  let activeTab = 'data';

  const modalApi = openModal({
    title: 'Export Center',
    size: 'wide',
    content: String(html`
      <div class="stack stack-md">
        <div class="export-tabs">
          <button class="export-tab is-active" data-action="switch-tab" data-tab="data">
            <i class="fas fa-database"></i> Data Export
          </button>
          <button class="export-tab" data-action="switch-tab" data-tab="pdf">
            <i class="fas fa-file-pdf"></i> PDF Report
          </button>
        </div>

        <div class="export-date-range">
          <div class="form-group" style="margin: 0;">
            <label class="form-label">Start Date</label>
            <input type="date" id="export-start-date" class="input" value="${start}" />
          </div>
          <div class="form-group" style="margin: 0;">
            <label class="form-label">End Date</label>
            <input type="date" id="export-end-date" class="input" value="${today}" />
          </div>
        </div>

        <div id="export-data-panel">
          <div class="form-group">
            <label class="form-label">Select Data to Export</label>
            <div class="export-type-grid">
              <label class="export-type-checkbox">
                <input type="checkbox" id="ex-type-workouts" checked />
                <i class="fas fa-dumbbell text-primary"></i>
                <span>Workouts</span>
              </label>
              <label class="export-type-checkbox">
                <input type="checkbox" id="ex-type-nutrition" checked />
                <i class="fas fa-utensils text-success"></i>
                <span>Nutrition</span>
              </label>
              <label class="export-type-checkbox">
                <input type="checkbox" id="ex-type-records" checked />
                <i class="fas fa-trophy text-warning"></i>
                <span>Personal Records</span>
              </label>
              <label class="export-type-checkbox">
                <input type="checkbox" id="ex-type-health" checked />
                <i class="fas fa-heartbeat text-danger"></i>
                <span>Health Data</span>
              </label>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Export Format</label>
            <div class="cluster">
              <label class="export-format-option is-selected">
                <input type="radio" name="export-format" value="csv" checked />
                <i class="fas fa-file-csv"></i>
                <span>CSV</span>
              </label>
              <label class="export-format-option">
                <input type="radio" name="export-format" value="json" />
                <i class="fas fa-file-code"></i>
                <span>JSON</span>
              </label>
            </div>
          </div>

          <button class="btn btn-primary btn-block" data-action="export-data">
            <i class="fas fa-download"></i> Download Data
          </button>
        </div>

        <div id="export-pdf-panel" hidden>
          <p class="text-muted">
            Generates a PDF report of workouts, volume, PRs, and analytics for the selected date range.
          </p>
          <button class="btn btn-block export-button" data-action="export-pdf">
            <i class="fas fa-file-pdf"></i> Generate PDF
          </button>
        </div>
      </div>
    `),
    actions: [{ label: 'Close', variant: 'btn-outline' }],
    onOpen: ({ element }) => {
      element.addEventListener('click', async (event) => {
        const target = event.target.closest('[data-action]');
        if (!target) return;
        const action = target.getAttribute('data-action');

        if (action === 'switch-tab') {
          const tab = target.getAttribute('data-tab');
          activeTab = tab;
          element.querySelectorAll('.export-tab').forEach((t) => t.classList.toggle('is-active', t.getAttribute('data-tab') === tab));
          element.querySelector('#export-data-panel').hidden = tab !== 'data';
          element.querySelector('#export-pdf-panel').hidden = tab !== 'pdf';
        } else if (action === 'export-data') {
          await executeExport(element);
        } else if (action === 'export-pdf') {
          await generatePDF(element);
        }
      });

      element.addEventListener('change', (event) => {
        if (event.target.name === 'export-format') {
          element.querySelectorAll('.export-format-option').forEach((opt) => {
            opt.classList.toggle('is-selected', opt.querySelector('input').checked);
          });
        }
      });
    }
  });
}

async function executeExport(modalEl) {
  const start = modalEl.querySelector('#export-start-date').value;
  const end = modalEl.querySelector('#export-end-date').value;
  const format = modalEl.querySelector('input[name="export-format"]:checked')?.value || 'csv';

  const types = {
    workouts: modalEl.querySelector('#ex-type-workouts').checked,
    nutrition: modalEl.querySelector('#ex-type-nutrition').checked,
    records: modalEl.querySelector('#ex-type-records').checked,
    measurements: modalEl.querySelector('#ex-type-health').checked
  };

  const selected = Object.entries(types).filter(([, v]) => v).map(([k]) => k);

  if (selected.length === 0) {
    toast.warning('Please select at least one data type');
    return;
  }

  try {
    toast.info('Preparing export…');
    if (selected.length === 4) {
      await downloadExport('all', { start, end, format });
    } else {
      await Promise.all(selected.map((type) => downloadExport(type, { start, end, format })));
    }
    toast.success('Export downloaded');
  } catch (err) {
    toast.error(`Export failed: ${err.message}`);
  }
}

// Compat aliases for legacy code references
export const openReportBuilder = openUnifiedExporter;
