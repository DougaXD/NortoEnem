import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  Award,
  ChevronDown,
  ChevronUp,
  Sparkles,
  BookOpen,
  Bookmark,
  ArrowLeft
} from 'lucide-react';
import type { Question } from '../../../types';
import { KNOWLEDGE_AREAS } from '../../../config/theme';
import { resolveTaxonomyLabels } from '../../../config/academicTaxonomy';
import { Button } from '../../../components/ui/DesignSystem';
import { useAuth } from '../../../providers/AuthProvider';
import { FavoriteService } from '../../../services/favoriteService';

export interface QuestionResolverCardProps {
  question: Question;
  selectedOption: string | null;
  onSelectOption: (optionId: string) => void;
  isAnswered: boolean;
  isSubmitting: boolean;
  validationError: string | null;
  onSubmit: () => void;
  onNext: () => void;
  isLastQuestion: boolean;
  onBack?: () => void;
}

export const QuestionResolverCard: React.FC<QuestionResolverCardProps> = ({
  question,
  selectedOption,
  onSelectOption,
  isAnswered,
  isSubmitting,
  validationError,
  onSubmit,
  onNext,
  isLastQuestion,
  onBack
}) => {
  const { user } = useAuth();
  const [showSolution, setShowSolution] = useState<boolean>(false);
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

  const handleToggleFavorite = async () => {
    if (!user?.uid) return;
    try {
      const newState = await FavoriteService.toggleFavorite(user.uid, question.id);
      setIsFavorited(newState);
    } catch (err) {
      console.error('Erro ao alternar favorito na prática:', err);
    }
  };

  // Metadados pedagógicos
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

  const correctOptionId = (question.correctOptionId || question.correctAnswer || '').toUpperCase();
  const isSelectedCorrect = selectedOption?.toUpperCase() === correctOptionId;

  return (
    <article
      id={`practice-question-${question.id}`}
      className="w-full bg-[#111827] border border-slate-800 rounded-3xl p-5 sm:p-7 lg:p-9 shadow-lg space-y-6"
    >
      {/* 1. Contexto Pedagógico / Tags */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-4 border-b border-slate-800/80">
        <div className="flex flex-wrap items-center gap-2">
          {/* Badge Área */}
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${areaConfig.bgBadge}`}
          >
            {areaConfig.shortName}
          </span>

          {/* Disciplina e Tópico */}
          <span className="text-xs font-semibold text-slate-300">
            {subjectName}
          </span>
          <span className="text-xs text-slate-500">•</span>
          <span className="text-xs text-slate-400">
            {topicName}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Dificuldade */}
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${difficultyConfig.badgeClass}`}
          >
            {difficultyConfig.label}
          </span>

          {/* Fonte / Ano */}
          {(question.source || question.year || question.sourceYear) && (
            <span className="text-xs font-mono text-slate-400 px-2 py-0.5 rounded-md bg-slate-800/70 border border-slate-700/60">
              {question.source ? `${question.source} ` : 'ENEM '}
              {question.year || question.sourceYear || ''}
            </span>
          )}

          {/* Botão de Favoritar */}
          <button
            type="button"
            onClick={handleToggleFavorite}
            aria-label={isFavorited ? 'Remover dos favoritos' : 'Salvar questão nos favoritos'}
            title={isFavorited ? 'Salva nos favoritos' : 'Adicionar aos favoritos'}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
              isFavorited
                ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                : 'text-slate-400 hover:text-amber-400 bg-slate-800/80 border-slate-700/60'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isFavorited ? 'fill-amber-400' : ''}`} />
            <span className="hidden sm:inline">{isFavorited ? 'Salva' : 'Favoritar'}</span>
          </button>
        </div>
      </div>

      {/* 2. Enunciado da Questão */}
      <div className="space-y-4">
        {question.context && (
          <div className="p-4 rounded-xl bg-[#0B0F19] border border-slate-800 text-sm text-slate-300 italic leading-relaxed">
            {question.context}
          </div>
        )}

        <div className="text-base sm:text-lg text-slate-100 font-normal leading-relaxed whitespace-pre-line">
          {question.statement}
        </div>

        {/* 3. Imagem da Questão (quando houver) */}
        {question.image && (
          <div className="my-4 p-2 sm:p-3 rounded-2xl bg-[#0B0F19] border border-slate-800 flex justify-center items-center overflow-hidden">
            <img
              src={question.image}
              alt="Figura de apoio para a questão"
              referrerPolicy="no-referrer"
              className="max-h-80 w-auto object-contain rounded-xl"
              loading="lazy"
            />
          </div>
        )}
      </div>

      {/* 4. Lista de Alternativas Interativas */}
      <div
        role="radiogroup"
        aria-label="Alternativas da questão"
        className="space-y-3 pt-2"
      >
        {question.options.map((option) => {
          const optionId = option.id.toUpperCase();
          const isChosen = selectedOption?.toUpperCase() === optionId;
          const isTheCorrect = optionId === correctOptionId;

          // Estados visuais
          let containerStyle = 'bg-[#131B2E] border-slate-800 text-slate-200 hover:border-slate-700 hover:bg-[#16223B] cursor-pointer';
          let letterBadgeStyle = 'bg-slate-800 text-slate-300 border-slate-700';
          let stateIcon: React.ReactNode = null;

          if (!isAnswered) {
            // Antes de responder: opção selecionada vs não selecionada
            if (isChosen) {
              containerStyle = 'bg-blue-950/40 border-blue-500 text-blue-100 ring-2 ring-blue-500/30 cursor-pointer';
              letterBadgeStyle = 'bg-blue-600 text-white border-blue-400 font-bold';
            }
          } else {
            // Após responder: feedback visual completo
            if (isChosen && isTheCorrect) {
              // Acertou
              containerStyle = 'bg-emerald-950/40 border-emerald-500 text-emerald-100 ring-2 ring-emerald-500/30';
              letterBadgeStyle = 'bg-emerald-600 text-white border-emerald-400 font-bold';
              stateIcon = <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 ml-2" />;
            } else if (isChosen && !isTheCorrect) {
              // Errou a escolhida
              containerStyle = 'bg-rose-950/40 border-rose-500 text-rose-100 ring-2 ring-rose-500/30';
              letterBadgeStyle = 'bg-rose-600 text-white border-rose-400 font-bold';
              stateIcon = <XCircle className="w-5 h-5 text-rose-400 shrink-0 ml-2" />;
            } else if (!isChosen && isTheCorrect) {
              // O gabarito correto destacado para aprendizado
              containerStyle = 'bg-emerald-950/20 border-emerald-500/60 text-emerald-200 border-dashed';
              letterBadgeStyle = 'bg-emerald-600/60 text-emerald-100 border-emerald-500';
              stateIcon = (
                <span className="text-xs font-semibold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 shrink-0 ml-2">
                  Gabarito
                </span>
              );
            } else {
              // Opções neutras desativadas
              containerStyle = 'bg-[#0E1524]/60 border-slate-800/60 text-slate-500 opacity-60';
              letterBadgeStyle = 'bg-slate-800/60 text-slate-500 border-slate-800';
            }
          }

          return (
            <div
              key={option.id}
              role="radio"
              aria-checked={isChosen}
              tabIndex={isAnswered ? -1 : 0}
              onClick={() => {
                if (!isAnswered && !isSubmitting) {
                  onSelectOption(option.id);
                }
              }}
              onKeyDown={(e) => {
                if (!isAnswered && !isSubmitting && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onSelectOption(option.id);
                }
              }}
              className={`group flex items-start justify-between p-4 sm:p-4.5 rounded-2xl border transition-all duration-200 ${containerStyle} focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
            >
              <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
                {/* Letra da Alternativa */}
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center text-xs sm:text-sm font-semibold border shrink-0 transition-colors ${letterBadgeStyle}`}
                >
                  {option.id}
                </div>

                {/* Texto da Alternativa */}
                <div className="text-sm sm:text-base leading-relaxed pt-0.5 break-words flex-1">
                  {option.text}
                </div>
              </div>

              {/* Ícone de status (se respondido) */}
              {stateIcon}
            </div>
          );
        })}
      </div>

      {/* 5. Alerta de Validação (se tentar responder sem selecionar) */}
      {validationError && !isAnswered && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs sm:text-sm flex items-center gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* 6. Ação de Responder (antes do envio) */}
      {!isAnswered && (
        <div className="pt-2 flex justify-end">
          <Button
            variant="primary"
            size="lg"
            onClick={onSubmit}
            loading={isSubmitting}
            className="w-full sm:w-auto font-semibold px-8"
          >
            {isSubmitting ? 'Corrigindo resposta...' : 'Responder'}
          </Button>
        </div>
      )}

      {/* 7. Feedback Pedagógico (após o envio) */}
      {isAnswered && (
        <div className="space-y-4 pt-4 border-t border-slate-800 animate-in fade-in duration-300">
          {/* Card de Acerto ou Erro */}
          <div
            className={`p-5 sm:p-6 rounded-2xl border ${
              isSelectedCorrect
                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-100'
                : 'bg-rose-950/20 border-rose-500/30 text-rose-100'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  isSelectedCorrect
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-rose-500/20 text-rose-400'
                }`}
              >
                {isSelectedCorrect ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <XCircle className="w-5 h-5" />
                )}
              </div>

              <div>
                <h4 className="text-base font-bold text-white">
                  {isSelectedCorrect ? 'Você acertou!' : 'Dessa vez não.'}
                </h4>
                <p className="text-xs text-slate-300">
                  {isSelectedCorrect
                    ? 'Excelente raciocínio. Continue assim!'
                    : `A alternativa correta é a letra ${correctOptionId}.`}
                </p>
              </div>
            </div>

            {/* Explicação Pedagógica */}
            {question.explanation && (
              <div className="mt-4 pt-3 border-t border-slate-700/50">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Por que essa resposta está correta?
                </span>
                <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                  {question.explanation}
                </p>
              </div>
            )}
          </div>

          {/* Resolução Passo a Passo (Accordion opcional) */}
          {question.solution && question.solution !== question.explanation && (
            <div className="rounded-2xl border border-slate-800 bg-[#0E1524] overflow-hidden">
              <button
                type="button"
                onClick={() => setShowSolution(!showSolution)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-800/40 transition-colors"
                aria-expanded={showSolution}
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                  <BookOpen className="w-4 h-4 text-blue-400" />
                  <span>Ver resolução detalhada passo a passo</span>
                </div>
                {showSolution ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {showSolution && (
                <div className="p-4 sm:p-5 border-t border-slate-800 text-sm text-slate-300 leading-relaxed whitespace-pre-line bg-[#0B0F19]/60">
                  {question.solution}
                </div>
              )}
            </div>
          )}

          {/* 8. Botões de Avanço: Retornar ou Avançar/Finalizar */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-3">
            {onBack ? (
              <Button
                variant="secondary"
                size="md"
                onClick={onBack}
                icon={<ArrowLeft className="w-4 h-4" />}
                className="w-full sm:w-auto font-medium"
              >
                Voltar ao Banco
              </Button>
            ) : <div />}

            <Button
              variant="primary"
              size="lg"
              onClick={onNext}
              icon={isLastQuestion ? <Award className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
              className="w-full sm:w-auto font-semibold px-8"
            >
              {isLastQuestion ? 'Finalizar Prática' : 'Próxima Questão'}
            </Button>
          </div>
        </div>
      )}
    </article>
  );
};
