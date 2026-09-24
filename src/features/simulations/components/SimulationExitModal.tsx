import React from 'react';
import { LogOut, CheckCircle2, Clock, X } from 'lucide-react';
import { Button } from '../../../components/ui/DesignSystem';

export interface SimulationExitModalProps {
  isOpen: boolean;
  hasTimer: boolean;
  onConfirmExit: () => void;
  onCancel: () => void;
}

export const SimulationExitModal: React.FC<SimulationExitModalProps> = ({
  isOpen,
  hasTimer,
  onConfirmExit,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-[#111827] border border-slate-800 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-5">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <h2 id="exit-modal-title" className="text-lg font-bold text-slate-100">
                Pausar e Sair do Simulado?
              </h2>
              <p className="text-xs text-slate-400">
                Seu progresso está salvo e protegido.
              </p>
            </div>
          </div>
          <button
            type="button"
            id="simulation-exit-modal-close"
            onClick={onCancel}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informações sobre Retomada */}
        <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Suas respostas foram gravadas automaticamente e você poderá continuar este simulado depois.
            </span>
          </div>

          {hasTimer && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300">
              <Clock className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <strong>Atenção:</strong> Como este simulado possui prazo limite oficial, o tempo continuará correndo até a data de expiração da sessão.
              </span>
            </div>
          )}
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            id="simulation-exit-modal-btn-stay"
            variant="secondary"
            size="md"
            onClick={onCancel}
            className="border-slate-700"
          >
            Continuar simulado
          </Button>

          <Button
            id="simulation-exit-modal-btn-confirm"
            variant="ghost"
            size="md"
            onClick={onConfirmExit}
            className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20"
          >
            Salvar e sair
          </Button>
        </div>
      </div>
    </div>
  );
};
