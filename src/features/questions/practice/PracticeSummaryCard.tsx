import React from 'react';
import { Award, CheckCircle2, XCircle, Clock, RotateCcw, ArrowLeft, Target, BarChart3, Home } from 'lucide-react';
import { Button } from '../../../components/ui/DesignSystem';
import type { PracticeSession } from '../../../types';

export interface PracticeSummaryCardProps {
  session: PracticeSession;
  onRestart: () => void;
  onBackToBank: () => void;
  onGoToHome?: () => void;
}

function formatDuration(sec: number): string {
  if (!sec || sec < 0) return '00:00';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export const PracticeSummaryCard: React.FC<PracticeSummaryCardProps> = ({
  session,
  onRestart,
  onBackToBank,
  onGoToHome
}) => {
  const {
    totalQuestions = 1,
    correctCount = 0,
    incorrectCount = 0,
    accuracy = 0,
    totalTimeSpentSeconds = 0,
    averageTime = 0
  } = session;

  const isHighPerformance = accuracy >= 70;
  const isMediumPerformance = accuracy >= 40 && accuracy < 70;

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Banner Principal */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-b from-[#132247] to-[#111827] border border-blue-500/30 p-6 sm:p-8 text-center shadow-xl">
        <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-blue-500/20 border border-blue-500/40 text-blue-400 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/10">
          <Award className="w-7 h-7 sm:w-8 sm:h-8" />
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
          Prática Concluída!
        </h2>
        <p className="text-sm sm:text-base text-slate-300 max-w-md mx-auto leading-relaxed">
          {isHighPerformance
            ? 'Excelente aproveitamento! Seu domínio sobre o conteúdo está se consolidando.'
            : isMediumPerformance
            ? 'Bom trabalho! A prática constante é o segredo para dominar as pegadinhas do ENEM.'
            : 'Cada erro nesta etapa é uma oportunidade de aprendizado valiosa para o dia da prova.'}
        </p>

        {/* Indicador de Aproveitamento Circular / Destacado */}
        <div className="mt-6 inline-flex flex-col items-center justify-center px-6 py-3 rounded-2xl bg-[#0B0F19]/80 border border-slate-700">
          <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-0.5">
            Aproveitamento Geral
          </span>
          <span className="text-3xl sm:text-4xl font-extrabold text-blue-400 font-mono">
            {accuracy}%
          </span>
        </div>
      </div>

      {/* Grade de Estatísticas Detalhadas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Total de Questões */}
        <div className="p-4 rounded-2xl bg-[#111827] border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Questões</span>
            <Target className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{totalQuestions}</div>
          <span className="text-xs text-slate-500 mt-1">Resolvidas na sessão</span>
        </div>

        {/* Acertos */}
        <div className="p-4 rounded-2xl bg-[#111827] border border-emerald-900/40 bg-emerald-950/10 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Acertos</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">{correctCount}</div>
          <span className="text-xs text-slate-500 mt-1">Respostas corretas</span>
        </div>

        {/* Erros */}
        <div className="p-4 rounded-2xl bg-[#111827] border border-rose-900/40 bg-rose-950/10 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">Erros</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400 font-mono">{incorrectCount}</div>
          <span className="text-xs text-slate-500 mt-1">Para revisar</span>
        </div>

        {/* Tempo Total */}
        <div className="p-4 rounded-2xl bg-[#111827] border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tempo Total</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{formatDuration(totalTimeSpentSeconds)}</div>
          <span className="text-xs text-slate-500 mt-1">Tempo acumulado</span>
        </div>

        {/* Tempo Médio */}
        <div className="p-4 rounded-2xl bg-[#111827] border border-slate-800 flex flex-col justify-between col-span-2 sm:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tempo Médio / Questão</span>
            <BarChart3 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{formatDuration(averageTime)}</div>
          <span className="text-xs text-slate-500 mt-1">
            Média ideal para o ENEM: ~3 minutos por questão
          </span>
        </div>
      </div>

      {/* Ações Inferiores */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <Button
          variant="primary"
          size="lg"
          onClick={onRestart}
          icon={<RotateCcw className="w-4 h-4" />}
          className="w-full sm:w-auto font-semibold"
        >
          Praticar Novamente
        </Button>

        <Button
          variant="secondary"
          size="lg"
          onClick={onBackToBank}
          icon={<ArrowLeft className="w-4 h-4" />}
          className="w-full sm:w-auto"
        >
          Voltar ao Banco de Questões
        </Button>

        {onGoToHome && (
          <Button
            variant="ghost"
            size="lg"
            onClick={onGoToHome}
            icon={<Home className="w-4 h-4" />}
            className="w-full sm:w-auto text-slate-400 hover:text-white"
          >
            Início
          </Button>
        )}
      </div>
    </div>
  );
};
