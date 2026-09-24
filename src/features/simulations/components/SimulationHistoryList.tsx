import React from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Layers,
  FileCheck2,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import type { SimulationResult } from '../../../types';
import {
  getClassificationLabel,
  getClassificationBadgeStyle
} from '../../../config/diagnosticConfig';
import { Button } from '../../../components/ui/DesignSystem';

export interface SimulationHistoryListProps {
  results: SimulationResult[];
  onSelectResult: (simulationId: string, sessionId: string, resultId: string) => void;
  onExploreSimulations?: () => void;
}

export const SimulationHistoryList: React.FC<SimulationHistoryListProps> = ({
  results,
  onSelectResult,
  onExploreSimulations
}) => {
  const formatTime = (totalSeconds: number): string => {
    if (!totalSeconds) return '0 min';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}min`;
    return `${minutes} min`;
  };

  const formatDate = (isoString: string): string => {
    try {
      return new Date(isoString).toLocaleString('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short'
      });
    } catch {
      return isoString;
    }
  };

  if (!results || results.length === 0) {
    return (
      <div className="bg-[#111827] border border-slate-800 rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-xl">
        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto">
          <FileCheck2 className="w-7 h-7" />
        </div>
        <div className="space-y-1 max-w-md mx-auto">
          <h3 className="text-base sm:text-lg font-bold text-white">
            Nenhum simulado concluído ainda
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Seus resultados consolidados, análises por área e gabaritos comentados aparecerão aqui
            assim que você finalizar seu primeiro simulado.
          </p>
        </div>
        {onExploreSimulations && (
          <div className="pt-2">
            <Button variant="primary" size="md" onClick={onExploreSimulations}>
              Explorar Catálogo de Simulados
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {results.map((res) => {
        const classification =
          res.percentage < 50
            ? 'attention'
            : res.percentage < 70
            ? 'developing'
            : 'mastered';

        return (
          <div
            key={res.id}
            onClick={() => onSelectResult(res.simulationId, res.sessionId, res.id)}
            className="group p-5 rounded-2xl bg-[#111827] border border-slate-800 hover:border-blue-500/50 hover:bg-[#131E33] transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm"
          >
            {/* Info Principal */}
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  {formatDate(res.completedAt)}
                </span>

                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${getClassificationBadgeStyle(
                    classification
                  )}`}
                >
                  {getClassificationLabel(classification)}
                </span>
              </div>

              <h4 className="text-sm sm:text-base font-bold text-white group-hover:text-blue-400 transition-colors">
                {res.simulationTitle || 'Simulado Concluído'}
              </h4>

              <div className="flex items-center gap-4 text-xs text-slate-400 pt-0.5">
                <span className="flex items-center gap-1 font-mono text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  {res.correctAnswers} / {res.totalQuestions} acertos
                </span>

                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  {formatTime(res.totalTimeSeconds)}
                </span>
              </div>
            </div>

            {/* Percentual e Ação */}
            <div className="flex items-center justify-between sm:justify-end gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-800">
              <div className="text-left sm:text-right">
                <div className="text-2xl sm:text-3xl font-black text-white font-mono leading-none">
                  {res.percentage}%
                </div>
                <div className="text-[11px] text-slate-400">acerto bruto</div>
              </div>

              <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <span>Ver Análise</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
