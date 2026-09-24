import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Clock,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  ShieldCheck,
  Zap,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import { useRouter } from '../../app/router/RouterContext';
import { useAuth } from '../../providers/AuthProvider';
import type { Simulation, SimulationSession, SimulationResult } from '../../types';
import { SimulationService } from '../../services/simulationService';
import {
  formatSimulationDuration,
  formatSimulationType
} from './components/SimulationCard';
import { SimulationStartModal } from './components/SimulationStartModal';
import { KNOWLEDGE_AREAS } from '../../config/theme';
import { Button, Card, Badge } from '../../components/ui/DesignSystem';
import { LoadingState, EmptyState, ErrorState } from '../../components/feedback/StateViews';

export interface SimulationDetailViewProps {
  simulationId: string;
}

export const SimulationDetailView: React.FC<SimulationDetailViewProps> = ({ simulationId }) => {
  const { navigate } = useRouter();
  const { user } = useAuth();
  const currentUserId = user?.uid || 'guest_student';

  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [session, setSession] = useState<SimulationSession | null>(null);
  const [latestResult, setLatestResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Controle do modal de confirmação de início
  const [isStartModalOpen, setIsStartModalOpen] = useState<boolean>(false);
  const [isStartingSession, setIsStartingSession] = useState<boolean>(false);

  // Mensagem de feedback de transição (ex: sessão iniciada com sucesso na Etapa 04B)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Busca definição do simulado
      const sim = await SimulationService.getSimulationById(simulationId);
      if (!sim) {
        setSimulation(null);
        return;
      }

      setSimulation(sim);

      // 2. Busca sessão mais recente do estudante para este simulado
      const userSession = await SimulationService.getLatestUserSession(currentUserId, simulationId);
      setSession(userSession);

      const res = await SimulationService.getLatestResultForSimulation(currentUserId, simulationId);
      setLatestResult(res);
    } catch (err) {
      console.error('Erro ao carregar detalhes do simulado:', err);
      setError('Ocorreu um erro ao carregar as informações do simulado.');
    } finally {
      setLoading(false);
    }
  }, [simulationId, currentUserId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Ação de iniciar nova sessão
  const handleConfirmStart = async () => {
    if (!simulation) return;

    setIsStartingSession(true);
    try {
      const newSession = await SimulationService.createSession(currentUserId, simulation.id);
      setSession(newSession);
      setIsStartModalOpen(false);
      navigate(`/app/simulados/${simulation.id}/executar`);
    } catch (err) {
      console.error('Erro ao criar sessão de simulado:', err);
      setError('Não foi possível iniciar a sessão do simulado. Tente novamente.');
      setIsStartModalOpen(false);
    } finally {
      setIsStartingSession(false);
    }
  };

  const handleContinueSession = () => {
    if (!simulation) return;
    navigate(`/app/simulados/${simulation.id}/executar`);
  };

  // 1. Estado de Carregamento
  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-12">
        <LoadingState message="Carregando informações do simulado..." />
      </div>
    );
  }

  // 2. Estado de Erro na Consulta
  if (error) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-4">
        <Button
          variant="ghost"
          size="sm"
          icon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => navigate('/app/simulados')}
        >
          Voltar para Simulados
        </Button>
        <ErrorState
          title="Erro ao carregar simulado"
          message={error}
          onRetry={loadData}
        />
      </div>
    );
  }

  // 3. Tratamento de ID Inválido / Não Encontrado
  if (!simulation) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-6">
        <Button
          variant="ghost"
          size="sm"
          icon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => navigate('/app/simulados')}
        >
          Voltar para Simulados
        </Button>

        <EmptyState
          title="Simulado não encontrado"
          description="O simulado que você tentou acessar não existe, foi arquivado ou você digitou um endereço inválido."
          actionText="Voltar ao catálogo de simulados"
          onAction={() => navigate('/app/simulados')}
          icon={<AlertTriangle className="w-6 h-6 text-amber-400" />}
        />
      </div>
    );
  }

  const hasActiveSession = session?.status === 'in_progress';
  const isCompleted = session?.status === 'completed';
  const isExpired = session?.status === 'expired';

  const totalQuestions = simulation.questionCount || simulation.questionIds.length;
  const answeredCount = session?.answeredQuestions ?? 0;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 animate-fade-in">
      {/* Botão Superior Voltar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/app/simulados')}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao catálogo</span>
        </button>

        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
          {formatSimulationType(simulation.type)}
        </span>
      </div>

      {/* Banner de Feedback Transicional (quando aplicável) */}
      {feedbackMessage && (
        <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-200 flex items-start gap-3 text-xs sm:text-sm leading-relaxed animate-fade-in">
          <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="font-semibold text-blue-300">Status da Sessão:</strong>
            <p>{feedbackMessage}</p>
          </div>
        </div>
      )}

      {/* Grid Principal: Detalhes & Configurações à esquerda | Card de Ação à direita */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start">
        {/* Coluna Esquerda: Informações Estruturais da Prova */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card de Apresentação */}
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 sm:p-7 space-y-4">
            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                {simulation.title}
              </h1>
              {simulation.description && (
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {simulation.description}
                </p>
              )}
            </div>

            {/* Áreas Contempladas */}
            {simulation.areaIds && simulation.areaIds.length > 0 && (
              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <span className="text-xs font-semibold text-slate-400">
                  Áreas do Conhecimento Contempladas:
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {simulation.areaIds.map((areaId) => {
                    const area = KNOWLEDGE_AREAS[areaId as keyof typeof KNOWLEDGE_AREAS];
                    if (!area) return null;
                    return (
                      <span
                        key={areaId}
                        className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold border ${area.bgBadge}`}
                      >
                        {area.name} ({area.id})
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Seções da Prova (quando configuradas) */}
          {simulation.sections && simulation.sections.length > 0 && (
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-400" />
                <h2 className="text-base font-bold text-slate-100">
                  Composição da Prova por Seções
                </h2>
              </div>

              <div className="divide-y divide-slate-800/80">
                {simulation.sections.map((section, idx) => (
                  <div key={section.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-blue-400">
                          Seção {idx + 1}
                        </span>
                        <h4 className="text-sm font-semibold text-slate-200">
                          {section.title}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-400">
                        {section.questionCount} questões selecionadas da matriz
                      </p>
                    </div>

                    {section.durationSeconds && (
                      <span className="text-xs font-medium text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-lg shrink-0">
                        {formatSimulationDuration(section.durationSeconds)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Orientações e Regras de Realização */}
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Orientações para Realização</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs text-slate-300">
              <div className="p-3.5 rounded-xl bg-[#0E1524] border border-slate-800/80 space-y-1">
                <strong className="text-slate-200 flex items-center gap-1.5 font-semibold">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  Controle de Tempo
                </strong>
                <p className="text-slate-400 leading-relaxed">
                  {simulation.durationSeconds
                    ? `Tempo total de ${formatSimulationDuration(simulation.durationSeconds)} com cronômetro oficial.`
                    : 'Simulado livre sem limitação rígida de tempo.'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0E1524] border border-slate-800/80 space-y-1">
                <strong className="text-slate-200 flex items-center gap-1.5 font-semibold">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Salvamento Automático
                </strong>
                <p className="text-slate-400 leading-relaxed">
                  Cada resposta é gravada instantaneamente, garantindo proteção contra quedas de sinal.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0E1524] border border-slate-800/80 space-y-1">
                <strong className="text-slate-200 flex items-center gap-1.5 font-semibold">
                  <RotateCcw className="w-3.5 h-3.5 text-purple-400" />
                  Retomada de Sessão
                </strong>
                <p className="text-slate-400 leading-relaxed">
                  {simulation.allowResume
                    ? 'Você pode pausar e continuar de onde parou antes da expiração.'
                    : 'A prova deve ser realizada em uma única sessão contínua.'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0E1524] border border-slate-800/80 space-y-1">
                <strong className="text-slate-200 flex items-center gap-1.5 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Revisão de Respostas
                </strong>
                <p className="text-slate-400 leading-relaxed">
                  Permite marcar questões para revisar antes do envio final de confirmação.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna Direita: Painel de Sessão & Ação Principal */}
        <div className="space-y-4 sticky top-6">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-5 shadow-lg shadow-black/20">
            {/* Status da Sessão */}
            <div className="space-y-2 pb-4 border-b border-slate-800">
              <span className="text-xs font-semibold text-slate-400">Estado atual</span>

              {hasActiveSession ? (
                <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                  <span>Você tem um simulado em andamento</span>
                </div>
              ) : isCompleted ? (
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simulado Concluído</span>
                </div>
              ) : isExpired ? (
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Sessão anterior expirada</span>
                </div>
              ) : (
                <div className="text-slate-200 font-bold text-sm">
                  Pronto para iniciar
                </div>
              )}
            </div>

            {/* Métricas Principais da Prova */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-slate-500" />
                  Total de Questões
                </span>
                <span className="font-bold text-slate-100">{totalQuestions}</span>
              </div>

              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-500" />
                  Duração Estimada
                </span>
                <span className="font-bold text-slate-100">
                  {formatSimulationDuration(simulation.durationSeconds)}
                </span>
              </div>

              {hasActiveSession && (
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Progresso</span>
                    <span className="font-bold text-blue-400">
                      {answeredCount} de {totalQuestions} respondidas
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Botão de Ação Principal */}
            <div className="pt-2 space-y-2.5">
              {hasActiveSession ? (
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full font-bold"
                  icon={<Play className="w-4 h-4 fill-current" />}
                  onClick={handleContinueSession}
                >
                  Continuar simulado
                </Button>
              ) : isCompleted ? (
                <>
                  {latestResult && (
                    <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-500/20 text-xs text-blue-300 space-y-1 text-center">
                      <div className="text-xl font-mono font-black text-white">
                        {latestResult.percentage}%
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {latestResult.correctAnswers} de {latestResult.totalQuestions} acertos no último envio
                      </div>
                    </div>
                  )}

                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full font-bold bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/20"
                    icon={<CheckCircle2 className="w-4 h-4" />}
                    onClick={() => {
                      if (session?.id) {
                        navigate(`/app/simulados/${simulation.id}/resultado?sessionId=${session.id}`);
                      } else {
                        navigate(`/app/simulados/${simulation.id}/resultado`);
                      }
                    }}
                  >
                    Ver Desempenho e Gabarito
                  </Button>

                  <Button
                    variant="secondary"
                    size="md"
                    className="w-full font-semibold border-slate-700"
                    icon={<Play className="w-4 h-4" />}
                    onClick={() => setIsStartModalOpen(true)}
                  >
                    Refazer Simulado
                  </Button>
                </>
              ) : (
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full font-bold"
                  icon={<Play className="w-4 h-4 fill-current" />}
                  onClick={() => setIsStartModalOpen(true)}
                >
                  Começar simulado
                </Button>
              )}
            </div>

            {/* Dica de segurança */}
            <p className="text-[11px] text-slate-400 text-center leading-relaxed">
              Ao iniciar, sua sessão é salva de forma segura. Você poderá revisar suas respostas com tranquilidade.
            </p>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação antes de Iniciar */}
      <SimulationStartModal
        simulation={simulation}
        isOpen={isStartModalOpen}
        isStarting={isStartingSession}
        onClose={() => setIsStartModalOpen(false)}
        onConfirm={handleConfirmStart}
      />
    </div>
  );
};
