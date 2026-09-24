import { QuestionService } from '../src/services/questionService';
import { DEMO_QUESTIONS } from '../src/data/demoQuestions';

async function runPracticeEngineTests() {
  console.log('🧪 Iniciando Testes Automatizados do Motor de Prática de Questões Norto ENEM...\n');

  const testUserId = `test_student_${Date.now()}`;
  const targetQuestion = DEMO_QUESTIONS[0]; // enem_2023_mat_01

  console.log(`1. Testando criação de sessão de prática para usuário ${testUserId}...`);
  const session = await QuestionService.createPracticeSession({
    userId: testUserId,
    questionIds: [targetQuestion.id]
  });

  console.assert(session.id.startsWith('session_practice_'), 'ID da sessão deve começar com session_practice_');
  console.assert(session.mode === 'practice', 'Modo da sessão deve ser practice');
  console.assert(session.status === 'in_progress', 'Status inicial deve ser in_progress');
  console.assert(session.totalQuestions === 1, 'Total de questões deve ser 1');
  console.log('   ✅ Sessão de prática criada com sucesso:', session.id);

  console.log('\n2. Testando envio de resposta e registro de QuestionAttempt...');
  const selectedAnswer = targetQuestion.correctOptionId || targetQuestion.correctAnswer || 'A';
  const { session: updatedSession, attempt: firstAttempt } = await QuestionService.savePracticeAnswer({
    sessionId: session.id,
    userId: testUserId,
    question: targetQuestion,
    selectedAnswer,
    timeSpentSeconds: 42
  });

  console.assert(firstAttempt.id.startsWith('attempt_'), 'ID da tentativa deve começar com attempt_');
  console.assert(firstAttempt.mode === 'practice', 'Modo da tentativa deve ser practice');
  console.assert(firstAttempt.isCorrect === true, 'A tentativa deve ser correta');
  console.assert(firstAttempt.correct === true, 'Sinônimo correct deve ser true');
  console.assert(firstAttempt.timeSpentSeconds === 42, 'Tempo gasto deve ser 42 segundos');
  console.assert(firstAttempt.selectedAnswer === selectedAnswer, 'Resposta selecionada deve coincidir');
  console.assert(updatedSession.correctCount === 1, 'Contagem de acertos na sessão deve ser 1');
  console.log('   ✅ Resposta gravada e tentativa criada com sucesso:', firstAttempt.id);

  console.log('\n3. Testando repetição de questão (deve gerar NOVA tentativa sem sobrescrever)...');
  const wrongAnswer = selectedAnswer === 'A' ? 'B' : 'A';
  const { attempt: secondAttempt } = await QuestionService.savePracticeAnswer({
    sessionId: session.id,
    userId: testUserId,
    question: targetQuestion,
    selectedAnswer: wrongAnswer,
    timeSpentSeconds: 25
  });

  console.assert(secondAttempt.id !== firstAttempt.id, 'Nova tentativa DEVE ter ID diferente');
  console.assert(secondAttempt.isCorrect === false, 'Segunda tentativa deve ser incorreta');
  console.assert(secondAttempt.mode === 'practice', 'Modo deve ser practice');
  console.log('   ✅ Nova tentativa criada com sucesso sem colisão:', secondAttempt.id);

  console.log('\n4. Testando finalização da sessão de prática e métricas...');
  const finishedSession = await QuestionService.finishPracticeSession(session.id, testUserId);
  console.assert(finishedSession.status === 'completed', 'Status da sessão finalizada deve ser completed');
  console.assert(finishedSession.completedAt !== null, 'completedAt deve estar preenchido');
  console.assert(finishedSession.finishedAt !== null, 'finishedAt deve estar preenchido');
  console.assert(typeof finishedSession.accuracy === 'number', 'accuracy deve ser número');
  console.assert(typeof finishedSession.averageTime === 'number', 'averageTime deve ser número');
  console.log('   ✅ Sessão finalizada com sucesso! Acurácia:', finishedSession.accuracy, '% - Tempo médio:', finishedSession.averageTime, 's');

  console.log('\n🎉 TODOS OS TESTES DO MOTOR DE PRÁTICA PASSARAM COM SUCESSO!\n');
  process.exit(0);
}

runPracticeEngineTests().catch((err) => {
  console.error('❌ Falha nos testes do motor de prática:', err);
  process.exit(1);
});
