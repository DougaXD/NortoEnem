import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileCheck,
  Flag,
  HelpCircle,
  Clock,
  X
} from 'lucide-react';
import { Button } from '../../../components/ui/DesignSystem';

export interface SimulationFinishModalProps {
  isOpen: boolean;
  totalQuestions: number;
  answeredCount: number;
  unansweredCount: number;
  reviewCount: number;
  timeRemainingFormatted?: string | null;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const SimulationFinishModal: React.FC<SimulationFinishModalProps> = ({
  isOpen,
  totalQuestions,
  answeredCount,
  unansweredCount,
  reviewCount,
  timeRemainingFormatted,
  isSubmitting,
  errorMessage,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  const hasPendingItems = unansweredCount > 0 || reviewCount > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="finish-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-[#111827] border border-slate-800 rounded-2xl max-w-lg w-full p-5 sm:p-7 shadow-2xl space-y-6">
        {/* Erro de Submissão, se houver */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="finish-modal-title" className="text-lg font-bold text-slate-100">
                Finalizar Simulado?
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Revise seu progresso antes de concluir a avaliação.
              </p>
            </div>
          </div>
          <button
            type="button"
            id="simulation-finish-modal-close"
            onClick={onCancel}
            disabled={isSubmitting}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumo Estatístico da Prova */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
            <span className="text-xs text-slate-400 block mb-0.5">Total</span>
            <span className="text-lg font-mono font-bold text-slate-200">
              {totalQuestions}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
            <span className="text-xs text-slate-400 block mb-0.5">Respondidas</span>
            <span className="text-lg font-mono font-bold text-emerald-400">
              {answeredCount}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
            <span className="text-xs text-slate-400 block mb-0.5">Em branco</span>
            <span className="text-lg font-mono font-bold text-slate-300">
              {unansweredCount}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
            <span className="text-xs text-slate-400 block mb-0.5">Para revisão</span>
            <span className="text-lg font-mono font-bold text-amber-400">
              {reviewCount}
            </span>
          </div>
        </div>

        {timeRemainingFormatted && (
          <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
            <Clock className="w-4 h-4 text-blue-400" />
            <span>Tempo restante de prova:</span>
            <span className="font-mono font-bold text-blue-300">{timeRemainingFormatted}</span>
          </div>
        )}

        {/* Alerta de Questões Pendentes */}
        {hasPendingItems && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-300 leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-0.5">Atenção antes de finalizar:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-amber-200/90">
                {unansweredCount > 0 && (
                  <li>Você ainda possui {unansweredCount} questão(ões) em branco.</li>
                )}
                {reviewCount > 0 && (
                  <li>Você marcou {reviewCount} questão(ões) para revisão.</li>
                )}
              </ul>
            </div>
          </div>
        )}

        <p className="text-xs text-slate-400 leading-relaxed">
          Após a confirmação, suas respostas serão registradas permanentemente e o simulado
          será encerrado. Não será possível alterar opções depois de finalizar.
        </p>

        {/* Ações */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            id="simulation-finish-modal-btn-cancel"
            variant="secondary"
            size="md"
            onClick={onCancel}
            disabled={isSubmitting}
            className="border-slate-700"
          >
            Voltar para a prova
          </Button>

          <Button
            id="simulation-finish-modal-btn-confirm"
            variant="primary"
            size="md"
            onClick={onConfirm}
            loading={isSubmitting}
            className="!bg-emerald-600 hover:!bg-emerald-500 !border-emerald-500 font-semibold"
          >
            Sim, finalizar prova
          </Button>
        </div>
      </div>
    </div>
  );
};
