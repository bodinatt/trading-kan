import { useState } from 'react';
import { useThemeStore } from '../../stores/themeStore';
import { useTranslation } from '../../i18n';

export function ChartActions() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isDark = useThemeStore((s) => s.theme) === 'dark';
  const t = useTranslation();

  const toggleFullscreen = () => {
    const chartArea = document.getElementById('chart-area');
    if (!chartArea) return;

    if (!document.fullscreenElement) {
      chartArea.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  const takeScreenshot = () => {
    const chartArea = document.getElementById('chart-area');
    if (!chartArea) return;

    // Find all canvas elements within the chart area
    const canvases = chartArea.querySelectorAll('canvas');
    if (canvases.length === 0) return;

    // Create a composite canvas
    const compositeCanvas = document.createElement('canvas');
    const rect = chartArea.getBoundingClientRect();
    compositeCanvas.width = rect.width * window.devicePixelRatio;
    compositeCanvas.height = rect.height * window.devicePixelRatio;
    const ctx = compositeCanvas.getContext('2d');
    if (!ctx) return;

    // Fill background
    ctx.fillStyle = isDark ? '#111827' : '#ffffff';
    ctx.fillRect(0, 0, compositeCanvas.width, compositeCanvas.height);

    // Draw each canvas
    canvases.forEach((canvas) => {
      const canvasRect = canvas.getBoundingClientRect();
      const x = (canvasRect.left - rect.left) * window.devicePixelRatio;
      const y = (canvasRect.top - rect.top) * window.devicePixelRatio;
      try {
        ctx.drawImage(canvas, x, y);
      } catch {
        // ignore CORS errors
      }
    });

    // Add watermark
    ctx.fillStyle = isDark ? '#ffffff40' : '#00000040';
    ctx.font = '14px sans-serif';
    ctx.fillText('Trading Kan', 10, compositeCanvas.height - 10);

    // Download
    const link = document.createElement('a');
    link.download = `trading-kan-${Date.now()}.png`;
    link.href = compositeCanvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="flex items-center gap-0.5">
      {/* Screenshot */}
      <button
        onClick={takeScreenshot}
        className={`p-1.5 rounded transition-colors ${isDark ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
        title={t.screenshotDesc}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
      {/* Fullscreen */}
      <button
        onClick={toggleFullscreen}
        className={`p-1.5 rounded transition-colors ${isDark ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
        title={t.fullscreen}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {isFullscreen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
          )}
        </svg>
      </button>
    </div>
  );
}
