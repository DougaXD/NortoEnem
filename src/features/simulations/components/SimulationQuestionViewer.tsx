import React from 'react';
import {
  Flag,
  ArrowLeft,
  ArrowRight,
  Check,
  FileCheck,
  RotateCcw
} from 'lucide-react';
import type { Question } from '../../../types';
import { KNOWLEDGE_AREAS } from '../../../config/theme';
import { resolveTaxonomyLabels } from '../../../config/academicTaxonomy';
import { Button } from '../../../components/ui/DesignSystem';

export interface SimulationQuestionViewerProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  selectedOption: string | null;
  isMarkedForReview: boolean;
  onSelectOption: (optionId: string) => void;
  onClearOption: () => void;
  onToggleReview: () => void;
  onNextQuestion: () => void;
  onPrevQuestion: () => void;
  isFirstQuestion: boolean;
  isLastQuestion: boolean;
  onFinish: () => void;
}

export const SimulationQuestionViewer: React.FC<SimulationQuestionViewerProps> = ({
  question,
  questionNumber,
  totalQuestions,
  selectedOption,
  isMarkedForReview,
  onSelectOption,
  onClearOption,
  onToggleReview,
  onNextQuestion,
  onPrevQuestion,
  isFirstQuestion,
  isLastQuestion,
  onFinish
}) => {
  // Configurações de Taxonomia e Metadados
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
      id={`simulation-question-card-${question.id}`}
      aria-label={`Questão ${questionNumber} de ${totalQuestions}`}
      className="w-full max-w-4xl mx-auto bg-[#111827] border border-slate-800 rounded-2xl p-4 sm:p-7 shadow-xl flex flex-col gap-6"
    >
      {/* 1. Barra de Metadados e Controle de Revisão */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div className="flex flex-wrap items-center gap-2">
          {/* Número da questão em destaque */}
          <span className="text-xs sm:text-sm font-mono font-bold text-white bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
            #{questionNumber}
          </span>

          {/* Área do Conhecimento */}
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${areaConfig.bgBadge}`}
          >
            {areaConfig.name}
          </span>

          {/* Disciplina e Tópico */}
          <span className="hidden md:inline text-xs text-slate-300">
            {subjectName} • {topicName}
          </span>

          {/* Nível de Dificuldade */}
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${difficultyConfig.badgeClass}`}
          >
            {difficultyConfig.label}
          </span>

          {/* Fonte / Ano */}
          {(question.source || question.year || question.sourceYear) && (
            <span className="text-xs font-mono text-slate-400 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
              {question.source ? `${question.source} ` : 'ENEM '}
              {question.year || question.sourceYear || ''}
            </span>
          )}
        </div>

        {/* Botão de Marcar para Revisão */}
        <button
          type="button"
          id="simulation-btn-toggle-review"
          onClick={onToggleReview}
          aria-pressed={isMarkedForReview}
          aria-label={isMarkedForReview ? 'Remover marcação de revisão' : 'Marcar questão para revisar depois'}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
            isMarkedForReview
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-500/10'
              : 'bg-slate-800/80 text-slate-400 hover:text-amber-300 hover:bg-slate-800 border-slate-700/60'
          }`}
        >
          <Flag className={`w-3.5 h-3.5 ${isMarkedForReview ? 'fill-amber-400 text-amber-400' : ''}`} />
          <span>{isMarkedForReview ? 'Marcada para revisão' : 'Marcar para revisão'}</span>
        </button>
      </div>

      {/* 2. Enunciado e Contexto da Questão */}
      <div className="space-y-4">
        {question.context && (
          <div className="p-4 rounded-xl bg-[#0B0F19] border border-slate-800/90 text-sm text-slate-300 italic leading-relaxed whitespace-pre-line">
            {question.context}
          </div>
        )}

        <div className="text-base sm:text-lg text-slate-100 font-normal leading-relaxed whitespace-pre-line">
          {question.statement}
        </div>

        {/* 3. Imagem de Apoio (se houver) */}
        {question.image && (
          <div className="my-4 p-3 rounded-2xl bg-[#0B0F19] border border-slate-800 flex justify-center items-center overflow-hidden">
            <img
              src={question.image}
              alt="Figura de apoio para a questão"
              referrerPolicy="no-referrer"
              className="max-h-84 w-auto object-contain rounded-xl"
              loading="lazy"
            />
          </div>
        )}
      </div>

      {/* 4. Lista de Alternativas Oficiais (Modo Simulado) */}
      <div
        role="radiogroup"
        aria-label={`Alternativas para a questão ${questionNumber}`}
        className="space-y-3 pt-2"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Selecione uma alternativa:
          </span>
          {selectedOption && (
            <button
              type="button"
              id="simulation-btn-clear-answer"
              onClick={onClearOption}
              className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
              title="Desmarcar alternativa desta questão"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Limpar resposta</span>
            </button>
          )}
        </div>

        {question.options.map((option) => {
          const optionId = option.id.toUpperCase();
          const isSelected = selectedOption?.toUpperCase() === optionId;

          return (
            <div
              key={option.id}
              id={`simulation-option-${optionId}`}
              role="radio"
              tabIndex={0}
              aria-checked={isSelected}
              onClick={() => onSelectOption(optionId)}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  onSelectOption(optionId);
                }
              }}
              className={`flex items-start gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-xl border text-sm sm:text-base transition-all select-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                isSelected
                  ? 'bg-blue-950/40 border-blue-500 text-blue-100 ring-1 ring-blue-500/40 shadow-sm'
                  : 'bg-[#131B2E] border-slate-800 text-slate-200 hover:border-slate-700 hover:bg-[#16223B]'
              }`}
            >
              {/* Letra da Alternativa */}
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs sm:text-sm shrink-0 transition-colors ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}
              >
                {optionId}
              </div>

              {/* Texto da Alternativa */}
              <div className="flex-1 pt-0.5 leading-relaxed text-slate-200">
                {option.text}
              </div>

              {/* Indicador de Seleção */}
              {isSelected && (
                <div className="shrink-0 pt-1 text-blue-400">
                  <Check className="w-5 h-5" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 5. Rodapé de Navegação da Prova */}
      <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        <Button
          id="simulation-btn-prev"
          variant="secondary"
          size="md"
          onClick={onPrevQuestion}
          disabled={isFirstQuestion}
          className="border-slate-700 hover:bg-slate-800 disabled:opacity-30"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          <span>Anterior</span>
        </Button>

        <div className="text-xs font-mono text-slate-400 hidden sm:block">
          Atalhos: 1-5 ou A-E para escolher • ← → para navegar
        </div>

        {isLastQuestion ? (
          <Button
            id="simulation-btn-review-finish"
            variant="primary"
            size="md"
            onClick={onFinish}
            className="!bg-emerald-600 hover:!bg-emerald-500 !border-emerald-500 font-semibold shadow-md"
          >
            <span>Revisar e Finalizar</span>
            <FileCheck className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button
            id="simulation-btn-next"
            variant="primary"
            size="md"
            onClick={onNextQuestion}
          >
            <span>Próxima</span>
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </article>
  );
};
