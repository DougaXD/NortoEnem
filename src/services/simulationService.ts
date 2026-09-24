import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  updateDoc,
  addDoc,
  limit,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { getFirebaseFirestore, getFirebaseAuth } from './firebase/config';
import type {
  Simulation,
  SimulationStatus,
  SimulationType,
  SimulationSession,
  SimulationSessionStatus,
  SimulationAnswer,
  SimulationResult,
  QuestionAnswerKey,
  SimulationFilters
} from '../types';
import { SimulationValidation, SimulationValidationError } from './simulationValidation';
import { DEMO_SIMULATIONS } from '../data/demoSimulations';
import { DEMO_QUESTIONS } from '../data/demoQuestions';

/**
 * Serviço de Domínio do Motor de Simulados do Norto ENEM.
 * 
 * Encapsula todo o ciclo de vida de definições de simulados, sessões de execução,
 * persistência individualizada de respostas e contratos de resultados e gabaritos.
 * Componentes visuais nunca devem acessar o Firestore diretamente.
 */
export class SimulationService {
  private static readonly SIMULATIONS_COLLECTION = 'simulations';
  private static readonly SESSIONS_COLLECTION = 'simulationSessions';
  private static readonly ANSWERS_SUBCOLLECTION = 'answers';
  private static readonly RESULTS_COLLECTION = 'simulationResults';
  private static readonly ANSWER_KEYS_COLLECTION = 'questionAnswerKeys';

  // Trava de concorrência em memória contra duplo-clique / múltiplas abas
  private static pendingCreatePromises = new Map<string, Promise<SimulationSession>>();

  // Cache em memória e persistência local para resiliência operacional
  private static readonly inMemorySessions = new Map<string, SimulationSession>();
  private static readonly inMemoryAnswers = new Map<string, Record<string, SimulationAnswer>>();

  private static getLocalSessionsKey(userId: string): string {
    return `norto_simulation_sessions_${userId}`;
  }

  private static getLocalAnswersKey(sessionId: string): string {
    return `norto_simulation_answers_${sessionId}`;
  }

  private static getCachedSession(userId: string, simulationId?: string): SimulationSession | null {
    if (!userId) return null;
    // 1. Memória
    for (const s of this.inMemorySessions.values()) {
      if (s.userId === userId && (!simulationId || s.simulationId === simulationId) && s.status === 'in_progress') {
        if (s.expiresAt && new Date(s.expiresAt).getTime() < Date.now()) {
          s.status = 'expired';
          continue;
        }
        return s;
      }
    }
    // 2. LocalStorage
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(this.getLocalSessionsKey(userId));
        if (raw) {
          const list: SimulationSession[] = JSON.parse(raw);
          const found = list.find(s =>
            s.userId === userId &&
            (!simulationId || s.simulationId === simulationId) &&
            s.status === 'in_progress'
          );
          if (found) {
            if (found.expiresAt && new Date(found.expiresAt).getTime() < Date.now()) {
              found.status = 'expired';
            } else {
              this.inMemorySessions.set(found.id, found);
              return found;
            }
          }
        }
      } catch (e) {
        console.warn('Erro ao ler cache de sessões de simulado:', e);
      }
    }
    return null;
  }

  private static saveCachedSession(session: SimulationSession): void {
    if (!session?.id) return;
    this.inMemorySessions.set(session.id, session);
    if (typeof window !== 'undefined' && session.userId) {
      try {
        const key = this.getLocalSessionsKey(session.userId);
        const raw = localStorage.getItem(key);
        let list: SimulationSession[] = raw ? JSON.parse(raw) : [];
        list = [session, ...list.filter(s => s.id !== session.id)].slice(0, 30);
        localStorage.setItem(key, JSON.stringify(list));
      } catch (e) {
        console.warn('Erro ao salvar sessão localmente:', e);
      }
    }
  }

  private static get firestore() {
    return getFirebaseFirestore();
  }

  // =========================================================================
  // 1. DEFINIÇÃO DE SIMULADOS (Catálogo & Configurações)
  // =========================================================================

  /**
   * Obtém a lista de simulados publicados acessíveis a estudantes.
   * Em caso de ausência de documentos no Firestore, recorre aos simulados de demonstração.
   */
  public static async getPublishedSimulations(filters: SimulationFilters = {}): Promise<Simulation[]> {
    try {
      const constraints = [
        where('status', '==', 'published')
      ];

      if (filters.type) {
        constraints.push(where('type', '==', filters.type));
      }

      const q = query(
        collection(this.firestore, this.SIMULATIONS_COLLECTION),
        ...constraints
      );

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const remoteItems = snapshot.docs.map(d => ({
          ...d.data(),
          id: d.id
        } as Simulation));

        if (filters.areaId) {
          return remoteItems.filter(item =>
            !item.areaIds || item.areaIds.includes(filters.areaId!)
          );
        }

        return remoteItems;
      }

      // Fallback gracioso para dados de demonstração
      let demoList = DEMO_SIMULATIONS.filter(s => s.status === 'published');
      if (filters.type) {
        demoList = demoList.filter(s => s.type === filters.type);
      }
      if (filters.areaId) {
        demoList = demoList.filter(s => !s.areaIds || s.areaIds.includes(filters.areaId!));
      }
      return demoList;
    } catch (error) {
      console.warn('Erro ao consultar simulados publicados no Firestore. Utilizando catálogo local:', error);
      return DEMO_SIMULATIONS.filter(s => s.status === 'published');
    }
  }

  /**
   * Obtém um simulado específico pelo seu identificador.
   */
  public static async getSimulationById(id: string): Promise<Simulation | null> {
    if (!id) return null;

    try {
      const docRef = doc(this.firestore, this.SIMULATIONS_COLLECTION, id);
      const snapshot = await Promise.race([
        getDoc(docRef),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('getSimulationById Firestore timeout')), 2000)
        )
      ]);

      if (snapshot.exists()) {
        return {
          ...snapshot.data(),
          id: snapshot.id
        } as Simulation;
      }

      // Documento inexistente no Firestore → procurar demo local
      const local = DEMO_SIMULATIONS.find(s => s.id === id);
      return local || null;
    } catch (_error) {
      // Erro recuperável de Firestore (permissão, rede, timeout) + demo local existente → usar demo local
      const local = DEMO_SIMULATIONS.find(s => s.id === id);
      if (local) {
        return local;
      }
      return null;
    }
  }

  /**
   * Cria uma nova definição de simulado (operação administrativa).
   */
  public static async createSimulation(
    data: Omit<Simulation, 'id' | 'createdAt' | 'updatedAt'>,
    customId?: string
  ): Promise<Simulation> {
    const errors = SimulationValidation.validateSimulation(data);
    if (errors.length > 0) {
      throw new SimulationValidationError('Dados inválidos para criação do simulado', errors);
    }

    const now = new Date().toISOString();
    const payload: Omit<Simulation, 'id'> = {
      ...data,
      version: data.version || 1,
      createdAt: now,
      updatedAt: now
    };

    if (customId) {
      const docRef = doc(this.firestore, this.SIMULATIONS_COLLECTION, customId);
      await setDoc(docRef, payload);
      return {
        ...payload,
        id: customId
      };
    } else {
      const docRef = await addDoc(collection(this.firestore, this.SIMULATIONS_COLLECTION), payload);
      return {
        ...payload,
        id: docRef.id
      };
    }
  }

  /**
   * Atualiza dados de um simulado existente (operação administrativa).
   */
  public static async updateSimulation(id: string, data: Partial<Simulation>): Promise<void> {
    if (!id) throw new Error('ID do simulado é obrigatório para atualização.');

    const errors = SimulationValidation.validateSimulation(data, true);
    if (errors.length > 0) {
      throw new SimulationValidationError('Dados inválidos para atualização do simulado', errors);
    }

    const docRef = doc(this.firestore, this.SIMULATIONS_COLLECTION, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString()
    });
  }

  /**
   * Altera o status de um simulado (publicar, arquivar, rascunho).
   */
  public static async updateSimulationStatus(id: string, status: SimulationStatus): Promise<void> {
    if (!id) throw new Error('ID do simulado é obrigatório.');
    if (!['draft', 'published', 'archived'].includes(status)) {
      throw new Error(`Status de simulado inválido: ${status}`);
    }

    const docRef = doc(this.firestore, this.SIMULATIONS_COLLECTION, id);
    await updateDoc(docRef, {
      status,
      updatedAt: new Date().toISOString()
    });
  }

  // =========================================================================
  // 2. SESSÕES DE SIMULADO (Execução do Aluno)
  // =========================================================================

  /**
   * Cria uma nova sessão de execução de simulado para o aluno autenticado.
   * Possui proteção rigorosa de idempotência contra cliques repetidos e abas concorrentes.
   */
  public static async createSession(userId: string, simulationId: string): Promise<SimulationSession> {
    if (!userId) throw new Error('userId é obrigatório para criar sessão de simulado.');
    if (!simulationId) throw new Error('simulationId é obrigatório para criar sessão de simulado.');

    const lockKey = `${userId}_${simulationId}`;
    if (this.pendingCreatePromises.has(lockKey)) {
      return this.pendingCreatePromises.get(lockKey)!;
    }

    const createPromise = (async () => {
      // 1. Idempotência: Se já houver sessão ativa válida (in_progress e não expirada), reutiliza-a
      const existingActive = await this.getActiveSession(userId, simulationId);
      if (existingActive && existingActive.status === 'in_progress') {
        return existingActive;
      }

      // 2. Localiza e valida o simulado
      const simulation = await this.getSimulationById(simulationId);
      if (!simulation) {
        throw new Error(`Simulado "${simulationId}" não encontrado.`);
      }

      if (simulation.status !== 'published') {
        throw new Error('Não é permitido iniciar um simulado que não esteja publicado.');
      }

      const now = new Date().toISOString();
      let expiresAt: string | null = null;
      if (simulation.durationSeconds && simulation.durationSeconds > 0) {
        expiresAt = new Date(Date.now() + simulation.durationSeconds * 1000).toISOString();
      }

      const sessionId = `sim_session_${userId}_${simulationId}_${Date.now()}`;
      const sessionPayload: SimulationSession = {
        id: sessionId,
        userId,
        simulationId,
        status: 'in_progress',
        currentQuestionIndex: 0,
        totalQuestions: simulation.questionCount || simulation.questionIds.length,
        answeredQuestions: 0,
        startedAt: now,
        lastSavedAt: now,
        completedAt: null,
        expiresAt,
        createdAt: now,
        updatedAt: now
      };

      const errors = SimulationValidation.validateSession(sessionPayload);
      if (errors.length > 0) {
        throw new SimulationValidationError('Erro ao validar payload de sessão de simulado', errors);
      }

      // Salva imediatamente em memória e localStorage
      this.saveCachedSession(sessionPayload);

      // Persiste no Firestore assincronamente (não bloqueante)
      setDoc(doc(this.firestore, this.SESSIONS_COLLECTION, sessionId), sessionPayload).catch(err => {
        console.warn('Aviso: sincronização remota da sessão de simulado:', err);
      });

      return sessionPayload;
    })();

    this.pendingCreatePromises.set(lockKey, createPromise);
    try {
      return await createPromise;
    } finally {
      this.pendingCreatePromises.delete(lockKey);
    }
  }

  /**
   * Obtém os metadados de uma sessão de simulado.
   */
  public static async getSessionById(sessionId: string): Promise<SimulationSession | null> {
    if (!sessionId) return null;

    // 1. Memória
    if (this.inMemorySessions.has(sessionId)) {
      const s = this.inMemorySessions.get(sessionId)!;
      if (s.status === 'in_progress' && s.expiresAt && new Date(s.expiresAt).getTime() < Date.now()) {
        s.status = 'expired';
      }
      return s;
    }

    // 2. LocalStorage
    if (typeof window !== 'undefined') {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('norto_simulation_sessions_')) {
            const raw = localStorage.getItem(k);
            if (raw) {
              const list: SimulationSession[] = JSON.parse(raw);
              const found = list.find(s => s.id === sessionId);
              if (found) {
                if (found.status === 'in_progress' && found.expiresAt && new Date(found.expiresAt).getTime() < Date.now()) {
                  found.status = 'expired';
                }
                this.inMemorySessions.set(sessionId, found);
                return found;
              }
            }
          }
        }
      } catch (e) {
        console.warn('Erro ao ler cache de sessão:', e);
      }
    }

    // 3. Firestore
    try {
      const docRef = doc(this.firestore, this.SESSIONS_COLLECTION, sessionId);
      const snapshot = await Promise.race([
        getDoc(docRef),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('getSessionById timeout')), 2000)
        )
      ]);

      if (!snapshot.exists()) return null;

      const session = {
        ...snapshot.data(),
        id: snapshot.id
      } as SimulationSession;

      // Verificação de expiração automática se ultrapassou expiresAt
      if (
        session.status === 'in_progress' &&
        session.expiresAt &&
        new Date(session.expiresAt).getTime() < Date.now()
      ) {
        session.status = 'expired';
        this.updateSessionStatus(sessionId, 'expired').catch(() => {});
      }

      this.saveCachedSession(session);
      return session;
    } catch (_error) {
      return null;
    }
  }

  /**
   * Busca uma sessão ativa ('in_progress') do usuário para determinado simulado ou qualquer simulado.
   */
  public static async getActiveSession(userId: string, simulationId?: string): Promise<SimulationSession | null> {
    if (!userId) return null;

    // 1. Verifica cache local/memória primeiro
    const cached = this.getCachedSession(userId, simulationId);
    if (cached) {
      return cached;
    }

    try {
      const constraints = [
        where('userId', '==', userId),
        where('status', '==', 'in_progress')
      ];

      if (simulationId) {
        constraints.push(where('simulationId', '==', simulationId));
      }

      const q = query(
        collection(this.firestore, this.SESSIONS_COLLECTION),
        ...constraints,
        limit(1)
      );

      const snapshot = await Promise.race([
        getDocs(q),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('getActiveSession timeout')), 2000)
        )
      ]);

      if (snapshot.empty) return null;

      const docSnap = snapshot.docs[0];
      const session = { ...docSnap.data(), id: docSnap.id } as SimulationSession;

      // Verificação de expiração
      if (session.expiresAt && new Date(session.expiresAt).getTime() < Date.now()) {
        this.updateSessionStatus(session.id, 'expired').catch(() => {});
        return null;
      }

      this.saveCachedSession(session);
      return session;
    } catch (_error) {
      return null;
    }
  }

  /**
   * Busca todas as sessões ativas ('in_progress') do usuário para alimentar os cards do catálogo.
   * Retorna um mapa indexado por simulationId.
   */
  public static async getUserActiveSessions(userId: string): Promise<Record<string, SimulationSession>> {
    if (!userId) return {};

    const activeMap: Record<string, SimulationSession> = {};

    // 1. Local / Memória
    for (const s of this.inMemorySessions.values()) {
      if (s.userId === userId && s.status === 'in_progress') {
        if (!s.expiresAt || new Date(s.expiresAt).getTime() >= Date.now()) {
          activeMap[s.simulationId] = s;
        }
      }
    }

    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(this.getLocalSessionsKey(userId));
        if (raw) {
          const list: SimulationSession[] = JSON.parse(raw);
          list.forEach(s => {
            if (s.status === 'in_progress' && (!s.expiresAt || new Date(s.expiresAt).getTime() >= Date.now())) {
              if (!activeMap[s.simulationId]) {
                activeMap[s.simulationId] = s;
                this.inMemorySessions.set(s.id, s);
              }
            }
          });
        }
      } catch (e) {
        console.warn('Erro ao ler sessões ativas locais:', e);
      }
    }

    // 2. Firestore
    try {
      const q = query(
        collection(this.firestore, this.SESSIONS_COLLECTION),
        where('userId', '==', userId),
        where('status', '==', 'in_progress'),
        limit(20)
      );

      const snapshot = await Promise.race([
        getDocs(q),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('getUserActiveSessions timeout')), 2000)
        )
      ]);

      snapshot.forEach(docSnap => {
        const session = { ...docSnap.data(), id: docSnap.id } as SimulationSession;
        if (!session.expiresAt || new Date(session.expiresAt).getTime() >= Date.now()) {
          activeMap[session.simulationId] = session;
          this.saveCachedSession(session);
        }
      });
    } catch (_error) {
      // Silenciosamente preserva mapa do cache local
    }

    return activeMap;
  }

  /**
   * Busca a sessão mais recente do usuário para determinado simulado, independente de status.
   */
  public static async getLatestUserSession(userId: string, simulationId: string): Promise<SimulationSession | null> {
    if (!userId || !simulationId) return null;

    // 1. Verifica cache local/memória primeiro
    const cached = this.getCachedSession(userId, simulationId);
    if (cached) return cached;

    // 2. Busca lista local se houver
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(this.getLocalSessionsKey(userId));
        if (raw) {
          const list: SimulationSession[] = JSON.parse(raw);
          const userSimSessions = list
            .filter(s => s.simulationId === simulationId)
            .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
          if (userSimSessions.length > 0) {
            return userSimSessions[0];
          }
        }
      } catch (e) {
        console.warn('Erro ao buscar sessão no cache local:', e);
      }
    }

    try {
      const q = query(
        collection(this.firestore, this.SESSIONS_COLLECTION),
        where('userId', '==', userId),
        where('simulationId', '==', simulationId),
        limit(10)
      );

      const snapshot = await Promise.race([
        getDocs(q),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('getLatestUserSession timeout')), 2000)
        )
      ]);

      if (snapshot.empty) return null;

      const sessions = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as SimulationSession));
      sessions.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
      const session = sessions[0];

      if (
        session.status === 'in_progress' &&
        session.expiresAt &&
        new Date(session.expiresAt).getTime() < Date.now()
      ) {
        session.status = 'expired';
        this.updateSessionStatus(session.id, 'expired').catch(() => {});
      }

      this.saveCachedSession(session);
      return session;
    } catch (_error) {
      return null;
    }
  }

  /**
   * Atualiza o progresso corrente da sessão (índice da questão, contagem, salvamento).
   */
  public static async updateSessionProgress(
    sessionId: string,
    progress: {
      currentQuestionIndex?: number;
      answeredQuestions?: number;
      lastSavedAt?: string;
    }
  ): Promise<void> {
    if (!sessionId) throw new Error('sessionId é obrigatório.');

    const now = progress.lastSavedAt || new Date().toISOString();

    const cached = this.inMemorySessions.get(sessionId);
    if (cached) {
      if (progress.currentQuestionIndex !== undefined) {
        cached.currentQuestionIndex = progress.currentQuestionIndex;
      }
      if (progress.answeredQuestions !== undefined) {
        cached.answeredQuestions = progress.answeredQuestions;
      }
      cached.lastSavedAt = now;
      cached.updatedAt = now;
      this.saveCachedSession(cached);
    }

    const updateData: Record<string, unknown> = {
      lastSavedAt: now,
      updatedAt: now
    };

    if (progress.currentQuestionIndex !== undefined) {
      if (progress.currentQuestionIndex < 0) {
        throw new Error('currentQuestionIndex não pode ser negativo.');
      }
      updateData.currentQuestionIndex = progress.currentQuestionIndex;
    }

    if (progress.answeredQuestions !== undefined) {
      if (progress.answeredQuestions < 0) {
        throw new Error('answeredQuestions não pode ser negativo.');
      }
      updateData.answeredQuestions = progress.answeredQuestions;
    }

    const docRef = doc(this.firestore, this.SESSIONS_COLLECTION, sessionId);
    updateDoc(docRef, updateData).catch(err => {
      console.warn('Aviso: falha na sincronização remota do progresso:', err);
    });
  }

  /**
   * Atualiza internamente o status da sessão.
   */
  private static async updateSessionStatus(
    sessionId: string,
    status: SimulationSessionStatus,
    completedAt?: string | null
  ): Promise<void> {
    const now = new Date().toISOString();
    const cached = this.inMemorySessions.get(sessionId);
    if (cached) {
      cached.status = status;
      cached.updatedAt = now;
      if (completedAt !== undefined) {
        cached.completedAt = completedAt;
      }
      this.saveCachedSession(cached);
    }

    const docRef = doc(this.firestore, this.SESSIONS_COLLECTION, sessionId);
    const payload: Record<string, unknown> = {
      status,
      updatedAt: now
    };
    if (completedAt !== undefined) {
      payload.completedAt = completedAt;
    }
    updateDoc(docRef, payload).catch(() => {});
  }

  /**
   * Finaliza a sessão do simulado.
   */
  public static async completeSession(sessionId: string): Promise<SimulationSession> {
    const session = await this.getSessionById(sessionId);
    if (!session) {
      throw new Error(`Sessão ${sessionId} não encontrada.`);
    }

    if (session.status === 'completed') {
      return session;
    }

    const now = new Date().toISOString();
    await this.updateSessionStatus(sessionId, 'completed', now);

    return {
      ...session,
      status: 'completed',
      completedAt: now,
      updatedAt: now
    };
  }

  /**
   * Abandona a sessão do simulado.
   */
  public static async abandonSession(sessionId: string): Promise<SimulationSession> {
    const session = await this.getSessionById(sessionId);
    if (!session) {
      throw new Error(`Sessão ${sessionId} não encontrada.`);
    }

    const now = new Date().toISOString();
    await this.updateSessionStatus(sessionId, 'abandoned', now);

    return {
      ...session,
      status: 'abandoned',
      completedAt: now,
      updatedAt: now
    };
  }

  // =========================================================================
  // 3. RESPOSTAS INDIVIDUAIS DA SESSÃO (Subcoleção 'answers')
  // =========================================================================

  /**
   * Salva ou atualiza individualmente a resposta de uma questão na subcoleção:
   * simulationSessions/{sessionId}/answers/{questionId}
   */
  public static async saveAnswer(
    sessionId: string,
    questionId: string,
    answerData: {
      selectedAnswer?: string | null;
      answered: boolean;
      markedForReview?: boolean;
      timeSpentSeconds?: number;
    }
  ): Promise<SimulationAnswer> {
    if (!sessionId) throw new Error('sessionId é obrigatório para salvar resposta.');
    if (!questionId) throw new Error('questionId é obrigatório para salvar resposta.');

    const now = new Date().toISOString();
    const answerPayload: SimulationAnswer = {
      questionId,
      selectedAnswer: answerData.selectedAnswer ?? null,
      answered: answerData.answered,
      markedForReview: !!answerData.markedForReview,
      timeSpentSeconds: answerData.timeSpentSeconds || 0,
      answeredAt: answerData.answered ? now : null,
      updatedAt: now
    };

    const errors = SimulationValidation.validateAnswer(answerPayload);
    if (errors.length > 0) {
      throw new SimulationValidationError('Erro ao validar resposta do simulado', errors);
    }

    // Atualiza cache em memória
    let sessionAnswers = this.inMemoryAnswers.get(sessionId);
    if (!sessionAnswers) {
      sessionAnswers = {};
      this.inMemoryAnswers.set(sessionId, sessionAnswers);
    }
    sessionAnswers[questionId] = answerPayload;

    // Atualiza localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.getLocalAnswersKey(sessionId), JSON.stringify(sessionAnswers));
      } catch (e) {
        console.warn('Erro ao salvar resposta localmente:', e);
      }
    }

    // Persistência no subdocumento da sessão (assíncrona)
    const answerDocRef = doc(
      this.firestore,
      this.SESSIONS_COLLECTION,
      sessionId,
      this.ANSWERS_SUBCOLLECTION,
      questionId
    );

    setDoc(answerDocRef, answerPayload, { merge: true }).catch(err => {
      console.warn('Aviso: sincronização remota de resposta do simulado:', err);
    });

    // Atualiza o timestamp de autosave da sessão
    const sessionDocRef = doc(this.firestore, this.SESSIONS_COLLECTION, sessionId);
    updateDoc(sessionDocRef, {
      lastSavedAt: now,
      updatedAt: now
    }).catch(() => {});

    return answerPayload;
  }

  /**
   * Carrega todas as respostas já salvas da sessão.
   * Retorna um mapa indexado por questionId.
   */
  public static async getSessionAnswers(sessionId: string): Promise<Record<string, SimulationAnswer>> {
    if (!sessionId) return {};

    // 1. Memória
    if (this.inMemoryAnswers.has(sessionId)) {
      return { ...this.inMemoryAnswers.get(sessionId)! };
    }

    // 2. LocalStorage
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(this.getLocalAnswersKey(sessionId));
        if (raw) {
          const map = JSON.parse(raw) as Record<string, SimulationAnswer>;
          this.inMemoryAnswers.set(sessionId, map);
          return { ...map };
        }
      } catch (e) {
        console.warn('Erro ao carregar respostas locais:', e);
      }
    }

    // 3. Firestore
    try {
      const answersRef = collection(
        this.firestore,
        this.SESSIONS_COLLECTION,
        sessionId,
        this.ANSWERS_SUBCOLLECTION
      );

      const snapshot = await Promise.race([
        getDocs(answersRef),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('getSessionAnswers timeout')), 2000)
        )
      ]);

      const answersMap: Record<string, SimulationAnswer> = {};

      snapshot.forEach(docSnap => {
        const data = docSnap.data() as SimulationAnswer;
        answersMap[docSnap.id] = data;
      });

      this.inMemoryAnswers.set(sessionId, answersMap);
      return answersMap;
    } catch (_error) {
      return {};
    }
  }

  // =========================================================================
  // 4. CONTRATOS DE RESULTADOS & GABARITO SEGURO
  // =========================================================================

  private static getLocalResultsKey(userId: string): string {
    return `norto_sim_results_${userId}`;
  }

  private static getCachedResults(userId: string): SimulationResult[] {
    if (typeof window === 'undefined' || !userId) return [];
    try {
      const raw = localStorage.getItem(this.getLocalResultsKey(userId));
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private static cacheResult(result: SimulationResult): void {
    if (typeof window === 'undefined' || !result.userId) return;
    try {
      const existing = this.getCachedResults(result.userId);
      const updated = [result, ...existing.filter(r => r.id !== result.id && r.sessionId !== result.sessionId)];
      localStorage.setItem(this.getLocalResultsKey(result.userId), JSON.stringify(updated.slice(0, 30)));
    } catch (e) {
      console.warn('Erro ao salvar resultado em cache local:', e);
    }
  }

  /**
   * Salva o resultado consolidado da sessão na coleção 'simulationResults'.
   */
  public static async saveSimulationResult(result: SimulationResult): Promise<void> {
    if (!result.id || !result.sessionId || !result.userId || !result.simulationId) {
      throw new Error('Metadados obrigatórios ausentes no resultado do simulado.');
    }

    // Atualiza cache local imediatamente
    this.cacheResult(result);

    try {
      const docRef = doc(this.firestore, this.RESULTS_COLLECTION, result.id);
      await setDoc(docRef, result);
    } catch (error) {
      console.warn('Aviso: falha ao persistir resultado de simulado no Firestore remoto:', error);
    }
  }

  /**
   * Obtém o resultado consolidado de um simulado pelo seu ID.
   */
  public static async getResultById(resultId: string): Promise<SimulationResult | null> {
    if (!resultId) return null;

    try {
      const docRef = doc(this.firestore, this.RESULTS_COLLECTION, resultId);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return { ...snapshot.data(), id: snapshot.id } as SimulationResult;
      }
    } catch (error) {
      console.warn(`Erro ao consultar resultado ${resultId} no Firestore:`, error);
    }

    // Fallback para cache local
    if (typeof window !== 'undefined') {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('norto_sim_results_')) {
            const raw = localStorage.getItem(key);
            if (raw) {
              const list = JSON.parse(raw) as SimulationResult[];
              const found = list.find(r => r.id === resultId);
              if (found) return found;
            }
          }
        }
      } catch (e) {
        console.warn('Erro ao buscar resultado no cache local:', e);
      }
    }

    return null;
  }

  /**
   * Obtém o resultado consolidado vinculado a uma sessão específica.
   * Utiliza cache local em primeiro lugar, e query autorizada por userId no Firestore se necessário.
   */
  public static async getResultBySessionId(sessionId: string, userId?: string): Promise<SimulationResult | null> {
    if (!sessionId) return null;

    // 1. Verificação prioritária no cache local
    if (typeof window !== 'undefined') {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('norto_sim_results_')) {
            const raw = localStorage.getItem(key);
            if (raw) {
              const list = JSON.parse(raw) as SimulationResult[];
              const found = list.find(r => r.sessionId === sessionId);
              if (found) return found;
            }
          }
        }
      } catch (e) {
        console.warn('Erro ao buscar resultado por sessionId no cache local:', e);
      }
    }

    // 2. Query autorizada no Firestore respeitando a regra de propriedade do usuário
    let authUid = '';
    try {
      const auth = getFirebaseAuth();
      authUid = auth.currentUser?.uid || '';
    } catch {
      authUid = '';
    }

    const effectiveUserId = userId || authUid;
    if (effectiveUserId) {
      try {
        const q = query(
          collection(this.firestore, this.RESULTS_COLLECTION),
          where('userId', '==', effectiveUserId),
          where('sessionId', '==', sessionId),
          limit(1)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const docSnap = snapshot.docs[0];
          return { ...docSnap.data(), id: docSnap.id } as SimulationResult;
        }
      } catch (error: any) {
        if (error?.code !== 'permission-denied' && error?.code !== 'unavailable') {
          console.warn(`Erro ao consultar resultado para sessão ${sessionId}:`, error);
        }
      }
    }

    return null;
  }

  /**
   * Consulta os resultados de simulados concluídos do estudante.
   */
  public static async getUserSimulationResults(userId: string): Promise<SimulationResult[]> {
    if (!userId) return [];

    let remoteList: SimulationResult[] = [];
    try {
      const q = query(
        collection(this.firestore, this.RESULTS_COLLECTION),
        where('userId', '==', userId),
        orderBy('completedAt', 'desc'),
        limit(20)
      );

      const snapshot = await getDocs(q);
      remoteList = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as SimulationResult));
    } catch (error) {
      console.warn('Aviso: falha na busca de resultados remotos, recorrendo ao cache:', error);
    }

    const cached = this.getCachedResults(userId);
    const combinedMap = new Map<string, SimulationResult>();

    // Unifica remotos e locais, priorizando os mais completos
    cached.forEach(r => combinedMap.set(r.id, r));
    remoteList.forEach(r => combinedMap.set(r.id, r));

    const combined = Array.from(combinedMap.values());
    combined.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
    return combined;
  }

  /**
   * Alias de conveniência para getUserSimulationResults.
   */
  public static async getUserResults(userId: string): Promise<SimulationResult[]> {
    return this.getUserSimulationResults(userId);
  }

  /**
   * Busca o resultado mais recente do usuário para determinado simulado.
   */
  public static async getLatestResultForSimulation(userId: string, simulationId: string): Promise<SimulationResult | null> {
    if (!userId || !simulationId) return null;

    try {
      const q = query(
        collection(this.firestore, this.RESULTS_COLLECTION),
        where('userId', '==', userId),
        where('simulationId', '==', simulationId),
        orderBy('completedAt', 'desc'),
        limit(1)
      );

      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        return { ...docSnap.data(), id: docSnap.id } as SimulationResult;
      }
    } catch (error) {
      console.warn(`Erro ao buscar resultado recente para simulado ${simulationId}:`, error);
    }

    const cached = this.getCachedResults(userId);
    const matching = cached.filter(r => r.simulationId === simulationId);
    if (matching.length > 0) {
      matching.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
      return matching[0];
    }

    return null;
  }

  /**
   * Contrato preparado para acesso ao gabarito seguro.
   * Para questões DEMO, utiliza os dados locais sem consultar a rede.
   * A coleção remota questionAnswerKeys/{questionId} é de acesso restrito a administradores.
   */
  public static async getQuestionAnswerKey(questionId: string): Promise<QuestionAnswerKey | null> {
    if (!questionId) return null;

    // 1. Para questões DEMO que já existem localmente em demoQuestions.ts, utiliza dados locais existentes
    const demoQ = DEMO_QUESTIONS.find(q => q.id === questionId);
    if (demoQ) {
      return {
        questionId: demoQ.id,
        correctOptionId: (demoQ.correctOptionId || demoQ.correctAnswer || '').toUpperCase(),
        explanation: demoQ.explanation || demoQ.solution || '',
        solution: demoQ.solution || demoQ.explanation || '',
        updatedAt: demoQ.updatedAt || new Date().toISOString()
      };
    }

    // 2. A coleção remota questionAnswerKeys é restrita a administradores (allow read, write: if isAdmin();)
    // Clientes estudantes NÃO devem tentar ler esta coleção para evitar "Missing or insufficient permissions"
    let isAdminUser = false;
    try {
      const auth = getFirebaseAuth();
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdTokenResult();
        isAdminUser = token.claims.role === 'admin' || token.claims.email === 'ds999501417@gmail.com';
      }
    } catch {
      isAdminUser = false;
    }

    if (!isAdminUser) {
      return null;
    }

    try {
      const docRef = doc(this.firestore, this.ANSWER_KEYS_COLLECTION, questionId);
      const snapshot = await getDoc(docRef);

      if (snapshot.exists()) {
        return snapshot.data() as QuestionAnswerKey;
      }
      return null;
    } catch {
      return null;
    }
  }
}
