import { useState } from 'react';
import { useDrawingStore } from '../../stores/drawingStore';
import { useChartStore } from '../../stores/chartStore';
import { useThemeStore } from '../../stores/themeStore';
import type { DrawingTool } from '../../types/drawing';
import { DRAWING_COLORS } from '../../types/drawing';
import { useTranslation } from '../../i18n';
import type { Translations } from '../../i18n';

const EMPTY_DRAWINGS: never[] = [];

interface ToolDef {
  tool: DrawingTool;
  labelKey: keyof Translations;
  helpKey?: keyof Translations;
  icon: React.ReactNode;
}

const LINE_TOOL_DEFS: ToolDef[] = [
  {
    tool: 'cursor',
    labelKey: 'cursor',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M6.672 1.911a1 1 0 10-1.932.518l.259.963a1 1 0 001.932-.518l-.26-.963zM2.429 4.74a1 1 0 10-.517 1.932l.962.258a1 1 0 00.517-1.932l-.962-.258zm8.814-.569a1 1 0 00-1.414-1.414L9 3.586l-.829-.829a1 1 0 10-1.414 1.414l.829.829-.829.829a1 1 0 001.414 1.414L9 6.414l.829.829a1 1 0 001.414-1.414L10.414 5l.829-.829zm-1.02 8.533a1 1 0 10-1.414 1.414l.707.707-3.07 3.07a1 1 0 001.415 1.414l3.07-3.07.706.707a1 1 0 001.414-1.414L11.07 13.55l1.658-1.658a1 1 0 10-1.414-1.414l-1.658 1.658-.849-.848z" />
      </svg>
    ),
  },
  {
    tool: 'hline',
    labelKey: 'horizontalLine',
    helpKey: 'helpHorizontalLine',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" className="w-4 h-4" strokeWidth={2}>
        <line x1="2" y1="10" x2="18" y2="10" />
      </svg>
    ),
  },
  {
    tool: 'vline',
    labelKey: 'verticalLine',
    helpKey: 'helpVerticalLine',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" className="w-4 h-4" strokeWidth={2}>
        <line x1="10" y1="2" x2="10" y2="18" />
      </svg>
    ),
  },
  {
    tool: 'trendline',
    labelKey: 'trendline',
    helpKey: 'helpTrendline',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" className="w-4 h-4" strokeWidth={2}>
        <line x1="3" y1="16" x2="17" y2="4" />
        <circle cx="3" cy="16" r="1.5" fill="currentColor" />
        <circle cx="17" cy="4" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    tool: 'ray',
    labelKey: 'ray',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" className="w-4 h-4" strokeWidth={2}>
        <line x1="3" y1="14" x2="18" y2="6" />
        <circle cx="3" cy="14" r="1.5" fill="currentColor" />
        <line x1="16" y1="6" x2="18" y2="5" strokeWidth={1.5} />
        <line x1="16" y1="7.5" x2="18" y2="5" strokeWidth={1.5} />
      </svg>
    ),
  },
  {
    tool: 'extline',
    labelKey: 'extendedLine',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" className="w-4 h-4" strokeWidth={2}>
        <line x1="1" y1="15" x2="19" y2="5" strokeDasharray="2 1" />
        <line x1="5" y1="13" x2="15" y2="7" />
      </svg>
    ),
  },
];

const SHAPE_TOOL_DEFS: ToolDef[] = [
  {
    tool: 'rectangle',
    labelKey: 'rectangle',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" className="w-4 h-4" strokeWidth={1.5}>
        <rect x="3" y="5" width="14" height="10" />
      </svg>
    ),
  },
  {
    tool: 'channel',
    labelKey: 'parallelChannel',
    helpKey: 'helpParallelChannel',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" className="w-4 h-4" strokeWidth={1.5}>
        <line x1="2" y1="14" x2="18" y2="8" />
        <line x1="2" y1="8" x2="18" y2="2" />
        <line x1="2" y1="14" x2="2" y2="8" strokeDasharray="1 2" strokeWidth={1} />
        <line x1="18" y1="8" x2="18" y2="2" strokeDasharray="1 2" strokeWidth={1} />
      </svg>
    ),
  },
  {
    tool: 'pitchfork',
    labelKey: 'pitchfork',
    helpKey: 'helpPitchfork',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" className="w-4 h-4" strokeWidth={1.5}>
        <line x1="3" y1="10" x2="18" y2="10" />
        <line x1="7" y1="4" x2="18" y2="7" />
        <line x1="7" y1="16" x2="18" y2="13" />
        <circle cx="3" cy="10" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
];

const ANNOTATION_TOOL_DEFS: ToolDef[] = [
  {
    tool: 'arrow',
    labelKey: 'arrow',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" className="w-4 h-4" strokeWidth={2}>
        <line x1="3" y1="17" x2="16" y2="4" />
        <polyline points="10,4 16,4 16,10" strokeWidth={2} />
      </svg>
    ),
  },
  {
    tool: 'text',
    labelKey: 'text',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <text x="4" y="15" fontSize="14" fontWeight="bold" fontFamily="sans-serif">T</text>
      </svg>
    ),
  },
  {
    tool: 'fibonacci',
    labelKey: 'fibRetracement',
    helpKey: 'helpFibonacci',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" className="w-4 h-4" strokeWidth={1.5}>
        <line x1="2" y1="3" x2="18" y2="3" />
        <line x1="2" y1="7" x2="18" y2="7" strokeDasharray="2 2" />
        <line x1="2" y1="10" x2="18" y2="10" strokeDasharray="3 2" />
        <line x1="2" y1="13" x2="18" y2="13" strokeDasharray="2 2" />
        <line x1="2" y1="17" x2="18" y2="17" />
      </svg>
    ),
  },
];

export function DrawingToolbar({ horizontal = false }: { horizontal?: boolean }) {
  const activeTool = useDrawingStore((s) => s.activeTool);
  const activeColor = useDrawingStore((s) => s.activeColor);
  const setActiveTool = useDrawingStore((s) => s.setActiveTool);
  const setActiveColor = useDrawingStore((s) => s.setActiveColor);
  const clearDrawings = useDrawingStore((s) => s.clearDrawings);
  const symbol = useChartStore((s) => s.symbol);
  const drawings = useDrawingStore((s) => s.drawings[symbol] ?? EMPTY_DRAWINGS);
  const isDark = useThemeStore((s) => s.theme) === 'dark';
  const t = useTranslation();

  const [showColorPicker, setShowColorPicker] = useState(false);

  const renderToolGroup = (tools: ToolDef[]) =>
    tools.map((td) => (
      <button
        key={td.tool}
        onClick={() => setActiveTool(td.tool)}
        className={`p-1.5 rounded transition-colors ${
          activeTool === td.tool
            ? 'bg-blue-600 text-white'
            : isDark
              ? 'text-gray-400 hover:text-white hover:bg-gray-800'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
        }`}
        title={td.helpKey && t[td.helpKey] ? `${t[td.labelKey]}\n\n${t[td.helpKey]}` : t[td.labelKey]}
      >
        {td.icon}
      </button>
    ));

  const separator = horizontal
    ? <div className={`h-5 w-px mx-1 ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`} />
    : <div className={`w-5 h-px my-1 ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`} />;

  const colorPickerPos = horizontal
    ? `absolute top-10 left-0 z-50 border rounded p-2 grid grid-cols-4 gap-1 shadow-xl ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`
    : `absolute left-10 top-0 z-50 border rounded p-2 grid grid-cols-4 gap-1 shadow-xl ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`;

  return (
    <div className={
      horizontal
        ? `flex flex-row items-center gap-1 px-2 h-9 shrink-0 overflow-x-auto ${isDark ? 'bg-gray-900 border-b border-gray-800' : 'bg-white border-b border-gray-200'}`
        : `flex flex-col items-center gap-1 py-2 w-9 shrink-0 ${isDark ? 'bg-gray-900 border-r border-gray-800' : 'bg-white border-r border-gray-200'}`
    }>
      {/* Lines */}
      {renderToolGroup(LINE_TOOL_DEFS)}
      {separator}
      {/* Shapes */}
      {renderToolGroup(SHAPE_TOOL_DEFS)}
      {separator}
      {/* Annotations */}
      {renderToolGroup(ANNOTATION_TOOL_DEFS)}
      {separator}

      {/* Color picker toggle */}
      <div className="relative">
        <button
          onClick={() => setShowColorPicker(!showColorPicker)}
          className={`p-1.5 rounded transition-colors ${isDark ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
          title={t.drawingColor}
        >
          <div
            className={`w-4 h-4 rounded-sm border ${isDark ? 'border-gray-600' : 'border-gray-300'}`}
            style={{ backgroundColor: activeColor }}
          />
        </button>

        {showColorPicker && (
          <div className={colorPickerPos}>
            {DRAWING_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setActiveColor(c);
                  setShowColorPicker(false);
                }}
                className={`w-5 h-5 rounded-sm border transition-transform hover:scale-110 ${
                  activeColor === c ? 'border-white scale-110' : isDark ? 'border-gray-600' : 'border-gray-300'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Clear all drawings */}
      {drawings.length > 0 && (
        <>
          {separator}
          <button
            onClick={() => clearDrawings(symbol)}
            className={`p-1.5 rounded transition-colors ${isDark ? 'text-gray-500 hover:text-red-400 hover:bg-gray-800' : 'text-gray-400 hover:text-red-500 hover:bg-gray-100'}`}
            title={t.clearAllDrawings}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path
                fillRule="evenodd"
                d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.519.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </>
      )}
    </div>
  );
}
