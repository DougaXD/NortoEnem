import React, { useState, useEffect } from 'react';
import { ArrowRight, BookOpen, Bookmark } from 'lucide-react';
import type { Question } from '../../../types';
import { KNOWLEDGE_AREAS } from '../../../config/theme';
import { resolveTaxonomyLabels } from '../../../config/academicTaxonomy';
import { useAuth } from '../../../providers/AuthProvider';
import { FavoriteService } from '../../../services/favoriteService';

export interface QuestionCardProps {
  question: Question;
  onSelect: (questionId: string) => void;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({ question, onSelect }) => {
  const { user } = useAuth();
  const [isFavorited, setIsFavorited] = useState<boolean>(false);

  useEffect(() => {
    if (!user?.uid) return;
    setIsFavorited(FavoriteService.isFavorited(user.uid, question.id));

    const onFavChanged = (e: any) => {
      if (e.detail?.questionId === question.id) {
        setIsFavorited(!!e.detail.isFavorited);
      }
    };
    window.addEventListener('norto:favorite_changed', onFavChanged);
    return () => window.removeEventListener('norto:favorite_changed', onFavChanged);
  }, [user?.uid, question.id]);

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user?.uid) return;
    try {
      const newState = await FavoriteService.toggleFavorite(user.uid, question.id);
      setIsFavorited(newState);
    } catch (err) {
      console.error('Erro ao alternar favorito no card:', err);
    }
  };

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
      id={`question-card-${question.id}`}
      onClick={() => onSelect(question.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(question.id);
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Visualizar questão de ${subjectName} sobre ${topicName}`}
      className="group relative flex flex-col justify-between p-5 sm:p-6 rounded-2xl bg-[#111827] border border-slate-800 hover:border-blue-500/50 hover:bg-[#131E35] transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md hover:shadow-black/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
    >
      <div>
        {/* Metadados Superiores */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Área do Conhecimento */}
            <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-lg border ${areaConfig.bgBadge}`}>
              {areaConfig.shortName}
            </span>

            {/* Dificuldade */}
            <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-lg border ${difficultyConfig.badgeClass}`}>
              {difficultyConfig.label}
            </span>

            {/* Selo Demo */}
            {question.source === 'demo' && (
              <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-400 border border-slate-700/60">
                Demo
              </span>
            )}
          </div>

          {/* Botão de Favoritar + ID Discreto */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleFavorite}
              aria-label={isFavorited ? 'Remover dos favoritos' : 'Salvar questão nos favoritos'}
              title={isFavorited ? 'Salva nos favoritos' : 'Adicionar aos favoritos'}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isFavorited
                  ? 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
                  : 'text-slate-500 hover:text-amber-400 hover:bg-slate-800'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isFavorited ? 'fill-amber-400' : ''}`} />
            </button>

            <span className="text-xs font-mono text-slate-500">
              #{question.id}
            </span>
          </div>
        </div>

        {/* Hierarquia Taxonômica (Disciplina e Assunto) */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-3 font-medium">
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
          <span>{question.options?.length || 5} alternativas</span>
        </div>

        <div className="inline-flex items-center gap-1 text-xs font-semibold text-blue-400 group-hover:text-blue-300 transition-colors">
          <span>Resolver questão</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </article>
  );
};
