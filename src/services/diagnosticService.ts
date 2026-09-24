import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { getFirebaseFirestore } from './firebase/config';
import {
  INITIAL_DIAGNOSTIC_QUESTIONS,
  DIAGNOSTIC_CONFIG,
  classifyMastery,
} from '../config/diagnosticConfig';
import { KNOWLEDGE_AREAS } from '../config/theme';
import { PerformanceService } from './performanceService';
import type {
  DiagnosticAttempt,
  DiagnosticResultSummary,
  AreaDiagnosticResult,
  KnowledgeAreaId,
  Question,
} from '../types';

export class DiagnosticService {
  private static get firestore() {
    return getFirebaseFirestore();
  }

  /**
   * Retorna o banco de questões configurado para a triagem diagnóstica inicial
   */
  public static getDiagnosticQuestions(): Question[] {
    return INITIAL_DIAGNOSTIC_QUESTIONS;
  }

  /**
   * Obtém a tentativa diagnóstica em andamento ou cria uma nova se não existir
   */
  public static async getOrCreateAttempt(userId: string): Promise<DiagnosticAttempt> {
    try {
      // 1. Procura tentativa existente para este usuário
      const q = query(
        collection(this.firestore, 'diagnosticAttempts'),
        where('userId', '==', userId),
        limit(1)
      );
      const snap = await getDocs(q);

      if (!snap.empty) {
        const docData = snap.docs[0].data() as DiagnosticAttempt;
        return { ...docData, id: snap.docs[0].id };
      }

      // 2. Cria nova tentativa
      const newAttemptId = `diag_${userId}_${Date.now()}`;
      const newAttempt: DiagnosticAttempt = {
        id: newAttemptId,
        userId,
        status: 'in_progress',
        startedAt: new Date().toISOString(),
        currentQuestionIndex: 0,
        answers: {},
      };

      await setDoc(doc(this.firestore, 'diagnosticAttempts', newAttemptId), newAttempt);

      // Atualiza status no perfil do estudante
      try {
        await updateDoc(doc(this.firestore, 'studentProfiles', userId), {
          diagnosticStatus: 'in_progress',
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Aviso ao sincronizar status do diagnóstico no perfil:', err);
      }

      return newAttempt;
    } catch (error) {
      console.error('Erro ao obter ou criar tentativa de diagnóstico:', error);
      // Fallback em memória/local para não travar o usuário
      const fallbackAttempt: DiagnosticAttempt = {
        id: `local_diag_${userId}`,
        userId,
        status: 'in_progress',
        startedAt: new Date().toISOString(),
        currentQuestionIndex: 0,
        answers: {},
      };
      return fallbackAttempt;
    }
  }

  /**
   * Salva a resposta de uma questão sem revelar gabarito
   */
  public static async saveAnswer(
    userId: string,
    attemptId: string,
    questionId: string,
    selectedOptionId: string,
    questionIndex: number
  ): Promise<void> {
    const answeredAt = new Date().toISOString();

    // Cache local de segurança
    try {
      const cacheKey = `norto_diag_ans_${userId}_${attemptId}`;
      const existing = localStorage.getItem(cacheKey);
      const map = existing ? JSON.parse(existing) : {};
      map[questionId] = { selectedOptionId, answeredAt };
      localStorage.setItem(cacheKey, JSON.stringify(map));
    } catch {
      // Ignora erro local
    }

    try {
      const attemptRef = doc(this.firestore, 'diagnosticAttempts', attemptId);
      await updateDoc(attemptRef, {
        [`answers.${questionId}`]: {
          selectedOptionId,
          answeredAt,
        },
        currentQuestionIndex: questionIndex,
      });
    } catch (error) {
      console.error('Erro ao salvar resposta no Firestore:', error);
      // Salva em tentativa local se falhar
    }
  }

  /**
   * Finaliza o teste diagnóstico, calcula métricas transparentes e persiste
   */
  public static async finishDiagnostic(
    userId: string,
    attemptId: string,
    userAnswers: Record<string, { selectedOptionId: string; answeredAt: string }>
  ): Promise<DiagnosticResultSummary> {
    const questions = INITIAL_DIAGNOSTIC_QUESTIONS;
    const completedAt = new Date().toISOString();

    let totalCorrect = 0;
    const areaStats: Record<string, { total: number; correct: number }> = {
      MT: { total: 0, correct: 0 },
      LC: { total: 0, correct: 0 },
      CH: { total: 0, correct: 0 },
      CN: { total: 0, correct: 0 },
    };

    const topicStats: Record<string, {
      areaId: KnowledgeAreaId;
      subject: string;
      topic: string;
      total: number;
      correct: number;
    }> = {};

    // Processa cada questão e computa acertos
    questions.forEach(q => {
      const userAns = userAnswers[q.id];
      const isCorrect = userAns ? userAns.selectedOptionId === q.correctOptionId : false;

      if (isCorrect) {
        totalCorrect++;
      }

      if (areaStats[q.knowledgeArea]) {
        areaStats[q.knowledgeArea].total++;
        if (isCorrect) areaStats[q.knowledgeArea].correct++;
      }

      // Estatística por tópico
      const topicKey = `${q.knowledgeArea}_${q.topic}`;
      if (!topicStats[topicKey]) {
        topicStats[topicKey] = {
          areaId: q.knowledgeArea,
          subject: q.subject,
          topic: q.topic,
          total: 0,
          correct: 0,
        };
      }
      topicStats[topicKey].total++;
      if (isCorrect) topicStats[topicKey].correct++;
    });

    const totalQuestions = questions.length;
    const overallPercentage = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
    const overallClassification = classifyMastery(overallPercentage, totalQuestions);

    const areaScores: Record<string, AreaDiagnosticResult> = {};
    const attentionPoints: string[] = [];
    const strongPoints: string[] = [];

    // Calcula percentual e classificação para cada área avaliada
    DIAGNOSTIC_CONFIG.evaluatedAreas.forEach(areaId => {
      const stat = areaStats[areaId] || { total: 0, correct: 0 };
      const pct = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
      const classification = classifyMastery(pct, stat.total);
      const areaMeta = KNOWLEDGE_AREAS[areaId as keyof typeof KNOWLEDGE_AREAS];
      const areaName = areaMeta ? areaMeta.name : areaId;

      areaScores[areaId] = {
        areaId,
        areaName,
        total: stat.total,
        correct: stat.correct,
        percentage: pct,
        classification,
      };

      if (classification === 'attention') {
        attentionPoints.push(areaName);
      } else if (classification === 'mastered') {
        strongPoints.push(areaName);
      }
    });

    // Se nenhuma área caiu estritamente em 'attention', adiciona a de menor percentual como foco
    if (attentionPoints.length === 0) {
      let lowestArea = 'MT';
      let lowestPct = 101;
      Object.entries(areaScores).forEach(([aId, sc]) => {
        if (sc.percentage < lowestPct) {
          lowestPct = sc.percentage;
          lowestArea = aId;
        }
      });
      const areaMeta = KNOWLEDGE_AREAS[lowestArea as keyof typeof KNOWLEDGE_AREAS];
      if (areaMeta) {
        attentionPoints.push(areaMeta.name);
      }
    }

    // Gera feedback construtivo e motivador
    let constructiveFeedback = '';
    if (overallPercentage >= 75) {
      constructiveFeedback = 'Excelente base inicial! Você demonstra consistência nas áreas avaliadas. O plano a seguir vai aprofundar tópicos avançados e lapidar seu ritmo de prova.';
    } else if (overallPercentage >= 50) {
      constructiveFeedback = 'Bom ponto de partida! Você tem compreensão sólida dos conceitos fundamentais e possui grande margem de evolução focando nas áreas de maior peso.';
    } else {
      constructiveFeedback = 'Diagnóstico concluído com sucesso! Este resultado é o mapa exato de onde você mais vai crescer. O plano inicial vai reforçar sua base passo a passo.';
    }

    const summary: DiagnosticResultSummary = {
      overallPercentage,
      overallClassification,
      totalQuestions,
      totalCorrect,
      areaScores,
      attentionPoints,
      strongPoints,
      constructiveFeedback,
    };

    // 1. Atualiza documento da tentativa no Firestore
    try {
      const attemptRef = doc(this.firestore, 'diagnosticAttempts', attemptId);
      await updateDoc(attemptRef, {
        status: 'completed',
        completedAt,
        results: summary,
      });
    } catch (e) {
      console.error('Erro ao atualizar tentativa diagnóstica:', e);
    }

    // 2. Persiste métricas no PerformanceService
    try {
      // Grava em userPerformanceAreas
      const areaPromises = Object.values(areaScores).map(score =>
        PerformanceService.saveAreaPerformance(
          userId,
          score.areaId,
          score.total,
          score.correct,
          score.classification,
          'diagnostic'
        )
      );
      await Promise.all(areaPromises);

      // Grava tópicos avaliados
      const topicPromises = Object.values(topicStats).map(t =>
        PerformanceService.saveTopicPerformance(
          userId,
          t.areaId,
          t.subject,
          t.topic,
          t.total,
          t.correct,
          classifyMastery(t.total > 0 ? (t.correct / t.total) * 100 : 0, t.total)
        )
      );
      await Promise.all(topicPromises);

      // Salva snapshot
      const areaBreakdown: Record<string, number> = {};
      Object.entries(areaScores).forEach(([k, v]) => {
        areaBreakdown[k] = v.percentage;
      });
      await PerformanceService.saveSnapshot(userId, 'diagnostic', overallPercentage, areaBreakdown);

      // Atualiza perfil do estudante
      await updateDoc(doc(this.firestore, 'studentProfiles', userId), {
        diagnosticCompleted: true,
        diagnosticStatus: 'completed',
        weakAreas: attentionPoints,
        strongAreas: strongPoints,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Erro ao persistir métricas de desempenho do diagnóstico:', err);
    }

    return summary;
  }

  /**
   * Busca o último resultado de diagnóstico concluído do estudante
   */
  public static async getUserCompletedDiagnostic(userId: string): Promise<DiagnosticAttempt | null> {
    try {
      const q = query(
        collection(this.firestore, 'diagnosticAttempts'),
        where('userId', '==', userId),
        where('status', '==', 'completed'),
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        return { ...snap.docs[0].data(), id: snap.docs[0].id } as DiagnosticAttempt;
      }
      return null;
    } catch (e) {
      console.error('Erro ao buscar diagnóstico concluído:', e);
      return null;
    }
  }
}
