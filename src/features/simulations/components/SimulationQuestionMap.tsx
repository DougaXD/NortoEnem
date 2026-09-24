import React from 'react';
import {
  X,
  Check,
  Flag,
  HelpCircle,
  LayoutGrid
} from 'lucide-react';

export interface SimulationQuestionMapProps {
  totalQuestions: number;
  currentIndex: number;
  answers: Record<string, { selectedAnswer?: string | null; answered: boolean }>;
  reviewSet: Set<string>;
  questionIds: string[];
  onSelectIndex: (index: number) => void;
  onClose?: () => void;
  isDrawer?: boolean;
}

export const SimulationQuestionMap: React.FC<SimulationQuestionMapProps> = ({
  totalQuestions,
  currentIndex,
  answers,
  reviewSet,
  questionIds,
  onSelectIndex,
  onClose,
  isDrawer = false
}) => {
  // Contadores analíticos para o resumo
  let answeredCount = 0;
  questionIds.forEach((qId) => {
    if (answers[qId]?.answered && answers[qId]?.selectedAnswer) {
      answeredCount++;
    }
  });
  const reviewCount = reviewSet.size;
  const unansweredCount = totalQuestions - answeredCount;

  return (
    <aside
      id="simulation-question-map"
      aria-label="Mapa de Navegação de Questões"
      className={`bg-[#111827] border border-slate-800 rounded-2xl flex flex-col p-4 sm:p-5 ${
        isDrawer ? 'h-full max-h-[90vh] overflow-y-auto shadow-2xl' : 'w-full'
      }`}
    >
      {/* Cabeçalho do Mapa */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm sm:text-base font-semibold text-slate-100">
            Mapa de Questões
          </h2>
        </div>
        {onClose && (
          <button
            type="button"
            id="simulation-map-btn-close"
            onClick={onClose}
            aria-label="Fechar mapa de questões"
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Resumo Rápido */}
      <div className="grid grid-cols-3 gap-2 mb-4 text-center">
        <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-base sm:text-lg font-bold text-emerald-400 font-mono">
            {answeredCount}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-400">Respondidas</div>
        </div>

        <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-base sm:text-lg font-bold text-slate-300 font-mono">
            {unansweredCount}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-400">Em branco</div>
        </div>

        <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-base sm:text-lg font-bold text-amber-400 font-mono">
            {reviewCount}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-400">Revisão</div>
        </div>
      </div>

      {/* Grade Interativa das Questões */}
      <div
        className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 my-2 overflow-y-auto max-h-72 sm:max-h-96 pr-1"
        role="group"
        aria-label="Grade de questões"
      >
        {questionIds.map((qId, index) => {
          const isCurrent = index === currentIndex;
          const isAnswered = Boolean(answers[qId]?.answered && answers[qId]?.selectedAnswer);
          const isMarked = reviewSet.has(qId);
          const selectedLetter = answers[qId]?.selectedAnswer?.toUpperCase() || null;

          // Determinação da estilização do botão
          let btnClass = 'bg-[#131B2E] border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-[#1A253E]';

          if (isCurrent) {
            btnClass = 'bg-blue-600/30 border-blue-500 text-white ring-2 ring-blue-500/50 font-bold';
          } else if (isAnswered) {
            btnClass = 'bg-emerald-950/30 border-emerald-600/60 text-emerald-300 hover:bg-emerald-900/40 font-semibold';
          }

          return (
            <button
              key={qId}
              type="button"
              id={`simulation-map-item-${index + 1}`}
              onClick={() => onSelectIndex(index)}
              aria-label={`Ir para a questão ${index + 1}${isAnswered ? ', respondida' : ', em branco'}${isMarked ? ', marcada para revisão' : ''}`}
              className={`relative h-11 sm:h-12 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer select-none text-xs font-mono ${btnClass}`}
            >
              {/* Marcador de Revisão */}
              {isMarked && (
                <span
                  title="Marcada para revisão"
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-sm"
                >
                  <Flag className="w-2.5 h-2.5 fill-slate-950" />
                </span>
              )}

              {/* Número da Questão */}
              <span className="text-xs font-semibold">{String(index + 1).padStart(2, '0')}</span>

              {/* Sub-indicador de Resposta Selecionada */}
              {isAnswered && selectedLetter && (
                <span className="text-[10px] text-emerald-400 font-bold -mt-0.5">
                  ({selectedLetter})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legenda Informativa */}
      <div className="pt-4 mt-auto border-t border-slate-800 text-[11px] text-slate-400 space-y-1.5">
        <div className="font-semibold text-slate-300 mb-1">Legenda:</div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded border border-blue-500 bg-blue-600/30 ring-1 ring-blue-500/50" />
          <span>Questão atual</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded border border-emerald-600/60 bg-emerald-950/30" />
          <span>Respondida</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded border border-slate-800 bg-[#131B2E]" />
          <span>Não respondida</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full bg-amber-500 flex items-center justify-center">
            <Flag className="w-2 h-2 fill-slate-950 text-slate-950" />
          </span>
          <span>Marcada para revisão</span>
        </div>
      </div>
    </aside>
  );
};
