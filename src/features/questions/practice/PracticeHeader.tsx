import React from 'react';
import { Clock, X, Compass } from 'lucide-react';
import { Button } from '../../../components/ui/DesignSystem';

export interface PracticeHeaderProps {
  currentIndex: number;
  totalQuestions: number;
  elapsedSeconds: number;
  isAnswered: boolean;
  onExit: () => void;
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export const PracticeHeader: React.FC<PracticeHeaderProps> = ({
  currentIndex,
  totalQuestions,
  elapsedSeconds,
  isAnswered,
  onExit
}) => {
  const progressPercent = totalQuestions > 0
    ? Math.round(((currentIndex + (isAnswered ? 1 : 0)) / totalQuestions) * 100)
    : 0;

  return (
    <header className="w-full bg-[#111827] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Lado Esquerdo: Tag do Modo e Indicador da Questão */}
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Compass className="w-3.5 h-3.5" />
            <span>Modo Prática</span>
          </div>

          <div className="text-sm font-medium text-slate-300">
            Questão <span className="font-bold text-white">{currentIndex + 1}</span> de{' '}
            <span className="font-bold text-white">{totalQuestions}</span>
          </div>
        </div>

        {/* Lado Direito: Cronômetro Discreto e Botão Sair */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Cronômetro */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0B0F19] border border-slate-800 text-slate-300 text-sm font-mono"
            title="Tempo decorrido nesta questão"
            aria-label={`Tempo decorrido: ${formatTimer(elapsedSeconds)}`}
          >
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="font-semibold">{formatTimer(elapsedSeconds)}</span>
          </div>

          {/* Sair da Prática */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onExit}
            className="text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 gap-1.5"
            aria-label="Sair da prática"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </div>

      {/* Barra de Progresso Simples */}
      <div className="mt-4 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
        <div
          className="bg-blue-500 h-full rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.max(5, Math.min(progressPercent, 100))}%` }}
        />
      </div>
    </header>
  );
};
