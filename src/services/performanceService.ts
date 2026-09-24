import { doc, setDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { getFirebaseFirestore, getFirebaseAuth } from './firebase/config';
import type { UserPerformanceArea, UserPerformanceTopic, PerformanceSnapshot, KnowledgeAreaId } from '../types';
import { KNOWLEDGE_AREAS } from '../config/theme';
import { classifyMastery } from '../config/diagnosticConfig';

export class PerformanceService {
  private static get firestore() {
    return getFirebaseFirestore();
  }

  // Cache em memória para garantir consistência de sessões e acumulação sem leituras redundantes
  private static readonly inMemoryAreas = new Map<string, UserPerformanceArea>();
  private static readonly inMemoryTopics = new Map<string, UserPerformanceTopic>();

  /**
   * Registra ou atualiza as métricas de domínio de uma área específica.
   * Suporta acumulação progressiva e idempotência baseada em sessionId sem leitura prévia remota.
   */
  public static async saveAreaPerformance(
    userId: string,
    areaId: KnowledgeAreaId,
    totalAnswered: number,
    totalCorrect: number,
    classification: 'attention' | 'developing' | 'mastered' | 'insufficient',
    source: 'diagnostic' | 'practice' | 'simulation' = 'diagnostic',
    options?: {
      accumulate?: boolean;
      sessionId?: string;
    }
  ): Promise<void> {
    if (!userId || !areaId) return;

    const docId = `${userId}_${areaId}`;
    const docRef = doc(this.firestore, 'userPerformanceAreas', docId);

    let finalAnswered = totalAnswered;
    let finalCorrect = totalCorrect;
    let finalClassification = classification;
    let processedSessions: string[] = options?.sessionId ? [options.sessionId] : [];

    const existingData = this.inMemoryAreas.get(docId);
    if (existingData) {
      // Idempotência: Se esta sessão já foi contabilizada nesta área, evita duplicidade
      if (options?.sessionId && existingData.processedSessions?.includes(options.sessionId)) {
        return;
      }

      if (existingData.processedSessions) {
        processedSessions = options?.sessionId
          ? [...existingData.processedSessions, options.sessionId]
          : existingData.processedSessions;
      }

      if (options?.accumulate) {
        finalAnswered = (existingData.totalAnswered || 0) + totalAnswered;
        finalCorrect = (existingData.totalCorrect || 0) + totalCorrect;
        const calculatedMastery = finalAnswered > 0 ? Math.round((finalCorrect / finalAnswered) * 100) : 0;
        finalClassification = classifyMastery(calculatedMastery, finalAnswered);
      }
    }

    const masteryIndex = finalAnswered > 0 ? Math.round((finalCorrect / finalAnswered) * 100) : 0;
    const areaMeta = KNOWLEDGE_AREAS[areaId as keyof typeof KNOWLEDGE_AREAS];
    const areaName = areaMeta ? areaMeta.name : areaId;

    const payload: UserPerformanceArea = {
      id: docId,
      userId,
      areaId,
      areaName,
      totalAnswered: finalAnswered,
      totalCorrect: finalCorrect,
      masteryIndex,
      classification: finalClassification,
      source,
      processedSessions,
      updatedAt: new Date().toISOString(),
    };

    this.inMemoryAreas.set(docId, payload);

    // Gravação direta com merge: true sem leitura prévia (respeitando ownership do Firestore)
    let authUid = '';
    try {
      const auth = getFirebaseAuth();
      authUid = auth.currentUser?.uid || '';
    } catch {
      authUid = '';
    }

    if (authUid && authUid === userId) {
      try {
        await setDoc(docRef, payload, { merge: true });
      } catch (err: any) {
        if (err?.code !== 'permission-denied' && err?.code !== 'unavailable') {
          console.error(`Erro ao salvar desempenho da área ${areaId}:`, err);
        }
      }
    }
  }

  /**
   * Registra o desempenho em um tópico ou assunto específico.
   * Suporta acumulação progressiva e idempotência baseada em sessionId sem leitura prévia remota.
   */
  public static async saveTopicPerformance(
    userId: string,
    areaId: KnowledgeAreaId,
    subject: string,
    topic: string,
    totalAnswered: number,
    totalCorrect: number,
    classification: 'attention' | 'developing' | 'mastered' | 'insufficient',
    options?: {
      accumulate?: boolean;
      sessionId?: string;
    }
  ): Promise<void> {
    if (!userId || !topic) return;

    // Cria um identificador seguro para o documento do tópico
    const safeTopicId = topic.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const docId = `${userId}_${areaId}_${safeTopicId}`;
    const docRef = doc(this.firestore, 'userPerformanceTopics', docId);

    let finalAnswered = totalAnswered;
    let finalCorrect = totalCorrect;
    let finalClassification = classification;
    let processedSessions: string[] = options?.sessionId ? [options.sessionId] : [];

    const existingData = this.inMemoryTopics.get(docId);
    if (existingData) {
      // Idempotência: Se esta sessão já foi contabilizada neste tópico, evita duplicidade
      if (options?.sessionId && existingData.processedSessions?.includes(options.sessionId)) {
        return;
      }

      if (existingData.processedSessions) {
        processedSessions = options?.sessionId
          ? [...existingData.processedSessions, options.sessionId]
          : existingData.processedSessions;
      }

      if (options?.accumulate) {
        finalAnswered = (existingData.totalAnswered || 0) + totalAnswered;
        finalCorrect = (existingData.totalCorrect || 0) + totalCorrect;
        const calculatedMastery = finalAnswered > 0 ? Math.round((finalCorrect / finalAnswered) * 100) : 0;
        finalClassification = classifyMastery(calculatedMastery, finalAnswered);
      }
    }

    const masteryIndex = finalAnswered > 0 ? Math.round((finalCorrect / finalAnswered) * 100) : 0;

    const payload: UserPerformanceTopic = {
      id: docId,
      userId,
      areaId,
      subject,
      topic,
      totalAnswered: finalAnswered,
      totalCorrect: finalCorrect,
      masteryIndex,
      classification: finalClassification,
      processedSessions,
      updatedAt: new Date().toISOString(),
    };

    this.inMemoryTopics.set(docId, payload);

    // Gravação direta com merge: true sem leitura prévia (respeitando ownership do Firestore)
    let authUid = '';
    try {
      const auth = getFirebaseAuth();
      authUid = auth.currentUser?.uid || '';
    } catch {
      authUid = '';
    }

    if (authUid && authUid === userId) {
      try {
        await setDoc(docRef, payload, { merge: true });
      } catch (err: any) {
        if (err?.code !== 'permission-denied' && err?.code !== 'unavailable') {
          console.error(`Erro ao salvar desempenho do tópico ${topic}:`, err);
        }
      }
    }
  }

  /**
   * Salva um snapshot histórico pontual do estudante
   */
  public static async saveSnapshot(
    userId: string,
    snapshotType: 'diagnostic' | 'weekly',
    overallMastery: number,
    areaBreakdown: Record<string, number>
  ): Promise<string> {
    const snapshotId = `snap_${userId}_${Date.now()}`;
    const payload: PerformanceSnapshot = {
      id: snapshotId,
      userId,
      snapshotType,
      overallMastery,
      areaBreakdown,
      createdAt: new Date().toISOString(),
    };

    const docRef = doc(this.firestore, 'performanceSnapshots', snapshotId);
    await setDoc(docRef, payload);
    return snapshotId;
  }

  /**
   * Busca as áreas de desempenho do usuário no Firestore com fallback
   */
  public static async getUserPerformanceAreas(userId: string): Promise<UserPerformanceArea[]> {
    if (!userId) return [];

    let authUid = '';
    try {
      const auth = getFirebaseAuth();
      authUid = auth.currentUser?.uid || '';
    } catch {
      authUid = '';
    }

    if (!authUid || authUid !== userId) {
      // Retorna os dados em memória para este usuário se não autenticado no Firestore
      return Array.from(this.inMemoryAreas.values()).filter(a => a.userId === userId);
    }

    try {
      const q = query(
        collection(this.firestore, 'userPerformanceAreas'),
        where('userId', '==', userId)
      );
      const snap = await getDocs(q);
      const items = snap.docs.map(d => {
        const data = d.data() as UserPerformanceArea;
        this.inMemoryAreas.set(data.id || `${data.userId}_${data.areaId}`, data);
        return data;
      });
      return items;
    } catch (error: any) {
      if (error?.code !== 'permission-denied' && error?.code !== 'unavailable') {
        console.error('Erro ao buscar áreas de desempenho do estudante:', error);
      }
      return Array.from(this.inMemoryAreas.values()).filter(a => a.userId === userId);
    }
  }

  /**
   * Busca tópicos avaliados do usuário
   */
  public static async getUserPerformanceTopics(userId: string): Promise<UserPerformanceTopic[]> {
    if (!userId) return [];

    let authUid = '';
    try {
      const auth = getFirebaseAuth();
      authUid = auth.currentUser?.uid || '';
    } catch {
      authUid = '';
    }

    if (!authUid || authUid !== userId) {
      return Array.from(this.inMemoryTopics.values()).filter(t => t.userId === userId);
    }

    try {
      const q = query(
        collection(this.firestore, 'userPerformanceTopics'),
        where('userId', '==', userId)
      );
      const snap = await getDocs(q);
      const items = snap.docs.map(d => {
        const data = d.data() as UserPerformanceTopic;
        this.inMemoryTopics.set(data.id, data);
        return data;
      });
      return items;
    } catch (error: any) {
      if (error?.code !== 'permission-denied' && error?.code !== 'unavailable') {
        console.error('Erro ao buscar tópicos avaliados:', error);
      }
      return Array.from(this.inMemoryTopics.values()).filter(t => t.userId === userId);
    }
  }
}
