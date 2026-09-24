import React from 'react';
import { Clock, FileText, CheckCircle2, Play, ArrowRight, AlertCircle } from 'lucide-react';
import type { Simulation, SimulationSession } from '../../../types';
import { KNOWLEDGE_AREAS } from '../../../config/theme';
import { Badge } from '../../../components/ui/DesignSystem';

export interface SimulationCardProps {
  simulation: Simulation;
  activeSession?: SimulationSession | null;
  onSelect: (simulationId: string) => void;
  onStartOrResume?: (simulationId: string, hasActiveSession: boolean) => void;
}

/**
 * Formata segundos para formato legível (ex: "60 min", "1h 30min", "5h")
 */
export const formatSimulationDuration = (seconds?: number): string => {
  if (!seconds || seconds <= 0) return 'Sem tempo limite';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}min`;
};

/**
 * Mapeia tipo técnico para rótulo amigável em português
 */
export const formatSimulationType = (type: Simulation['type']): string => {
  switch (type) {
    case 'full':
      return 'Simulado Completo';
    case 'area':
      return 'Por Área';
    case 'custom':
      return 'Personalizado';
    default:
      return 'Simulado';
  }
};

export const SimulationCard: React.FC<SimulationCardProps> = ({
  simulation,
  activeSession,
  onSelect,
  onStartOrResume
}) => {
  const hasActiveSession = Boolean(activeSession && activeSession.status === 'in_progress');
  const isCompleted = activeSession?.status === 'completed';

  const answeredCount = activeSession?.answeredQuestions ?? 0;
  const totalCount = activeSession?.totalQuestions || simulation.questionCount || simulation.questionIds.length;
  const progressPercent = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onStartOrResume) {
      onStartOrResume(simulation.id, hasActiveSession);
    } else {
      onSelect(simulation.id);
    }
  };

  return (
    <div
      onClick={() => onSelect(simulation.id)}
      className={`group relative rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden ${
        hasActiveSession
          ? 'bg-[#121B2F] border-blue-500/50 hover:border-blue-400 shadow-md shadow-blue-500/10'
          : 'bg-[#111827] border-slate-800 hover:border-slate-700 hover:bg-[#131E33]'
      }`}
    >
      {/* Barra superior de destaque em caso de sessão em andamento */}
      {hasActiveSession && (
        <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-emerald-500" />
      )}

      <div className="p-5 sm:p-6 space-y-4">
        {/* Top Header: Tipo + Badges de Status */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800/90 text-slate-300 border border-slate-700/80">
            {formatSimulationType(simulation.type)}
          </span>

          {hasActiveSession ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              Em andamento
            </span>
          ) : isCompleted ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Concluído
            </span>
          ) : null}
        </div>

        {/* Título e Descrição */}
        <div className="space-y-1.5">
          <h3 className="text-base sm:text-lg font-bold text-slate-100 group-hover:text-blue-400 transition-colors line-clamp-2">
            {simulation.title}
          </h3>
          {simulation.description && (
            <p className="text-xs sm:text-sm text-slate-400 line-clamp-2 leading-relaxed">
              {simulation.description}
            </p>
          )}
        </div>

        {/* Metadados: Questões e Duração */}
        <div className="flex items-center gap-4 text-xs sm:text-sm text-slate-400 pt-1">
          <div className="flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-slate-500" />
            <span className="font-medium text-slate-300">
              {simulation.questionCount || simulation.questionIds.length} questões
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-500" />
            <span className="font-medium text-slate-300">
              {formatSimulationDuration(simulation.durationSeconds)}
            </span>
          </div>
        </div>

        {/* Áreas Abrangidas */}
        {simulation.areaIds && simulation.areaIds.length > 0 && (
          <div className="pt-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {simulation.areaIds.map((areaId) => {
                const area = KNOWLEDGE_AREAS[areaId as keyof typeof KNOWLEDGE_AREAS];
                if (!area) return null;
                return (
                  <span
                    key={areaId}
                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${area.bgBadge}`}
                  >
                    {area.shortName}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Barra de Progresso quando há sessão ativa */}
        {hasActiveSession && (
          <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Progresso atual</span>
              <span className="text-blue-400 font-semibold">
                {answeredCount} de {totalCount} questões
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer com Ação */}
      <div className="px-5 py-3.5 sm:px-6 bg-[#0E1524] border-t border-slate-800/80 flex items-center justify-between">
        <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">
          Ver detalhes e regras
        </span>

        <button
          onClick={handleActionClick}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
            hasActiveSession
              ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-600/20'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 group-hover:border-blue-500/40 group-hover:text-white'
          }`}
        >
          {hasActiveSession ? (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Continuar</span>
            </>
          ) : (
            <>
              <span>Começar</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
