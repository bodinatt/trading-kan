import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { useTranslation } from '../../i18n';
import { isSupabaseConfigured } from '../../services/supabase';
import { pushToCloud } from '../../services/syncService';
import { AuthModal } from './AuthModal';

export function AuthButton() {
  const [showModal, setShowModal] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const isDark = useThemeStore((s) => s.theme) === 'dark';
  const t = useTranslation();

  if (!isSupabaseConfigured()) return null;

  const handleSync = async () => {
    setSyncing(true);
    const ok = await pushToCloud();
    setSyncStatus(ok ? 'ok' : 'error');
    setSyncing(false);
    setTimeout(() => setSyncStatus('idle'), 2000);
  };

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handleSync}
          disabled={syncing}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            syncStatus === 'ok'
              ? 'bg-green-600 text-white'
              : syncStatus === 'error'
                ? 'bg-red-600 text-white'
                : isDark
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
          }`}
          title={t.syncToCloud}
        >
          {syncing ? '...' : syncStatus === 'ok' ? t.synced : syncStatus === 'error' ? t.syncError : '☁️'}
        </button>
        <div className="relative group">
          <button
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
              isDark
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold">
              {(user.email?.[0] || 'U').toUpperCase()}
            </span>
            <span className="max-w-[100px] truncate">{user.email}</span>
          </button>
          <div
            className={`absolute right-0 top-full mt-1 w-36 rounded border shadow-lg z-50 hidden group-hover:block ${
              isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}
          >
            <button
              onClick={signOut}
              className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                isDark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              {t.signOut}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`px-3 py-1 text-xs rounded transition-colors ${
          isDark
            ? 'bg-blue-600 hover:bg-blue-500 text-white'
            : 'bg-blue-500 hover:bg-blue-400 text-white'
        }`}
      >
        {t.signIn}
      </button>
      {showModal && <AuthModal onClose={() => setShowModal(false)} />}
    </>
  );
}
