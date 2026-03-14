import { useEffect, useRef, useCallback } from 'react';
import { useReplayStore } from '../../stores/replayStore';
import { useThemeStore } from '../../stores/themeStore';
import { useTranslation } from '../../i18n';

const SPEED_OPTIONS = [
  { label: '1x', value: 1000 },
  { label: '2x', value: 500 },
  { label: '4x', value: 250 },
  { label: '10x', value: 100 },
];

export function ReplayControls() {
  const isDark = useThemeStore((s) => s.theme) === 'dark';
  const t = useTranslation();

  const isReplaying = useReplayStore((s) => s.isReplaying);
  const isPlaying = useReplayStore((s) => s.isPlaying);
  const replayIndex = useReplayStore((s) => s.replayIndex);
  const replaySpeed = useReplayStore((s) => s.replaySpeed);
  const fullData = useReplayStore((s) => s.fullData);
  const play = useReplayStore((s) => s.play);
  const pause = useReplayStore((s) => s.pause);
  const stopReplay = useReplayStore((s) => s.stopReplay);
  const setSpeed = useReplayStore((s) => s.setSpeed);
  const stepForward = useReplayStore((s) => s.stepForward);
  const stepBackward = useReplayStore((s) => s.stepBackward);
  const setIndex = useReplayStore((s) => s.setIndex);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-play timer
  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    clearTimer();
    if (isPlaying && isReplaying) {
      intervalRef.current = setInterval(() => {
        const { replayIndex: idx, fullData: data, pause: doPause } = useReplayStore.getState();
        if (idx >= data.length) {
          doPause();
        } else {
          useReplayStore.getState().stepForward();
        }
      }, replaySpeed);
    }
    return clearTimer;
  }, [isPlaying, isReplaying, replaySpeed, clearTimer]);

  if (!isReplaying) return null;

  const currentBar = fullData[replayIndex - 1];
  const dateStr = currentBar
    ? new Date(currentBar.time * 1000).toLocaleString()
    : '';

  const progressPct = fullData.length > 0 ? (replayIndex / fullData.length) * 100 : 0;

  const currentSpeedLabel = SPEED_OPTIONS.find((s) => s.value === replaySpeed)?.label ?? `${replaySpeed}ms`;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium ${
        isDark
          ? 'bg-gray-900 border-b border-gray-800 text-gray-300'
          : 'bg-white border-b border-gray-200 text-gray-600'
      }`}
    >
      {/* Replay mode label */}
      <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${
        isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700'
      }`}>
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {t.replayMode}
      </span>

      <div className={`w-px h-4 ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`} />

      {/* Step backward */}
      <button
        onClick={stepBackward}
        disabled={replayIndex <= 1}
        className={`p-1 rounded transition-colors disabled:opacity-30 ${
          isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
        }`}
        title={t.replayStepBack}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
        </svg>
      </button>

      {/* Play / Pause */}
      <button
        onClick={isPlaying ? pause : play}
        className={`p-1 rounded transition-colors ${
          isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
        }`}
        title={isPlaying ? t.replayPause : t.replayPlay}
      >
        {isPlaying ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
      </button>

      {/* Step forward */}
      <button
        onClick={stepForward}
        disabled={replayIndex >= fullData.length}
        className={`p-1 rounded transition-colors disabled:opacity-30 ${
          isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
        }`}
        title={t.replayStepForward}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
        </svg>
      </button>

      <div className={`w-px h-4 ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`} />

      {/* Speed selector */}
      <span className="text-[10px] opacity-60">{t.replaySpeedLabel}:</span>
      <div className="flex gap-0.5">
        {SPEED_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSpeed(opt.value)}
            className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
              replaySpeed === opt.value
                ? isDark
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-500 text-white'
                : isDark
                  ? 'hover:bg-gray-800 text-gray-400'
                  : 'hover:bg-gray-100 text-gray-500'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className={`w-px h-4 ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`} />

      {/* Progress slider */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <input
          type="range"
          min={1}
          max={fullData.length}
          value={replayIndex}
          onChange={(e) => setIndex(Number(e.target.value))}
          className="flex-1 h-1 accent-blue-500 cursor-pointer"
        />
        <span className={`text-[10px] tabular-nums whitespace-nowrap ${
          isDark ? 'text-gray-500' : 'text-gray-400'
        }`}>
          {replayIndex}/{fullData.length}
        </span>
      </div>

      <div className={`w-px h-4 ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`} />

      {/* Date display */}
      <span className={`text-[10px] tabular-nums whitespace-nowrap ${
        isDark ? 'text-gray-400' : 'text-gray-500'
      }`}>
        {dateStr}
      </span>

      <div className={`w-px h-4 ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`} />

      {/* Stop / Exit */}
      <button
        onClick={stopReplay}
        className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-colors ${
          isDark
            ? 'text-red-400 hover:bg-red-500/20'
            : 'text-red-600 hover:bg-red-50'
        }`}
        title={t.replayStop}
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
        </svg>
        {t.replayStop}
      </button>
    </div>
  );
}
