import { useSidePanelStore } from '../../stores/sidePanelStore';
import { IconBar } from './IconBar';
import { PanelContainer } from './PanelContainer';
import { ResizeHandle } from './ResizeHandle';

export function RightSidebar() {
  const activePanel = useSidePanelStore((s) => s.activePanel);
  const closePanel = useSidePanelStore((s) => s.closePanel);

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex h-full flex-row">
        {activePanel !== null && (
          <>
            <ResizeHandle />
            <PanelContainer />
          </>
        )}
        <IconBar />
      </div>

      {/* Mobile overlay (shown on small screens when panel is active) */}
      {activePanel && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={closePanel} />
          {/* Panel slide-in from right */}
          <div
            className="absolute right-0 top-0 h-full w-80 max-w-[calc(100%-3rem)]"
            onClick={(e) => e.stopPropagation()}
          >
            <PanelContainer />
          </div>
        </div>
      )}
    </>
  );
}
