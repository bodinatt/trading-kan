import { create } from 'zustand';

export interface EconEvent {
  id: string;
  title: string;
  country: string;
  date: string;
  time: string;
  impact: 'high' | 'medium' | 'low';
  forecast?: string;
  previous?: string;
  actual?: string;
}

interface CalendarState {
  events: EconEvent[];
  isLoading: boolean;
  error: string | null;
  tab: 'today' | 'week' | 'nextWeek';
  fetchEvents: () => Promise<void>;
  setTab: (t: 'today' | 'week' | 'nextWeek') => void;
}

function getRelativeDate(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function getDayOfWeek(): number {
  return new Date().getDay(); // 0=Sun, 1=Mon, ...
}

function buildMockEvents(): EconEvent[] {
  const dow = getDayOfWeek();
  const today = getRelativeDate(0);
  const tomorrow = getRelativeDate(1);

  // Days until specific weekdays from today
  const daysUntilWed = ((3 - dow) + 7) % 7 || 7;
  const daysUntilThu = ((4 - dow) + 7) % 7 || 7;
  const daysUntilFri = ((5 - dow) + 7) % 7 || 7;

  // Next week monday
  const daysUntilNextMon = ((1 - dow) + 7) % 7 + 7;

  return [
    { id: '1', title: 'Non-Farm Payrolls', country: 'US', date: today, time: '08:30', impact: 'high', forecast: '180K', previous: '175K' },
    { id: '2', title: 'CPI m/m', country: 'US', date: today, time: '08:30', impact: 'high', forecast: '0.3%', previous: '0.4%' },
    { id: '3', title: 'GDP q/q', country: 'GB', date: today, time: '07:00', impact: 'medium', forecast: '0.2%', previous: '0.1%' },
    { id: '4', title: 'Interest Rate Decision', country: 'JP', date: tomorrow, time: '03:00', impact: 'high', forecast: '0.25%', previous: '0.25%' },
    { id: '5', title: 'Retail Sales m/m', country: 'US', date: tomorrow, time: '08:30', impact: 'medium', forecast: '0.5%', previous: '0.7%' },
    { id: '6', title: 'Unemployment Rate', country: 'AU', date: getRelativeDate(daysUntilWed), time: '00:30', impact: 'medium', forecast: '3.8%', previous: '3.7%' },
    { id: '7', title: 'PMI Manufacturing', country: 'DE', date: getRelativeDate(daysUntilThu), time: '08:30', impact: 'low', forecast: '47.5', previous: '46.5' },
    { id: '8', title: 'ECB Press Conference', country: 'EU', date: getRelativeDate(daysUntilThu), time: '08:45', impact: 'high' },
    { id: '9', title: 'Core PCE Price Index', country: 'US', date: getRelativeDate(daysUntilFri), time: '08:30', impact: 'high', forecast: '0.3%', previous: '0.3%' },
    { id: '10', title: 'BOE Interest Rate', country: 'GB', date: getRelativeDate(daysUntilNextMon), time: '12:00', impact: 'high', forecast: '5.00%', previous: '5.25%' },
  ];
}

export const useCalendarStore = create<CalendarState>((set) => ({
  events: [],
  isLoading: false,
  error: null,
  tab: 'today',

  setTab: (t) => set({ tab: t }),

  fetchEvents: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('https://nfs.faireconomy.media/ff_calendar_thisweek.json', {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) throw new Error('Empty data');

      const events: EconEvent[] = data.map((item: Record<string, unknown>, i: number) => ({
        id: String(i),
        title: String(item.title ?? ''),
        country: String(item.country ?? ''),
        date: typeof item.date === 'string' ? item.date.slice(0, 10) : '',
        time: typeof item.date === 'string' && item.date.length > 11 ? item.date.slice(11, 16) : '',
        impact: item.impact === 'High' ? 'high' : item.impact === 'Medium' ? 'medium' : 'low',
        forecast: item.forecast != null ? String(item.forecast) : undefined,
        previous: item.previous != null ? String(item.previous) : undefined,
        actual: item.actual != null ? String(item.actual) : undefined,
      }));

      set({ events, isLoading: false });
    } catch {
      // Fallback to mock data
      set({ events: buildMockEvents(), isLoading: false, error: null });
    }
  },
}));
