export type DrawingTool = 'cursor' | 'hline' | 'vline' | 'trendline' | 'fibonacci' | 'rectangle' | 'pitchfork' | 'channel' | 'arrow' | 'text' | 'ray' | 'extline';

export interface BaseDrawing {
  id: string;
  type: DrawingTool;
  symbol: string;
  color: string;
  lineWidth: number;
}

export interface HLineDrawing extends BaseDrawing {
  type: 'hline';
  price: number;
}

export interface VLineDrawing extends BaseDrawing {
  type: 'vline';
  time: number;
}

export interface TrendlineDrawing extends BaseDrawing {
  type: 'trendline';
  point1: { time: number; price: number };
  point2: { time: number; price: number };
}

export interface FibonacciDrawing extends BaseDrawing {
  type: 'fibonacci';
  point1: { time: number; price: number };
  point2: { time: number; price: number };
  levels: number[];
}

export interface RectangleDrawing extends BaseDrawing {
  type: 'rectangle';
  point1: { time: number; price: number };
  point2: { time: number; price: number };
}

export interface PitchforkDrawing extends BaseDrawing {
  type: 'pitchfork';
  anchor: { time: number; price: number };
  point1: { time: number; price: number };
  point2: { time: number; price: number };
}

export interface ParallelChannelDrawing extends BaseDrawing {
  type: 'channel';
  point1: { time: number; price: number };
  point2: { time: number; price: number };
  widthOffset: number;
}

export interface ArrowDrawing extends BaseDrawing {
  type: 'arrow';
  point1: { time: number; price: number };
  point2: { time: number; price: number };
}

export interface TextDrawing extends BaseDrawing {
  type: 'text';
  position: { time: number; price: number };
  text: string;
  fontSize: number;
}

export interface RayDrawing extends BaseDrawing {
  type: 'ray';
  point1: { time: number; price: number };
  point2: { time: number; price: number };
}

export interface ExtendedLineDrawing extends BaseDrawing {
  type: 'extline';
  point1: { time: number; price: number };
  point2: { time: number; price: number };
}

export type Drawing =
  | HLineDrawing
  | VLineDrawing
  | TrendlineDrawing
  | FibonacciDrawing
  | RectangleDrawing
  | PitchforkDrawing
  | ParallelChannelDrawing
  | ArrowDrawing
  | TextDrawing
  | RayDrawing
  | ExtendedLineDrawing;

export const DEFAULT_FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

export const DRAWING_COLORS = [
  '#f59e0b', // amber
  '#3b82f6', // blue
  '#ef4444', // red
  '#22c55e', // green
  '#a855f7', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#ffffff', // white
];
