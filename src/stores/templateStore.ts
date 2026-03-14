import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { IndicatorConfig } from './indicatorStore';
import type { ChartType } from './chartStore';

export interface ChartTemplate {
  id: string;
  name: string;
  indicators: IndicatorConfig[];
  chartType: ChartType;
  timeframe: string;
}

interface TemplateState {
  templates: ChartTemplate[];
  saveTemplate: (template: Omit<ChartTemplate, 'id'>) => void;
  deleteTemplate: (id: string) => void;
  getTemplate: (id: string) => ChartTemplate | undefined;
}

let templateId = 0;

export const useTemplateStore = create<TemplateState>()(
  persist(
    (set, get) => ({
      templates: [],

      saveTemplate: (template) =>
        set((state) => ({
          templates: [
            ...state.templates,
            { ...template, id: `tmpl-${Date.now()}-${templateId++}` },
          ],
        })),

      deleteTemplate: (id) =>
        set((state) => ({
          templates: state.templates.filter((t) => t.id !== id),
        })),

      getTemplate: (id) => get().templates.find((t) => t.id === id),
    }),
    { name: 'trading-kan-templates' }
  )
);
