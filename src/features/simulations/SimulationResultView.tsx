import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Clock,
  Target,
  Award,
  TrendingUp,
  AlertTriangle,
  Layers,
  BookOpen,
  Sparkles,
  RotateCcw,
  FileText,
  ChevronDown,
  ChevronUp,
  Filter,
  Info,
  Calendar,
  Check,
  X,
  Share2
} from 'lucide-react';
import { useRouter } from '../../app/router/RouterContext';
import { useAuth } from '../../providers/AuthProvider';
import type {
  Simulation,
  SimulationResult,
  SimulationAreaResult,
  SimulationSubjectResult,
  SimulationTopicResult,
  SimulationQuestionCorrection,
  KnowledgeAreaId,
  MasteryClassification
} from '../../types';
import { SimulationService } from '../../services/simulationService';
import { SimulationGradingService } from '../../services/simulationGradingService';
import { KNOWLEDGE_AREAS } from '../../config/theme';
import {
  getClassificationLabel,
  getClassificationBadgeStyle
} from '../../config/diagnosticConfig';
import { Button, Card, Badge } from '../../components/ui/DesignSystem';
import { LoadingState, EmptyState, ErrorState } from '../../components/feedback/StateViews';
import { formatSimulationDuration } from './components/SimulationCard';

export interface SimulationResultViewProps {
  simulationId: string;
  sessionId?: string;
  resultId?: string;
}

type TabType = 'areas' | 'subjects' | 'topics' | 'gabarito';
type QuestionFilterType = 'all' | 'correct' | 'incorrect' | 'unanswered';

export const SimulationResultView: React.FC<SimulationResultViewProps> = ({
  simulationId,
  sessionId,
  resultId
}) => {
  const { navigate } = useRouter();
  const { user } = useAuth();

  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Controle de Abas
  const [activeTab, setActiveTab] = useState<TabType>('areas');

  // Filtros da aba de Gabarito
  const [questionFilter, setQuestionFilter] = useState<QuestionFilterType>('all');
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>('all');

  // Estado de expansão de explicações (todas abertas por padrão ou toggláveis)
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Carrega dados do simulado
      const sim = await SimulationService.getSimulationById(simulationId);
      setSimulation(sim);

      let foundResult: SimulationResult | null = null;

      // 2. Busca por resultId se fornecido
      if (resultId) {
        foundResult = await SimulationService.getResultById(resultId);
      }

      // 3. Se não encontrou, busca por sessionId
      if (!foundResult && sessionId) {
        foundResult = await SimulationService.getResultBySessionId(sessionId);

        // Se ainda não foi corrigido mas temos a sessão e usuário, executa a correção agora
        if (!foundResult && user?.uid) {
          try {
            foundResult = await SimulationGradingService.gradeSimulationSession(sessionId, user.uid);
          } catch (gradeErr) {
            console.warn('Tentativa de correção sob demanda da sessão falhou:', gradeErr);
          }
        }
      }

      // 4. Se não encontrou, busca o resultado mais recente deste simulado para o usuário
      if (!foundResult && user?.uid) {
        foundResult = await SimulationService.getLatestResultForSimulation(user.uid, simulationId);
      }

      if (!foundResult) {
        setError('Não foi encontrado um resultado consolidado para esta sessão de simulado.');
        return;
      }

      setResult(foundResult);

      // Inicializa perguntas expandidas
      if (foundResult.questionCorrections) {
        const initialExpanded: Record<string, boolean> = {};
        foundResult.questionCorrections.forEach(qc => {
          // Deixa as incorretas expandidas por padrão para facilitar o estudo de erros
          initialExpanded[qc.questionId] = !qc.isCorrect;
        });
        setExpandedQuestions(initialExpanded);
      }
    } catch (err) {
      console.error('Erro ao carregar resultado do simulado:', err);
      setError('Ocorreu um erro ao carregar as análises de desempenho do simulado.');
    } finally {
      setLoading(false);
    }
  }, [simulationId, sessionId, resultId, user?.uid]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleQuestionExpansion = (questionId: string) => {
    setExpandedQuestions(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  const expandAllQuestions = () => {
    if (!result?.questionCorrections) return;
    const allExp: Record<string, boolean> = {};
    result.questionCorrections.forEach(qc => {
      allExp[qc.questionId] = true;
    });
    setExpandedQuestions(allExp);
  };

  const collapseAllQuestions = () => {
    setExpandedQuestions({});
  };

  // Filtragem de Questões na Aba Gabarito
  const filteredCorrections = useMemo(() => {
    if (!result?.questionCorrections) return [];

    return result.questionCorrections.filter(qc => {
      // Filtro de status
      if (questionFilter === 'correct' && !qc.isCorrect) return false;
      if (questionFilter === 'incorrect' && (qc.isCorrect || qc.isUnanswered)) return false;
      if (questionFilter === 'unanswered' && !qc.isUnanswered) return false;

      // Filtro de área
      if (selectedAreaFilter !== 'all' && qc.areaId !== selectedAreaFilter) return false;

      return true;
    });
  }, [result?.questionCorrections, questionFilter, selectedAreaFilter]);

  // Contadores para as pills de filtro
  const questionCounts = useMemo(() => {
    if (!result?.questionCorrections) {
      return { all: 0, correct: 0, incorrect: 0, unanswered: 0 };
    }
    return {
      all: result.questionCorrections.length,
      correct: result.questionCorrections.filter(q => q.isCorrect).length,
      incorrect: result.questionCorrections.filter(q => !q.isCorrect && !q.isUnanswered).length,
      unanswered: result.questionCorrections.filter(q => q.isUnanswered).length
    };
  }, [result?.questionCorrections]);

  // Formatação de data
  const formattedCompletedDate = useMemo(() => {
    if (!result?.completedAt) return '';
    try {
      return new Date(result.completedAt).toLocaleString('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short'
      });
    } catch {
      return result.completedAt;
    }
  }, [result?.completedAt]);

  // Formatação de segundos para MM:SS ou HH:MM:SS
  const formatTimeDetailed = (totalSeconds: number): string => {
    if (!totalSeconds || totalSeconds <= 0) return '0 min';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    }
    if (minutes > 0) {
      return `${minutes} min ${seconds} s`;
    }
    return `${seconds} s`;
  };

  // Classificação geral pedagógica
  const overallClassification: MasteryClassification = useMemo(() => {
    const pct = result?.percentage ?? 0;
    if (pct < 50) return 'attention';
    if (pct < 70) return 'developing';
    return 'mastered';
  }, [result?.percentage]);

  if (loading) {
    return (
      <div className="w-full max-w-5xl mx-auto px-4 py-16 space-y-4">
        <LoadingState message="Consolidando correção e compilando análise de desempenho..." />
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-12 space-y-6 animate-fade-in">
        <Button
          variant="ghost"
          size="sm"
          icon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => navigate('/app/simulados')}
        >
          Voltar para Simulados
        </Button>
        <ErrorState
          title="Não foi possível carregar o resultado"
          message={error || 'O resultado solicitado não existe ou ainda não foi processado.'}
          action={
            <Button variant="primary" onClick={loadData}>
              Tentar Novamente
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div
      id="simulation-result-view"
      className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8 animate-fade-in text-slate-100"
    >
      {/* 1. Barra de Navegação Superior */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <button
          id="btn-back-to-simulations"
          onClick={() => navigate('/app/simulados')}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-400 hover:text-slate-200 transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Catálogo de Simulados</span>
        </button>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<RotateCcw className="w-3.5 h-3.5" />}
            onClick={() => navigate(`/app/simulados/${simulationId}`)}
          >
            Refazer Simulado
          </Button>

          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeft className="w-3.5 h-3.5" />}
            onClick={() => navigate('/app/inicio')}
          >
            Início
          </Button>
        </div>
      </div>

      {/* 2. Cabeçalho de Contexto do Simulado */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Resultado Consolidado
          </span>

          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-500" />
            Finalizado em {formattedCompletedDate}
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          {result.simulationTitle || simulation?.title || 'Relatório de Desempenho do Simulado'}
        </h1>

        <p className="text-xs sm:text-sm text-slate-400 max-w-3xl leading-relaxed">
          Confira abaixo seu percentual de acertos brutos, análise detalhada por área e disciplina,
          e o gabarito comentado com a resolução de cada questão.
        </p>
      </div>

      {/* 3. Painel Principal de Desempenho Bruto */}
      <div className="bg-[#111827] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Coluna Esquerda: Percentual Bruto de Acertos */}
          <div className="lg:col-span-4 flex flex-col items-center sm:items-start text-center sm:text-left space-y-2 sm:border-r sm:border-slate-800/80 sm:pr-6">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Desempenho Geral
            </span>

            <div className="flex items-baseline gap-2">
              <span className="text-5xl sm:text-6xl font-black tracking-tight text-white font-mono">
                {result.percentage}%
              </span>
              <span className="text-xs sm:text-sm font-semibold text-slate-400">
                de acerto bruto
              </span>
            </div>

            <div className="pt-1">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getClassificationBadgeStyle(
                  overallClassification
                )}`}
              >
                {overallClassification === 'mastered' && <Sparkles className="w-3.5 h-3.5" />}
                {overallClassification === 'developing' && <TrendingUp className="w-3.5 h-3.5" />}
                {overallClassification === 'attention' && <AlertTriangle className="w-3.5 h-3.5" />}
                {getClassificationLabel(overallClassification)}
              </span>
            </div>

            <p className="text-xs text-slate-400 pt-1 leading-relaxed">
              Você acertou <strong className="text-slate-200">{result.correctAnswers}</strong> de{' '}
              <strong className="text-slate-200">{result.totalQuestions} questões</strong> da prova.
            </p>
          </div>

          {/* Coluna Direita: Métricas Detalhadas (Acertos, Erros, Branco, Tempo) */}
          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {/* Acertos */}
            <div className="p-4 rounded-2xl bg-[#0E1524] border border-emerald-500/20 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Acertos</span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-white font-mono">
                {result.correctAnswers}
              </div>
              <div className="text-[11px] text-slate-400">
                {result.totalQuestions > 0
                  ? `${Math.round((result.correctAnswers / result.totalQuestions) * 100)}% do total`
                  : '0%'}
              </div>
            </div>

            {/* Erros */}
            <div className="p-4 rounded-2xl bg-[#0E1524] border border-rose-500/20 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-400">
                <XCircle className="w-4 h-4" />
                <span>Erros</span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-white font-mono">
                {result.incorrectAnswers}
              </div>
              <div className="text-[11px] text-slate-400">
                {result.totalQuestions > 0
                  ? `${Math.round((result.incorrectAnswers / result.totalQuestions) * 100)}% do total`
                  : '0%'}
              </div>
            </div>

            {/* Em Branco */}
            <div className="p-4 rounded-2xl bg-[#0E1524] border border-slate-700/60 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                <MinusCircle className="w-4 h-4" />
                <span>Em branco</span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-white font-mono">
                {result.unansweredQuestions}
              </div>
              <div className="text-[11px] text-slate-400">não respondidas</div>
            </div>

            {/* Tempo Médio */}
            <div className="p-4 rounded-2xl bg-[#0E1524] border border-slate-700/60 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-400">
                <Clock className="w-4 h-4" />
                <span>Tempo Médio</span>
              </div>
              <div className="text-lg sm:text-xl font-bold text-white font-mono truncate">
                {formatTimeDetailed(result.averageTimeSeconds)}
              </div>
              <div className="text-[11px] text-slate-400">por questão</div>
            </div>
          </div>
        </div>

        {/* Nota de Transparência Pedagógica (Proibição estrita de invenção de Nota ENEM/TRI) */}
        <div className="p-3.5 rounded-xl bg-blue-950/20 border border-blue-500/20 flex items-start gap-2.5 text-xs text-blue-200/90 leading-relaxed">
          <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <span>
            <strong>Transparência Pedagógica Norto:</strong> Este resultado expressa o desempenho bruto
            de acertos no simulado. Em respeito ao rigor metodológico e à precisão pedagógica, não
            inventamos uma fórmula de suposta "nota ENEM" nem simulamos TRI arbitrária sem a régua
            oficial de calibração do Inep.
          </span>
        </div>
      </div>

      {/* 4. Abas de Navegação Analítica */}
      <div className="border-b border-slate-800 flex items-center gap-2 overflow-x-auto pb-px">
        <button
          id="tab-btn-areas"
          onClick={() => setActiveTab('areas')}
          className={`inline-flex items-center gap-2 px-4 py-3 border-b-2 text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${
            activeTab === 'areas'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Áreas do Conhecimento</span>
          {result.areaResults && result.areaResults.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[11px] bg-slate-800 text-slate-300">
              {result.areaResults.length}
            </span>
          )}
        </button>

        <button
          id="tab-btn-subjects"
          onClick={() => setActiveTab('subjects')}
          className={`inline-flex items-center gap-2 px-4 py-3 border-b-2 text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${
            activeTab === 'subjects'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Disciplinas</span>
          {result.subjectResults && result.subjectResults.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[11px] bg-slate-800 text-slate-300">
              {result.subjectResults.length}
            </span>
          )}
        </button>

        <button
          id="tab-btn-topics"
          onClick={() => setActiveTab('topics')}
          className={`inline-flex items-center gap-2 px-4 py-3 border-b-2 text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${
            activeTab === 'topics'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Target className="w-4 h-4" />
          <span>Assuntos & Temas</span>
          {result.topicResults && result.topicResults.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[11px] bg-slate-800 text-slate-300">
              {result.topicResults.length}
            </span>
          )}
        </button>

        <button
          id="tab-btn-gabarito"
          onClick={() => setActiveTab('gabarito')}
          className={`inline-flex items-center gap-2 px-4 py-3 border-b-2 text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${
            activeTab === 'gabarito'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Gabarito & Correção</span>
          <span className="px-1.5 py-0.5 rounded-full text-[11px] bg-blue-500/20 text-blue-300 font-bold">
            {questionCounts.all} questões
          </span>
        </button>
      </div>

      {/* 5. CONTEÚDO DA ABA: Áreas do Conhecimento */}
      {activeTab === 'areas' && (
        <div id="tab-content-areas" className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {result.areaResults && result.areaResults.length > 0 ? (
              result.areaResults.map(areaRes => {
                const areaMeta = KNOWLEDGE_AREAS[areaRes.areaId as keyof typeof KNOWLEDGE_AREAS];
                const classification =
                  areaRes.classification ||
                  (areaRes.percentage < 50
                    ? 'attention'
                    : areaRes.percentage < 70
                    ? 'developing'
                    : 'mastered');

                return (
                  <div
                    key={areaRes.areaId}
                    className="p-5 sm:p-6 rounded-2xl bg-[#111827] border border-slate-800 space-y-4 shadow-md"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${
                            areaMeta ? areaMeta.bgBadge : 'bg-slate-800 text-slate-200'
                          }`}
                        >
                          {areaRes.areaId}
                        </span>
                        <h3 className="text-base font-bold text-slate-100">
                          {areaRes.areaName}
                        </h3>
                      </div>

                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getClassificationBadgeStyle(
                          classification
                        )}`}
                      >
                        {getClassificationLabel(classification)}
                      </span>
                    </div>

                    {/* Barra de Progresso e Percentual */}
                    <div className="space-y-2">
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="text-slate-400">Acerto Bruto</span>
                        <span className="text-lg font-extrabold text-white font-mono">
                          {areaRes.percentage}%
                        </span>
                      </div>

                      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-500"
                          style={{
                            width: `${
                              areaRes.totalQuestions > 0
                                ? (areaRes.correctAnswers / areaRes.totalQuestions) * 100
                                : 0
                            }%`
                          }}
                        />
                        <div
                          className="h-full bg-rose-500 transition-all duration-500"
                          style={{
                            width: `${
                              areaRes.totalQuestions > 0
                                ? (areaRes.incorrectAnswers / areaRes.totalQuestions) * 100
                                : 0
                            }%`
                          }}
                        />
                      </div>
                    </div>

                    {/* Resumo de Respostas da Área */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-center">
                      <div className="p-2 rounded-xl bg-[#0E1524]">
                        <span className="text-[11px] text-emerald-400 font-semibold block">
                          Acertos
                        </span>
                        <span className="text-sm font-bold text-white font-mono">
                          {areaRes.correctAnswers} / {areaRes.totalQuestions}
                        </span>
                      </div>

                      <div className="p-2 rounded-xl bg-[#0E1524]">
                        <span className="text-[11px] text-rose-400 font-semibold block">Erros</span>
                        <span className="text-sm font-bold text-white font-mono">
                          {areaRes.incorrectAnswers}
                        </span>
                      </div>

                      <div className="p-2 rounded-xl bg-[#0E1524]">
                        <span className="text-[11px] text-amber-400 font-semibold block">
                          Em branco
                        </span>
                        <span className="text-sm font-bold text-white font-mono">
                          {areaRes.unansweredQuestions}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-2 text-center py-8 text-sm text-slate-400">
                Não há dados por área registrados nesta sessão.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. CONTEÚDO DA ABA: Disciplinas */}
      {activeTab === 'subjects' && (
        <div id="tab-content-subjects" className="space-y-4 animate-fade-in">
          {result.subjectResults && result.subjectResults.length > 0 ? (
            <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-[#0E1524] text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4 sm:px-6">Disciplina</th>
                      <th className="py-3.5 px-4 text-center">Área</th>
                      <th className="py-3.5 px-4 text-center">Total</th>
                      <th className="py-3.5 px-4 text-center text-emerald-400">Acertos</th>
                      <th className="py-3.5 px-4 text-center text-rose-400">Erros</th>
                      <th className="py-3.5 px-4 text-center text-amber-400">Em branco</th>
                      <th className="py-3.5 px-4 text-right">Acerto</th>
                      <th className="py-3.5 px-4 sm:px-6 text-right">Diagnóstico</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-200">
                    {result.subjectResults.map(subj => {
                      const areaMeta = KNOWLEDGE_AREAS[subj.areaId as keyof typeof KNOWLEDGE_AREAS];
                      return (
                        <tr key={subj.subjectId} className="hover:bg-[#131E33] transition-colors">
                          <td className="py-3 px-4 sm:px-6 font-semibold text-white">
                            {subj.subjectName}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${
                                areaMeta ? areaMeta.bgBadge : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {subj.areaId}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono">{subj.totalQuestions}</td>
                          <td className="py-3 px-4 text-center font-bold text-emerald-400 font-mono">
                            {subj.correctAnswers}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-rose-400 font-mono">
                            {subj.incorrectAnswers}
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-slate-400">
                            {subj.unansweredQuestions}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-white font-mono">
                            {subj.percentage}%
                          </td>
                          <td className="py-3 px-4 sm:px-6 text-right">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getClassificationBadgeStyle(
                                subj.classification
                              )}`}
                            >
                              {getClassificationLabel(subj.classification)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-sm text-slate-400 bg-[#111827] rounded-2xl border border-slate-800 p-6">
              Não há dados detalhados por disciplina para este simulado.
            </div>
          )}
        </div>
      )}

      {/* 7. CONTEÚDO DA ABA: Assuntos & Temas */}
      {activeTab === 'topics' && (
        <div id="tab-content-topics" className="space-y-6 animate-fade-in">
          {result.topicResults && result.topicResults.length > 0 ? (
            <>
              {/* Seção de Destaques e Atenção */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Destaques Positivos (>= 70%) */}
                <div className="p-5 rounded-2xl bg-[#111827] border border-emerald-500/30 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <Sparkles className="w-4 h-4" />
                    <span>Destaques Positivos (Bom Domínio)</span>
                  </div>
                  <div className="space-y-2">
                    {result.topicResults.filter(t => t.percentage >= 70).length > 0 ? (
                      result.topicResults
                        .filter(t => t.percentage >= 70)
                        .map(t => (
                          <div
                            key={t.topicId}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-[#0E1524] text-xs"
                          >
                            <div>
                              <span className="font-semibold text-slate-100 block">{t.topicName}</span>
                              <span className="text-[11px] text-slate-400">{t.subjectName}</span>
                            </div>
                            <span className="font-bold text-emerald-400 font-mono">
                              {t.percentage}% ({t.correctAnswers}/{t.totalQuestions})
                            </span>
                          </div>
                        ))
                    ) : (
                      <p className="text-xs text-slate-400 py-2">
                        Nenhum tópico atingiu o limiar de 70% neste simulado.
                      </p>
                    )}
                  </div>
                </div>

                {/* Pontos de Atenção (< 50%) */}
                <div className="p-5 rounded-2xl bg-[#111827] border border-amber-500/30 space-y-3">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Oportunidades de Atenção (&lt; 50%)</span>
                  </div>
                  <div className="space-y-2">
                    {result.topicResults.filter(t => t.percentage < 50).length > 0 ? (
                      result.topicResults
                        .filter(t => t.percentage < 50)
                        .map(t => (
                          <div
                            key={t.topicId}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-[#0E1524] text-xs"
                          >
                            <div>
                              <span className="font-semibold text-slate-100 block">{t.topicName}</span>
                              <span className="text-[11px] text-slate-400">{t.subjectName}</span>
                            </div>
                            <span className="font-bold text-amber-400 font-mono">
                              {t.percentage}% ({t.correctAnswers}/{t.totalQuestions})
                            </span>
                          </div>
                        ))
                    ) : (
                      <p className="text-xs text-slate-400 py-2">
                        Excelente! Não foram identificados tópicos com domínio crítico abaixo de 50%.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Lista Completa de Tópicos */}
              <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-slate-200">
                  Todos os Tópicos Avaliados ({result.topicResults.length})
                </h3>

                <div className="space-y-3">
                  {result.topicResults.map(t => (
                    <div
                      key={t.topicId}
                      className="p-3.5 rounded-xl bg-[#0E1524] border border-slate-800/80 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                        <div>
                          <span className="font-bold text-slate-100 text-sm">{t.topicName}</span>
                          <span className="text-slate-400 ml-2">({t.subjectName})</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-mono text-slate-300">
                            {t.correctAnswers} de {t.totalQuestions} acertos
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${getClassificationBadgeStyle(
                              t.classification
                            )}`}
                          >
                            {t.percentage}% — {getClassificationLabel(t.classification)}
                          </span>
                        </div>
                      </div>

                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            t.percentage >= 70
                              ? 'bg-emerald-500'
                              : t.percentage >= 50
                              ? 'bg-blue-500'
                              : 'bg-amber-500'
                          }`}
                          style={{ width: `${t.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-sm text-slate-400 bg-[#111827] rounded-2xl border border-slate-800 p-6">
              As questões deste simulado foram mapeadas primariamente a nível de disciplina e área.
            </div>
          )}
        </div>
      )}

      {/* 8. CONTEÚDO DA ABA: Gabarito & Correção Questão a Questão */}
      {activeTab === 'gabarito' && (
        <div id="tab-content-gabarito" className="space-y-6 animate-fade-in">
          {/* Barra de Filtros e Controles */}
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              {/* Pills de Filtro por Status */}
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                <button
                  onClick={() => setQuestionFilter('all')}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-colors ${
                    questionFilter === 'all'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Todas ({questionCounts.all})
                </button>

                <button
                  onClick={() => setQuestionFilter('correct')}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-colors ${
                    questionFilter === 'correct'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Acertos ({questionCounts.correct})
                </button>

                <button
                  onClick={() => setQuestionFilter('incorrect')}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-colors ${
                    questionFilter === 'incorrect'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Erros ({questionCounts.incorrect})
                </button>

                <button
                  onClick={() => setQuestionFilter('unanswered')}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-colors ${
                    questionFilter === 'unanswered'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Em branco ({questionCounts.unanswered})
                </button>
              </div>

              {/* Botões de Expandir/Recolher Resoluções */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  onClick={expandAllQuestions}
                  className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Expandir todas
                </button>
                <span className="text-slate-600">•</span>
                <button
                  onClick={collapseAllQuestions}
                  className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Recolher todas
                </button>
              </div>
            </div>

            {/* Filtro por Área */}
            {result.areaResults && result.areaResults.length > 1 && (
              <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800 text-xs">
                <span className="text-slate-400 font-semibold mr-1">Filtrar por Área:</span>
                <button
                  onClick={() => setSelectedAreaFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                    selectedAreaFilter === 'all'
                      ? 'bg-slate-700 text-white'
                      : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Todas
                </button>
                {result.areaResults.map(a => (
                  <button
                    key={a.areaId}
                    onClick={() => setSelectedAreaFilter(a.areaId)}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                      selectedAreaFilter === a.areaId
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {a.areaId}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Lista de Questões Corrigidas */}
          <div className="space-y-4">
            {filteredCorrections.length > 0 ? (
              filteredCorrections.map(qc => {
                const isExpanded = !!expandedQuestions[qc.questionId];
                const areaMeta = KNOWLEDGE_AREAS[qc.areaId as keyof typeof KNOWLEDGE_AREAS];

                return (
                  <div
                    key={qc.questionId}
                    className={`rounded-2xl border transition-all ${
                      qc.isCorrect
                        ? 'bg-[#111827] border-slate-800 hover:border-emerald-500/40'
                        : qc.isUnanswered
                        ? 'bg-[#111827] border-slate-800 hover:border-amber-500/40'
                        : 'bg-[#121624] border-rose-500/30 hover:border-rose-500/50'
                    } p-5 sm:p-6 space-y-4`}
                  >
                    {/* Top Header da Questão: Número, Status, Tempo */}
                    <div className="flex items-center justify-between gap-2 flex-wrap pb-3 border-b border-slate-800/80">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-bold text-white bg-slate-800 px-2.5 py-1 rounded-lg">
                          Questão #{qc.order}
                        </span>

                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${
                            areaMeta ? areaMeta.bgBadge : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {qc.areaId}
                        </span>

                        {qc.subject && (
                          <span className="text-xs text-slate-400 font-medium">
                            {qc.subject}
                          </span>
                        )}

                        {qc.topic && (
                          <span className="text-[11px] text-slate-500 hidden sm:inline">
                            • {qc.topic}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        {qc.timeSpentSeconds > 0 && (
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            {formatTimeDetailed(qc.timeSpentSeconds)}
                          </span>
                        )}

                        {/* Badge de Acerto/Erro */}
                        {qc.isCorrect ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Acertou
                          </span>
                        ) : qc.isUnanswered ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            <MinusCircle className="w-3.5 h-3.5" />
                            Em branco
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                            <XCircle className="w-3.5 h-3.5" />
                            Errou
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Enunciado da Questão */}
                    <div className="text-xs sm:text-sm text-slate-200 leading-relaxed font-normal">
                      {qc.statement}
                    </div>

                    {/* Alternativas */}
                    <div className="space-y-2 pt-1">
                      {qc.options && qc.options.length > 0 ? (
                        qc.options.map(opt => {
                          const isSelected = qc.selectedOptionId === opt.id;
                          const isOfficialCorrect = qc.correctOptionId === opt.id;

                          let optionStyles = 'bg-[#0E1524] border-slate-800 text-slate-300';
                          let indicator = null;

                          if (isSelected && isOfficialCorrect) {
                            // Aluno acertou
                            optionStyles =
                              'bg-emerald-950/30 border-emerald-500/60 text-emerald-200 font-semibold';
                            indicator = (
                              <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                <Check className="w-3 h-3" /> Sua resposta (Correta)
                              </span>
                            );
                          } else if (isSelected && !isOfficialCorrect) {
                            // Aluno errou
                            optionStyles =
                              'bg-rose-950/30 border-rose-500/60 text-rose-200 font-semibold';
                            indicator = (
                              <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                <X className="w-3 h-3" /> Sua resposta
                              </span>
                            );
                          } else if (isOfficialCorrect) {
                            // Gabarito correto
                            optionStyles =
                              'bg-emerald-950/20 border-emerald-500/40 text-emerald-300 font-medium';
                            indicator = (
                              <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <Check className="w-3 h-3" /> Gabarito Oficial
                              </span>
                            );
                          }

                          return (
                            <div
                              key={opt.id}
                              className={`p-3 rounded-xl border flex items-start gap-3 text-xs sm:text-sm leading-relaxed ${optionStyles}`}
                            >
                              <span
                                className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                                  isSelected && isOfficialCorrect
                                    ? 'bg-emerald-600 text-white'
                                    : isSelected && !isOfficialCorrect
                                    ? 'bg-rose-600 text-white'
                                    : isOfficialCorrect
                                    ? 'bg-emerald-700/80 text-white'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {opt.id}
                              </span>

                              <span className="pt-0.5 flex-1">{opt.text}</span>

                              {indicator}
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-xs text-slate-400">
                          Gabarito da questão: <strong className="text-white">{qc.correctOptionId}</strong>
                        </div>
                      )}
                    </div>

                    {/* Resolução Pedagógica Comentada (Expandível) */}
                    {qc.explanation && (
                      <div className="pt-2">
                        <button
                          onClick={() => toggleQuestionExpansion(qc.questionId)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>
                            {isExpanded
                              ? 'Ocultar Resolução Comentada'
                              : 'Ver Resolução Pedagógica'}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {isExpanded && (
                          <div className="mt-3 p-4 rounded-xl bg-blue-950/20 border border-blue-500/20 space-y-1.5 text-xs sm:text-sm text-blue-100/90 leading-relaxed animate-fade-in">
                            <span className="font-bold text-blue-300 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                              Resolução Pedagógica Norto:
                            </span>
                            <p className="pt-1 whitespace-pre-line">{qc.explanation}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 text-sm text-slate-400 bg-[#111827] rounded-2xl border border-slate-800 p-6">
                Nenhuma questão encontrada para os filtros selecionados.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 9. Barra de Ações Inferior */}
      <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Button
          variant="secondary"
          size="md"
          icon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => navigate('/app/simulados')}
        >
          Voltar aos Simulados
        </Button>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="md"
            icon={<RotateCcw className="w-4 h-4" />}
            onClick={() => navigate(`/app/simulados/${simulationId}`)}
          >
            Refazer Simulado
          </Button>

          <Button
            variant="secondary"
            size="md"
            icon={<Sparkles className="w-4 h-4 text-blue-400" />}
            onClick={() => navigate('/app/inicio')}
          >
            Ir para Meu Painel
          </Button>
        </div>
      </div>
    </div>
  );
};
