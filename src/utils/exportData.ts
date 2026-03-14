import type { OHLCData } from '../types/chart';

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString();
}

function triggerDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function buildFilename(symbol: string, timeframe: string, extension: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `${symbol}_${timeframe}_${date}.${extension}`;
}

export function exportToCSV(data: OHLCData[], symbol: string, timeframe: string): void {
  const header = 'Date,Open,High,Low,Close,Volume';
  const rows = data.map(
    (d) =>
      `${formatDate(d.time)},${d.open},${d.high},${d.low},${d.close},${d.volume ?? 0}`
  );
  const csv = [header, ...rows].join('\n');
  triggerDownload(csv, buildFilename(symbol, timeframe, 'csv'), 'text/csv;charset=utf-8;');
}

export function exportToJSON(data: OHLCData[], symbol: string, timeframe: string): void {
  const formatted = data.map((d) => ({
    date: formatDate(d.time),
    open: d.open,
    high: d.high,
    low: d.low,
    close: d.close,
    volume: d.volume ?? 0,
  }));
  const json = JSON.stringify(formatted, null, 2);
  triggerDownload(json, buildFilename(symbol, timeframe, 'json'), 'application/json;charset=utf-8;');
}

export async function copyToClipboard(data: OHLCData[]): Promise<void> {
  const header = 'Date\tOpen\tHigh\tLow\tClose\tVolume';
  const rows = data.map(
    (d) =>
      `${formatDate(d.time)}\t${d.open}\t${d.high}\t${d.low}\t${d.close}\t${d.volume ?? 0}`
  );
  const tsv = [header, ...rows].join('\n');
  await navigator.clipboard.writeText(tsv);
}
