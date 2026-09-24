import React from 'react';
import { AlertTriangle, Clock, FileCheck } from 'lucide-react';
import { Button } from '../../../components/ui/DesignSystem';

export interface SimulationTimeExpiredModalProps {
  isOpen: boolean;
  totalQuestions: number;
  answeredCount: number;
  isSubmitting: boolean;
  onConfirmFinalize: () => void;
}

export const SimulationTimeExpiredModal: React.FC<SimulationTimeExpiredModalProps> = ({
  isOpen,
  totalQuestions,
  answeredCount,
  isSubmitting,
  onConfirmFinalize
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="expired-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
    >
      <div className="bg-[#111827] border border-rose-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 mx-auto flex items-center justify-center text-rose-400">
          <Clock className="w-7 h-7 animate-pulse" />
        </div>

        <div className="space-y-1">
          <h2 id="expired-modal-title" className="text-xl font-bold text-slate-100">
            Tempo Encerrado!
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            O prazo limite para a realização deste simulado foi atingido.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
          Você respondeu <strong>{answeredCount}</strong> de <strong>{totalQuestions}</strong> questões.
          Todas as suas respostas foram salvas no sistema com segurança.
        </div>

        <div className="pt-2">
          <Button
            id="simulation-expired-btn-finalize"
            variant="primary"
            size="lg"
            onClick={onConfirmFinalize}
            loading={isSubmitting}
            className="w-full !bg-emerald-600 hover:!bg-emerald-500 !border-emerald-500 font-semibold shadow-lg"
          >
            <FileCheck className="w-5 h-5 mr-2" />
            Concluir e Salvar Avaliação
          </Button>
        </div>
      </div>
    </div>
  );
};
