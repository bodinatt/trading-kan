import { useChartStore, type ChartType } from '../../stores/chartStore';
import { useThemeStore } from '../../stores/themeStore';
import { useTranslation } from '../../i18n';
import type { Translations } from '../../i18n';

const CHART_TYPES: { key: ChartType; labelKey: keyof Translations }[] = [
  { key: 'candle', labelKey: 'candle' },
  { key: 'bar', labelKey: 'bar' },
  { key: 'line', labelKey: 'line' },
  { key: 'area', labelKey: 'area' },
];

export function ChartTypeSelector() {
  const { chartType, setChartType } = useChartStore();
  const isDark = useThemeStore((s) => s.theme) === 'dark';
  const t = useTranslation();

  return (
    <div className="flex gap-0.5">
      {CHART_TYPES.map((ct) => (
        <button
          key={ct.key}
          onClick={() => setChartType(ct.key)}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            chartType === ct.key
              ? 'bg-blue-600 text-white'
              : isDark
                ? 'text-gray-400 hover:bg-gray-800 hover:text-white'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          {t[ct.labelKey]}
        </button>
      ))}
    </div>
  );
}
