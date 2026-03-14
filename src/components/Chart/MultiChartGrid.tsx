import { useLayoutStore } from '../../stores/layoutStore';
import { MiniChart } from './MiniChart';

export function MultiChartGrid() {
  const { preset, panels, activePanel, setActivePanel } = useLayoutStore();

  const gridClass = {
    '1x1': 'grid-cols-1 grid-rows-1',
    '1x2': 'grid-cols-2 grid-rows-1',
    '2x1': 'grid-cols-1 grid-rows-2',
    '2x2': 'grid-cols-2 grid-rows-2',
    '3x1': 'grid-cols-3 grid-rows-1',
    '1+2': 'grid-cols-2 grid-rows-2',
  }[preset];

  return (
    <div className={`h-full w-full grid gap-1 ${gridClass}`}>
      {panels.map((panel, idx) => (
        <div
          key={panel.id}
          className={
            preset === '1+2' && idx === 0 ? 'row-span-2' : ''
          }
        >
          <MiniChart
            panelId={panel.id}
            symbol={panel.symbol}
            timeframe={panel.timeframe}
            chartType={panel.chartType}
            isActive={activePanel === panel.id}
            onActivate={() => setActivePanel(panel.id)}
          />
        </div>
      ))}
    </div>
  );
}
