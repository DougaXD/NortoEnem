import React from 'react';
import { AlertCircle, X } from 'lucide-react';
import { Button } from '../../../components/ui/DesignSystem';

export interface ExitConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ExitConfirmModal: React.FC<ExitConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-[#111827] border border-slate-800 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-lg"
          aria-label="Fechar janela"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 id="exit-modal-title" className="text-base font-semibold text-slate-100">
              Deseja sair da prática?
            </h3>
            <p className="text-xs text-slate-400">
              Sessão de estudos em andamento
            </p>
          </div>
        </div>

        <p className="text-sm text-slate-300 mb-6 leading-relaxed">
          As respostas que você já enviou nesta prática ficarão salvas com segurança no seu histórico. A questão atual não respondida não será contabilizada como erro.
        </p>

        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
          <Button
            variant="outline"
            size="md"
            onClick={onConfirm}
            className="w-full sm:w-auto text-slate-300 hover:text-white"
          >
            Sair da prática
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            Continuar praticando
          </Button>
        </div>
      </div>
    </div>
  );
};
