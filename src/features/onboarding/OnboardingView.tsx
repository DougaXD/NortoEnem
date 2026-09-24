import React, { useState, useEffect } from 'react';
import { useRouter } from '../../app/router/RouterContext';
import { useAuth } from '../../providers/AuthProvider';
import { OnboardingService } from '../../services/onboardingService';
import { KNOWLEDGE_AREAS } from '../../config/theme';
import type { SchoolYearOption, StudyShift, KnowledgeAreaId, StudentProfile } from '../../types';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Clock,
  Calendar,
  CheckCircle2,
  BookOpen,
  Target,
  Bell,
  User,
  Compass,
  AlertCircle,
  Loader2,
} from 'lucide-react';

const SCHOOL_YEARS: Array<{ id: SchoolYearOption; label: string; desc: string }> = [
  { id: '1ano', label: '1º ano do Ensino Médio', desc: 'Iniciando o ciclo preparatório' },
  { id: '2ano', label: '2º ano do Ensino Médio', desc: 'Consolidando base para aprofundamento' },
  { id: '3ano', label: '3º ano do Ensino Médio', desc: 'Foco total nas provas deste ano' },
  { id: 'cursinho', label: 'Cursinho Pré-Vestibular', desc: 'Dedicação exclusiva para aprovação' },
  { id: 'graduado', label: 'Já formado / Segunda graduação', desc: 'Retomando a rotina de estudos' },
];

const OBJECTIVES = [
  { id: 'enem_geral', label: 'Quero me preparar para o ENEM 2026', desc: 'Construir base forte para pontuação competitiva' },
  { id: 'curso_concorrido', label: 'Quero melhorar minha nota para curso concorrido', desc: 'Medicina, Direito, Engenharias e afins' },
  { id: 'fortalecer_fracas', label: 'Quero fortalecer minhas matérias com mais dificuldade', desc: 'Superar bloqueios específicos' },
  { id: 'rotina_disciplina', label: 'Quero criar uma rotina de estudos consistente', desc: 'Organização diária e constância' },
  { id: 'outro', label: 'Outro objetivo', desc: 'Descreva sua meta personalizada' },
];

const TIME_OPTIONS = [
  { minutes: 30, label: '30 minutos', badge: 'Rotina Leve' },
  { minutes: 60, label: '1 hora', badge: 'Recomendado' },
  { minutes: 90, label: '1 hora e 30 min', badge: 'Ritmo Forte' },
  { minutes: 120, label: '2 horas', badge: 'Intensivo' },
  { minutes: 180, label: '3 horas ou mais', badge: 'Foco Total' },
];

const SHIFTS: Array<{ id: StudyShift; label: string; timeRange: string }> = [
  { id: 'morning', label: 'Manhã', timeRange: '06h às 12h' },
  { id: 'afternoon', label: 'Tarde', timeRange: '12h às 18h' },
  { id: 'night', label: 'Noite', timeRange: '18h às 23h' },
];

const DAYS_OF_WEEK = [
  { id: 'segunda', label: 'Seg' },
  { id: 'terca', label: 'Ter' },
  { id: 'quarta', label: 'Qua' },
  { id: 'quinta', label: 'Qui' },
  { id: 'sexta', label: 'Sex' },
  { id: 'sabado', label: 'Sáb' },
  { id: 'domingo', label: 'Dom' },
];

const AREAS_LIST: Array<{ id: KnowledgeAreaId; label: string }> = [
  { id: 'MT', label: 'Matemática e suas Tecnologias' },
  { id: 'CN', label: 'Ciências da Natureza (Física, Química, Biologia)' },
  { id: 'LC', label: 'Linguagens, Códigos e Interpretação' },
  { id: 'CH', label: 'Ciências Humanas (História, Geo, Filo, Socio)' },
  { id: 'RED', label: 'Redação Nota 1000' },
];

export const OnboardingView: React.FC = () => {
  const { navigate } = useRouter();
  const { firebaseUser, studentProfile } = useAuth();

  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [fullName, setFullName] = useState<string>('');
  const [schoolYear, setSchoolYear] = useState<SchoolYearOption>('3ano');
  const [goal, setGoal] = useState<string>('enem_geral');
  const [goalCustomDetail, setGoalCustomDetail] = useState<string>('');
  const [dailyMinutes, setDailyMinutes] = useState<number>(60);
  const [preferredShifts, setPreferredShifts] = useState<StudyShift[]>(['afternoon']);
  const [preferredDays, setPreferredDays] = useState<string[]>([
    'segunda',
    'terca',
    'quarta',
    'quinta',
    'sexta',
  ]);
  const [weakAreas, setWeakAreas] = useState<string[]>(['MT']);
  const [notificationPreference, setNotificationPreference] = useState<'yes' | 'later'>('yes');

  // Inicializa dados existentes do usuário se disponíveis
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!firebaseUser) return;
      try {
        const existing = await OnboardingService.getStudentProfile(firebaseUser.uid);
        if (!isMounted) return;

        if (existing) {
          if (existing.name) setFullName(existing.name);
          else if (firebaseUser.displayName) setFullName(firebaseUser.displayName);

          if (existing.schoolYear) setSchoolYear(existing.schoolYear);
          if (existing.goal) setGoal(existing.goal);
          if (existing.goalCustomDetail) setGoalCustomDetail(existing.goalCustomDetail);
          if (existing.dailyStudyMinutes) setDailyMinutes(existing.dailyStudyMinutes);
          if (existing.preferredStudyTimes) setPreferredShifts(existing.preferredStudyTimes);
          if (existing.preferredStudyDays) setPreferredDays(existing.preferredStudyDays);
          if (existing.weakAreas) setWeakAreas(existing.weakAreas);
          if (existing.notificationPreference) setNotificationPreference(existing.notificationPreference);

          if (existing.onboardingCurrentStep && existing.onboardingCurrentStep >= 1 && existing.onboardingCurrentStep <= 6) {
            setStep(existing.onboardingCurrentStep);
          }
        } else if (firebaseUser.displayName) {
          setFullName(firebaseUser.displayName);
        }
      } catch (err) {
        console.warn('Aviso ao carregar dados do perfil:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [firebaseUser]);

  const handleNext = async () => {
    if (!firebaseUser) return;
    setErrorMsg(null);
    setSaving(true);

    const payload: Partial<StudentProfile> = {
      name: fullName.trim() || firebaseUser.displayName || 'Estudante Norto',
      schoolYear,
      goal,
      goalCustomDetail: goal === 'outro' ? goalCustomDetail : '',
      dailyStudyMinutes: dailyMinutes,
      preferredStudyTimes: preferredShifts,
      preferredStudyDays: preferredDays,
      weakAreas,
      notificationPreference,
    };

    try {
      if (step < 6) {
        const nextStep = step + 1;
        await OnboardingService.saveOnboardingStep(firebaseUser.uid, nextStep, payload);
        setStep(nextStep);
      } else {
        // Conclusão do onboarding
        await OnboardingService.completeOnboarding(firebaseUser.uid, payload);
        // Avança direto para o diagnóstico
        navigate('/diagnostico');
      }
    } catch (e: any) {
      console.error('Erro ao salvar progresso:', e);
      setErrorMsg('Não foi possível salvar esta etapa no servidor. Verifique sua conexão e tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const toggleShift = (shiftId: StudyShift) => {
    if (preferredShifts.includes(shiftId)) {
      if (preferredShifts.length > 1) {
        setPreferredShifts(preferredShifts.filter(s => s !== shiftId));
      }
    } else {
      setPreferredShifts([...preferredShifts, shiftId]);
    }
  };

  const toggleDay = (dayId: string) => {
    if (preferredDays.includes(dayId)) {
      if (preferredDays.length > 1) {
        setPreferredDays(preferredDays.filter(d => d !== dayId));
      }
    } else {
      setPreferredDays([...preferredDays, dayId]);
    }
  };

  const toggleArea = (areaLabel: string) => {
    if (weakAreas.includes(areaLabel)) {
      setWeakAreas(weakAreas.filter(a => a !== areaLabel));
    } else {
      setWeakAreas([...weakAreas, areaLabel]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
        <p className="text-sm text-slate-400 font-medium">Carregando seu plano de personalização...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[88vh] py-8 px-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md rounded-2xl p-6 sm:p-8 shadow-2xl">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-5 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">
                Personalização Norto ENEM
              </span>
              <h1 className="text-base sm:text-lg font-bold text-slate-100">
                Configuração do Seu Perfil de Estudos
              </h1>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold text-slate-300">Etapa {step} de 6</span>
            <div className="w-24 h-1.5 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${(step / 6) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: Quem é você? */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-100">Quem é você?</h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Vamos personalizar sua rotina de acordo com seu momento atual de estudos.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Como devemos te chamar?
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Seu nome completo"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Qual é o seu momento escolar atual?
                </label>
                <div className="grid grid-cols-1 gap-2.5">
                  {SCHOOL_YEARS.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSchoolYear(item.id)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        schoolYear === item.id
                          ? 'bg-blue-600/15 border-blue-500 text-white shadow-sm'
                          : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="text-sm font-semibold">{item.label}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{item.desc}</div>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          schoolYear === item.id ? 'border-blue-500 bg-blue-500' : 'border-slate-600'
                        }`}
                      >
                        {schoolYear === item.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Qual seu objetivo? */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-100">Qual é o seu objetivo principal?</h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Isso nos ajuda a calibrar a densidade do plano e os alertas de foco.
              </p>
            </div>

            <div className="space-y-2.5">
              {OBJECTIVES.map(obj => (
                <button
                  key={obj.id}
                  type="button"
                  onClick={() => setGoal(obj.id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    goal === obj.id
                      ? 'bg-blue-600/15 border-blue-500 text-white shadow-sm'
                      : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="text-sm font-semibold">{obj.label}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{obj.desc}</div>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ml-3 ${
                      goal === obj.id ? 'border-blue-500 bg-blue-500' : 'border-slate-600'
                    }`}
                  >
                    {goal === obj.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </button>
              ))}

              {goal === 'outro' && (
                <div className="pt-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Descreva resumidamente seu objetivo:
                  </label>
                  <input
                    type="text"
                    value={goalCustomDetail}
                    onChange={e => setGoalCustomDetail(e.target.value)}
                    placeholder="Ex: Medicina na USP / Fuvest + ENEM 820+"
                    className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: Quanto tempo você pode estudar por dia? */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-100">
                Quanto tempo você pode estudar por dia?
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Seja realista. É melhor estudar 1 hora com qualidade todos os dias do que sobrecarregar.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TIME_OPTIONS.map(opt => (
                <button
                  key={opt.minutes}
                  type="button"
                  onClick={() => setDailyMinutes(opt.minutes)}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    dailyMinutes === opt.minutes
                      ? 'bg-blue-600/15 border-blue-500 text-white shadow-md'
                      : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-medium">
                      {opt.badge}
                    </span>
                    <Clock
                      className={`w-4 h-4 ${
                        dailyMinutes === opt.minutes ? 'text-blue-400' : 'text-slate-500'
                      }`}
                    />
                  </div>
                  <div>
                    <div className="text-base font-bold text-slate-100">{opt.label}</div>
                    <div className="text-xs text-slate-400 mt-0.5">Meta diária planejada</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 4: Turnos e Dias */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-100">
                Quando prefere estudar e em quais dias?
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Selecione os turnos em que seu foco costuma ser maior e seus dias disponíveis.
              </p>
            </div>

            {/* Turnos */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Turnos preferidos (seleção múltipla):
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {SHIFTS.map(shift => {
                  const isSelected = preferredShifts.includes(shift.id);
                  return (
                    <button
                      key={shift.id}
                      type="button"
                      onClick={() => toggleShift(shift.id)}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600/15 border-blue-500 text-white'
                          : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold text-slate-200">{shift.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{shift.timeRange}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dias da semana */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Dias de estudo na semana:
              </label>
              <div className="grid grid-cols-7 gap-2">
                {DAYS_OF_WEEK.map(d => {
                  const isSelected = preferredDays.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => toggleDay(d.id)}
                      className={`h-11 rounded-xl border font-bold text-xs transition-all cursor-pointer flex items-center justify-center ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                          : 'bg-slate-950/40 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                {preferredDays.length} {preferredDays.length === 1 ? 'dia ativo' : 'dias ativos'} por semana.
              </p>
            </div>
          </div>
        )}

        {/* STEP 5: Áreas com maior dificuldade */}
        {step === 5 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-100">
                Quais áreas você considera mais desafiadoras?
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Sua autopercepção ajuda a equilibrar o diagnóstico e a priorização inicial de tópicos.
              </p>
            </div>

            <div className="space-y-2.5">
              {AREAS_LIST.map(area => {
                const isSelected = weakAreas.includes(area.label);
                return (
                  <button
                    key={area.id}
                    type="button"
                    onClick={() => toggleArea(area.label)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-600/15 border-blue-500 text-white shadow-sm'
                        : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          area.id === 'MT'
                            ? 'bg-purple-500'
                            : area.id === 'CN'
                            ? 'bg-emerald-500'
                            : area.id === 'LC'
                            ? 'bg-blue-500'
                            : area.id === 'CH'
                            ? 'bg-amber-500'
                            : 'bg-pink-500'
                        }`}
                      />
                      <span className="text-sm font-semibold">{area.label}</span>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                        isSelected ? 'border-blue-500 bg-blue-500' : 'border-slate-600'
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 6: Lembretes & Conclusão */}
        {step === 6 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-100">
                Deseja utilizar lembretes de estudo?
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Você deseja receber alertas para manter sua rotina nos horários escolhidos?
              </p>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setNotificationPreference('yes')}
                className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  notificationPreference === 'yes'
                    ? 'bg-blue-600/15 border-blue-500 text-white shadow-sm'
                    : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold">Sim, me ajude a manter a disciplina</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Receber notificações de estudo nos turnos selecionados
                    </div>
                  </div>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    notificationPreference === 'yes' ? 'border-blue-500 bg-blue-500' : 'border-slate-600'
                  }`}
                >
                  {notificationPreference === 'yes' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setNotificationPreference('later')}
                className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  notificationPreference === 'later'
                    ? 'bg-blue-600/15 border-blue-500 text-white shadow-sm'
                    : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold">Agora não, vou gerenciar sozinho</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Você pode ativar a qualquer momento nas configurações
                    </div>
                  </div>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    notificationPreference === 'later' ? 'border-blue-500 bg-blue-500' : 'border-slate-600'
                  }`}
                >
                  {notificationPreference === 'later' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </button>
            </div>

            <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-500/20 text-blue-200 text-xs">
              <div className="font-semibold text-blue-300 mb-1 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                Tudo pronto para o próximo passo!
              </div>
              Ao confirmar, seu perfil estará salvo e você poderá realizar a prova de triagem rápida para descobrirmos seu nível inicial.
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="mt-8 pt-5 border-t border-slate-800/80 flex items-center justify-between gap-4">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-800 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={handleNext}
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : step === 6 ? (
              <>
                <span>Iniciar Diagnóstico</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <span>Continuar</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
