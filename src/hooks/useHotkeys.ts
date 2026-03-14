import { useEffect } from 'react';
import { useChartStore } from '../stores/chartStore';
import { useDrawingStore } from '../stores/drawingStore';

export function useHotkeys() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Undo: Ctrl+Z (without Shift)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        useDrawingStore.getState().undo();
        return;
      }

      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'Z' && e.shiftKey) || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        useDrawingStore.getState().redo();
        return;
      }

      // Timeframe shortcuts
      if (e.key === '1') useChartStore.getState().setTimeframe('1m');
      if (e.key === '5') useChartStore.getState().setTimeframe('5m');
      if (e.key === '3') useChartStore.getState().setTimeframe('15m');
      if (e.key === 'h') useChartStore.getState().setTimeframe('1h');
      if (e.key === '4') useChartStore.getState().setTimeframe('4h');
      if (e.key === 'd') useChartStore.getState().setTimeframe('1D');
      if (e.key === 'w') useChartStore.getState().setTimeframe('1W');

      // Escape to cancel drawing (reset to cursor if drawingStore exists)
      if (e.key === 'Escape') {
        // Generic escape handling - dispatches a custom event that drawing tools can listen to
        window.dispatchEvent(new CustomEvent('hotkey-escape'));
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
