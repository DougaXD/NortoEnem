import React from 'react';
import {
  CheckCircle2,
  Calendar,
  Clock,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  FileCheck2,
  ListCheck,
  Sparkles
} from 'lucide-react';
import { Button } from '../../../components/ui/DesignSystem';

export interface SimulationCompletedStateProps {
  simulationTitle: string;
  totalQuestions: number;
  answeredCount: number;
  completedAt: string;
  durationFormatted?: string;
  onViewResult?: () => void;
  onGoToSimulations: () => void;
  onGoToHome: () => void;
}

export const SimulationCompletedState: React.FC<SimulationCompletedStateProps> = ({
  simulationTitle,
  totalQuestions,
  answeredCount,
  completedAt,
  durationFormatted,
  onViewResult,
  onGoToSimulations,
  onGoToHome
}) => {
  const formattedDate = new Date(completedAt).toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  });

  return (
    <div
      id="simulation-completed-container"
      className="w-full max-w-2xl mx-auto px-4 py-8 sm:py-12 animate-fade-in"
    >
      <div className="bg-[#111827] border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 text-center">
        {/* Ícone de Sucesso */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 mx-auto flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/10">
          <CheckCircle2 className="w-9 h-9 sm:w-11 sm:h-11" />
        </div>

        {/* Títulos e Subtítulos */}
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            Prova Entregue com Sucesso
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100">
            Simulado Finalizado!
          </h1>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Suas respostas para <strong className="text-slate-200">{simulationTitle}</strong> foram
            bloqueadas e registradas com integridade no ambiente seguro Norto ENEM.
          </p>
        </div>

        {/* Resumo da Entrega */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-[#0B0F19] border border-slate-800/80 text-left">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <ListCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Questões</span>
            </div>
            <div className="text-sm sm:text-base font-bold text-slate-100 font-mono">
              {answeredCount} / {totalQuestions}
            </div>
            <div className="text-[11px] text-slate-400">respondidas</div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>Conclusão</span>
            </div>
            <div className="text-sm sm:text-base font-bold text-slate-100 font-mono">
              {formattedDate}
            </div>
            <div className="text-[11px] text-slate-400">data de envio</div>
          </div>

          {durationFormatted && (
            <div className="col-span-2 sm:col-span-1 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Tempo</span>
              </div>
              <div className="text-sm sm:text-base font-bold text-slate-100 font-mono">
                {durationFormatted}
              </div>
              <div className="text-[11px] text-slate-400">tempo decorrido</div>
            </div>
          )}
        </div>

        {/* Aviso de Correção Disponível */}
        <div className="p-4 rounded-2xl bg-blue-950/20 border border-blue-500/20 text-xs sm:text-sm text-blue-200/90 leading-relaxed text-left flex items-start gap-3">
          <FileCheck2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-blue-200">
              Correção e Análise Prontas
            </p>
            <p className="text-xs text-blue-300/80">
              Seu percentual de acerto bruto, divisão por áreas do conhecimento, disciplinas e o
              gabarito comentado com a resolução de cada questão já foram consolidados e estão prontos para visualização.
            </p>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          {onViewResult && (
            <Button
              id="simulation-completed-btn-view-result"
              variant="primary"
              size="lg"
              onClick={onViewResult}
              className="w-full sm:w-auto font-bold bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/20"
              icon={<Sparkles className="w-4 h-4" />}
            >
              Ver Desempenho e Gabarito
            </Button>
          )}

          <Button
            id="simulation-completed-btn-catalog"
            variant={onViewResult ? 'secondary' : 'primary'}
            size="lg"
            onClick={onGoToSimulations}
            className="w-full sm:w-auto font-semibold border-slate-700"
          >
            Voltar para Simulados
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>

          <Button
            id="simulation-completed-btn-home"
            variant="ghost"
            size="lg"
            onClick={onGoToHome}
            className="w-full sm:w-auto text-slate-400 hover:text-white"
          >
            Ir para o Início
          </Button>
        </div>
      </div>
    </div>
  );
};

