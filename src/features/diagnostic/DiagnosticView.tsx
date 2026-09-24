import React, { useState, useEffect } from 'react';
import { useRouter } from '../../app/router/RouterContext';
import { useAuth } from '../../providers/AuthProvider';
import { DiagnosticService } from '../../services/diagnosticService';
import { KNOWLEDGE_AREAS } from '../../config/theme';
import type { Question, DiagnosticAttempt } from '../../types';
import {
  Compass,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  Send,
  Loader2,
  Sparkles,
} from 'lucide-react';

export const DiagnosticView: React.FC = () => {
  const { navigate } = useRouter();
  const { firebaseUser } = useAuth();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, { selectedOptionId: string; answeredAt: string }>>({});
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [showConfirmFinish, setShowConfirmFinish] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Inicializa o teste e recupera tentativa existente
  useEffect(() => {
    let isMounted = true;

    async function initDiagnostic() {
      if (!firebaseUser) return;
      try {
        const qList = DiagnosticService.getDiagnosticQuestions();
        if (!isMounted) return;
        setQuestions(qList);

        const attempt = await DiagnosticService.getOrCreateAttempt(firebaseUser.uid);
        if (!isMounted) return;

        setAttemptId(attempt.id);
        if (attempt.answers) {
          setAnswers(attempt.answers);
        }
        if (attempt.currentQuestionIndex !== undefined && attempt.currentQuestionIndex < qList.length) {
          setCurrentIndex(attempt.currentQuestionIndex);
        }

        // Se já estava concluído, vai para a tela de resultado
        if (attempt.status === 'completed') {
          navigate('/diagnostico/resultado');
          return;
        }
      } catch (e) {
        console.error('Erro ao inicializar diagnóstico:', e);
        setErrorMsg('Erro ao conectar ao serviço de diagnóstico. Tentando modo de contingência...');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initDiagnostic();
    return () => {
      isMounted = false;
    };
  }, [firebaseUser, navigate]);

  const currentQ = questions[currentIndex];
  const selectedOption = currentQ && answers[currentQ.id]?.selectedOptionId;
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;

  const handleSelectOption = async (optionId: string) => {
    if (!currentQ || !firebaseUser || !attemptId) return;

    const answeredAt = new Date().toISOString();
    const updated = {
      ...answers,
      [currentQ.id]: { selectedOptionId: optionId, answeredAt },
    };
    setAnswers(updated);

    // Salva no Firestore
    try {
      await DiagnosticService.saveAnswer(firebaseUser.uid, attemptId, currentQ.id, optionId, currentIndex);
    } catch (e) {
      console.warn('Erro ao salvar resposta no servidor:', e);
    }
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setShowConfirmFinish(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleFinish = async () => {
    if (!firebaseUser || !attemptId) return;
    setSubmitting(true);
    setErrorMsg(null);

    try {
      await DiagnosticService.finishDiagnostic(firebaseUser.uid, attemptId, answers);
      navigate('/diagnostico/resultado');
    } catch (e: any) {
      console.error('Erro ao finalizar diagnóstico:', e);
      setErrorMsg('Houve um erro ao processar seu diagnóstico. Tente novamente.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[85vh] flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
        <p className="text-sm text-slate-300 font-semibold">Preparando seu Diagnóstico de Domínio...</p>
        <p className="text-xs text-slate-500 mt-1">Carregando itens de triagem e sincronizando progresso.</p>
      </div>
    );
  }

  if (!currentQ) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-10 h-10 text-amber-500 mb-3" />
        <h2 className="text-base font-bold text-slate-100">Nenhuma questão disponível</h2>
        <button
          onClick={() => navigate('/app/inicio')}
          className="mt-4 px-4 py-2 bg-blue-600 rounded-xl text-xs font-semibold text-white cursor-pointer"
        >
          Voltar ao Dashboard
        </button>
      </div>
    );
  }

  const areaMeta = KNOWLEDGE_AREAS[currentQ.knowledgeArea as keyof typeof KNOWLEDGE_AREAS] || {
    name: currentQ.knowledgeArea,
    color: '#3B82F6',
    bgBadge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  };

  return (
    <div className="min-h-[90vh] py-8 px-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-3xl bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden flex flex-col">
        {/* Header Superior do Simulado */}
        <div className="px-6 py-4 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border ${areaMeta.bgBadge}`}>
              {areaMeta.name}
            </span>
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">
              • {currentQ.subject} ({currentQ.topic})
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-xs font-bold text-slate-200">
                Questão {currentIndex + 1} de {totalQuestions}
              </span>
              <div className="text-[10px] text-slate-400">
                {answeredCount} de {totalQuestions} respondidas
              </div>
            </div>

            <button
              onClick={() => setShowConfirmFinish(true)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              Finalizar Teste
            </button>
          </div>
        </div>

        {/* Barra de Progresso Visual */}
        <div className="w-full h-1 bg-slate-800">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
          />
        </div>

        {/* Corpo Principal da Questão */}
        <div className="p-6 sm:p-8 flex-1 flex flex-col space-y-6">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Tag de demonstração e identificador */}
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-300">
              Item #{currentIndex + 1}
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800/80 text-slate-400">
              {currentQ.source || 'Triagem Diagnóstica Norto'}
            </span>
          </div>

          {/* Enunciado da questão */}
          <div className="text-sm sm:text-base text-slate-100 font-normal leading-relaxed whitespace-pre-line">
            {currentQ.statement}
          </div>

          {/* Alternativas de Resposta */}
          <div className="space-y-3 pt-2">
            {currentQ.options.map(opt => {
              const isSelected = selectedOption === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectOption(opt.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                    isSelected
                      ? 'bg-blue-600/15 border-blue-500 text-white shadow-sm'
                      : 'bg-slate-950/40 border-slate-800/90 text-slate-300 hover:border-slate-700 hover:bg-slate-800/30'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg border font-bold text-xs flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                  >
                    {opt.id}
                  </div>
                  <div className="text-xs sm:text-sm pt-0.5 leading-relaxed font-normal">
                    {opt.text}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Rodapé de Navegação do Simulado */}
        <div className="px-6 py-4 bg-slate-950/70 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Anterior
          </button>

          {/* Mini-mapa de questões interativo */}
          <div className="hidden sm:flex items-center gap-1.5">
            {questions.map((q, idx) => {
              const hasAnswer = Boolean(answers[q.id]);
              const isCurrent = idx === currentIndex;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                    isCurrent
                      ? 'border border-blue-500 bg-blue-600 text-white'
                      : hasAnswer
                      ? 'bg-slate-800 text-slate-200 border border-slate-700'
                      : 'bg-slate-950/60 text-slate-500 border border-slate-800/60 hover:border-slate-700'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {currentIndex < totalQuestions - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-md shadow-blue-600/20 flex items-center gap-1.5 cursor-pointer"
            >
              <span>Próxima</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowConfirmFinish(true)}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer"
            >
              <span>Revisar e Finalizar</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Modal de Confirmação de Envio */}
      {showConfirmFinish && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-left space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">Finalizar Diagnóstico?</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Você respondeu {answeredCount} de {totalQuestions} questões.
                </p>
              </div>
            </div>

            {answeredCount < totalQuestions && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                Atenção: restam {totalQuestions - answeredCount} questão(ões) sem resposta. Se finalizar agora, elas serão contabilizadas como não resolvidas.
              </div>
            )}

            <p className="text-xs text-slate-300 leading-relaxed">
              Ao concluir, o Norto calculará seu índice inicial de domínio por área e gerará automaticamente seu primeiro plano de estudos focado nas matérias prioritárias.
            </p>

            <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowConfirmFinish(false)}
                disabled={submitting}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Voltar à Prova
              </button>
              <button
                type="button"
                onClick={handleFinish}
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Calculando...</span>
                  </>
                ) : (
                  <>
                    <span>Confirmar e Ver Resultado</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
