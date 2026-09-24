import React, { useState, useEffect } from 'react';
import { useRouter } from '../../app/router/RouterContext';
import { useAuth } from '../../providers/AuthProvider';
import { DiagnosticService } from '../../services/diagnosticService';
import { KNOWLEDGE_AREAS } from '../../config/theme';
import {
  getClassificationLabel,
  getClassificationBadgeStyle,
} from '../../config/diagnosticConfig';
import type { DiagnosticAttempt, DiagnosticResultSummary } from '../../types';
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Award,
  BookOpen,
  Calendar,
  Layers,
  Loader2,
  Info,
} from 'lucide-react';

export const DiagnosticResultView: React.FC = () => {
  const { navigate } = useRouter();
  const { firebaseUser, studentProfile } = useAuth();

  const [attempt, setAttempt] = useState<DiagnosticAttempt | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function loadResults() {
      if (!firebaseUser) return;
      try {
        const completed = await DiagnosticService.getUserCompletedDiagnostic(firebaseUser.uid);
        if (!isMounted) return;
        setAttempt(completed);
      } catch (err) {
        console.error('Erro ao carregar resultados do diagnóstico:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadResults();
    return () => {
      isMounted = false;
    };
  }, [firebaseUser]);

  if (loading) {
    return (
      <div className="min-h-[85vh] flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
        <p className="text-sm text-slate-300 font-semibold">Compilando suas métricas de domínio...</p>
      </div>
    );
  }

  const results: DiagnosticResultSummary | undefined = attempt?.results;

  if (!results) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-100">Nenhum resultado finalizado encontrado</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          Você ainda não concluiu a prova diagnóstica ou seu teste está em andamento.
        </p>
        <button
          onClick={() => navigate('/diagnostico')}
          className="mt-5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
        >
          Ir para o Diagnóstico
        </button>
      </div>
    );
  }

  const badgeStyle = getClassificationBadgeStyle(results.overallClassification);
  const labelText = getClassificationLabel(results.overallClassification);

  return (
    <div className="min-h-[90vh] py-8 px-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-3xl space-y-6">
        {/* Header de Parabéns e Contexto */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-md shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">
                  Mapeamento Concluído
                </span>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-100">
                  Seu Diagnóstico de Domínio Inicial
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${badgeStyle}`}>
                {labelText}
              </span>
            </div>
          </div>

          {/* Aviso Pedagógico Transparente (Sem falsa TRI) */}
          <div className="mb-6 p-3.5 rounded-xl bg-blue-950/20 border border-blue-500/20 text-blue-200 text-xs flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Este diagnóstico expressa o <strong>Índice de Domínio de Habilidades Norto</strong> baseado na precisão por área e assunto. Ele não utiliza cálculos simulados ou estimativas artificiais da TRI oficial do INEP.
            </p>
          </div>

          {/* Card Resumo de Desempenho Geral */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 font-semibold uppercase">Índice Geral</span>
              <div className="text-3xl font-extrabold text-blue-400 mt-1">
                {results.overallPercentage}%
              </div>
              <span className="text-[10px] text-slate-500">Aproveitamento global</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 font-semibold uppercase">Acertos</span>
              <div className="text-3xl font-extrabold text-emerald-400 mt-1">
                {results.totalCorrect} <span className="text-base text-slate-500 font-medium">/ {results.totalQuestions}</span>
              </div>
              <span className="text-[10px] text-slate-500">Itens resolvidos</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 font-semibold uppercase">Classificação</span>
              <div className="text-base font-bold text-slate-200 mt-2">
                {labelText}
              </div>
              <span className="text-[10px] text-slate-500">Ponto de partida pedagógico</span>
            </div>
          </div>

          {/* Mensagem Construtiva */}
          <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 text-xs sm:text-sm text-slate-300 leading-relaxed">
            <span className="font-bold text-slate-100 mr-1.5">Avaliação Pedagógica:</span>
            {results.constructiveFeedback}
          </div>
        </div>

        {/* Desempenho por Área de Conhecimento */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-md shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-400" />
              Detalhamento pelas 4 Áreas do ENEM
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {Object.values(results.areaScores).map(area => {
              const meta = KNOWLEDGE_AREAS[area.areaId as keyof typeof KNOWLEDGE_AREAS] || {
                name: area.areaName,
                color: '#3B82F6',
                bgBadge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
              };
              const areaBadge = getClassificationBadgeStyle(area.classification);
              const areaLabel = getClassificationLabel(area.classification);

              return (
                <div
                  key={area.areaId}
                  className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${meta.bgBadge}`}>
                      {meta.name}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${areaBadge}`}>
                      {areaLabel}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-baseline justify-between text-xs mb-1.5">
                      <span className="text-slate-400">Domínio da área:</span>
                      <span className="font-bold text-slate-200">
                        {area.percentage}% ({area.correct}/{area.total})
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${area.percentage}%`,
                          backgroundColor: meta.color,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pontos de Atenção e Pontos Fortes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400 mb-2">
                <AlertTriangle className="w-4 h-4" />
                Matérias de Foco Prioritário
              </div>
              <p className="text-[11px] text-slate-400 mb-3">
                Identificadas para receber reforço nas primeiras semanas:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {results.attentionPoints.map((pt, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold"
                  >
                    {pt}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 mb-2">
                <CheckCircle2 className="w-4 h-4" />
                Pontos de Força Inicial
              </div>
              <p className="text-[11px] text-slate-400 mb-3">
                Bases que você já domina e que vão sustentar sua pontuação:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {results.strongPoints.length > 0 ? (
                  results.strongPoints.map((pt, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold"
                    >
                      {pt}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 italic">
                    Conforme praticar no plano, suas forças serão consolidadas.
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Botão de Ação: Gerar Plano */}
        <div className="p-6 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-100">
              Próximo passo: Seu Plano de Estudos Personalizado
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Vamos distribuir suas atividades nos dias e horários que você escolheu.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => navigate('/app/inicio')}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Painel
            </button>
            <button
              onClick={() => navigate('/plano-inicial')}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Gerar Meu Primeiro Plano</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
