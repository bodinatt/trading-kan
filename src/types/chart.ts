export interface OHLCData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export type TimeframeKey =
  | '1m' | '2m' | '3m' | '5m' | '15m' | '30m'
  | '1h' | '2h' | '4h' | '6h' | '8h' | '12h'
  | '1D' | '3D' | '1W' | '1M';

export interface Timeframe {
  key: TimeframeKey;
  label: string;
  seconds: number;
  group: 'Minutes' | 'Hours' | 'Days+';
}

export const TIMEFRAMES: Timeframe[] = [
  // Minutes
  { key: '1m', label: '1m', seconds: 60, group: 'Minutes' },
  { key: '2m', label: '2m', seconds: 120, group: 'Minutes' },
  { key: '3m', label: '3m', seconds: 180, group: 'Minutes' },
  { key: '5m', label: '5m', seconds: 300, group: 'Minutes' },
  { key: '15m', label: '15m', seconds: 900, group: 'Minutes' },
  { key: '30m', label: '30m', seconds: 1800, group: 'Minutes' },
  // Hours
  { key: '1h', label: '1H', seconds: 3600, group: 'Hours' },
  { key: '2h', label: '2H', seconds: 7200, group: 'Hours' },
  { key: '4h', label: '4H', seconds: 14400, group: 'Hours' },
  { key: '6h', label: '6H', seconds: 21600, group: 'Hours' },
  { key: '8h', label: '8H', seconds: 28800, group: 'Hours' },
  { key: '12h', label: '12H', seconds: 43200, group: 'Hours' },
  // Days+
  { key: '1D', label: '1D', seconds: 86400, group: 'Days+' },
  { key: '3D', label: '3D', seconds: 259200, group: 'Days+' },
  { key: '1W', label: '1W', seconds: 604800, group: 'Days+' },
  { key: '1M', label: '1M', seconds: 2592000, group: 'Days+' },
];
