import React from 'react';
import { SlidersHorizontal, X, RotateCcw } from 'lucide-react';
import type { SimulationType, KnowledgeAreaId } from '../../../types';
import { KNOWLEDGE_AREAS } from '../../../config/theme';
import { Button } from '../../../components/ui/DesignSystem';

export interface SimulationFiltersState {
  type?: SimulationType;
  areaId?: KnowledgeAreaId;
  durationRange?: 'short' | 'medium' | 'long'; // short: <= 60 min, medium: <= 120 min, long: > 120 min
}

export interface SimulationFiltersProps {
  filters: SimulationFiltersState;
  onFilterChange: (filters: SimulationFiltersState) => void;
  onClearFilters: () => void;
  isMobileModal?: boolean;
  onCloseMobileModal?: () => void;
}

const TYPE_OPTIONS: { label: string; value?: SimulationType }[] = [
  { label: 'Todos os tipos', value: undefined },
  { label: 'Simulado Completo', value: 'full' },
  { label: 'Por Área', value: 'area' },
  { label: 'Personalizado', value: 'custom' },
];

const AREA_OPTIONS: { label: string; value?: KnowledgeAreaId }[] = [
  { label: 'Todas as áreas', value: undefined },
  { label: 'Matemática (MT)', value: 'MT' },
  { label: 'Ciências da Natureza (CN)', value: 'CN' },
  { label: 'Linguagens e Códigos (LC)', value: 'LC' },
  { label: 'Ciências Humanas (CH)', value: 'CH' },
];

const DURATION_OPTIONS: { label: string; value?: 'short' | 'medium' | 'long' }[] = [
  { label: 'Qualquer duração', value: undefined },
  { label: 'Até 60 min', value: 'short' },
  { label: 'Até 120 min', value: 'medium' },
  { label: 'Mais de 120 min', value: 'long' },
];

export const SimulationFilters: React.FC<SimulationFiltersProps> = ({
  filters,
  onFilterChange,
  onClearFilters,
  isMobileModal = false,
  onCloseMobileModal
}) => {
  const hasActiveFilters = Boolean(filters.type || filters.areaId || filters.durationRange);

  const activeCount = [
    filters.type,
    filters.areaId,
    filters.durationRange
  ].filter(Boolean).length;

  const content = (
    <div className="space-y-4">
      {/* Header em caso de Modal Mobile */}
      {isMobileModal && (
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-blue-400" />
            <h3 className="text-base font-bold text-slate-100">Filtros de Simulados</h3>
            {activeCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-blue-600 text-[11px] font-bold text-white flex items-center justify-center">
                {activeCount}
              </span>
            )}
          </div>
          <button
            onClick={onCloseMobileModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Grid de Controles */}
      <div className={`grid gap-3 ${isMobileModal ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-3'}`}>
        {/* Filtro: Tipo de Simulado */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Tipo de Simulado</label>
          <select
            value={filters.type || ''}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                type: (e.target.value as SimulationType) || undefined
              })
            }
            className="w-full bg-[#0E1524] border border-slate-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.label} value={opt.value || ''} className="bg-[#0B0F19] text-slate-200">
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro: Área de Conhecimento */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Área do Conhecimento</label>
          <select
            value={filters.areaId || ''}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                areaId: (e.target.value as KnowledgeAreaId) || undefined
              })
            }
            className="w-full bg-[#0E1524] border border-slate-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
          >
            {AREA_OPTIONS.map((opt) => (
              <option key={opt.label} value={opt.value || ''} className="bg-[#0B0F19] text-slate-200">
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro: Duração */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Duração</label>
          <select
            value={filters.durationRange || ''}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                durationRange: (e.target.value as 'short' | 'medium' | 'long') || undefined
              })
            }
            className="w-full bg-[#0E1524] border border-slate-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
          >
            {DURATION_OPTIONS.map((opt) => (
              <option key={opt.label} value={opt.value || ''} className="bg-[#0B0F19] text-slate-200">
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Ações / Limpar Filtros */}
      <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
        {hasActiveFilters ? (
          <button
            onClick={onClearFilters}
            className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Limpar filtros ativos ({activeCount})
          </button>
        ) : (
          <span className="text-xs text-slate-500">Filtrando simulados disponíveis</span>
        )}

        {isMobileModal && (
          <Button
            variant="primary"
            size="md"
            className="w-full mt-2"
            onClick={onCloseMobileModal}
          >
            Aplicar Filtros
          </Button>
        )}
      </div>
    </div>
  );

  if (isMobileModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
        <div className="w-full sm:max-w-lg bg-[#111827] border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#111827] border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-sm">
      {content}
    </div>
  );
};
