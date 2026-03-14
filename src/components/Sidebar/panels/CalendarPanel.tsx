import { useEffect, useMemo } from 'react';
import { useCalendarStore, type EconEvent } from '../../../stores/calendarStore';
import { useThemeStore } from '../../../stores/themeStore';
import { useTranslation } from '../../../i18n';

const COUNTRY_FLAGS: Record<string, string> = {
  US: '\u{1F1FA}\u{1F1F8}',
  GB: '\u{1F1EC}\u{1F1E7}',
  JP: '\u{1F1EF}\u{1F1F5}',
  EU: '\u{1F1EA}\u{1F1FA}',
  AU: '\u{1F1E6}\u{1F1FA}',
  DE: '\u{1F1E9}\u{1F1EA}',
  CA: '\u{1F1E8}\u{1F1E6}',
  CN: '\u{1F1E8}\u{1F1F3}',
  NZ: '\u{1F1F3}\u{1F1FF}',
  CH: '\u{1F1E8}\u{1F1ED}',
  FR: '\u{1F1EB}\u{1F1F7}',
};

const IMPACT_STYLES = {
  high: { dot: 'bg-red-500', text: 'text-red-500' },
  medium: { dot: 'bg-yellow-500', text: 'text-yellow-500' },
  low: { dot: 'bg-gray-400', text: 'text-gray-400' },
};

type TabId = 'today' | 'week' | 'nextWeek';

function getWeekRange(): { start: string; end: string } {
  const now = new Date();
  const dow = now.getDay();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - ((dow + 6) % 7)); // Monday
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday
  return { start: startOfWeek.toISOString().slice(0, 10), end: endOfWeek.toISOString().slice(0, 10) };
}

function getNextWeekRange(): { start: string; end: string } {
  const now = new Date();
  const dow = now.getDay();
  const startOfNextWeek = new Date(now);
  startOfNextWeek.setDate(now.getDate() - ((dow + 6) % 7) + 7);
  const endOfNextWeek = new Date(startOfNextWeek);
  endOfNextWeek.setDate(startOfNextWeek.getDate() + 6);
  return { start: startOfNextWeek.toISOString().slice(0, 10), end: endOfNextWeek.toISOString().slice(0, 10) };
}

function filterEvents(events: EconEvent[], tab: TabId): EconEvent[] {
  const today = new Date().toISOString().slice(0, 10);

  switch (tab) {
    case 'today':
      return events.filter((e) => e.date === today);
    case 'week': {
      const { start, end } = getWeekRange();
      return events.filter((e) => e.date >= start && e.date <= end);
    }
    case 'nextWeek': {
      const { start, end } = getNextWeekRange();
      return events.filter((e) => e.date >= start && e.date <= end);
    }
  }
}

function groupByDate(events: EconEvent[]): Map<string, EconEvent[]> {
  const groups = new Map<string, EconEvent[]>();
  const sorted = [...events].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.time.localeCompare(b.time);
  });
  for (const ev of sorted) {
    const group = groups.get(ev.date);
    if (group) group.push(ev);
    else groups.set(ev.date, [ev]);
  }
  return groups;
}

function formatDateLabel(dateStr: string): string {
  const today = new Date().toISOString().slice(0, 10);
  if (dateStr === today) return 'Today';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function CalendarPanel() {
  const { events, isLoading, tab, setTab, fetchEvents } = useCalendarStore();
  const isDark = useThemeStore((s) => s.theme) === 'dark';
  const tx = useTranslation();

  useEffect(() => {
    if (events.length === 0) {
      fetchEvents();
    }
  }, [events.length, fetchEvents]);

  const filtered = useMemo(() => filterEvents(events, tab), [events, tab]);
  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  const tabs: { id: TabId; label: string }[] = [
    { id: 'today', label: tx.today },
    { id: 'week', label: tx.thisWeek },
    { id: 'nextWeek', label: tx.nextWeek },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Tab Bar */}
      <div className={`flex border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 px-2 py-2 text-xs font-medium transition-colors ${
              tab === t.id
                ? isDark
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-blue-600 border-b-2 border-blue-600'
                : isDark
                ? 'text-gray-400 hover:text-gray-200'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              {tx.noData}
            </p>
          </div>
        ) : (
          Array.from(grouped.entries()).map(([date, eventsInDate]) => (
            <div key={date}>
              {/* Date Header */}
              <div
                className={`sticky top-0 px-3 py-1.5 text-[10px] font-semibold uppercase ${
                  isDark ? 'bg-gray-800/90 text-gray-400' : 'bg-gray-100/90 text-gray-500'
                }`}
              >
                {formatDateLabel(date)}
              </div>

              {/* Events */}
              {eventsInDate.map((ev) => (
                <EventRow key={ev.id} event={ev} isDark={isDark} tx={tx} />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function EventRow({
  event,
  isDark,
  tx,
}: {
  event: EconEvent;
  isDark: boolean;
  tx: Record<string, string>;
}) {
  const impact = IMPACT_STYLES[event.impact];
  const flag = COUNTRY_FLAGS[event.country] ?? event.country;

  return (
    <div
      className={`px-3 py-2 border-b ${
        isDark ? 'border-gray-800/50' : 'border-gray-100'
      }`}
    >
      <div className="flex items-center gap-2">
        {/* Time */}
        <span className={`text-[10px] font-mono w-10 flex-shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          {event.time}
        </span>

        {/* Flag */}
        <span className="text-sm flex-shrink-0">{flag}</span>

        {/* Impact dot */}
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${impact.dot}`} />

        {/* Title */}
        <span className={`text-xs truncate flex-1 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
          {event.title}
        </span>
      </div>

      {/* Values row */}
      {(event.forecast || event.previous || event.actual) && (
        <div className={`flex gap-3 mt-1 ml-[72px] text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          {event.forecast && (
            <span>
              <span className="font-medium">{tx.forecast}:</span> {event.forecast}
            </span>
          )}
          {event.previous && (
            <span>
              <span className="font-medium">{tx.previous}:</span> {event.previous}
            </span>
          )}
          {event.actual && (
            <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>
              <span className="font-medium">{tx.actual}:</span> {event.actual}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
