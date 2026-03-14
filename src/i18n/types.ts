export type Language = 'th' | 'en';

export interface Translations {
  // App
  appTitle: string;
  menu: string;
  settings: string;
  hideWatchlist: string;
  showWatchlist: string;
  drawingTools: string;
  templates: string;
  addApiKey: string;
  switchToLight: string;
  switchToDark: string;
  language: string;
  loading: string;

  // Chart Legend
  legendOpen: string;
  legendHigh: string;
  legendLow: string;
  legendClose: string;
  legendVolume: string;
  crypto: string;
  forex: string;
  stock: string;
  price: string;
  change24h: string;
  volume: string;

  // Chart Toolstrip
  logScale: string;
  toggleLogScale: string;
  percentScale: string;
  togglePercentScale: string;
  autoFit: string;
  autoFitDesc: string;
  zoomIn: string;
  zoomOut: string;

  // Timeframe
  minutes: string;
  hours: string;
  daysPlus: string;

  // Chart Types
  candle: string;
  bar: string;
  line: string;
  area: string;

  // Context Menu
  resetChart: string;
  addAlertAtPrice: string;
  removeAllDrawings: string;
  removeAllIndicators: string;
  saveAsTemplate: string;
  screenshot: string;
  templateNamePrompt: string;

  // Drawing Tools
  cursor: string;
  horizontalLine: string;
  verticalLine: string;
  trendline: string;
  ray: string;
  extendedLine: string;
  rectangle: string;
  parallelChannel: string;
  pitchfork: string;
  arrow: string;
  text: string;
  fibRetracement: string;
  drawingColor: string;
  clearAllDrawings: string;
  enterText: string;
  deleteDrawing: string;

  // Indicators
  indicators: string;
  addIndicator: string;
  active: string;
  remove: string;

  // Indicator Categories
  catMovingAverages: string;
  catOscillators: string;
  catTrend: string;
  catVolatility: string;
  catVolume: string;

  // Indicator Names
  sma: string;
  smaDesc: string;
  ema: string;
  emaDesc: string;
  dema: string;
  demaDesc: string;
  tema: string;
  temaDesc: string;
  wma: string;
  wmaDesc: string;
  hma: string;
  hmaDesc: string;
  rsi: string;
  rsiDesc: string;
  macd: string;
  macdDesc: string;
  stochastic: string;
  stochasticDesc: string;
  williamsR: string;
  williamsRDesc: string;
  cci: string;
  cciDesc: string;
  mfi: string;
  mfiDesc: string;
  roc: string;
  rocDesc: string;
  dpo: string;
  dpoDesc: string;
  adx: string;
  adxDesc: string;
  parabolicSar: string;
  parabolicSarDesc: string;
  supertrend: string;
  supertrendDesc: string;
  ichimoku: string;
  ichimokuDesc: string;
  bollingerBands: string;
  bollingerBandsDesc: string;
  atr: string;
  atrDesc: string;
  keltnerChannels: string;
  keltnerChannelsDesc: string;
  obv: string;
  obvDesc: string;
  vwap: string;
  vwapDesc: string;
  cmf: string;
  cmfDesc: string;
  volumeProfile: string;
  volumeProfileDesc: string;

  // Indicator Settings
  indicatorSettings: string;
  period: string;
  apply: string;
  resetDefaults: string;
  color: string;
  visibility: string;
  visible: string;
  hidden: string;
  fast: string;
  slow: string;
  signal: string;
  stdDev: string;
  multiplier: string;
  step: string;
  max: string;
  smoothK: string;
  smoothD: string;
  tenkan: string;
  kijun: string;
  senkou: string;
  emaPeriod: string;
  atrPeriod: string;
  duplicate: string;
  vpBins: string;

  // Alerts
  alerts: string;
  newAlert: string;
  priceAbove: string;
  priceBelow: string;
  crossesAbove: string;
  crossesBelow: string;
  alertMessage: string;
  add: string;
  noAlerts: string;
  triggered: string;
  clearTriggered: string;
  alertCondition: string;
  alertPrice: string;
  alertIndicator: string;
  alertRsiAbove: string;
  alertRsiBelow: string;
  alertMacdCrossUp: string;
  alertMacdCrossDown: string;
  alertMacdAbove: string;
  alertMacdBelow: string;
  alertBbUpperBreak: string;
  alertBbLowerBreak: string;

  // Compare
  compare: string;
  searchToCompare: string;
  comparing: string;
  searchAndAddSymbols: string;

  // Layout
  chartLayout: string;
  layout: string;
  single: string;

  // Search
  searchSymbol: string;
  noResults: string;

  // Watchlist
  watchlist: string;
  addSymbol: string;
  custom: string;
  name: string;
  moveUp: string;
  moveDown: string;

  // Settings
  settingsTitle: string;
  apiKeyLabel: string;
  apiKeyPlaceholder: string;
  apiKeyHelp: string;
  apiKeyDescription: string;
  cancel: string;
  save: string;

  // Templates
  chartTemplates: string;
  noTemplates: string;
  load: string;
  delete_: string;
  indicator: string;
  indicatorPlural: string;

  // Timezone
  timezone: string;
  tzUTC: string;
  tzLocal: string;
  tzBangkok: string;
  tzTokyo: string;
  tzNewYork: string;
  tzLondon: string;
  tzSydney: string;
  tzHongKong: string;
  tzSingapore: string;

  // Screenshot & Share
  screenshotDesc: string;
  fullscreen: string;
  share: string;
  copyChartImage: string;
  downloadPNG: string;
  downloadSVG: string;
  shareLink: string;
  linkCopied: string;
  imageCopied: string;

  // Backtest
  btBacktest: string;
  btRunBacktest: string;
  btStrategy: string;
  btParameters: string;
  btMaCrossover: string;
  btRsiStrategy: string;
  btMacdStrategy: string;
  btBollingerStrategy: string;
  btSupertrendStrategy: string;
  btStochasticStrategy: string;
  btCombinedStrategy: string;
  btInitialCapital: string;
  btPositionSize: string;
  btPositionSettings: string;
  btStopLoss: string;
  btTakeProfit: string;
  btPeriod: string;
  btPeriodLabel: string;
  btResults: string;
  btEquityCurve: string;
  btTotalReturn: string;
  btWinRate: string;
  btProfitFactor: string;
  btMaxDrawdown: string;
  btSharpeRatio: string;
  btTotalTrades: string;
  btAvgWin: string;
  btAvgLoss: string;
  btBestTrade: string;
  btWorstTrade: string;
  btAvgHoldingPeriod: string;
  btTradeList: string;
  btEntryPrice: string;
  btExitPrice: string;
  btPnl: string;
  btDuration: string;
  btDirection: string;
  btLongOnly: string;
  btShortOnly: string;
  btBothDirections: string;
  btFastPeriod: string;
  btSlowPeriod: string;
  btOversold: string;
  btOverbought: string;
  btStdDev: string;
  btMultiplier: string;
  btLogic: string;
  btNoResults: string;
  btNoTrades: string;
  btGuideTitle: string;
  btGuideStep1: string;
  btGuideStep2: string;
  btGuideStep3: string;
  btGuideStep4: string;
  btGuideStep5: string;
  btGuideTip1: string;
  btGuideTip2: string;
  btGuideTip3: string;
  btGuideStrategies: string;
  btGuideMaCrossover: string;
  btGuideRsi: string;
  btGuideMacd: string;
  btGuideBollinger: string;
  btGuideSupertrend: string;
  btGuideStochastic: string;
  btGuideCombined: string;

  // Help Tooltips (for beginners)
  helpSMA: string;
  helpEMA: string;
  helpRSI: string;
  helpMACD: string;
  helpBollinger: string;
  helpStochastic: string;
  helpATR: string;
  helpADX: string;
  helpVWAP: string;
  helpOBV: string;
  helpIchimoku: string;
  helpParabolicSAR: string;
  helpSupertrend: string;
  helpDEMA: string;
  helpTEMA: string;
  helpWMA: string;
  helpHMA: string;
  helpWilliamsR: string;
  helpCCI: string;
  helpMFI: string;
  helpROC: string;
  helpDPO: string;
  helpKeltner: string;
  helpCMF: string;
  helpVolumeProfile: string;
  helpFibonacci: string;
  helpTrendline: string;
  helpHorizontalLine: string;
  helpVerticalLine: string;
  helpParallelChannel: string;
  helpPitchfork: string;
  helpCandlestick: string;
  helpVolume: string;
  helpLogScale: string;
  helpTimeframe: string;
  helpWatchlist: string;
  helpAlerts: string;
  helpCompare: string;

  // Replay
  replay: string;
  replayMode: string;
  replaySpeed: string;
  replayPlay: string;
  replayPause: string;
  replayStepForward: string;
  replayStepBack: string;
  replayStop: string;
  replaySpeedLabel: string;

  // Export Data
  exportData: string;
  exportCSV: string;
  exportJSON: string;
  copyClipboard: string;
  dataCopied: string;

  // Last Updated
  lastUpdated: string;

  // Side Panel
  sidePanel: string;
  panelWatchlist: string;
  panelAlerts: string;
  panelDataWindow: string;
  panelNews: string;
  panelScreener: string;
  panelCalendar: string;
  panelNotifications: string;
  panelHelp: string;

  // Watchlist enhancements
  newGroup: string;
  renameGroup: string;
  deleteGroup: string;
  moveToGroup: string;
  ungrouped: string;
  marketCap: string;
  high24h: string;
  low24h: string;

  // Data Window
  dataWindow: string;
  noData: string;

  // News
  newsTitle: string;
  allNews: string;
  loadMore: string;
  minutesAgo: string;
  hoursAgo: string;
  daysAgo: string;

  // Screener
  screenerTitle: string;
  topGainers: string;
  topLosers: string;
  volumeLeaders: string;
  autoRefresh: string;

  // Calendar
  calendarTitle: string;
  today: string;
  thisWeek: string;
  nextWeek: string;
  forecast: string;
  previous: string;
  actual: string;
  highImpact: string;
  mediumImpact: string;
  lowImpact: string;

  // Notifications
  notificationsTitle: string;
  allNotifications: string;
  systemNotifications: string;
  alertNotifications: string;
  clearAll: string;
  noNotifications: string;

  // Help
  helpTitle: string;
  keyboardShortcuts: string;
  quickGuide: string;
  appInfo: string;
  howToIndicators: string;
  howToDrawings: string;
  howToAlerts: string;
  howToBacktest: string;

  // Auth
  signIn: string;
  signUp: string;
  signOut: string;
  email: string;
  password: string;
  signInWithGoogle: string;
  orUseEmail: string;
  noAccount: string;
  haveAccount: string;
  syncToCloud: string;
  synced: string;
  syncError: string;
  guest: string;
}
