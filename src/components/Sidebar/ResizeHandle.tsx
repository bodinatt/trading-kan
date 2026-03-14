import { useCallback } from 'react';
import { useSidePanelStore } from '../../stores/sidePanelStore';
import { useThemeStore } from '../../stores/themeStore';

export function ResizeHandle() {
  const setPanelWidth = useSidePanelStore((s) => s.setPanelWidth);
  const panelWidth = useSidePanelStore((s) => s.panelWidth);
  const isDark = useThemeStore((s) => s.theme) === 'dark';

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = panelWidth;

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      const onMouseMove = (ev: MouseEvent) => {
        const delta = startX - ev.clientX;
        setPanelWidth(startWidth + delta);
      };

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [panelWidth, setPanelWidth]
  );

  return (
    <div
      className={`w-1 h-full cursor-col-resize transition-colors hover:bg-blue-500/50 ${
        isDark ? 'border-l border-gray-700' : 'border-l border-gray-300'
      }`}
      onMouseDown={onMouseDown}
    />
  );
}
