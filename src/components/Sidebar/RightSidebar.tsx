import { useSidePanelStore } from '../../stores/sidePanelStore';
import { IconBar } from './IconBar';
import { PanelContainer } from './PanelContainer';
import { ResizeHandle } from './ResizeHandle';

export function RightSidebar() {
  const activePanel = useSidePanelStore((s) => s.activePanel);

  return (
    <div className="hidden md:flex h-full flex-row">
      {activePanel !== null && (
        <>
          <ResizeHandle />
          <PanelContainer />
        </>
      )}
      <IconBar />
    </div>
  );
}
