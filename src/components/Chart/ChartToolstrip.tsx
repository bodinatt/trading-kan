import { useChartStore } from '../../stores/chartStore';
import { useThemeStore } from '../../stores/themeStore';
import { useTranslation } from '../../i18n';

interface ChartToolstripProps {
  onSetPriceScaleMode: (mode: 0 | 1 | 2) => void;
  onFitContent: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export function ChartToolstrip({
  onSetPriceScaleMode,
  onFitContent,
  onZoomIn,
  onZoomOut,
}: ChartToolstripProps) {
  const { logScale, percentageScale, toggleLogScale, togglePercentageScale } =
    useChartStore();
  const isDark = useThemeStore((s) => s.theme) === 'dark';
  const t = useTranslation();

  const handleLogToggle = () => {
    toggleLogScale();
    const willBeLog = !logScale;
    onSetPriceScaleMode(willBeLog ? 1 : 0);
  };

  const handlePercentageToggle = () => {
    togglePercentageScale();
    const willBePct = !percentageScale;
    onSetPriceScaleMode(willBePct ? 2 : 0);
  };

  const btnBase =
    'px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors select-none';
  const btnInactive = `${btnBase} ${isDark ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200'}`;

  return (
    <div className={`absolute bottom-2 right-2 flex items-center gap-0.5 backdrop-blur-sm rounded px-1 py-0.5 border z-10 ${isDark ? 'bg-gray-900/80 border-gray-700/50' : 'bg-white/80 border-gray-300/50'}`}>
      <button
        onClick={handleLogToggle}
        className={`${btnBase} ${
          logScale ? 'bg-blue-600 text-white' : isDark ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200'
        }`}
        title={t.toggleLogScale}
      >
        {t.logScale}
      </button>
      <button
        onClick={handlePercentageToggle}
        className={`${btnBase} ${
          percentageScale
            ? 'bg-blue-600 text-white'
            : isDark ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200'
        }`}
        title={t.togglePercentScale}
      >
        {t.percentScale}
      </button>
      <div className={`w-px h-3 mx-0.5 ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`} />
      <button
        onClick={onFitContent}
        className={btnInactive}
        title={t.autoFitDesc}
      >
        {t.autoFit}
      </button>
      <div className={`w-px h-3 mx-0.5 ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`} />
      <button
        onClick={onZoomIn}
        className={btnInactive}
        title={t.zoomIn}
      >
        +
      </button>
      <button
        onClick={onZoomOut}
        className={btnInactive}
        title={t.zoomOut}
      >
        -
      </button>
    </div>
  );
}
