import React from 'react';
import { Clock, CheckCircle2, XCircle, ArrowRight, Compass } from 'lucide-react';
import type { QuestionAttempt } from '../../../types';
import { KNOWLEDGE_AREAS } from '../../../config/theme';
import { resolveTaxonomyLabels } from '../../../config/academicTaxonomy';

export interface AttemptHistoryCardProps {
  attempt: QuestionAttempt;
  onOpenQuestion: (questionId: string) => void;
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatRelativeDate(isoDate: string): string {
  if (!isoDate) return 'Data não informada';
  try {
    const d = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    const timeStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    if (diffDays === 0 && d.getDate() === now.getDate()) {
      return `Hoje, ${timeStr}`;
    }
    if (diffDays === 1 || (diffDays === 0 && d.getDate() === now.getDate() - 1)) {
      return `Ontem, ${timeStr}`;
    }

    return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} · ${timeStr}`;
  } catch {
    return isoDate;
  }
}

export const AttemptHistoryCard: React.FC<AttemptHistoryCardProps> = ({ attempt, onOpenQuestion }) => {
  const isCorrect = attempt.isCorrect ?? attempt.correct;
  const areaKey = (attempt.knowledgeArea || attempt.areaId || 'MT') as keyof typeof KNOWLEDGE_AREAS;
  const areaConfig = KNOWLEDGE_AREAS[areaKey] || {
    name: 'Geral',
    shortName: 'Geral',
    bgBadge: 'bg-slate-800 text-slate-300 border-slate-700'
  };

  const { subjectName, topicName } = resolveTaxonomyLabels(
    attempt.knowledgeArea || attempt.areaId,
    attempt.subjectId,
    attempt.topicId
  );

  const modeLabel = {
    practice: 'Prática',
    diagnostic: 'Diagnóstico',
    simulation: 'Simulado'
  }[attempt.mode || 'practice'];

  const timeSpent = attempt.timeSpentSeconds ?? attempt.timeSpent ?? 0;

  return (
    <article
      id={`attempt-card-${attempt.id}`}
      onClick={() => onOpenQuestion(attempt.questionId)}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenQuestion(attempt.questionId);
        }
      }}
      aria-label={`Tentativa da questão ${attempt.questionId}: ${isCorrect ? 'Acertou' : 'Errou'}`}
      className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 rounded-2xl bg-[#111827] border border-slate-800 hover:border-blue-500/50 hover:bg-[#131E35] transition-all duration-150 cursor-pointer shadow-sm gap-4"
    >
      {/* Informações Principais */}
      <div className="flex items-start gap-3.5">
        {/* Ícone de Resultado */}
        <div
          className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border mt-0.5 ${
            isCorrect
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          }`}
          title={isCorrect ? 'Resposta correta' : 'Resposta incorreta'}
        >
          {isCorrect ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <XCircle className="w-5 h-5" />
          )}
        </div>

        <div>
          {/* Status e Metadados */}
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-md border ${
                isCorrect
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}
            >
              {isCorrect ? '✓ Acertou' : '✗ Errou'}
            </span>

            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${areaConfig.bgBadge}`}>
              {areaConfig.shortName}
            </span>

            <span className="text-xs font-semibold text-slate-200">
              {subjectName} · {topicName}
            </span>
          </div>

          {/* Data e Identificação da Questão */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1">
            <span>{formatRelativeDate(attempt.attemptedAt)}</span>
            <span>•</span>
            <span className="font-mono text-slate-400">#{attempt.questionId}</span>
          </div>
        </div>
      </div>

      {/* Métricas e Ação */}
      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Modo */}
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/60">
            <Compass className="w-3 h-3 text-slate-400" />
            <span>{modeLabel}</span>
          </span>

          {/* Tempo */}
          <div
            className="inline-flex items-center gap-1 text-xs font-mono font-medium text-slate-300 px-2 py-0.5 rounded-md bg-[#0B0F19] border border-slate-800"
            title="Tempo gasto na tentativa"
          >
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>{formatTimer(timeSpent)}</span>
          </div>
        </div>

        {/* Seta de navegação */}
        <div className="text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all p-1">
          <ArrowRight className="w-4 h-4" />
        </div>
      </div>
    </article>
  );
};
