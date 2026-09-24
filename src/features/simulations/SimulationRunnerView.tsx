import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type {
  Simulation,
  SimulationSession,
  SimulationAnswer,
  Question,
  SimulationSection
} from '../../types';
import { SimulationService } from '../../services/simulationService';
import { QuestionService } from '../../services/questionService';
import { SimulationGradingService } from '../../services/simulationGradingService';
import { useAuth } from '../../providers/AuthProvider';
import { SimulationHeader } from './components/SimulationHeader';
import { SimulationQuestionViewer } from './components/SimulationQuestionViewer';
import { SimulationQuestionMap } from './components/SimulationQuestionMap';
import { SimulationFinishModal } from './components/SimulationFinishModal';
import { SimulationExitModal } from './components/SimulationExitModal';
import { SimulationTimeExpiredModal } from './components/SimulationTimeExpiredModal';
import { SimulationCompletedState } from './components/SimulationCompletedState';
import { LoadingState, ErrorState } from '../../components/feedback/StateViews';
import { Button } from '../../components/ui/DesignSystem';

export interface SimulationRunnerViewProps {
  simulationId: string;
  onExitToDetail?: () => void;
  onGoToCatalog?: () => void;
  onGoToHome?: () => void;
  onGoToResult?: (resultId: string, sessionId: string) => void;
}

export const SimulationRunnerView: React.FC<SimulationRunnerViewProps> = ({
  simulationId,
  onExitToDetail,
  onGoToCatalog,
  onGoToHome,
  onGoToResult
}) => {
  const { user, firebaseUser } = useAuth();
  const userId = user?.uid || firebaseUser?.uid || 'guest_student';

  // 1. Estados Principais da Execução
  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [session, setSession] = useState<SimulationSession | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // Respostas e Revisão locais
  const [answers, setAnswers] = useState<Record<string, SimulationAnswer>>({});
  const [reviewSet, setReviewSet] = useState<Set<string>>(new Set());

  // Estados de Controle
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isSubmittingFinish, setIsSubmittingFinish] = useState<boolean>(false);
  const [finishError, setFinishError] = useState<string | null>(null);

  // Modais de Controle
  const [isMapDrawerOpen, setIsMapDrawerOpen] = useState<boolean>(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState<boolean>(false);
  const [isFinishModalOpen, setIsFinishModalOpen] = useState<boolean>(false);
  const [isExpiredModalOpen, setIsExpiredModalOpen] = useState<boolean>(false);

  // Referência para tempo decorrido por questão e debounce de gravação
  const questionStartTimeRef = useRef<number>(Date.now());
  const questionTimesRef = useRef<Record<string, number>>({});
  const saveTimeoutRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Limpeza de timers ao desmontar componente
  useEffect(() => {
    return () => {
      Object.values(saveTimeoutRef.current).forEach((t: ReturnType<typeof setTimeout>) => clearTimeout(t));
    };
  }, []);

  // 2. Inicialização e Recuperação Resiliente da Sessão
  useEffect(() => {
    let isMounted = true;

    async function initSimulationEngine() {
      setLoading(true);
      setError(null);

      try {
        // A. Carrega o modelo do simulado
        const loadedSim = await SimulationService.getSimulationById(simulationId);
        if (!loadedSim) {
          if (isMounted) setError(`Simulado "${simulationId}" não encontrado.`);
          return;
        }

        if (loadedSim.status !== 'published') {
          if (isMounted) setError('Este simulado não está disponível para execução.');
          return;
        }

        if (!isMounted) return;
        setSimulation(loadedSim);

        // B. Recupera sessão ativa ou cria nova sessão
        let currentSession = await SimulationService.getActiveSession(userId, loadedSim.id);

        if (!currentSession) {
          // Verifica se o usuário já finalizou este simulado anteriormente
          const latestSession = await SimulationService.getLatestUserSession(userId, loadedSim.id);
          if (latestSession && (latestSession.status === 'completed' || latestSession.status === 'expired')) {
            const hasResult = await SimulationService.getResultBySessionId(latestSession.id, userId);
            if (hasResult) {
              if (isMounted) {
                setSession(latestSession);
                setIsCompleted(true);
                setLoading(false);
              }
              return;
            }
          }

          // Cria nova sessão para o estudante
          currentSession = await SimulationService.createSession(userId, loadedSim.id);
        }

        if (!isMounted) return;

        // Se a sessão recuperada já estiver completada ou expirada
        if (currentSession.status === 'completed') {
          setSession(currentSession);
          setIsCompleted(true);
          setLoading(false);
          return;
        }

        if (currentSession.status === 'expired') {
          const existingRes = await SimulationService.getResultBySessionId(currentSession.id, userId);
          if (existingRes) {
            setSession(currentSession);
            setIsCompleted(true);
            setLoading(false);
            return;
          }
          setSession(currentSession);
          setIsExpiredModalOpen(true);
          setLoading(false);
          return;
        }

        setSession(currentSession);

        // C. Determina a ordem oficial de questões (respeitando seções ou questionIds)
        let orderedIds: string[] = [];
        if (loadedSim.sections && loadedSim.sections.length > 0) {
          const sortedSections = [...loadedSim.sections].sort((a, b) => a.order - b.order);
          orderedIds = sortedSections.flatMap(sec => sec.questionIds);
        } else {
          orderedIds = loadedSim.questionIds || [];
        }

        // D. Carrega as questões completas e sanitiza respostas do runtime de execução
        const loadedQuestionsRaw = await QuestionService.getQuestionsByIds(orderedIds);
        if (loadedQuestionsRaw.length === 0) {
          if (isMounted) {
            setError('Nenhuma questão foi carregada para este simulado. Verifique os dados do exame.');
          }
          return;
        }

        // Sanitização de segurança: Remove chaves de gabarito e resolução do estado do executor
        const sanitizedQuestions: Question[] = loadedQuestionsRaw.map(q => {
          const {
            correctOptionId: _cId,
            correctAnswer: _cA,
            explanation: _exp,
            solution: _sol,
            ...safeQuestion
          } = q as unknown as Record<string, unknown>;
          return safeQuestion as unknown as Question;
        });

        if (!isMounted) return;
        setQuestions(sanitizedQuestions);

        // E. Carrega respostas já salvas da subcoleção segura
        const savedAnswers = await SimulationService.getSessionAnswers(currentSession.id);
        if (isMounted) {
          setAnswers(savedAnswers);

          // Restaura tempos acumulados por questão
          const restoredTimes: Record<string, number> = {};
          const initialReviews = new Set<string>();
          Object.entries(savedAnswers).forEach(([qId, ans]) => {
            if (ans.markedForReview) {
              initialReviews.add(qId);
            }
            if (ans.timeSpentSeconds) {
              restoredTimes[qId] = ans.timeSpentSeconds;
            }
          });
          questionTimesRef.current = restoredTimes;
          setReviewSet(initialReviews);

          // Restaura índice da questão corrente salvo na sessão
          const restoredIndex = Math.min(
            Math.max(0, currentSession.currentQuestionIndex || 0),
            sanitizedQuestions.length - 1
          );
          setCurrentIndex(restoredIndex);
          questionStartTimeRef.current = Date.now();
        }
      } catch (err) {
        console.error('Erro ao inicializar motor de simulado:', err);
        if (isMounted) {
          setError('Ocorreu um erro ao carregar o simulado. Por favor, tente novamente.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    initSimulationEngine();

    return () => {
      isMounted = false;
    };
  }, [simulationId, userId]);

  // 3. Mapeamento de Seções para a Questão Corrente
  const currentQuestion = questions[currentIndex] || null;

  const currentSection = useMemo<SimulationSection | null>(() => {
    if (!simulation?.sections || !currentQuestion) return null;
    return (
      simulation.sections.find(sec => sec.questionIds.includes(currentQuestion.id)) || null
    );
  }, [simulation, currentQuestion]);

  // Contadores analíticos
  const questionIds = useMemo(() => questions.map(q => q.id), [questions]);
  const answeredCount = useMemo(() => {
    return questionIds.filter(id => Boolean(answers[id]?.answered && answers[id]?.selectedAnswer)).length;
  }, [questionIds, answers]);
  const unansweredCount = questions.length - answeredCount;
  const reviewCount = reviewSet.size;

  // 4. Autosave e Seleção de Alternativas com Debounce Seguro
  const saveAnswerToService = useCallback(
    (
      questionId: string,
      selectedAnswer: string | null,
      marked: boolean,
      immediate: boolean = false
    ) => {
      if (!session || isCompleted || isExpiredModalOpen) return;

      if (saveTimeoutRef.current[questionId]) {
        clearTimeout(saveTimeoutRef.current[questionId]);
        delete saveTimeoutRef.current[questionId];
      }

      const executeSave = async () => {
        setSaveStatus('saving');

        // Calcula tempo decorrido na questão
        const elapsedNow = Math.floor((Date.now() - questionStartTimeRef.current) / 1000);
        const prevSpent = questionTimesRef.current[questionId] || 0;
        const totalSpent = prevSpent + elapsedNow;
        questionTimesRef.current[questionId] = totalSpent;
        questionStartTimeRef.current = Date.now();

        const answered = Boolean(selectedAnswer);

        try {
          await SimulationService.saveAnswer(session.id, questionId, {
            selectedAnswer,
            answered,
            markedForReview: marked,
            timeSpentSeconds: totalSpent
          });

          // Atualiza progresso da sessão
          const updatedAnswers: Record<string, SimulationAnswer> = {
            ...answers,
            [questionId]: {
              questionId,
              selectedAnswer,
              answered,
              markedForReview: marked,
              timeSpentSeconds: totalSpent,
              answeredAt: answered ? new Date().toISOString() : null,
              updatedAt: new Date().toISOString()
            }
          };
          const nextAnsweredCount = Object.values(updatedAnswers).filter(
            (a) => a.answered && Boolean(a.selectedAnswer)
          ).length;

          await SimulationService.updateSessionProgress(session.id, {
            currentQuestionIndex: currentIndex,
            answeredQuestions: nextAnsweredCount
          });

          setSaveStatus('saved');
        } catch (err) {
          console.warn('Aviso: falha temporária ao sincronizar resposta com servidor:', err);
          setSaveStatus('error');
        }
      };

      if (immediate) {
        executeSave();
      } else {
        saveTimeoutRef.current[questionId] = setTimeout(executeSave, 300);
      }
    },
    [session, currentIndex, answers, isCompleted, isExpiredModalOpen]
  );

  const handleSelectOption = useCallback(
    (optionId: string) => {
      if (!currentQuestion || isCompleted || isExpiredModalOpen) return;

      const qId = currentQuestion.id;
      const isMarked = reviewSet.has(qId);

      // Atualização otimista imediata na UI
      setAnswers(prev => ({
        ...prev,
        [qId]: {
          questionId: qId,
          selectedAnswer: optionId,
          answered: true,
          markedForReview: isMarked,
          timeSpentSeconds: questionTimesRef.current[qId] || 0,
          answeredAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }));

      saveAnswerToService(qId, optionId, isMarked);
    },
    [currentQuestion, isCompleted, isExpiredModalOpen, reviewSet, saveAnswerToService]
  );

  const handleClearOption = useCallback(() => {
    if (!currentQuestion || isCompleted || isExpiredModalOpen) return;

    const qId = currentQuestion.id;
    const isMarked = reviewSet.has(qId);

    setAnswers(prev => ({
      ...prev,
      [qId]: {
        questionId: qId,
        selectedAnswer: null,
        answered: false,
        markedForReview: isMarked,
        timeSpentSeconds: questionTimesRef.current[qId] || 0,
        answeredAt: null,
        updatedAt: new Date().toISOString()
      }
    }));

    saveAnswerToService(qId, null, isMarked);
  }, [currentQuestion, isCompleted, isExpiredModalOpen, reviewSet, saveAnswerToService]);

  const handleToggleReview = useCallback(() => {
    if (!currentQuestion || isCompleted || isExpiredModalOpen) return;

    const qId = currentQuestion.id;
    const nextMarked = !reviewSet.has(qId);

    setReviewSet(prev => {
      const next = new Set(prev);
      if (nextMarked) {
        next.add(qId);
      } else {
        next.delete(qId);
      }
      return next;
    });

    const currentAns = answers[qId]?.selectedAnswer ?? null;
    saveAnswerToService(qId, currentAns, nextMarked, true);
  }, [currentQuestion, isCompleted, isExpiredModalOpen, reviewSet, answers, saveAnswerToService]);

  // 5. Navegação entre Questões
  const handleGoToIndex = useCallback(
    (newIndex: number) => {
      if (newIndex < 0 || newIndex >= questions.length || newIndex === currentIndex) return;

      // Acumula tempo gasto na questão saindo
      if (currentQuestion) {
        const elapsed = Math.floor((Date.now() - questionStartTimeRef.current) / 1000);
        questionTimesRef.current[currentQuestion.id] =
          (questionTimesRef.current[currentQuestion.id] || 0) + elapsed;
      }

      setCurrentIndex(newIndex);
      questionStartTimeRef.current = Date.now();
      setIsMapDrawerOpen(false);

      // Persiste o índice corrente na sessão
      if (session) {
        SimulationService.updateSessionProgress(session.id, {
          currentQuestionIndex: newIndex
        }).catch(err => console.warn('Erro ao atualizar índice corrente:', err));
      }
    },
    [currentIndex, questions.length, currentQuestion, session]
  );

  const handleNextQuestion = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      handleGoToIndex(currentIndex + 1);
    } else {
      setIsFinishModalOpen(true);
    }
  }, [currentIndex, questions.length, handleGoToIndex]);

  const handlePrevQuestion = useCallback(() => {
    if (currentIndex > 0) {
      handleGoToIndex(currentIndex - 1);
    }
  }, [currentIndex, handleGoToIndex]);

  // 6. Atalhos de Teclado (A-E, 1-5, Setas de Navegação, R para revisão)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignora atalhos se um modal estiver aberto ou em inputs
      if (
        isFinishModalOpen ||
        isExitModalOpen ||
        isExpiredModalOpen ||
        isCompleted ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)
      ) {
        return;
      }

      const key = e.key.toUpperCase();

      // Navegação por setas
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextQuestion();
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevQuestion();
        return;
      }

      // Marcar revisão com tecla R
      if (key === 'R') {
        e.preventDefault();
        handleToggleReview();
        return;
      }

      // Seleção de alternativas A, B, C, D, E
      const optionLetters = ['A', 'B', 'C', 'D', 'E'];
      if (optionLetters.includes(key)) {
        e.preventDefault();
        handleSelectOption(key);
        return;
      }

      // Seleção por números 1 a 5
      const numMap: Record<string, string> = {
        '1': 'A',
        '2': 'B',
        '3': 'C',
        '4': 'D',
        '5': 'E'
      };
      if (numMap[key]) {
        e.preventDefault();
        handleSelectOption(numMap[key]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleNextQuestion,
    handlePrevQuestion,
    handleToggleReview,
    handleSelectOption,
    isFinishModalOpen,
    isExitModalOpen,
    isExpiredModalOpen,
    isCompleted
  ]);

  // 7. Expiração de Tempo
  const handleTimeExpire = useCallback(async () => {
    if (isCompleted || !session) return;
    setIsExpiredModalOpen(true);
  }, [isCompleted, session]);

  // 8. Finalização da Prova
  const handleConfirmFinish = async () => {
    if (!session || isSubmittingFinish) return;

    setIsSubmittingFinish(true);
    setFinishError(null);

    try {
      // 1. Limpa timeouts de debounce pendentes para evitar sobrescritas tardias
      Object.values(saveTimeoutRef.current).forEach((t: ReturnType<typeof setTimeout>) => clearTimeout(t));
      saveTimeoutRef.current = {};

      // 2. Registra última atualização de tempo na questão ativa
      if (currentQuestion) {
        const elapsed = Math.floor((Date.now() - questionStartTimeRef.current) / 1000);
        questionTimesRef.current[currentQuestion.id] =
          (questionTimesRef.current[currentQuestion.id] || 0) + elapsed;
      }

      // 3. Finaliza a sessão no Firestore
      const completed = await SimulationService.completeSession(session.id);
      setSession(completed);

      // 4. Consolidação de resultado da Etapa 04D (idempotente)
      try {
        await SimulationGradingService.gradeSimulationSession(session.id, userId);
      } catch (gradeErr) {
        console.warn('Correção automática de simulado em segundo plano falhou:', gradeErr);
      }

      setIsCompleted(true);
      setIsFinishModalOpen(false);
      setIsExpiredModalOpen(false);
    } catch (err) {
      console.error('Erro ao finalizar sessão de simulado:', err);
      setFinishError('Não foi possível finalizar a sessão com segurança. Por favor, verifique sua conexão e tente novamente.');
    } finally {
      setIsSubmittingFinish(false);
    }
  };

  // 9. Saída da Prova
  const handleConfirmExit = () => {
    setIsExitModalOpen(false);
    if (onExitToDetail) {
      onExitToDetail();
    } else if (onGoToCatalog) {
      onGoToCatalog();
    } else {
      window.location.href = `/app/simulados/${simulationId}`;
    }
  };

  // 10. Telas de Loading e Erro
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4">
        <LoadingState
          title="Preparando o Simulado..."
          message="Carregando caderno de questões e sincronizando ambiente seguro..."
        />
      </div>
    );
  }

  if (error || !simulation) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <ErrorState
            title="Não foi possível iniciar o simulado"
            message={error || 'Simulado não encontrado ou indisponível.'}
            actionLabel="Voltar para Simulados"
            onRetry={onGoToCatalog || onExitToDetail || (() => window.location.href = '/app/simulados')}
          />
        </div>
      </div>
    );
  }

  // 11. Tela de Conclusão da Prova
  if (isCompleted && session) {
    return (
      <div className="min-h-screen bg-[#0B0F19] py-8 px-4">
        <SimulationCompletedState
          simulationTitle={simulation.title}
          totalQuestions={questions.length}
          answeredCount={answeredCount}
          completedAt={session.completedAt || new Date().toISOString()}
          durationFormatted={
            simulation.durationSeconds
              ? `${Math.round(simulation.durationSeconds / 60)} minutos`
              : undefined
          }
          onViewResult={() => {
            if (onGoToResult) {
              onGoToResult(`result_${session.id}`, session.id);
            } else {
              window.location.href = `/app/simulados/${simulation.id}/resultado?sessionId=${session.id}`;
            }
          }}
          onGoToSimulations={onGoToCatalog || (() => window.location.href = '/app/simulados')}
          onGoToHome={onGoToHome || (() => window.location.href = '/app/inicio')}
        />
      </div>
    );
  }

  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : null;
  const isCurrentMarked = currentQuestion ? reviewSet.has(currentQuestion.id) : false;

  return (
    <div
      id="simulation-runner-container"
      className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col select-none"
    >
      {/* 1. Cabeçalho Oficial do Simulado */}
      <SimulationHeader
        title={simulation.title}
        sectionTitle={currentSection?.title}
        currentQuestionIndex={currentIndex}
        totalQuestions={questions.length}
        answeredCount={answeredCount}
        reviewCount={reviewCount}
        expiresAt={session?.expiresAt || null}
        saveStatus={saveStatus}
        onOpenQuestionMap={() => setIsMapDrawerOpen(true)}
        onExit={() => setIsExitModalOpen(true)}
        onFinish={() => setIsFinishModalOpen(true)}
        onExpire={handleTimeExpire}
      />

      {/* 2. Área Principal de Execução: Questão e Painel Lateral no Desktop */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-3 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-6 items-start">
        {/* Visualizador da Questão Corrente */}
        <div className="flex-1 w-full min-w-0">
          {currentQuestion ? (
            <SimulationQuestionViewer
              key={currentQuestion.id}
              question={currentQuestion}
              questionNumber={currentIndex + 1}
              totalQuestions={questions.length}
              selectedOption={currentAnswer?.selectedAnswer || null}
              isMarkedForReview={isCurrentMarked}
              onSelectOption={handleSelectOption}
              onClearOption={handleClearOption}
              onToggleReview={handleToggleReview}
              onNextQuestion={handleNextQuestion}
              onPrevQuestion={handlePrevQuestion}
              isFirstQuestion={currentIndex === 0}
              isLastQuestion={currentIndex === questions.length - 1}
              onFinish={() => setIsFinishModalOpen(true)}
            />
          ) : (
            <div className="p-8 text-center text-slate-400">
              Nenhuma questão selecionada.
            </div>
          )}
        </div>

        {/* Mapa de Questões no Desktop (Fixo na Lateral Direita) */}
        <div className="hidden lg:block w-80 shrink-0 sticky top-20">
          <SimulationQuestionMap
            totalQuestions={questions.length}
            currentIndex={currentIndex}
            answers={answers}
            reviewSet={reviewSet}
            questionIds={questionIds}
            onSelectIndex={handleGoToIndex}
          />
        </div>
      </main>

      {/* 3. Drawer / Modal do Mapa de Questões no Mobile */}
      {isMapDrawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mapa de Questões da Prova"
          className="lg:hidden fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4 animate-fade-in"
        >
          <div className="w-full max-w-md max-h-[88vh] overflow-hidden rounded-2xl bg-[#111827] border border-slate-800 shadow-2xl">
            <SimulationQuestionMap
              totalQuestions={questions.length}
              currentIndex={currentIndex}
              answers={answers}
              reviewSet={reviewSet}
              questionIds={questionIds}
              onSelectIndex={handleGoToIndex}
              onClose={() => setIsMapDrawerOpen(false)}
              isDrawer={true}
            />
          </div>
        </div>
      )}

      {/* 4. Modal de Confirmação de Saída */}
      <SimulationExitModal
        isOpen={isExitModalOpen}
        hasTimer={Boolean(simulation.durationSeconds && simulation.durationSeconds > 0)}
        onConfirmExit={handleConfirmExit}
        onCancel={() => setIsExitModalOpen(false)}
      />

      {/* 5. Modal de Confirmação de Finalização */}
      <SimulationFinishModal
        isOpen={isFinishModalOpen}
        totalQuestions={questions.length}
        answeredCount={answeredCount}
        unansweredCount={unansweredCount}
        reviewCount={reviewCount}
        isSubmitting={isSubmittingFinish}
        errorMessage={finishError}
        onConfirm={handleConfirmFinish}
        onCancel={() => {
          setFinishError(null);
          setIsFinishModalOpen(false);
        }}
      />

      {/* 6. Modal de Tempo Esgotado */}
      <SimulationTimeExpiredModal
        isOpen={isExpiredModalOpen}
        totalQuestions={questions.length}
        answeredCount={answeredCount}
        isSubmitting={isSubmittingFinish}
        onConfirmFinalize={handleConfirmFinish}
      />
    </div>
  );
};
