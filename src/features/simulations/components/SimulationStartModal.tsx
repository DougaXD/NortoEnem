import React from 'react';
import { Play, AlertCircle, Clock, FileText, X } from 'lucide-react';
import type { Simulation } from '../../../types';
import { formatSimulationDuration } from './SimulationCard';
import { Button } from '../../../components/ui/DesignSystem';

export interface SimulationStartModalProps {
  simulation: Simulation;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isStarting?: boolean;
}

export const SimulationStartModal: React.FC<SimulationStartModalProps> = ({
  simulation,
  isOpen,
  onClose,
  onConfirm,
  isStarting = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-2xl relative space-y-5">
        {/* Botão fechar */}
        <button
          onClick={onClose}
          disabled={isStarting}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Ícone de Destaque */}
        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
          <Play className="w-6 h-6 fill-current" />
        </div>

        {/* Textos de Confirmação */}
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-slate-100">
            Iniciar Simulado
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Você está prestes a iniciar <strong className="text-slate-200">{simulation.title}</strong>.
            Depois de iniciar, o tempo poderá ser contado conforme a configuração da prova.
          </p>
        </div>

        {/* Resumo da Prova */}
        <div className="bg-[#0E1524] border border-slate-800/80 rounded-xl p-3.5 grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <FileText className="w-4 h-4 text-slate-500" />
            <span>{simulation.questionCount || simulation.questionIds.length} questões</span>
          </div>

          <div className="flex items-center gap-2 text-slate-300">
            <Clock className="w-4 h-4 text-slate-500" />
            <span>{formatSimulationDuration(simulation.durationSeconds)}</span>
          </div>
        </div>

        {/* Aviso de resiliência e auto-salvamento */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 text-[11px] text-blue-300 leading-relaxed">
          <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <span>
            Suas respostas serão salvas automaticamente ao longo da prova. Você poderá revisar antes de enviar.
          </span>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            variant="outline"
            size="md"
            onClick={onClose}
            disabled={isStarting}
          >
            Voltar
          </Button>

          <Button
            variant="primary"
            size="md"
            loading={isStarting}
            onClick={onConfirm}
            icon={<Play className="w-4 h-4 fill-current" />}
          >
            {isStarting ? 'Preparando...' : 'Iniciar agora'}
          </Button>
        </div>
      </div>
    </div>
  );
};
