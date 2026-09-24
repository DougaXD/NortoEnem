import React, { useState } from 'react';
import { ArrowRight, RotateCcw, Check, Clock, AlertTriangle, BookOpen } from 'lucide-react';
import type { ErrorNotebookItem } from '../../../types';
import { KNOWLEDGE_AREAS } from '../../../config/theme';
import { resolveTaxonomyLabels } from '../../../config/academicTaxonomy';
import { ReviewStatusBadge } from './ReviewStatusBadge';
import { Button } from '../../../components/ui/DesignSystem';

export interface ErrorQuestionCardProps {
  item: ErrorNotebookItem;
  onSelect: (questionId: string) => void;
  onToggleReview: (questionId: string, currentStatus: 'not_reviewed' | 'reviewed') => Promise<void>;
}

export const ErrorQuestionCard: React.FC<ErrorQuestionCardProps> = ({
  item,
  onSelect,
  onToggleReview
}) => {
  const [updating, setUpdating] = useState<boolean>(false);

  const { question, questionId, totalAttempts, errorCount, correctCount, lastAttemptCorrect } = item;

  const areaKey = (item.knowledgeArea || question?.areaId || 'MT') as keyof typeof KNOWLEDGE_AREAS;
  const areaConfig = KNOWLEDGE_AREAS[areaKey] || {
    name: 'Geral',
    shortName: 'Geral',
    bgBadge: 'bg-slate-800 text-slate-300 border-slate-700'
  };

  const { subjectName, topicName } = resolveTaxonomyLabels(
    item.knowledgeArea || question?.areaId,
    item.subjectId || question?.subjectId,
    item.topicId || question?.topicId
  );

  const handleReviewClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (updating) return;

    setUpdating(true);
    try {
      await onToggleReview(questionId, item.reviewStatus);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <article
      id={`error-card-${questionId}`}
      onClick={() => onSelect(questionId)}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(questionId);
        }
      }}
      aria-label={`Questão do caderno de erros: ${subjectName} sobre ${topicName}`}
      className="group flex flex-col justify-between p-5 sm:p-6 rounded-2xl bg-[#111827] border border-slate-800 hover:border-blue-500/50 hover:bg-[#131E35] transition-all duration-150 cursor-pointer shadow-sm space-y-4"
    >
      <div>
        {/* Cabeçalho do Card de Erro: Metadados + Status de Revisão */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-lg border ${areaConfig.bgBadge}`}>
              {areaConfig.shortName}
            </span>

            <span className="text-xs font-semibold text-slate-300">
              {subjectName} · {topicName}
            </span>

            <span className="text-xs font-mono text-slate-500">
              #{questionId}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <ReviewStatusBadge status={item.reviewStatus} />
          </div>
        </div>

        {/* Resumo do Enunciado se disponível */}
        {question?.statement && (
          <p className="text-sm text-slate-300 line-clamp-2 leading-relaxed mb-4">
            {question.statement}
          </p>
        )}

        {/* Painel Agregado de Métricas do Erro */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-[#0B0F19] border border-slate-800/80 text-xs">
          {/* Total de Tentativas */}
          <div className="flex flex-col">
            <span className="text-slate-500 text-[11px]">Tentativas</span>
            <span className="font-semibold text-slate-200">
              {totalAttempts} {totalAttempts === 1 ? 'tentativa' : 'tentativas'}
            </span>
          </div>

          {/* Histórico de Erros / Acertos */}
          <div className="flex flex-col">
            <span className="text-slate-500 text-[11px]">Registro</span>
            <span className="font-medium text-slate-300">
              <span className="text-rose-400 font-semibold">{errorCount} {errorCount === 1 ? 'erro' : 'erros'}</span>
              {correctCount > 0 && (
                <span className="text-emerald-400 font-semibold"> · {correctCount} {correctCount === 1 ? 'acerto' : 'acertos'}</span>
              )}
            </span>
          </div>

          {/* Última Tentativa */}
          <div className="flex flex-col col-span-2 sm:col-span-1">
            <span className="text-slate-500 text-[11px]">Última tentativa</span>
            <span className={`font-semibold flex items-center gap-1 ${
              lastAttemptCorrect ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {lastAttemptCorrect ? '✓ Acertou' : '✗ Errou'}
            </span>
          </div>
        </div>
      </div>

      {/* Rodapé: Ações de Revisão e Prática */}
      <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Botão Alternar Revisão */}
        <div>
          {item.reviewStatus === 'not_reviewed' ? (
            <button
              type="button"
              onClick={handleReviewClick}
              disabled={updating}
              aria-label="Marcar questão como revisada"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Marcar como revisada</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleReviewClick}
              disabled={updating}
              aria-label="Marcar questão como não revisada"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium bg-slate-800 text-slate-300 hover:bg-slate-700/80 border border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Marcar como não revisada</span>
            </button>
          )}
        </div>

        {/* Botão Praticar Novamente */}
        <div className="flex items-center gap-1 text-blue-400 font-semibold group-hover:translate-x-0.5 transition-transform">
          <span>Praticar Novamente</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </article>
  );
};
