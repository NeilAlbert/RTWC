/**
 * admin/js/components/backupTools.js: small helpers shared by the Backups page
 * and the dashboard.
 */
import { formatDateTime, formatFileSize } from './dom.js';
import { api } from '../adminApi.js';

/** An ISO time from the server, shown in this computer's own time: "18 November 2026, 1:05 pm". */
export function localDateTime(iso) {
  const date = new Date(iso);
  if (!iso || Number.isNaN(date.getTime())) return '';
  const two = (number) => String(number).padStart(2, '0');
  return formatDateTime(`${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())} ${two(date.getHours())}:${two(date.getMinutes())}`);
}

/** "1.4 MB", "320 KB", "2.1 GB". */
export function size(bytes) {
  const value = Number(bytes) || 0;
  if (value >= 1024 * 1024 * 1024) return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  return formatFileSize(value);
}

export const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;

export const KINDS = {
  manual: { label: 'Manual', tone: 'neutral' },
  automatic: { label: 'Automatic', tone: 'info' },
  pre_restore: { label: 'Before restore', tone: 'warning' },
};

/**
 * Downloads a saved backup. A plain link cannot carry the sign-in token, so a
 * single-use ticket is asked for first and the browser then opens the download
 * address with it. The file comes as an attachment, so the page stays open.
 * Resolves to the result of the ticket request.
 */
export async function startDownload(id) {
  const result = await api.post(`/admin/backups/${id}/download-ticket`);
  if (result.ok) window.location.assign(`/api/admin/backups/download/${encodeURIComponent(result.data.ticket)}`);
  return result;
}
