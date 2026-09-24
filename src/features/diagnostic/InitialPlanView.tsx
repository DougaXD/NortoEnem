import React, { useState, useEffect } from 'react';
import { useRouter } from '../../app/router/RouterContext';
import { useAuth } from '../../providers/AuthProvider';
import { StudyPlanService } from '../../services/studyPlanService';
import { DiagnosticService } from '../../services/diagnosticService';
import { OnboardingService } from '../../services/onboardingService';
import { KNOWLEDGE_AREAS } from '../../config/theme';
import type { StudyPlan, StudentTask, StudentProfile } from '../../types';
import {
  Sparkles,
  ArrowRight,
  Calendar,
  Clock,
  CheckCircle2,
  BookOpen,
  Target,
  Layers,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export const InitialPlanView: React.FC = () => {
  const { navigate } = useRouter();
  const { firebaseUser, studentProfile, refreshProfile } = useAuth();

  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [tasks, setTasks] = useState<StudentTask[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [confirming, setConfirming] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadOrCreatePlan() {
      if (!firebaseUser) return;
      try {
        // 1. Verifica se já existe um plano ativo
        const activePlan = await StudyPlanService.getActivePlan(firebaseUser.uid);
        if (activePlan) {
          if (!isMounted) return;
          setPlan(activePlan);
          const studentTasks = await StudyPlanService.getStudentTasks(firebaseUser.uid);
          if (!isMounted) return;
          setTasks(studentTasks);
          setLoading(false);
          return;
        }

        // 2. Se não existe, busca perfil e diagnóstico recente para gerar
        let profile = studentProfile;
        if (!profile) {
          profile = await OnboardingService.getStudentProfile(firebaseUser.uid);
        }

        const completedDiag = await DiagnosticService.getUserCompletedDiagnostic(firebaseUser.uid);
        const diagSummary = completedDiag?.results;

        if (profile) {
          const generated = await StudyPlanService.generateInitialPlan(
            firebaseUser.uid,
            profile,
            diagSummary
          );
          if (!isMounted) return;
          setPlan(generated.plan);
          setTasks(generated.tasks);
        }
      } catch (err: any) {
        console.error('Erro ao preparar plano de estudos:', err);
        setErrorMsg('Erro ao compor cronograma inicial.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadOrCreatePlan();
    return () => {
      isMounted = false;
    };
  }, [firebaseUser, studentProfile]);

  const handleConfirmAndGoDashboard = async () => {
    setConfirming(true);
    try {
      if (refreshProfile) {
        await refreshProfile();
      }
      navigate('/app/inicio');
    } catch (e) {
      console.warn('Erro ao atualizar estado local:', e);
      navigate('/app/inicio');
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[85vh] flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
        <p className="text-sm text-slate-300 font-semibold">Organizando suas prioridades de estudo...</p>
        <p className="text-xs text-slate-500 mt-1">Calculando carga horária e distribuindo matérias.</p>
      </div>
    );
  }

  const priorityMeta = plan?.priorityArea ? KNOWLEDGE_AREAS[plan.priorityArea as keyof typeof KNOWLEDGE_AREAS] : null;

  return (
    <div className="min-h-[90vh] py-8 px-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-3xl space-y-6">
        {/* Header do Plano */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-md shadow-2xl">
          <div className="flex items-center gap-3 border-b border-slate-800/80 pb-5 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">
                Cronograma Personalizado
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-100">
                Seu Primeiro Plano de Estudos
              </h1>
            </div>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Diretrizes Chave do Plano */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-3">
              <Clock className="w-5 h-5 text-blue-400 shrink-0" />
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Meta Diária</div>
                <div className="text-sm font-bold text-slate-100">
                  {plan?.dailyMinutes || 60} minutos / dia
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-3">
              <Target className="w-5 h-5 text-purple-400 shrink-0" />
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Foco Prioritário</div>
                <div className="text-sm font-bold text-purple-300">
                  {priorityMeta?.shortName || 'Matemática'}
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-3">
              <Layers className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Horizonte Inicial</div>
                <div className="text-sm font-bold text-slate-100">
                  7 dias estruturados
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Seu plano equilibra o reforço nos tópicos onde você mais pode elevar sua pontuação com revisões ativas das demais áreas, respeitando rigorosamente sua rotina declarada.
          </p>
        </div>

        {/* Lista das Primeiras Atividades do Plano */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-md shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-400" />
              Próximas Atividades da Sua Grade
            </h2>
            <span className="text-xs text-slate-400 font-medium">
              {tasks.length} atividades geradas
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {tasks.slice(0, 7).map((t, idx) => {
              const areaMeta = t.knowledgeArea
                ? KNOWLEDGE_AREAS[t.knowledgeArea as keyof typeof KNOWLEDGE_AREAS]
                : null;

              const categoryBadge =
                t.category === 'study'
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  : t.category === 'exercise'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20';

              const categoryLabel =
                t.category === 'study'
                  ? 'Estudo Teórico'
                  : t.category === 'exercise'
                  ? 'Treino Prático'
                  : 'Revisão Ativa';

              return (
                <div
                  key={t.id || idx}
                  className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                        Dia {idx + 1}
                      </span>
                      {areaMeta && (
                        <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${areaMeta.bgBadge}`}>
                          {areaMeta.shortName}
                        </span>
                      )}
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${categoryBadge}`}>
                        {categoryLabel}
                      </span>
                      {t.priority === 'high' && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 font-bold border border-purple-500/30">
                          Foco
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-semibold text-slate-100">{t.title}</div>
                    {t.description && (
                      <div className="text-xs text-slate-400 line-clamp-1">{t.description}</div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400 shrink-0 self-end sm:self-center">
                    <Clock className="w-3.5 h-3.5" />
                    <span>~{t.estimatedMinutes || 45} min</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ação de Conclusão */}
        <div className="p-6 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-100">
              Tudo pronto para começar sua jornada!
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Suas tarefas já foram integradas ao seu painel diário de estudos.
            </p>
          </div>

          <button
            onClick={handleConfirmAndGoDashboard}
            disabled={confirming}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {confirming ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Atualizando painel...</span>
              </>
            ) : (
              <>
                <span>Ir para o Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
