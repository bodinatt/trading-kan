import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useWatchlistStore, type SortOption, type WatchlistItem, type WatchlistGroup } from '../../../stores/watchlistStore';
import { useChartStore } from '../../../stores/chartStore';
import { dataManager } from '../../../services/dataManager';
import type { SymbolInfo } from '../../../services/types';
import { useThemeStore } from '../../../stores/themeStore';
import { useTranslation } from '../../../i18n';

/* ---------- Mini sparkline ---------- */
function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 48;
  const h = 18;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={w} height={h} className="flex-shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={positive ? '#22c55e' : '#ef4444'}
        strokeWidth={1.2}
      />
    </svg>
  );
}

/* ---------- Search bar ---------- */
function PanelSearch({
  query,
  onChange,
  isDark,
  placeholder,
}: {
  query: string;
  onChange: (v: string) => void;
  isDark: boolean;
  placeholder: string;
}) {
  return (
    <div className="px-2 py-1.5">
      <input
        value={query}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full text-xs px-2 py-1.5 rounded border focus:border-blue-500 focus:outline-none ${
          isDark ? 'bg-gray-800 text-white border-gray-700' : 'bg-gray-50 text-gray-900 border-gray-300'
        }`}
      />
    </div>
  );
}

/* ---------- Add symbol search ---------- */
function AddSymbolSearch({ isDark, groupId }: { isDark: boolean; groupId?: string | null }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SymbolInfo[]>([]);
  const [open, setOpen] = useState(false);
  const addItem = useWatchlistStore((s) => s.addItem);
  const moveItemToGroup = useWatchlistStore((s) => s.moveItemToGroup);
  const t = useTranslation();
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = (val: string) => {
    setQuery(val);
    clearTimeout(timerRef.current);
    if (val.trim().length < 1) {
      setResults([]);
      setOpen(false);
      return;
    }
    timerRef.current = setTimeout(async () => {
      const res = await dataManager.searchSymbols(val.trim());
      setResults(res);
      setOpen(true);
    }, 300);
  };

  const handleSelect = (info: SymbolInfo) => {
    addItem(info.symbol, info.name, groupId ?? 'default');
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative px-2 py-1">
      <input
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder={t.addSymbol}
        className={`w-full text-xs px-2 py-1 rounded border focus:border-blue-500 focus:outline-none ${
          isDark ? 'bg-gray-800 text-white border-gray-700' : 'bg-gray-50 text-gray-900 border-gray-300'
        }`}
      />
      {open && results.length > 0 && (
        <div
          className={`absolute left-2 right-2 bottom-full mb-0.5 rounded shadow-lg z-50 max-h-48 overflow-y-auto border ${
            isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}
        >
          {results.map((r) => (
            <button
              key={`${r.symbol}-${r.exchange}`}
              onClick={() => handleSelect(r)}
              className={`w-full text-left px-2 py-1.5 flex items-center gap-2 text-xs ${
                isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
            >
              <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{r.symbol}</span>
              <span className={`truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{r.name}</span>
              <span className="ml-auto text-gray-500 text-[10px]">{r.exchange}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Context menu ---------- */
interface ContextMenuState {
  x: number;
  y: number;
  symbol: string;
}

function ContextMenu({
  menu,
  groups,
  isDark,
  onClose,
  onRemove,
  onMoveToGroup,
}: {
  menu: ContextMenuState;
  groups: WatchlistGroup[];
  isDark: boolean;
  onClose: () => void;
  onRemove: (symbol: string) => void;
  onMoveToGroup: (symbol: string, groupId: string | null) => void;
}) {
  const t = useTranslation();
  const [showGroupSubmenu, setShowGroupSubmenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const menuItemCls = `w-full text-left px-3 py-1.5 text-xs ${
    isDark ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-100 text-gray-700'
  }`;

  return (
    <div
      ref={menuRef}
      className={`fixed z-[100] rounded shadow-lg border py-1 min-w-[160px] ${
        isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}
      style={{ left: menu.x, top: menu.y }}
    >
      {/* Move to Group */}
      <div
        className="relative"
        onMouseEnter={() => setShowGroupSubmenu(true)}
        onMouseLeave={() => setShowGroupSubmenu(false)}
      >
        <button className={menuItemCls}>
          {t.moveToGroup} &rsaquo;
        </button>
        {showGroupSubmenu && (
          <div
            className={`absolute left-full top-0 rounded shadow-lg border py-1 min-w-[140px] ${
              isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}
          >
            <button
              className={menuItemCls}
              onClick={() => {
                onMoveToGroup(menu.symbol, null);
                onClose();
              }}
            >
              {t.ungrouped}
            </button>
            {groups.map((g) => (
              <button
                key={g.id}
                className={menuItemCls}
                onClick={() => {
                  onMoveToGroup(menu.symbol, g.id);
                  onClose();
                }}
              >
                {g.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Remove */}
      <button
        className={menuItemCls}
        onClick={() => {
          onRemove(menu.symbol);
          onClose();
        }}
      >
        {t.remove}
      </button>

      {/* Set Alert (placeholder) */}
      <button
        className={`${menuItemCls} opacity-50 cursor-default`}
        onClick={onClose}
      >
        Set Alert
      </button>
    </div>
  );
}

/* ---------- Format helpers ---------- */
function formatPrice(price: number): string {
  if (price < 1) return price.toFixed(6);
  if (price < 100) return price.toFixed(4);
  return price.toFixed(2);
}

function formatVolume(vol: number): string {
  if (vol >= 1e9) return (vol / 1e9).toFixed(1) + 'B';
  if (vol >= 1e6) return (vol / 1e6).toFixed(1) + 'M';
  if (vol >= 1e3) return (vol / 1e3).toFixed(1) + 'K';
  return vol.toFixed(0);
}

/* ---------- Watchlist item row ---------- */
function WatchlistRow({
  item,
  isDark,
  isActive,
  volume24h,
  onSelect,
  onContextMenu,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  item: WatchlistItem;
  isDark: boolean;
  isActive: boolean;
  volume24h?: number;
  onSelect: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  draggable: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  const isPositive = (item.changePercent ?? 0) >= 0;
  const bgGradient =
    item.price != null
      ? isPositive
        ? 'linear-gradient(90deg, rgba(34,197,94,0.08) 0%, transparent 100%)'
        : 'linear-gradient(90deg, rgba(239,68,68,0.08) 0%, transparent 100%)'
      : undefined;

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onClick={onSelect}
      onContextMenu={onContextMenu}
      role="button"
      className={`w-full text-left px-3 py-1.5 transition-colors group flex items-center cursor-pointer ${
        isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
      } ${isActive ? (isDark ? 'bg-gray-800/50' : 'bg-blue-50') : ''}`}
      style={{ background: bgGradient }}
    >
      {/* Symbol info */}
      <div className="min-w-0 flex-1">
        <div className={`text-xs font-medium truncate ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
          {item.symbol}
        </div>
        <div className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{item.name}</div>
        {volume24h != null && (
          <div className={`text-[9px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
            Vol: {formatVolume(volume24h)}
          </div>
        )}
      </div>

      {/* Sparkline */}
      {item.sparklineData && item.sparklineData.length > 1 && (
        <Sparkline data={item.sparklineData} positive={isPositive} />
      )}

      {/* Price / change */}
      <div className="text-right flex-shrink-0 ml-2">
        {item.price != null && (
          <>
            <div className={`text-xs font-mono ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
              {formatPrice(item.price)}
            </div>
            <div
              className={`text-[10px] font-mono ${
                isPositive ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {isPositive ? '+' : ''}
              {(item.changePercent ?? 0).toFixed(2)}%
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- Group header ---------- */
function GroupHeader({
  group,
  itemCount,
  isDark,
  onToggle,
  onRename,
  onDelete,
}: {
  group: WatchlistGroup;
  itemCount: number;
  isDark: boolean;
  onToggle: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const t = useTranslation();

  return (
    <div
      className={`flex items-center px-3 py-1.5 cursor-pointer select-none ${
        isDark ? 'bg-gray-850 hover:bg-gray-800' : 'bg-gray-100 hover:bg-gray-150'
      }`}
      onClick={onToggle}
    >
      {/* Chevron */}
      <svg
        className={`w-3 h-3 mr-1.5 transition-transform ${
          group.collapsed ? '' : 'rotate-90'
        } ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 18l6-6-6-6" />
      </svg>

      <span className={`text-xs font-semibold flex-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
        {group.name}
      </span>
      <span className={`text-[10px] mr-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
        {itemCount}
      </span>

      {/* Group actions (only for non-default groups) */}
      {group.id !== 'default' && (
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRename();
            }}
            className={`text-[10px] px-1 rounded ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}
            title={t.renameGroup}
          >
            &#9998;
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className={`text-[10px] px-1 rounded hover:text-red-400 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
            title={t.deleteGroup}
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------- Main WatchlistPanel ---------- */
export function WatchlistPanel() {
  const items = useWatchlistStore((s) => s.items);
  const groups = useWatchlistStore((s) => s.groups);
  const updatePrice = useWatchlistStore((s) => s.updatePrice);
  const removeItem = useWatchlistStore((s) => s.removeItem);
  const moveItem = useWatchlistStore((s) => s.moveItem);
  const setSparklineData = useWatchlistStore((s) => s.setSparklineData);
  const sortBy = useWatchlistStore((s) => s.sortBy);
  const addGroup = useWatchlistStore((s) => s.addGroup);
  const removeGroup = useWatchlistStore((s) => s.removeGroup);
  const renameGroup = useWatchlistStore((s) => s.renameGroup);
  const toggleGroupCollapse = useWatchlistStore((s) => s.toggleGroupCollapse);
  const moveItemToGroup = useWatchlistStore((s) => s.moveItemToGroup);
  const setSymbol = useChartStore((s) => s.setSymbol);
  const currentSymbol = useChartStore((s) => s.symbol);
  const isDark = useThemeStore((s) => s.theme) === 'dark';
  const t = useTranslation();

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Context menu
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // Volume data
  const [volumes, setVolumes] = useState<Record<string, number>>({});

  // Drag state
  const [dragSymbol, setDragSymbol] = useState<string | null>(null);

  // Rename state
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Subscribe to mini tickers for all watchlist symbols
  useEffect(() => {
    if (items.length === 0) return;
    const ws = new WebSocket('wss://stream.binance.com:9443/ws/!miniTicker@arr');
    const symbolSet = new Set(items.map((i) => i.symbol));

    ws.onmessage = (event) => {
      const tickers = JSON.parse(event.data);
      const newVolumes: Record<string, number> = {};
      for (const ticker of tickers) {
        if (!symbolSet.has(ticker.s)) continue;
        const price = Number(ticker.c);
        const open = Number(ticker.o);
        const change = price - open;
        const changePercent = open > 0 ? (change / open) * 100 : 0;
        updatePrice(ticker.s, price, change, changePercent);
        // ticker.q = quote volume (24h)
        if (ticker.q) {
          newVolumes[ticker.s] = Number(ticker.q);
        }
      }
      if (Object.keys(newVolumes).length > 0) {
        setVolumes((prev) => ({ ...prev, ...newVolumes }));
      }
    };

    ws.onerror = () => {};
    return () => ws.close();
  }, [items, updatePrice]);

  // Fetch sparkline data
  const sparklineLoaded = useRef(new Set<string>());
  useEffect(() => {
    for (const item of items) {
      if (sparklineLoaded.current.has(item.symbol)) continue;
      sparklineLoaded.current.add(item.symbol);
      dataManager
        .fetchHistorical(item.symbol, '1h', 48)
        .then((bars) => {
          const closes = bars.slice(-24).map((b) => b.close);
          setSparklineData(item.symbol, closes);
        })
        .catch(() => {});
    }
  }, [items, setSparklineData]);

  // Filter items by search
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      (i) => i.symbol.toLowerCase().includes(q) || i.name.toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  // Sort items
  const sortedItems = useMemo(() => {
    if (sortBy === 'none') return filteredItems;
    const sorted = [...filteredItems];
    switch (sortBy) {
      case 'name':
        sorted.sort((a, b) => a.symbol.localeCompare(b.symbol));
        break;
      case 'price':
        sorted.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
        break;
      case 'change':
        sorted.sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0));
        break;
    }
    return sorted;
  }, [filteredItems, sortBy]);

  // Group items
  const groupedItems = useMemo(() => {
    const map = new Map<string | null, WatchlistItem[]>();
    for (const group of groups) {
      map.set(group.id, []);
    }
    map.set(null, []); // ungrouped
    for (const item of sortedItems) {
      const gid = item.groupId ?? null;
      const list = map.get(gid);
      if (list) {
        list.push(item);
      } else {
        // group was deleted, put in ungrouped
        map.get(null)!.push(item);
      }
    }
    return map;
  }, [sortedItems, groups]);

  // Context menu handlers
  const handleContextMenu = useCallback((e: React.MouseEvent, symbol: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, symbol });
  }, []);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  // Drag handlers
  const handleDragStart = useCallback(
    (e: React.DragEvent, symbol: string) => {
      if (sortBy !== 'none') return;
      setDragSymbol(symbol);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', symbol);
    },
    [sortBy]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetSymbol: string) => {
      e.preventDefault();
      if (dragSymbol && dragSymbol !== targetSymbol && sortBy === 'none') {
        const fromIndex = items.findIndex((i) => i.symbol === dragSymbol);
        const toIndex = items.findIndex((i) => i.symbol === targetSymbol);
        if (fromIndex !== -1 && toIndex !== -1) {
          moveItem(fromIndex, toIndex);
          // Also move to same group as target
          const targetItem = items[toIndex];
          if (targetItem) {
            moveItemToGroup(dragSymbol, targetItem.groupId ?? null);
          }
        }
      }
      setDragSymbol(null);
    },
    [dragSymbol, items, moveItem, moveItemToGroup, sortBy]
  );

  const handleDropOnGroup = useCallback(
    (e: React.DragEvent, groupId: string | null) => {
      e.preventDefault();
      if (dragSymbol) {
        moveItemToGroup(dragSymbol, groupId);
      }
      setDragSymbol(null);
    },
    [dragSymbol, moveItemToGroup]
  );

  const handleDragEnd = useCallback(() => setDragSymbol(null), []);

  // Add new group
  const handleAddGroup = useCallback(() => {
    const name = prompt(t.newGroup);
    if (name && name.trim()) {
      addGroup(name.trim());
    }
  }, [addGroup, t.newGroup]);

  // Rename group
  const handleStartRename = useCallback(
    (id: string) => {
      const group = groups.find((g) => g.id === id);
      if (group) {
        setRenamingGroupId(id);
        setRenameValue(group.name);
        setTimeout(() => renameInputRef.current?.focus(), 0);
      }
    },
    [groups]
  );

  const handleFinishRename = useCallback(() => {
    if (renamingGroupId && renameValue.trim()) {
      renameGroup(renamingGroupId, renameValue.trim());
    }
    setRenamingGroupId(null);
    setRenameValue('');
  }, [renamingGroupId, renameValue, renameGroup]);

  // Render a group section
  const renderGroup = (group: WatchlistGroup | null) => {
    const isUngrouped = group === null;
    const groupId = isUngrouped ? null : group.id;
    const groupItems = groupedItems.get(groupId) ?? [];

    // Don't show empty ungrouped section
    if (isUngrouped && groupItems.length === 0) return null;

    return (
      <div
        key={groupId ?? 'ungrouped'}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDropOnGroup(e, groupId)}
      >
        {/* Group header */}
        {isUngrouped ? (
          <div
            className={`flex items-center px-3 py-1.5 ${
              isDark ? 'bg-gray-850' : 'bg-gray-100'
            }`}
          >
            <span className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {t.ungrouped}
            </span>
            <span className={`text-[10px] ml-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              {groupItems.length}
            </span>
          </div>
        ) : renamingGroupId === group.id ? (
          <div className={`flex items-center px-3 py-1 ${isDark ? 'bg-gray-850' : 'bg-gray-100'}`}>
            <input
              ref={renameInputRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleFinishRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleFinishRename();
                if (e.key === 'Escape') {
                  setRenamingGroupId(null);
                  setRenameValue('');
                }
              }}
              className={`text-xs font-semibold flex-1 bg-transparent border-b focus:outline-none ${
                isDark ? 'text-gray-300 border-blue-500' : 'text-gray-700 border-blue-500'
              }`}
            />
          </div>
        ) : (
          <div className="group">
            <GroupHeader
              group={group}
              itemCount={groupItems.length}
              isDark={isDark}
              onToggle={() => toggleGroupCollapse(group.id)}
              onRename={() => handleStartRename(group.id)}
              onDelete={() => removeGroup(group.id)}
            />
          </div>
        )}

        {/* Group items */}
        {(!isUngrouped && group.collapsed) ? null : (
          groupItems.map((item) => (
            <WatchlistRow
              key={item.symbol}
              item={item}
              isDark={isDark}
              isActive={currentSymbol === item.symbol}
              volume24h={volumes[item.symbol]}
              onSelect={() => setSymbol(item.symbol)}
              onContextMenu={(e) => handleContextMenu(e, item.symbol)}
              draggable={sortBy === 'none'}
              onDragStart={(e) => handleDragStart(e, item.symbol)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, item.symbol)}
              onDragEnd={handleDragEnd}
            />
          ))
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search filter */}
      <PanelSearch
        query={searchQuery}
        onChange={setSearchQuery}
        isDark={isDark}
        placeholder={t.searchSymbol}
      />

      {/* Groups */}
      <div className="flex-1 overflow-y-auto">
        {groups.map((group) => renderGroup(group))}
        {renderGroup(null)}
      </div>

      {/* New group button */}
      <div className={`px-2 py-1 border-t ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
        <button
          onClick={handleAddGroup}
          className={`w-full text-xs py-1 rounded flex items-center justify-center gap-1 ${
            isDark
              ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          + {t.newGroup}
        </button>
      </div>

      {/* Add symbol */}
      <div className={`border-t ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
        <AddSymbolSearch isDark={isDark} />
      </div>

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          menu={contextMenu}
          groups={groups}
          isDark={isDark}
          onClose={closeContextMenu}
          onRemove={removeItem}
          onMoveToGroup={moveItemToGroup}
        />
      )}
    </div>
  );
}
