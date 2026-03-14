import { SymbolSearch } from './SymbolSearch';
import { TimeframeSelector } from './TimeframeSelector';
import { TimezoneSelector } from './TimezoneSelector';
import { ChartTypeSelector } from './ChartTypeSelector';
import { IndicatorMenu } from './IndicatorMenu';
import { CompareButton } from './CompareButton';
import { LayoutSelector } from './LayoutSelector';
import { ChartActions } from './ChartActions';
import { ShareMenu } from './ShareMenu';
import { ExportMenu } from './ExportMenu';
import { ReplayControls } from './ReplayControls';
import { useThemeStore } from '../../stores/themeStore';
import { useBacktestStore } from '../../stores/backtestStore';
import { useChartStore } from '../../stores/chartStore';
import { useReplayStore } from '../../stores/replayStore';
import { useTranslation } from '../../i18n';
import { BacktestPanel } from '../Backtest/BacktestPanel';

export function Toolbar() {
  const isDark = useThemeStore((s) => s.theme) === 'dark';
  const openBacktest = useBacktestStore((s) => s.openPanel);
  const t = useTranslation();
  const chartData = useChartStore((s) => s.data);
  const isReplaying = useReplayStore((s) => s.isReplaying);
  const startReplay = useReplayStore((s) => s.startReplay);

  const handleStartReplay = () => {
    if (chartData.length > 0 && !isReplaying) {
      startReplay(chartData);
    }
  };

  return (
    <>
      <div className={`h-10 flex items-center px-2 gap-2 md:gap-3 min-w-max ${
        isDark
          ? 'bg-gray-900 border-b border-gray-800'
          : 'bg-white border-b border-gray-200'
      }`}>
        <SymbolSearch />
        <div className={`w-px h-5 ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`} />
        <TimeframeSelector />
        <div className={`w-px h-5 ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`} />
        <TimezoneSelector />
        <div className={`w-px h-5 ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`} />
        <ChartTypeSelector />
        <div className={`w-px h-5 hidden md:block ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`} />
        <div className="hidden md:block"><IndicatorMenu /></div>
        <div className={`w-px h-5 hidden md:block ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`} />
        <div className="hidden md:block"><CompareButton /></div>
        <div className={`w-px h-5 hidden md:block ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`} />
        <div className="hidden md:block"><LayoutSelector /></div>
        <div className={`w-px h-5 hidden md:block ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`} />
        <div className="hidden md:block">
          <button
            onClick={openBacktest}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
              isDark
                ? 'text-gray-300 hover:bg-gray-800 hover:text-white'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
            title={t.btBacktest}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            {t.btBacktest}
          </button>
        </div>
        <div className={`w-px h-5 hidden md:block ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`} />
        <div className="hidden md:block">
          <button
            onClick={handleStartReplay}
            disabled={isReplaying || chartData.length === 0}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors disabled:opacity-40 ${
              isReplaying
                ? isDark
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-yellow-100 text-yellow-700'
                : isDark
                  ? 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
            title={t.replay}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t.replay}
          </button>
        </div>
        <div className={`w-px h-5 hidden md:block ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`} />
        <div className="hidden md:block"><ExportMenu /></div>
        <div className={`w-px h-5 hidden md:block ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`} />
        <div className="hidden md:block"><ShareMenu /></div>
        <div className="flex-1" />
        <ChartActions />
      </div>
      <ReplayControls />
      <BacktestPanel />
    </>
  );
}
