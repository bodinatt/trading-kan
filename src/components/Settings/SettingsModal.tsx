import { useState, useEffect } from 'react';
import { getTwelveDataApiKey, setTwelveDataApiKey } from '../../services/twelvedata';
import { useThemeStore } from '../../stores/themeStore';
import { useTranslation } from '../../i18n';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState('');
  const isDark = useThemeStore((s) => s.theme) === 'dark';
  const t = useTranslation();

  useEffect(() => {
    if (isOpen) {
      setApiKey(getTwelveDataApiKey());
    }
  }, [isOpen]);

  const handleSave = () => {
    setTwelveDataApiKey(apiKey.trim());
    onClose();
    // Reload to apply new API key
    window.location.reload();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
      <div className={`rounded-lg w-96 shadow-xl ${isDark ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'}`}>
        <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className="text-sm font-semibold">{t.settingsTitle}</h2>
          <button onClick={onClose} className={isDark ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-gray-900'}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {t.apiKeyLabel}
            </label>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={t.apiKeyPlaceholder}
              className={`w-full px-3 py-2 rounded text-sm outline-none focus:border-blue-500 border ${isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
            />
            <p className="mt-1 text-[10px] text-gray-500">
              {t.apiKeyHelp}{' '}
              <a
                href="https://twelvedata.com/register"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                twelvedata.com
              </a>
              {' '}— {t.apiKeyDescription}
            </p>
          </div>
        </div>
        <div className={`flex justify-end gap-2 px-4 py-3 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <button
            onClick={onClose}
            className={`px-3 py-1.5 text-xs rounded ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
          >
            {t.cancel}
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-500"
          >
            {t.save}
          </button>
        </div>
      </div>
    </div>
  );
}
