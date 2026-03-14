import { useState, useEffect } from 'react';
import { ChartContainer } from './components/Chart/ChartContainer';
import { IndicatorPane } from './components/Chart/IndicatorPane';
import { MultiChartGrid } from './components/Chart/MultiChartGrid';
import { Toolbar } from './components/Toolbar/Toolbar';
import { Watchlist } from './components/Watchlist/Watchlist';
import { SettingsModal } from './components/Settings/SettingsModal';
import { AlertPanel } from './components/Alerts/AlertPanel';
import { useIndicatorStore } from './stores/indicatorStore';
import { useLayoutStore } from './stores/layoutStore';
import { useHotkeys } from './hooks/useHotkeys';
import { DrawingToolbar } from './components/Toolbar/DrawingToolbar';
import { getTwelveDataApiKey } from './services/twelvedata';
import { useThemeStore } from './stores/themeStore';
import { TemplateManager } from './components/Settings/TemplateManager';
import { BacktestPanel } from './components/Backtest/BacktestPanel';
import { useBacktestStore } from './stores/backtestStore';
import { useTranslation } from './i18n';
import { useI18nStore } from './i18n';
import { useChartStore } from './stores/chartStore';
import { decodeChartState } from './utils/shareChart';
import { AuthButton } from './components/Auth/AuthButton';
import { useAuthStore } from './stores/authStore';

function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [watchlistVisible, setWatchlistVisible] = useState(true);
  const [drawingToolsOpen, setDrawingToolsOpen] = useState(false);
  const [templateManagerOpen, setTemplateManagerOpen] = useState(false);
  const indicators = useIndicatorStore((s) => s.indicators);
  const removeIndicator = useIndicatorStore((s) => s.removeIndicator);
  const layoutPreset = useLayoutStore((s) => s.preset);
  const hasTdKey = !!getTwelveDataApiKey();
  const isMultiChart = layoutPreset !== '1x1';
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const tx = useTranslation();
  const toggleLanguage = useI18nStore((s) => s.toggleLanguage);
  const openBacktest = useBacktestStore((s) => s.openPanel);

  useHotkeys();

  // Initialize auth
  useEffect(() => {
    useAuthStore.getState().initialize();
  }, []);

  // Apply shared chart state from URL on initial load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('chart');
    if (!encoded) return;
    const state = decodeChartState(encoded);
    if (!state) return;

    const chart = useChartStore.getState();
    chart.setSymbol(state.symbol);
    chart.setTimeframe(state.timeframe);
    chart.setChartType(state.chartType);
    chart.setTimezone(state.timezone);

    // Apply shared indicators
    if (state.indicators && state.indicators.length > 0) {
      const indStore = useIndicatorStore.getState();
      // Clear existing indicators first
      indStore.indicators.forEach((ind) => indStore.removeIndicator(ind.id));
      // Add shared indicators
      state.indicators.forEach((ind) => {
        indStore.addIndicator(ind.type);
        // Update params on the newly added indicator (re-read state since addIndicator mutated it)
        const currentIndicators = useIndicatorStore.getState().indicators;
        const added = currentIndicators[currentIndicators.length - 1];
        if (added) {
          useIndicatorStore.getState().updateIndicatorParams(added.id, ind.params);
        }
      });
    }

    // Clean up URL without reloading
    window.history.replaceState({}, '', window.location.pathname);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Separate pane indicators (rendered in their own sub-charts)
  const PANE_TYPES = new Set([
    'RSI', 'MACD', 'STOCH', 'ATR',
    'WILLR', 'CCI', 'OBV', 'ADX', 'MFI', 'ROC', 'CMF', 'DPO',
  ]);
  const paneIndicators = indicators.filter(
    (ind) => PANE_TYPES.has(ind.type) && ind.visible
  );

  const isDark = theme === 'dark';

  return (
    <div className={`h-screen flex flex-col ${
      isDark
        ? 'bg-gray-950 text-white'
        : 'bg-gray-50 text-gray-900'
    }`}>
      <header className={`h-12 flex items-center px-4 justify-between shrink-0 ${
        isDark
          ? 'bg-gray-900 border-b border-gray-800'
          : 'bg-white border-b border-gray-200'
      }`}>
        <div className="flex items-center gap-2">
          {/* Hamburger menu - mobile only */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`p-1.5 rounded transition-colors md:hidden ${
              isDark ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
            title={tx.menu}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-lg font-bold tracking-wide">Trading Kan</h1>
        </div>
        <div className="flex items-center gap-2">
          {!hasTdKey && (
            <button
              onClick={() => setSettingsOpen(true)}
              className="text-[10px] px-2 py-1 bg-yellow-600/20 text-yellow-400 rounded hover:bg-yellow-600/30 transition-colors hidden sm:block"
            >
              {tx.addApiKey}
            </button>
          )}
          <AlertPanel />
          {/* Backtest button */}
          <button
            onClick={openBacktest}
            className={`p-1.5 rounded transition-colors ${
              isDark ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
            title={tx.btBacktest}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </button>
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className={`p-1.5 rounded transition-colors ${
              isDark ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
            title={isDark ? tx.switchToLight : tx.switchToDark}
          >
            {isDark ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className={`p-1.5 rounded transition-colors ${
              isDark ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
            title={tx.settings}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          {/* Auth */}
          <AuthButton />
          {/* Language toggle */}
          <button
            onClick={toggleLanguage}
            className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
              isDark ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
            title={tx.language}
          >
            {tx.lang === 'th' ? 'EN' : 'TH'}
          </button>
        </div>
      </header>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className={`absolute top-0 left-0 w-64 h-full shadow-xl flex flex-col ${
              isDark ? 'bg-gray-900' : 'bg-white'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`p-4 border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
              <h2 className="font-bold">{tx.menu}</h2>
            </div>
            <div className="flex-1 p-2 space-y-1">
              <button
                onClick={() => { setWatchlistVisible(!watchlistVisible); setMobileMenuOpen(false); }}
                className={`w-full text-left px-3 py-2 rounded text-sm flex items-center gap-2 ${
                  isDark ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                {watchlistVisible ? tx.hideWatchlist : tx.showWatchlist}
              </button>
              <button
                onClick={() => { setDrawingToolsOpen(!drawingToolsOpen); setMobileMenuOpen(false); }}
                className={`w-full text-left px-3 py-2 rounded text-sm flex items-center gap-2 ${
                  isDark ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                {tx.drawingTools}
              </button>
              <button
                onClick={() => { setSettingsOpen(true); setMobileMenuOpen(false); }}
                className={`w-full text-left px-3 py-2 rounded text-sm flex items-center gap-2 ${
                  isDark ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {tx.settings}
              </button>
              <button
                onClick={() => { setTemplateManagerOpen(true); setMobileMenuOpen(false); }}
                className={`w-full text-left px-3 py-2 rounded text-sm flex items-center gap-2 ${
                  isDark ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                </svg>
                {tx.templates}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar - scrollable on mobile, z-20 keeps dropdowns above chart iframe */}
      <div className="overflow-x-auto shrink-0 relative z-20">
        <Toolbar />
      </div>

      {/* Mobile drawing toolbar strip */}
      {!isMultiChart && drawingToolsOpen && (
        <div className="md:hidden shrink-0">
          <DrawingToolbar horizontal />
        </div>
      )}

      <main className="flex-1 overflow-hidden flex">
        {/* Desktop drawing toolbar (vertical) */}
        {!isMultiChart && <div className="hidden md:block"><DrawingToolbar /></div>}

        <div className="flex-1 p-1 md:p-2 flex flex-col gap-1 min-w-0">
          {isMultiChart ? (
            <div className="flex-1 overflow-hidden">
              <MultiChartGrid />
            </div>
          ) : (
            <>
              <div id="chart-area" className={`flex-1 rounded border overflow-hidden ${
                isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
              }`}>
                <ChartContainer />
              </div>
              {paneIndicators.map((ind) => (
                <IndicatorPane
                  key={ind.id}
                  indicator={ind}
                  onRemove={() => removeIndicator(ind.id)}
                />
              ))}
            </>
          )}
        </div>

        {/* Watchlist - hidden on mobile by default, toggle via hamburger menu */}
        {watchlistVisible && (
          <div className={`hidden md:block ${watchlistVisible ? '' : 'md:hidden'}`}>
            <Watchlist />
          </div>
        )}
      </main>

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <TemplateManager isOpen={templateManagerOpen} onClose={() => setTemplateManagerOpen(false)} />
      <BacktestPanel />
    </div>
  );
}

export default App;
