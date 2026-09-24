import React, { useEffect, useState } from 'react';
import { useAuth } from '../../providers/AuthProvider';
import { useRouter } from '../../app/router/RouterContext';
import { Card, Button, Badge, ProgressBar } from '../../components/ui/DesignSystem';
import { LoadingState, EmptyState, ErrorState } from '../../components/feedback/StateViews';
import { KNOWLEDGE_AREAS, type KnowledgeAreaKey } from '../../config/theme';
import { DataService } from '../../services/firebase/dataService';
import { PerformanceService } from '../../services/performanceService';
import { StudyPlanService } from '../../services/studyPlanService';
import type { UserGamification, StudentTask, UserPerformanceArea, StudyPlan } from '../../types';
import {
  Flame,
  Zap,
  Target,
  Clock,
  ArrowRight,
  CheckCircle2,
  Circle,
  Sparkles,
  BookOpen,
  Calendar,
  AlertCircle,
  Check,
  Compass,
  Award,
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { firebaseUser, account, studentProfile, loading: authLoading } = useAuth();
  const { navigate } = useRouter();

  const [gamification, setGamification] = useState<UserGamification | null>(null);
  const [tasks, setTasks] = useState<StudentTask[]>([]);
  const [performanceAreas, setPerformanceAreas] = useState<Record<string, UserPerformanceArea>>({});
  const [activePlan, setActivePlan] = useState<StudyPlan | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = async () => {
    if (!firebaseUser) {
      setLoadingData(false);
      return;
    }
    setLoadingData(true);
    setLoadError(null);
    try {
      const [gamif, userTasks, areasList, plan] = await Promise.all([
        DataService.getUserGamification(firebaseUser.uid),
        StudyPlanService.getStudentTasks(firebaseUser.uid),
        PerformanceService.getUserPerformanceAreas(firebaseUser.uid),
        StudyPlanService.getActivePlan(firebaseUser.uid),
      ]);

      setGamification(gamif);
      setTasks(userTasks);
      setActivePlan(plan);

      const areaMap: Record<string, UserPerformanceArea> = {};
      areasList.forEach((a) => {
        areaMap[a.areaId] = a;
      });
      setPerformanceAreas(areaMap);
    } catch (err: any) {
      console.error('Erro ao carregar dados do dashboard:', err);
      setLoadError('Não foi possível conectar ao banco de dados do estudante. Verifique sua conexão.');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [firebaseUser]);

  const handleToggleTask = async (taskId: string, currentCompleted: boolean) => {
    const updated = !currentCompleted;
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: updated } : t))
    );
    try {
      await StudyPlanService.toggleTask(taskId, updated);
    } catch (e) {
      console.error('Erro ao atualizar tarefa:', e);
    }
  };

  if (authLoading || loadingData) {
    return <LoadingState message="Carregando seu plano e métricas..." />;
  }

  if (loadError) {
    return (
      <div className="py-12 max-w-lg mx-auto">
        <ErrorState
          title="Erro de Conexão com Firestore"
          message={loadError}
          onRetry={loadData}
        />
      </div>
    );
  }

  const studentName = studentProfile?.name || account?.displayName || 'Estudante';
  const hasOnboarding = studentProfile?.onboardingCompleted ?? false;
  const hasDiagnosed = studentProfile?.diagnosticCompleted ?? false;
  const diagnosticInProgress = studentProfile?.diagnosticStatus === 'in_progress';
  const hasStudyPlan = Boolean(activePlan) || Boolean(studentProfile?.hasActiveStudyPlan);

  const currentStreak = gamification?.currentStreak ?? 0;
  const totalXp = gamification?.totalXp ?? 0;
  const level = gamification?.level ?? 1;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* 1. Header do Estudante & Métricas Vitais */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-[#111827] to-[#141C31] p-5 sm:p-6 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
              Plano ENEM 2026
            </span>
            <Badge variant="primary" size="sm">Nível {level}</Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Olá, {studentName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {hasStudyPlan
              ? `Plano ativo • Meta de ${studentProfile?.dailyStudyMinutes || 60} minutos diários.`
              : 'Construa sua rotina de alta performance passo a passo.'}
          </p>
        </div>

        {/* Gamificação: Streak & XP */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-800">
            <Flame className={`w-5 h-5 ${currentStreak > 0 ? 'text-amber-500 fill-amber-500' : 'text-slate-500'}`} />
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Sequência</p>
              <p className="text-sm font-extrabold text-slate-100">
                {currentStreak} {currentStreak === 1 ? 'dia' : 'dias'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-800">
            <Zap className="w-5 h-5 text-blue-400 fill-blue-400/30" />
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">XP Total</p>
              <p className="text-sm font-extrabold text-slate-100">{totalXp} XP</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Banner de Estado Contextual do Estudante */}
      {!hasOnboarding ? (
        // Caso 1: Sem Onboarding
        <Card variant="elevated" className="border-blue-500/40 bg-gradient-to-br from-blue-950/40 via-[#111827] to-[#111827]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 max-w-xl">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                  Etapa 1 de 3: Personalização
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                Configure seu Perfil de Estudos Norto
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Conte-nos seus objetivos, sua disponibilidade de horário e matérias desafiadoras para calibrarmos seu plano.
              </p>
            </div>
            <Button
              variant="primary"
              size="md"
              icon={<ArrowRight className="w-4 h-4" />}
              onClick={() => navigate('/onboarding')}
              className="shrink-0"
            >
              Iniciar Onboarding
            </Button>
          </div>
        </Card>
      ) : !hasDiagnosed ? (
        // Caso 2: Onboarding pronto, Diagnóstico pendente ou em andamento
        <Card variant="elevated" className="border-purple-500/40 bg-gradient-to-br from-purple-950/30 via-[#111827] to-[#111827]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 max-w-xl">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                  Etapa 2 de 3: Diagnóstico de Domínio
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                {diagnosticInProgress ? 'Seu Diagnóstico está em Andamento' : 'Descubra seu Nível Inicial'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Uma triagem rápida nas 4 áreas do conhecimento do ENEM para identificar com precisão seus pontos de reforço.
              </p>
            </div>
            <Button
              variant="primary"
              size="md"
              icon={<ArrowRight className="w-4 h-4" />}
              onClick={() => navigate('/diagnostico')}
              className="shrink-0 bg-purple-600 hover:bg-purple-500 shadow-purple-600/30"
            >
              {diagnosticInProgress ? 'Continuar Prova' : 'Iniciar Diagnóstico'}
            </Button>
          </div>
        </Card>
      ) : !hasStudyPlan ? (
        // Caso 3: Diagnóstico pronto, Plano ainda não gerado
        <Card variant="elevated" className="border-emerald-500/40 bg-gradient-to-br from-emerald-950/30 via-[#111827] to-[#111827]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 max-w-xl">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Etapa 3 de 3: Plano de Estudos
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                Diagnóstico Concluído com Sucesso!
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Seu índice inicial foi calculado. Gere agora seu cronograma semanal personalizado e equilibrado.
              </p>
            </div>
            <Button
              variant="primary"
              size="md"
              icon={<ArrowRight className="w-4 h-4" />}
              onClick={() => navigate('/diagnostico/resultado')}
              className="shrink-0 bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30"
            >
              Ver Resultado e Gerar Plano
            </Button>
          </div>
        </Card>
      ) : (
        // Caso 4: Plano ativo e em execução!
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-200">
                {activePlan?.title || 'Plano de Estudos Norto Ativo'}
              </div>
              <div className="text-[11px] text-slate-400">
                Meta diária: {activePlan?.dailyMinutes || studentProfile?.dailyStudyMinutes || 60} minutos • Foco prioritário: {activePlan?.priorityArea || 'Matemática'}
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate('/plano-inicial')}
            className="px-3.5 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs text-slate-300 font-semibold transition-colors cursor-pointer self-start sm:self-auto"
          >
            Ver Detalhes do Plano
          </button>
        </div>
      )}

      {/* 3. Grid Principal: Módulos de Estudo e Tarefas do Dia */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Coluna 1 & 2: Áreas do Conhecimento */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-100">Áreas do Conhecimento ENEM</h2>
              <p className="text-xs text-slate-400">Índice real de domínio baseado no seu diagnóstico</p>
            </div>
            {hasDiagnosed && (
              <button
                onClick={() => navigate('/diagnostico/resultado')}
                className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 cursor-pointer"
              >
                Ver diagnóstico completo
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {(Object.keys(KNOWLEDGE_AREAS) as KnowledgeAreaKey[]).map((key) => {
              const area = KNOWLEDGE_AREAS[key];
              const areaPerf = performanceAreas[key];
              const mastery = areaPerf ? areaPerf.masteryIndex : null;

              return (
                <Card
                  key={key}
                  variant="interactive"
                  padding="md"
                  onClick={() => {
                    if (!hasDiagnosed) navigate('/diagnostico');
                    else navigate('/app/estudar');
                  }}
                  className="flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${area.bgBadge}`}>
                        {area.id}
                      </span>
                      <BookOpen className="w-4 h-4 text-slate-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-blue-400">
                        {area.name}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {key === 'RED' ? 'Dissertação e Proposta de Intervenção' : 'Teoria e questões comentadas'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                      <span>Índice de Domínio:</span>
                      <span className="font-bold text-slate-200">
                        {mastery !== null ? `${mastery}%` : 'Não avaliado'}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${mastery !== null ? mastery : 0}%`,
                          backgroundColor: area.color,
                        }}
                      />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Coluna 3: Checklist do Dia & Metas */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-100">Tarefas do Plano</h2>
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              Cronograma Ativo
            </span>
          </div>

          <Card variant="default" padding="md">
            {tasks.length === 0 ? (
              <EmptyState
                title="Sem tarefas ativas"
                description={
                  !hasDiagnosed
                    ? 'Conclua seu diagnóstico para gerar automaticamente suas atividades personalizadas.'
                    : 'Gere seu primeiro plano de estudos para carregar suas tarefas da semana.'
                }
                actionText={!hasDiagnosed ? 'Fazer Diagnóstico' : 'Gerar Plano'}
                onAction={() => (!hasDiagnosed ? navigate('/diagnostico') : navigate('/plano-inicial'))}
              />
            ) : (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {tasks.slice(0, 8).map((task) => {
                  const areaMeta = task.knowledgeArea
                    ? KNOWLEDGE_AREAS[task.knowledgeArea as keyof typeof KNOWLEDGE_AREAS]
                    : null;

                  return (
                    <div
                      key={task.id}
                      onClick={() => handleToggleTask(task.id, task.completed)}
                      className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 transition-colors cursor-pointer"
                    >
                      <button className="mt-0.5 text-blue-400 shrink-0">
                        {task.completed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-500" />
                        )}
                      </button>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {areaMeta && (
                            <span className={`text-[9px] px-1.5 py-0.2 rounded border font-bold ${areaMeta.bgBadge}`}>
                              {areaMeta.shortName}
                            </span>
                          )}
                          {task.estimatedMinutes && (
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {task.estimatedMinutes} min
                            </span>
                          )}
                        </div>
                        <p className={`text-xs font-semibold ${task.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-[11px] text-slate-400 truncate">{task.description}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Quick Stat / Meta Diária */}
          <Card variant="default" padding="md" className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Meta Diária de Estudo
              </span>
              <Clock className="w-4 h-4 text-slate-400" />
            </div>
            <ProgressBar
              value={tasks.filter(t => t.completed).length}
              max={Math.max(tasks.length, 1)}
              label={`${tasks.filter(t => t.completed).length} de ${tasks.length} atividades concluídas`}
              variant="blue"
              height="sm"
            />
            <p className="text-[11px] text-slate-400">
              Conclua suas tarefas diárias para somar pontos de sequência e XP.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};
