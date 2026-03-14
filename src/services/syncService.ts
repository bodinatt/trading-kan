import { supabase, isSupabaseConfigured } from './supabase';
import { useAuthStore } from '../stores/authStore';
import { useWatchlistStore } from '../stores/watchlistStore';
import { useAlertStore } from '../stores/alertStore';
import { useChartStore } from '../stores/chartStore';
import { useThemeStore } from '../stores/themeStore';

interface CloudSettings {
  theme: string;
  timezone: string;
  language: string;
  chart_type: string;
  default_symbol: string;
  default_timeframe: string;
  td_api_key: string;
}

interface CloudWatchlistItem {
  symbol: string;
  name: string;
}

interface CloudAlert {
  symbol: string;
  price: number;
  condition: string;
  category: string;
  indicator_type: string | null;
  indicator_value: number | null;
  message: string;
}

/** Push current local state to Supabase */
export async function pushToCloud(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const user = useAuthStore.getState().user;
  if (!user) return false;

  try {
    // 1. Settings
    const chartStore = useChartStore.getState();
    const theme = useThemeStore.getState().theme;
    const lang = localStorage.getItem('trading-kan-lang') || 'en';

    const settings: CloudSettings & { user_id: string } = {
      user_id: user.id,
      theme,
      timezone: chartStore.timezone,
      language: lang,
      chart_type: chartStore.chartType,
      default_symbol: chartStore.symbol,
      default_timeframe: chartStore.timeframe,
      td_api_key: localStorage.getItem('td-api-key') || '',
    };

    await supabase
      .from('user_settings')
      .upsert(settings, { onConflict: 'user_id' });

    // 2. Watchlist
    const watchlist = useWatchlistStore.getState().items;
    const watchlistRows = watchlist.map((item, i) => ({
      user_id: user.id,
      symbol: item.symbol,
      name: item.name,
      sort_order: i,
    }));

    // Delete old watchlist and insert new
    await supabase.from('user_watchlist').delete().eq('user_id', user.id);
    if (watchlistRows.length > 0) {
      await supabase.from('user_watchlist').insert(watchlistRows);
    }

    // 3. Alerts
    const alerts = useAlertStore.getState().alerts.filter((a) => !a.triggered);
    const alertRows: (CloudAlert & { user_id: string })[] = alerts.map((a) => ({
      user_id: user.id,
      symbol: a.symbol,
      price: a.price,
      condition: a.condition,
      category: a.category,
      indicator_type: a.indicatorType ?? null,
      indicator_value: a.indicatorValue ?? null,
      message: a.message,
    }));

    await supabase.from('user_alerts').delete().eq('user_id', user.id);
    if (alertRows.length > 0) {
      await supabase.from('user_alerts').insert(alertRows);
    }

    console.log('[Sync] Pushed to cloud');
    return true;
  } catch (err) {
    console.error('[Sync] Push error:', err);
    return false;
  }
}

/** Pull cloud state and apply to local stores */
export async function pullFromCloud(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const user = useAuthStore.getState().user;
  if (!user) return false;

  try {
    // 1. Settings
    const { data: settings } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (settings) {
      useThemeStore.getState().setTheme(settings.theme);
      useChartStore.getState().setTimezone(settings.timezone);
      useChartStore.getState().setChartType(settings.chart_type);
      useChartStore.getState().setSymbol(settings.default_symbol);
      useChartStore.getState().setTimeframe(settings.default_timeframe);
      if (settings.td_api_key) {
        localStorage.setItem('td-api-key', settings.td_api_key);
      }
      if (settings.language) {
        localStorage.setItem('trading-kan-lang', settings.language);
      }
    }

    // 2. Watchlist
    const { data: watchlist } = await supabase
      .from('user_watchlist')
      .select('symbol, name, sort_order')
      .eq('user_id', user.id)
      .order('sort_order');

    if (watchlist && watchlist.length > 0) {
      // Replace local watchlist with cloud data
      const store = useWatchlistStore.getState();
      // Clear and re-add
      for (const item of store.items) {
        store.removeItem(item.symbol);
      }
      for (const item of watchlist) {
        store.addItem(item.symbol, item.name);
      }
    }

    // 3. Alerts
    const { data: alerts } = await supabase
      .from('user_alerts')
      .select('*')
      .eq('user_id', user.id);

    if (alerts && alerts.length > 0) {
      const alertStore = useAlertStore.getState();
      // Clear triggered, add cloud alerts
      alertStore.clearTriggered();
      for (const a of alerts) {
        alertStore.addAlert({
          symbol: a.symbol,
          price: a.price,
          condition: a.condition,
          category: a.category,
          indicatorType: a.indicator_type ?? undefined,
          indicatorValue: a.indicator_value ?? undefined,
          message: a.message,
        });
      }
    }

    console.log('[Sync] Pulled from cloud');
    return true;
  } catch (err) {
    console.error('[Sync] Pull error:', err);
    return false;
  }
}
