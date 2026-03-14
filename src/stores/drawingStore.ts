import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Drawing, DrawingTool } from '../types/drawing';

type DrawingsMap = Record<string, Drawing[]>;

interface DrawingState {
  /** Drawings keyed by symbol */
  drawings: DrawingsMap;
  /** Currently active drawing tool (null / 'cursor' = no tool) */
  activeTool: DrawingTool;
  /** Color for next drawing */
  activeColor: string;
  /** Line width for next drawing */
  activeLineWidth: number;

  /** Currently selected drawing id */
  selectedDrawingId: string | null;

  /** Undo/redo stacks (snapshots of drawings state) */
  undoStack: DrawingsMap[];
  redoStack: DrawingsMap[];

  setActiveTool: (tool: DrawingTool) => void;
  setActiveColor: (color: string) => void;
  setActiveLineWidth: (width: number) => void;
  setSelectedDrawing: (id: string | null) => void;

  addDrawing: (symbol: string, drawing: Drawing) => void;
  removeDrawing: (symbol: string, drawingId: string) => void;
  updateDrawing: (symbol: string, drawingId: string, updates: Partial<Drawing>) => void;
  clearDrawings: (symbol: string) => void;
  getDrawingsForSymbol: (symbol: string) => Drawing[];

  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

/** Deep-clone drawings map for undo/redo snapshots */
function cloneDrawings(drawings: DrawingsMap): DrawingsMap {
  const result: DrawingsMap = {};
  for (const key of Object.keys(drawings)) {
    result[key] = drawings[key].map((d) => ({ ...d }));
  }
  return result;
}

/** Max undo history size */
const MAX_UNDO = 50;

export const useDrawingStore = create<DrawingState>()(
  persist(
    (set, get) => ({
      drawings: {},
      activeTool: 'cursor',
      activeColor: '#f59e0b',
      activeLineWidth: 1,
      selectedDrawingId: null,
      undoStack: [],
      redoStack: [],

      setActiveTool: (tool) => set({ activeTool: tool }),
      setActiveColor: (color) => set({ activeColor: color }),
      setActiveLineWidth: (width) => set({ activeLineWidth: width }),
      setSelectedDrawing: (id) => set({ selectedDrawingId: id }),

      addDrawing: (symbol, drawing) =>
        set((state) => {
          const snapshot = cloneDrawings(state.drawings);
          const undoStack = [...state.undoStack, snapshot].slice(-MAX_UNDO);
          return {
            drawings: {
              ...state.drawings,
              [symbol]: [...(state.drawings[symbol] ?? []), drawing],
            },
            undoStack,
            redoStack: [],
          };
        }),

      removeDrawing: (symbol, drawingId) =>
        set((state) => {
          const snapshot = cloneDrawings(state.drawings);
          const undoStack = [...state.undoStack, snapshot].slice(-MAX_UNDO);
          return {
            drawings: {
              ...state.drawings,
              [symbol]: (state.drawings[symbol] ?? []).filter((d) => d.id !== drawingId),
            },
            undoStack,
            redoStack: [],
            selectedDrawingId: state.selectedDrawingId === drawingId ? null : state.selectedDrawingId,
          };
        }),

      updateDrawing: (symbol, drawingId, updates) =>
        set((state) => {
          const snapshot = cloneDrawings(state.drawings);
          const undoStack = [...state.undoStack, snapshot].slice(-MAX_UNDO);
          return {
            drawings: {
              ...state.drawings,
              [symbol]: (state.drawings[symbol] ?? []).map((d) =>
                d.id === drawingId ? ({ ...d, ...updates } as Drawing) : d
              ),
            },
            undoStack,
            redoStack: [],
          };
        }),

      clearDrawings: (symbol) =>
        set((state) => {
          const snapshot = cloneDrawings(state.drawings);
          const undoStack = [...state.undoStack, snapshot].slice(-MAX_UNDO);
          return {
            drawings: {
              ...state.drawings,
              [symbol]: [],
            },
            undoStack,
            redoStack: [],
          };
        }),

      getDrawingsForSymbol: (symbol) => get().drawings[symbol] ?? [],

      undo: () =>
        set((state) => {
          if (state.undoStack.length === 0) return state;
          const newUndoStack = [...state.undoStack];
          const prevDrawings = newUndoStack.pop()!;
          return {
            undoStack: newUndoStack,
            redoStack: [...state.redoStack, cloneDrawings(state.drawings)],
            drawings: prevDrawings,
          };
        }),

      redo: () =>
        set((state) => {
          if (state.redoStack.length === 0) return state;
          const newRedoStack = [...state.redoStack];
          const nextDrawings = newRedoStack.pop()!;
          return {
            redoStack: newRedoStack,
            undoStack: [...state.undoStack, cloneDrawings(state.drawings)],
            drawings: nextDrawings,
          };
        }),

      canUndo: () => get().undoStack.length > 0,
      canRedo: () => get().redoStack.length > 0,
    }),
    {
      name: 'trading-kan-drawings',
      partialize: (state) => ({ drawings: state.drawings }),
    }
  )
);
