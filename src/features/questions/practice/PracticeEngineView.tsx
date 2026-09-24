import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { Question, PracticeSession } from '../../../types';
import { QuestionService } from '../../../services/questionService';
import { useAuth } from '../../../providers/AuthProvider';
import { PracticeHeader } from './PracticeHeader';
import { QuestionResolverCard } from './QuestionResolverCard';
import { PracticeSummaryCard } from './PracticeSummaryCard';
import { ExitConfirmModal } from './ExitConfirmModal';
import { LoadingState, ErrorState } from '../../../components/feedback/StateViews';
import { Button } from '../../../components/ui/DesignSystem';

export interface PracticeEngineViewProps {
  questionId: string;
  onBack: () => void;
  onGoToHome?: () => void;
}

export const PracticeEngineView: React.FC<PracticeEngineViewProps> = ({
  questionId,
  onBack,
  onGoToHome
}) => {
  const { firebaseUser, loading: authLoading } = useAuth();
  const userId = firebaseUser?.uid;

  // Estado da Sessão & Questões
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Estado da Questão Atual
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Cronômetro
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const questionStartTimeRef = useRef<string>(new Date().toISOString());

  // Modais e Conclusão
  const [showExitModal, setShowExitModal] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  // Evita duplo clique de inicialização
  const isInitializingRef = useRef<boolean>(false);

  // 1. Inicialização e Recuperação de Sessão
  useEffect(() => {
    let isMounted = true;

    if (authLoading) return;

    if (!userId) {
      setLoading(false);
      return;
    }

    async function initPractice() {
      if (isInitializingRef.current) return;
      isInitializingRef.current = true;

      setLoading(true);
      setError(null);

      try {
        // Tenta recuperar sessão ativa em andamento para este usuário autenticado
        let activeSession = await QuestionService.getActivePracticeSession(userId!);

        // Se houver sessão ativa mas que não inclui a questão solicitada, ou se a questão já foi respondida nesta sessão anterior, cria nova sessão limpa
        if (
          !activeSession ||
          !activeSession.questionIds.includes(questionId) ||
          activeSession.answers?.[questionId] ||
          activeSession.status === 'completed'
        ) {
          activeSession = await QuestionService.createPracticeSession({
            userId: userId!,
            questionIds: [questionId]
          });
        }

        if (!isMounted) return;

        setSession(activeSession);
        setCurrentIndex(activeSession.currentIndex || 0);

        // Carrega todas as questões da sessão
        const loadedQuestions: Question[] = [];
        for (const qId of activeSession.questionIds) {
          const q = await QuestionService.getQuestionById(qId);
          if (q) {
            loadedQuestions.push(q);
          }
        }

        if (!isMounted) return;

        if (loadedQuestions.length === 0) {
          setError('Nenhuma questão válida foi encontrada para esta sessão de prática.');
          return;
        }

        setQuestions(loadedQuestions);

        // Se a questão atual já foi respondida nesta sessão (ex: após refresh), recupera resposta
        const currentQ = loadedQuestions[activeSession.currentIndex || 0];
        if (currentQ && activeSession.answers[currentQ.id]) {
          setSelectedOption(activeSession.answers[currentQ.id].selectedAnswer);
          setElapsedSeconds(activeSession.answers[currentQ.id].timeSpentSeconds || 0);
        } else {
          setSelectedOption(null);
          setElapsedSeconds(0);
          questionStartTimeRef.current = new Date().toISOString();
        }

        if (activeSession.status === 'completed') {
          setIsCompleted(true);
        }
      } catch (err) {
        console.error('Erro ao inicializar sessão de prática:', err);
        if (isMounted) {
          setError('Não foi possível carregar a sessão de prática. Tente novamente.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          isInitializingRef.current = false;
        }
      }
    }

    initPractice();

    return () => {
      isMounted = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [questionId, userId, authLoading]);

  // Questão Atual
  const currentQuestion: Question | undefined = questions[currentIndex];
  const isCurrentQuestionAnswered = currentQuestion
    ? !!session?.answers[currentQuestion.id]
    : false;

  // 2. Cronômetro: roda enquanto a questão atual NÃO foi respondida e a sessão está ativa
  useEffect(() => {
    if (loading || isCompleted || isCurrentQuestionAnswered) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [loading, isCompleted, isCurrentQuestionAnswered, currentIndex]);

  // 3. Seleção de Alternativa
  const handleSelectOption = useCallback((optionId: string) => {
    if (isCurrentQuestionAnswered || isSubmitting) return;
    setSelectedOption(optionId);
    setValidationError(null);
  }, [isCurrentQuestionAnswered, isSubmitting]);

  // 4. Submissão da Resposta
  const handleSubmitAnswer = async () => {
    if (isCurrentQuestionAnswered || isSubmitting) return;

    if (!selectedOption) {
      setValidationError('Selecione uma alternativa antes de responder.');
      return;
    }

    if (!session || !currentQuestion || !userId) return;

    setIsSubmitting(true);
    setValidationError(null);

    try {
      const { session: updatedSession } = await QuestionService.savePracticeAnswer({
        sessionId: session.id,
        userId,
        question: currentQuestion,
        selectedAnswer: selectedOption,
        timeSpentSeconds: elapsedSeconds,
        startedAt: questionStartTimeRef.current
      });

      setSession(updatedSession);
    } catch (err) {
      console.error('Erro ao salvar resposta da prática:', err);
      setValidationError('Erro de conexão ao salvar sua resposta. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. Próxima Questão ou Conclusão da Sessão
  const handleNextQuestion = async () => {
    if (!session || !userId) return;

    const nextIndex = currentIndex + 1;

    // Se houver mais questões na sessão
    if (nextIndex < questions.length) {
      setCurrentIndex(nextIndex);
      const nextQ = questions[nextIndex];
      const existingAnswer = session.answers[nextQ.id];

      if (existingAnswer) {
        setSelectedOption(existingAnswer.selectedAnswer);
        setElapsedSeconds(existingAnswer.timeSpentSeconds || 0);
      } else {
        setSelectedOption(null);
        setElapsedSeconds(0);
        questionStartTimeRef.current = new Date().toISOString();
      }
      setValidationError(null);
    } else {
      // Última questão respondida -> Conclui a sessão
      setLoading(true);
      try {
        const completed = await QuestionService.finishPracticeSession(session.id, userId);
        setSession(completed);
        setIsCompleted(true);
      } catch (err) {
        console.error('Erro ao finalizar sessão de prática:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  // 6. Sair da Prática
  const handleConfirmExit = async () => {
    setShowExitModal(false);
    if (session && session.status === 'in_progress' && userId) {
      try {
        await QuestionService.abandonPracticeSession(session.id, userId);
      } catch (e) {
        console.warn('Erro ao registrar abandono de sessão:', e);
      }
    }
    onBack();
  };

  // 7. Reiniciar Prática (Praticar Novamente)
  const handleRestart = async () => {
    if (!userId) return;
    setLoading(true);
    setIsCompleted(false);
    try {
      const newSession = await QuestionService.createPracticeSession({
        userId,
        questionIds: questions.map((q) => q.id)
      });
      setSession(newSession);
      setCurrentIndex(0);
      setSelectedOption(null);
      setElapsedSeconds(0);
      questionStartTimeRef.current = new Date().toISOString();
    } catch (err) {
      console.error('Erro ao reiniciar prática:', err);
    } finally {
      setLoading(false);
    }
  };

  // Renderização de Loading / Verificação de Autenticação
  if (authLoading || (loading && !session && userId)) {
    return (
      <div className="py-20 flex flex-col items-center justify-center">
        <LoadingState message={authLoading ? 'Verificando autenticação...' : 'Preparando sua sessão de prática...'} />
      </div>
    );
  }

  // Renderização de Não Autenticado
  if (!userId) {
    return (
      <div className="py-12 flex flex-col items-center">
        <ErrorState
          title="Autenticação Necessária"
          message="Você precisa estar conectado como estudante para praticar questões."
          onRetry={onBack}
        />
        <div className="mt-4">
          <Button
            variant="secondary"
            size="md"
            icon={<ArrowLeft className="w-4 h-4" />}
            onClick={onBack}
          >
            Voltar para o Banco de Questões
          </Button>
        </div>
      </div>
    );
  }

  // Renderização de Erro
  if (error || !currentQuestion) {
    return (
      <div className="py-12 flex flex-col items-center">
        <ErrorState
          title="Não foi possível iniciar a prática"
          message={error || 'Questão indisponível no momento.'}
          onRetry={onBack}
        />
        <div className="mt-4">
          <Button
            variant="secondary"
            size="md"
            icon={<ArrowLeft className="w-4 h-4" />}
            onClick={onBack}
          >
            Voltar para o Banco de Questões
          </Button>
        </div>
      </div>
    );
  }

  // Renderização de Resumo da Sessão (Concluída)
  if (isCompleted && session) {
    return (
      <div className="py-4 sm:py-6">
        <PracticeSummaryCard
          session={session}
          onRestart={handleRestart}
          onBackToBank={onBack}
          onGoToHome={onGoToHome}
        />
      </div>
    );
  }

  const isLastQuestion = currentIndex === questions.length - 1;

  return (
    <div className="w-full max-w-4xl mx-auto py-2 sm:py-4">
      {/* Cabeçalho da Sessão com Progresso, Tempo e Ação Sair */}
      <PracticeHeader
        currentIndex={currentIndex}
        totalQuestions={questions.length}
        elapsedSeconds={elapsedSeconds}
        isAnswered={isCurrentQuestionAnswered}
        onExit={() => setShowExitModal(true)}
      />

      {/* Card Principal de Resolução */}
      <QuestionResolverCard
        question={currentQuestion}
        selectedOption={selectedOption}
        onSelectOption={handleSelectOption}
        isAnswered={isCurrentQuestionAnswered}
        isSubmitting={isSubmitting}
        validationError={validationError}
        onSubmit={handleSubmitAnswer}
        onNext={handleNextQuestion}
        isLastQuestion={isLastQuestion}
        onBack={onBack}
      />

      {/* Modal de Confirmação para Sair */}
      <ExitConfirmModal
        isOpen={showExitModal}
        onClose={() => setShowExitModal(false)}
        onConfirm={handleConfirmExit}
      />
    </div>
  );
};
