import { useTemplateStore } from '../../stores/templateStore';
import { useChartStore } from '../../stores/chartStore';
import { useIndicatorStore } from '../../stores/indicatorStore';
import { useThemeStore } from '../../stores/themeStore';
import { useTranslation } from '../../i18n';

interface TemplateManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TemplateManager({ isOpen, onClose }: TemplateManagerProps) {
  const { templates, deleteTemplate } = useTemplateStore();
  const setChartType = useChartStore((s) => s.setChartType);
  const setTimeframe = useChartStore((s) => s.setTimeframe);
  const isDark = useThemeStore((s) => s.theme) === 'dark';
  const t = useTranslation();

  const loadTemplate = (templateId: string) => {
    const template = useTemplateStore.getState().getTemplate(templateId);
    if (!template) return;

    setChartType(template.chartType);
    setTimeframe(template.timeframe as Parameters<typeof setTimeframe>[0]);

    // Replace indicators
    const indStore = useIndicatorStore.getState();
    // Remove all existing
    for (const ind of indStore.indicators) {
      indStore.removeIndicator(ind.id);
    }
    // Add template indicators
    for (const ind of template.indicators) {
      indStore.addIndicator(ind.type);
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
      <div className={`rounded-lg w-96 shadow-xl ${
        isDark ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'
      }`}>
        <div className={`flex items-center justify-between px-4 py-3 border-b ${
          isDark ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <h2 className="text-sm font-semibold">{t.chartTemplates}</h2>
          <button onClick={onClose} className={isDark ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-gray-900'}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 max-h-80 overflow-y-auto">
          {templates.length === 0 ? (
            <div className={`text-center py-8 text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              {t.noTemplates}
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className={`flex items-center justify-between px-3 py-2 rounded ${
                    isDark ? 'bg-gray-800 hover:bg-gray-750' : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{tmpl.name}</div>
                    <div className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      {tmpl.chartType} / {tmpl.timeframe} / {tmpl.indicators.length} {tmpl.indicators.length !== 1 ? t.indicatorPlural : t.indicator}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button
                      onClick={() => loadTemplate(tmpl.id)}
                      className="px-2 py-1 text-[10px] bg-blue-600 text-white rounded hover:bg-blue-500"
                    >
                      {t.load}
                    </button>
                    <button
                      onClick={() => deleteTemplate(tmpl.id)}
                      className={`px-2 py-1 text-[10px] rounded ${
                        isDark ? 'text-gray-400 hover:text-red-400 hover:bg-gray-700' : 'text-gray-500 hover:text-red-500 hover:bg-gray-200'
                      }`}
                    >
                      {t.delete_}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
