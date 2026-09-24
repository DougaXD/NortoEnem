import React from 'react';
import { Filter, X, RotateCcw, Check } from 'lucide-react';
import type { QuestionFilters, KnowledgeAreaId, QuestionDifficulty } from '../../../types';
import {
  getAcademicAreas,
  getSubjectsByArea,
  getTopicsBySubject
} from '../../../config/academicTaxonomy';
import { Button } from '../../../components/ui/DesignSystem';

export interface QuestionFilterPanelProps {
  filters: QuestionFilters;
  onFilterChange: (filters: QuestionFilters) => void;
  onClearFilters: () => void;
  isMobileModal?: boolean;
  onCloseMobileModal?: () => void;
}

export const QuestionFilterPanel: React.FC<QuestionFilterPanelProps> = ({
  filters,
  onFilterChange,
  onClearFilters,
  isMobileModal = false,
  onCloseMobileModal
}) => {
  const academicAreas = getAcademicAreas(false); // MT, LC, CH, CN
  const availableSubjects = filters.areaId ? getSubjectsByArea(filters.areaId) : [];
  const availableTopics = filters.subjectId ? getTopicsBySubject(filters.subjectId) : [];

  const handleAreaChange = (areaIdStr: string) => {
    const areaId = (areaIdStr || undefined) as KnowledgeAreaId | undefined;
    // Ao trocar de área, limpa disciplina e assunto incompatíveis
    onFilterChange({
      ...filters,
      areaId,
      subjectId: undefined,
      topicId: undefined
    });
  };

  const handleSubjectChange = (subjectIdStr: string) => {
    const subjectId = subjectIdStr || undefined;
    // Ao trocar de disciplina, limpa assunto incompatível
    onFilterChange({
      ...filters,
      subjectId,
      topicId: undefined
    });
  };

  const handleTopicChange = (topicIdStr: string) => {
    const topicId = topicIdStr || undefined;
    onFilterChange({
      ...filters,
      topicId
    });
  };

  const handleDifficultyChange = (diffStr: string) => {
    const difficulty = (diffStr || undefined) as QuestionDifficulty | undefined;
    onFilterChange({
      ...filters,
      difficulty
    });
  };

  const hasActiveFilters = Boolean(
    filters.areaId || filters.subjectId || filters.topicId || filters.difficulty
  );

  return (
    <div className={`flex flex-col gap-4 ${isMobileModal ? 'p-2' : ''}`}>
      {/* Título do painel */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
          <Filter className="w-4 h-4 text-blue-400" />
          <span>Filtros Pedagógicos</span>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-blue-400 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Limpar filtros</span>
          </button>
        )}
      </div>

      {/* Grid de Controles de Filtro */}
      <div className="flex flex-col gap-4">
        {/* 1. Área do Conhecimento */}
        <div>
          <label htmlFor="filter-area" className="block text-xs font-medium text-slate-300 mb-1.5">
            Área do Conhecimento
          </label>
          <select
            id="filter-area"
            value={filters.areaId || ''}
            onChange={(e) => handleAreaChange(e.target.value)}
            className="w-full h-10 px-3 text-sm bg-[#0E1524] text-slate-200 border border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all cursor-pointer"
          >
            <option value="">Todas as áreas</option>
            {academicAreas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name} ({area.shortName})
              </option>
            ))}
          </select>
        </div>

        {/* 2. Disciplina (Dependente da Área) */}
        <div>
          <label htmlFor="filter-subject" className="block text-xs font-medium text-slate-300 mb-1.5">
            Disciplina
          </label>
          <select
            id="filter-subject"
            value={filters.subjectId || ''}
            onChange={(e) => handleSubjectChange(e.target.value)}
            disabled={!filters.areaId}
            className="w-full h-10 px-3 text-sm bg-[#0E1524] text-slate-200 border border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <option value="">
              {filters.areaId ? 'Todas as disciplinas da área' : 'Selecione uma área primeiro'}
            </option>
            {availableSubjects.map((subj) => (
              <option key={subj.id} value={subj.id}>
                {subj.name}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Assunto / Tópico (Dependente da Disciplina) */}
        <div>
          <label htmlFor="filter-topic" className="block text-xs font-medium text-slate-300 mb-1.5">
            Assunto / Tópico
          </label>
          <select
            id="filter-topic"
            value={filters.topicId || ''}
            onChange={(e) => handleTopicChange(e.target.value)}
            disabled={!filters.subjectId}
            className="w-full h-10 px-3 text-sm bg-[#0E1524] text-slate-200 border border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <option value="">
              {filters.subjectId ? 'Todos os assuntos' : 'Selecione uma disciplina primeiro'}
            </option>
            {availableTopics.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.name}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Dificuldade */}
        <div>
          <label htmlFor="filter-difficulty" className="block text-xs font-medium text-slate-300 mb-1.5">
            Dificuldade
          </label>
          <select
            id="filter-difficulty"
            value={filters.difficulty || ''}
            onChange={(e) => handleDifficultyChange(e.target.value)}
            className="w-full h-10 px-3 text-sm bg-[#0E1524] text-slate-200 border border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all cursor-pointer"
          >
            <option value="">Todas as dificuldades</option>
            <option value="easy">Fácil</option>
            <option value="medium">Média</option>
            <option value="hard">Difícil</option>
          </select>
        </div>
      </div>

      {/* Botões do Modal Mobile */}
      {isMobileModal && (
        <div className="pt-4 mt-2 border-t border-slate-800 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            size="md"
            className="flex-1"
            onClick={onClearFilters}
            disabled={!hasActiveFilters}
          >
            Limpar
          </Button>

          <Button
            variant="primary"
            size="md"
            className="flex-1"
            onClick={onCloseMobileModal}
            icon={<Check className="w-4 h-4" />}
          >
            Ver Resultados
          </Button>
        </div>
      )}
    </div>
  );
};
