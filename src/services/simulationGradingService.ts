import type {
  SimulationResult,
  SimulationAreaResult,
  SimulationSubjectResult,
  SimulationTopicResult,
  SimulationQuestionCorrection,
  SimulationSession,
  Simulation,
  Question,
  SimulationAnswer,
  KnowledgeAreaId,
  MasteryClassification
} from '../types';
import { KNOWLEDGE_AREAS } from '../config/theme';
import { classifyMastery } from '../config/diagnosticConfig';
import { SimulationService } from './simulationService';
import { QuestionService } from './questionService';
import { PerformanceService } from './performanceService';

export interface RawGradingInput {
  session: SimulationSession;
  simulation: Simulation;
  questions: Question[];
  answers: Record<string, SimulationAnswer>;
  answerKeys?: Record<string, { correctOptionId: string; explanation?: string }>;
}

/**
 * Serviço Responsável pela Correção e Consolidação de Desempenho de Simulados.
 * 
 * Implementa cálculo puramente de desempenho bruto de acertos (percentuais, contagens
 * de acertos, erros e em branco, segmentação por área, disciplina e tema).
 * 
 * NÃO calcula TRI ou suposta "nota ENEM".
 */
export class SimulationGradingService {
  /**
   * Função pura para cálculo e consolidação de desempenho de um simulado.
   * Não realiza efeitos colaterais de banco de dados, facilitando testes e previsibilidade.
   */
  public static calculateSimulationPerformance(input: RawGradingInput): SimulationResult {
    const { session, simulation, questions, answers, answerKeys = {} } = input;
    const completedAt = session.completedAt || new Date().toISOString();

    let totalCorrect = 0;
    let totalIncorrect = 0;
    let totalUnanswered = 0;
    let totalTimeAccumulated = 0;

    const questionCorrections: SimulationQuestionCorrection[] = [];

    // Agrupadores por Área, Disciplina e Tópico
    const areaStatsMap: Record<
      string,
      { total: number; correct: number; incorrect: number; unanswered: number; areaName: string }
    > = {};

    const subjectStatsMap: Record<
      string,
      {
        subjectId: string;
        subjectName: string;
        areaId: KnowledgeAreaId;
        total: number;
        correct: number;
        incorrect: number;
        unanswered: number;
      }
    > = {};

    const topicStatsMap: Record<
      string,
      {
        topicId: string;
        topicName: string;
        subjectName: string;
        areaId: KnowledgeAreaId;
        total: number;
        correct: number;
        incorrect: number;
        unanswered: number;
      }
    > = {};

    questions.forEach((q, index) => {
      const areaId = (q.areaId || q.knowledgeArea || 'MT') as KnowledgeAreaId;
      const areaMeta = KNOWLEDGE_AREAS[areaId as keyof typeof KNOWLEDGE_AREAS];
      const areaName = areaMeta ? areaMeta.name : areaId;

      const subjectName = q.subject || q.subjectId || areaName;
      const subjectId = q.subjectId || subjectName.toLowerCase().replace(/[^a-z0-9]/g, '_');

      const topicName = q.topic || q.topicId || '';
      const topicId = q.topicId || (topicName ? topicName.toLowerCase().replace(/[^a-z0-9]/g, '_') : '');

      // Gabarito seguro
      const keyObj = answerKeys[q.id];
      const correctOptionId = (
        keyObj?.correctOptionId ||
        q.correctOptionId ||
        q.correctAnswer ||
        'A'
      ).toUpperCase();

      const explanation = keyObj?.explanation || q.explanation || '';

      const answer = answers[q.id];
      const selectedOptionId = answer?.selectedAnswer
        ? answer.selectedAnswer.toUpperCase()
        : null;

      const isUnanswered = !selectedOptionId;
      const isCorrect = !isUnanswered && selectedOptionId === correctOptionId;
      const isIncorrect = !isUnanswered && selectedOptionId !== correctOptionId;

      const timeSpent = answer?.timeSpentSeconds || 0;
      totalTimeAccumulated += timeSpent;

      if (isCorrect) totalCorrect++;
      else if (isIncorrect) totalIncorrect++;
      else totalUnanswered++;

      // 1. Agrupamento por Área
      if (!areaStatsMap[areaId]) {
        areaStatsMap[areaId] = {
          total: 0,
          correct: 0,
          incorrect: 0,
          unanswered: 0,
          areaName
        };
      }
      areaStatsMap[areaId].total++;
      if (isCorrect) areaStatsMap[areaId].correct++;
      else if (isIncorrect) areaStatsMap[areaId].incorrect++;
      else areaStatsMap[areaId].unanswered++;

      // 2. Agrupamento por Disciplina
      if (!subjectStatsMap[subjectId]) {
        subjectStatsMap[subjectId] = {
          subjectId,
          subjectName,
          areaId,
          total: 0,
          correct: 0,
          incorrect: 0,
          unanswered: 0
        };
      }
      subjectStatsMap[subjectId].total++;
      if (isCorrect) subjectStatsMap[subjectId].correct++;
      else if (isIncorrect) subjectStatsMap[subjectId].incorrect++;
      else subjectStatsMap[subjectId].unanswered++;

      // 3. Agrupamento por Assunto / Tópico (se existir)
      if (topicName && topicId) {
        if (!topicStatsMap[topicId]) {
          topicStatsMap[topicId] = {
            topicId,
            topicName,
            subjectName,
            areaId,
            total: 0,
            correct: 0,
            incorrect: 0,
            unanswered: 0
          };
        }
        topicStatsMap[topicId].total++;
        if (isCorrect) topicStatsMap[topicId].correct++;
        else if (isIncorrect) topicStatsMap[topicId].incorrect++;
        else topicStatsMap[topicId].unanswered++;
      }

      // Detalhe de correção da questão
      questionCorrections.push({
        questionId: q.id,
        order: index + 1,
        areaId,
        subject: subjectName,
        topic: topicName || undefined,
        statement: q.statement,
        options: q.options || [],
        selectedOptionId,
        correctOptionId,
        isCorrect,
        isUnanswered,
        timeSpentSeconds: timeSpent,
        explanation,
        markedForReview: !!answer?.markedForReview
      });
    });

    const totalQuestions = questions.length;
    const answeredQuestions = totalCorrect + totalIncorrect;
    const percentage = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

    // Tempo total estimado caso o acumulado individual seja 0
    let finalTotalTimeSeconds = totalTimeAccumulated;
    if (finalTotalTimeSeconds <= 0 && session.startedAt) {
      const startTime = new Date(session.startedAt).getTime();
      const endTime = new Date(completedAt).getTime();
      finalTotalTimeSeconds = Math.max(0, Math.floor((endTime - startTime) / 1000));
    }
    const averageTimeSeconds = totalQuestions > 0 ? Math.round(finalTotalTimeSeconds / totalQuestions) : 0;

    // Consolidação de Áreas
    const areaResults: SimulationAreaResult[] = Object.entries(areaStatsMap).map(
      ([aId, stats]) => {
        const areaPct = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
        return {
          areaId: aId as KnowledgeAreaId,
          areaName: stats.areaName,
          totalQuestions: stats.total,
          correctAnswers: stats.correct,
          incorrectAnswers: stats.incorrect,
          unansweredQuestions: stats.unanswered,
          percentage: areaPct,
          classification: classifyMastery(areaPct, stats.total)
        };
      }
    );

    // Ordenação canônica das áreas (MT, CN, LC, CH)
    const areaSortOrder: Record<string, number> = { MT: 1, CN: 2, LC: 3, CH: 4 };
    areaResults.sort((a, b) => (areaSortOrder[a.areaId] || 99) - (areaSortOrder[b.areaId] || 99));

    // Consolidação de Disciplinas
    const subjectResults: SimulationSubjectResult[] = Object.values(subjectStatsMap).map(stats => {
      const subjPct = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
      return {
        subjectId: stats.subjectId,
        subjectName: stats.subjectName,
        areaId: stats.areaId,
        totalQuestions: stats.total,
        correctAnswers: stats.correct,
        incorrectAnswers: stats.incorrect,
        unansweredQuestions: stats.unanswered,
        percentage: subjPct,
        classification: classifyMastery(subjPct, stats.total)
      };
    });
    subjectResults.sort((a, b) => b.totalQuestions - a.totalQuestions);

    // Consolidação de Tópicos
    const topicResults: SimulationTopicResult[] = Object.values(topicStatsMap).map(stats => {
      const topPct = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
      return {
        topicId: stats.topicId,
        topicName: stats.topicName,
        subjectName: stats.subjectName,
        areaId: stats.areaId,
        totalQuestions: stats.total,
        correctAnswers: stats.correct,
        incorrectAnswers: stats.incorrect,
        unansweredQuestions: stats.unanswered,
        percentage: topPct,
        classification: classifyMastery(topPct, stats.total)
      };
    });
    topicResults.sort((a, b) => b.totalQuestions - a.totalQuestions);

    const resultId = `result_${session.id}`;

    return {
      id: resultId,
      sessionId: session.id,
      userId: session.userId,
      simulationId: simulation.id,
      simulationTitle: simulation.title,
      totalQuestions,
      answeredQuestions,
      correctAnswers: totalCorrect,
      incorrectAnswers: totalIncorrect,
      unansweredQuestions: totalUnanswered,
      percentage,
      totalTimeSeconds: finalTotalTimeSeconds,
      averageTimeSeconds,
      completedAt,
      areaResults,
      subjectResults,
      topicResults,
      questionCorrections
    };
  }

  /**
   * Finaliza e corrige uma sessão de simulado de forma idempotente e segura.
   * Persiste o resultado, sincroniza com o perfil de desempenho e registra tentativas.
   */
  public static async gradeSimulationSession(
    sessionId: string,
    userId: string
  ): Promise<SimulationResult> {
    if (!sessionId) throw new Error('sessionId é obrigatório.');
    if (!userId) throw new Error('userId é obrigatório.');

    // 1. Idempotência: Se já existir resultado salvo para esta sessão, retorna-o
    const existingResult = await SimulationService.getResultBySessionId(sessionId, userId);
    if (existingResult && existingResult.questionCorrections && existingResult.questionCorrections.length > 0) {
      return existingResult;
    }

    // 2. Busca a sessão
    const session = await SimulationService.getSessionById(sessionId);
    if (!session) {
      throw new Error(`Sessão ${sessionId} não encontrada.`);
    }

    // Garante que o status da sessão esteja finalizado
    let completedSession = session;
    if (session.status !== 'completed') {
      completedSession = await SimulationService.completeSession(sessionId);
    }

    // 3. Busca a definição do simulado
    const simulation = await SimulationService.getSimulationById(session.simulationId);
    if (!simulation) {
      throw new Error(`Simulado ${session.simulationId} não encontrado.`);
    }

    // 4. Busca respostas salvas da sessão
    const answers = await SimulationService.getSessionAnswers(sessionId);

    // 5. Busca questões completas
    const questions = await QuestionService.getQuestionsByIds(simulation.questionIds);

    // 6. Tenta buscar gabarito seguro segregado (se disponível via questionAnswerKeys)
    const answerKeys: Record<string, { correctOptionId: string; explanation?: string }> = {};
    for (const q of questions) {
      try {
        const secureKey = await SimulationService.getQuestionAnswerKey(q.id);
        if (secureKey) {
          answerKeys[q.id] = {
            correctOptionId: secureKey.correctOptionId,
            explanation: secureKey.explanation || secureKey.solution
          };
        }
      } catch {
        // Fallback natural para a questão
      }
    }

    // 7. Calcula o resultado consolidado
    const result = this.calculateSimulationPerformance({
      session: completedSession,
      simulation,
      questions,
      answers,
      answerKeys
    });

    // 8. Persiste o resultado consolidado na coleção 'simulationResults'
    await SimulationService.saveSimulationResult(result);

    // 9. Integração com o Perfil de Desempenho do Estudante (PerformanceService)
    if (result.areaResults) {
      for (const areaRes of result.areaResults) {
        try {
          const classification = areaRes.classification || classifyMastery(areaRes.percentage, areaRes.totalQuestions);
          await PerformanceService.saveAreaPerformance(
            userId,
            areaRes.areaId,
            areaRes.totalQuestions,
            areaRes.correctAnswers,
            classification,
            'simulation',
            { accumulate: true, sessionId: session.id }
          );
        } catch (err) {
          console.warn(`Erro ao sincronizar desempenho da área ${areaRes.areaId}:`, err);
        }
      }
    }

    // Sincroniza tópicos avaliados
    if (result.topicResults) {
      for (const topicRes of result.topicResults) {
        try {
          await PerformanceService.saveTopicPerformance(
            userId,
            topicRes.areaId,
            topicRes.subjectName,
            topicRes.topicName,
            topicRes.totalQuestions,
            topicRes.correctAnswers,
            topicRes.classification,
            { accumulate: true, sessionId: session.id }
          );
        } catch (err) {
          console.warn(`Erro ao sincronizar desempenho do tópico ${topicRes.topicName}:`, err);
        }
      }
    }

    // 10. Registra tentativas no Caderno de Erros / Histórico do Estudante
    if (result.questionCorrections) {
      for (const qc of result.questionCorrections) {
        // Registra tentativas de questões respondidas para alimentar caderno de erros
        if (!qc.isUnanswered && qc.selectedOptionId) {
          try {
            await QuestionService.recordQuestionAttempt({
              userId,
              questionId: qc.questionId,
              selectedOptionId: qc.selectedOptionId,
              isCorrect: qc.isCorrect,
              timeSpentSeconds: qc.timeSpentSeconds,
              knowledgeArea: qc.areaId,
              mode: 'practice'
            });
          } catch (err) {
            console.warn(`Erro ao registrar tentativa para questão ${qc.questionId}:`, err);
          }
        }
      }
    }

    return result;
  }
}
