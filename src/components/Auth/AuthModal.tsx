import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { useTranslation } from '../../i18n';

interface AuthModalProps {
  onClose: () => void;
}

export function AuthModal({ onClose }: AuthModalProps) {
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const isDark = useThemeStore((s) => s.theme) === 'dark';
  const t = useTranslation();
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, isLoading } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const fn = mode === 'signIn' ? signInWithEmail : signUpWithEmail;
    const result = await fn(email, password);
    if (result.error) {
      setError(result.error);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className={`w-80 rounded-lg border shadow-xl p-5 ${
          isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {mode === 'signIn' ? t.signIn : t.signUp}
        </h2>

        {/* Google sign-in */}
        <button
          onClick={signInWithGoogle}
          disabled={isLoading}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded border text-sm transition-colors ${
            isDark
              ? 'border-gray-600 hover:bg-gray-800 text-gray-300'
              : 'border-gray-300 hover:bg-gray-50 text-gray-700'
          }`}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {t.signInWithGoogle}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-4">
          <div className={`flex-1 h-px ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
          <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{t.orUseEmail}</span>
          <div className={`flex-1 h-px ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
        </div>

        {/* Email form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            placeholder={t.email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={`w-full px-3 py-2 text-sm rounded border outline-none focus:ring-1 focus:ring-blue-500 ${
              isDark
                ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-500'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
            }`}
          />
          <input
            type="password"
            placeholder={t.password}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className={`w-full px-3 py-2 text-sm rounded border outline-none focus:ring-1 focus:ring-blue-500 ${
              isDark
                ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-500'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
            }`}
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 text-sm font-medium rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50"
          >
            {isLoading ? '...' : mode === 'signIn' ? t.signIn : t.signUp}
          </button>
        </form>

        {/* Toggle mode */}
        <p className={`text-xs text-center mt-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {mode === 'signIn' ? t.noAccount : t.haveAccount}{' '}
          <button
            onClick={() => { setMode(mode === 'signIn' ? 'signUp' : 'signIn'); setError(''); }}
            className="text-blue-500 hover:underline"
          >
            {mode === 'signIn' ? t.signUp : t.signIn}
          </button>
        </p>
      </div>
    </div>
  );
}
