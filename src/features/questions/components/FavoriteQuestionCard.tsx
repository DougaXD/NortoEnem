import React from 'react';
import { Bookmark, ArrowRight, BookOpen, AlertTriangle } from 'lucide-react';
import type { Question } from '../../../types';
import { KNOWLEDGE_AREAS } from '../../../config/theme';
import { resolveTaxonomyLabels } from '../../../config/academicTaxonomy';
import { Button } from '../../../components/ui/DesignSystem';

export interface FavoriteQuestionCardProps {
  question: Question | null;
  questionId: string;
  favoritedAt?: string;
  onSelect: (questionId: string) => void;
  onToggleFavorite: (questionId: string) => void;
}

export const FavoriteQuestionCard: React.FC<FavoriteQuestionCardProps> = ({
  question,
  questionId,
  favoritedAt,
  onSelect,
  onToggleFavorite
}) => {
  // Caso a questão não exista ou tenha sido arquivada
  if (!question || question.status === 'archived') {
    return (
      <article
        id={`fav-card-${questionId}`}
        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 rounded-2xl bg-[#111827]/70 border border-slate-800 text-slate-400 gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-500">#{questionId}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400">Indisponível</span>
            </div>
            <p className="text-sm text-slate-300 font-medium mt-0.5">
              Questão indisponível para nova prática.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleFavorite(questionId)}
            className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-xs"
          >
            Remover dos Favoritos
          </Button>
        </div>
      </article>
    );
  }

  const areaKey = (question.areaId || question.knowledgeArea) as keyof typeof KNOWLEDGE_AREAS;
  const areaConfig = KNOWLEDGE_AREAS[areaKey] || {
    name: question.knowledgeArea || 'Geral',
    shortName: question.knowledgeArea || 'Geral',
    bgBadge: 'bg-slate-800 text-slate-300 border-slate-700'
  };

  const { subjectName, topicName } = resolveTaxonomyLabels(
    question.areaId || question.knowledgeArea,
    question.subjectId,
    question.topicId
  );

  const difficultyConfig = {
    easy: {
      label: 'Fácil',
      badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    },
    medium: {
      label: 'Média',
      badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    },
    hard: {
      label: 'Difícil',
      badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
    }
  }[question.difficulty || 'medium'];

  return (
    <article
      id={`fav-card-${question.id}`}
      onClick={() => onSelect(question.id)}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(question.id);
        }
      }}
      aria-label={`Visualizar questão favorita ${question.id}`}
      className="group relative flex flex-col justify-between p-5 sm:p-6 rounded-2xl bg-[#111827] border border-slate-800 hover:border-blue-500/50 hover:bg-[#131E35] transition-all duration-150 cursor-pointer shadow-sm"
    >
      <div>
        {/* Metadados Superiores */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-lg border ${areaConfig.bgBadge}`}>
              {areaConfig.shortName}
            </span>

            <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-lg border ${difficultyConfig.badgeClass}`}>
              {difficultyConfig.label}
            </span>

            {(question.source || question.year) && (
              <span className="text-[11px] font-mono text-slate-400 px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60">
                {question.source} {question.year}
              </span>
            )}
          </div>

          {/* Botão de Desfavoritar */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(question.id);
            }}
            aria-label="Remover dos favoritos"
            title="Remover dos favoritos"
            className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-rose-500/10 hover:border-rose-500/20 hover:text-rose-400 transition-colors cursor-pointer"
          >
            <Bookmark className="w-4 h-4 fill-amber-400" />
          </button>
        </div>

        {/* Hierarquia Taxonômica */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2 font-medium">
          <span className="text-slate-300">{subjectName}</span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-400 truncate">{topicName}</span>
        </div>

        {/* Trecho do Enunciado */}
        <p className="text-sm sm:text-base text-slate-200 line-clamp-3 leading-relaxed mb-4">
          {question.statement}
        </p>
      </div>

      {/* Rodapé do Card */}
      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5 text-slate-500" />
          <span className="font-mono text-slate-500">#{question.id}</span>
        </div>

        <div className="flex items-center gap-1 text-blue-400 font-semibold group-hover:translate-x-0.5 transition-transform">
          <span>Praticar Questão</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </article>
  );
};
