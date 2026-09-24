import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  limit,
  orderBy,
  startAfter,
  documentId,
  setDoc,
  updateDoc,
  writeBatch,
  type QueryConstraint
} from 'firebase/firestore';
import { getFirebaseFirestore, getFirebaseAuth } from './firebase/config';
import type {
  Question,
  QuestionFilters,
  PaginationOptions,
  PaginatedResult,
  QuestionAttempt,
  PracticeSession,
  AttemptFilters,
  ErrorNotebookItem
} from '../types';
import { DEMO_QUESTIONS } from '../data/demoQuestions';
import { QuestionReviewService } from './reviewService';

/**
 * Serviço de Acesso a Dados do Banco de Questões do Norto ENEM.
 * 
 * Encapsula todas as consultas e operações do repositório 'questions' no Firestore.
 * Garante que estudantes tenham acesso exclusivamente a questões com status 'published'.
 * Inclui suporte a paginação cursor-based, múltiplos filtros pedagógicos e fallback
 * gracioso para as questões de demonstração caso a coleção remota esteja vazia.
 */
export class QuestionService {
  private static readonly COLLECTION_NAME = 'questions';

  private static get firestore() {
    return getFirebaseFirestore();
  }

  /**
   * Consulta questões no Firestore aplicando filtros pedagógicos e paginação.
   * Por padrão, restringe os resultados a questões publicadas (status == 'published').
   */
  public static async getQuestions(
    filters: QuestionFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<PaginatedResult<Question>> {
    const pageSize = Math.min(Math.max(pagination.limit || 10, 1), 50);
    const requestedStatus = filters.status || 'published';

    // 1. Verificação de autenticação:
    // A regra de segurança do Firestore para questions é: allow list: if isAuthenticated() && ...
    // Se o usuário não está autenticado, não executamos a chamada para não gerar erro de permissão no console.
    let isAuthed = false;
    try {
      const auth = getFirebaseAuth();
      isAuthed = !!auth.currentUser;
    } catch {
      isAuthed = false;
    }

    if (!isAuthed) {
      return this.filterDemoQuestions(filters, pagination, pageSize, requestedStatus);
    }

    try {
      const constraints: QueryConstraint[] = [
        where('status', '==', requestedStatus)
      ];

      // Filtros estruturais obrigatórios/opcionais
      if (filters.areaId) {
        constraints.push(where('areaId', '==', filters.areaId));
      }
      if (filters.subjectId) {
        constraints.push(where('subjectId', '==', filters.subjectId));
      }
      if (filters.topicId) {
        constraints.push(where('topicId', '==', filters.topicId));
      }
      if (filters.difficulty) {
        constraints.push(where('difficulty', '==', filters.difficulty));
      }
      if (filters.source) {
        constraints.push(where('source', '==', filters.source));
      }
      if (filters.competencyId) {
        constraints.push(where('competencyId', '==', filters.competencyId));
      }
      if (filters.skillId) {
        constraints.push(where('skillId', '==', filters.skillId));
      }

      // Ordenação consistente por ID para paginação estável sem exigir índices compostos caros
      constraints.push(orderBy(documentId()));

      if (pagination.startAfterId) {
        constraints.push(startAfter(pagination.startAfterId));
      }

      // Buscamos 1 a mais que o pageSize para determinar se há próxima página
      constraints.push(limit(pageSize + 1));

      const q = query(collection(this.firestore, this.COLLECTION_NAME), ...constraints);
      // Proteção de timeout para evitar travamento se a rede ou regras do Firestore ficarem pendentes
      const snapshot = await Promise.race([
        getDocs(q),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('getQuestions Firestore timeout')), 2500)
        )
      ]);

      if (!snapshot.empty) {
        const docs = snapshot.docs;
        const hasMore = docs.length > pageSize;
        const validDocs = hasMore ? docs.slice(0, pageSize) : docs;

        const items = validDocs.map(d => {
          const data = d.data();
          return {
            ...data,
            id: d.id,
            // Normalização e compatibilidade retroativa
            areaId: data.areaId || data.knowledgeArea,
            knowledgeArea: data.knowledgeArea || data.areaId,
            correctOptionId: data.correctOptionId || data.correctAnswer,
            correctAnswer: data.correctAnswer || data.correctOptionId,
            status: data.status || 'published'
          } as Question;
        });

        const nextCursor = hasMore && validDocs.length > 0
          ? validDocs[validDocs.length - 1].id
          : null;

        return {
          items,
          nextCursor,
          hasMore,
          total: items.length
        };
      }

      // Se o Firestore não retornou documentos, recorremos ao banco de demonstração em memória
      return this.filterDemoQuestions(filters, pagination, pageSize, requestedStatus);

    } catch (error: any) {
      // Distingue tipos de erro (permission-denied, unavailable, timeout, etc.)
      if (error?.code !== 'permission-denied' && error?.code !== 'unavailable' && !error?.message?.includes('timeout')) {
        console.error('Erro ao consultar questões no Firestore:', error);
      }
      return this.filterDemoQuestions(filters, pagination, pageSize, requestedStatus);
    }
  }

  /**
   * Busca uma única questão pelo seu ID.
   * Por padrão, estudantes só conseguem visualizar questões com status 'published'.
   */
  public static async getQuestionById(
    questionId: string,
    options: { allowUnpublished?: boolean } = {}
  ): Promise<Question | null> {
    if (!questionId) return null;

    // 1. Resolução prioritária local: questões de demonstração têm resposta imediata (0ms)
    const demoQ = DEMO_QUESTIONS.find(q => q.id === questionId);
    if (demoQ) {
      if (!options.allowUnpublished && demoQ.status !== 'published') {
        return null;
      }
      return demoQ;
    }

    // 2. Se o usuário não está autenticado, a regra exige allow get: if isAuthenticated()
    let isAuthed = false;
    try {
      const auth = getFirebaseAuth();
      isAuthed = !!auth.currentUser;
    } catch {
      isAuthed = false;
    }

    if (!isAuthed) {
      return null;
    }

    // 3. Consulta remota no Firestore com limite de tempo para evitar loading infinito
    try {
      const docRef = doc(this.firestore, this.COLLECTION_NAME, questionId);
      const snap = await Promise.race([
        getDoc(docRef),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('getQuestionById Firestore timeout')), 2500)
        )
      ]);

      if (snap.exists()) {
        const data = snap.data();
        const questionStatus = data.status || 'published';

        if (!options.allowUnpublished && questionStatus !== 'published') {
          return null;
        }

        return {
          ...data,
          id: snap.id,
          areaId: data.areaId || data.knowledgeArea,
          knowledgeArea: data.knowledgeArea || data.areaId,
          correctOptionId: data.correctOptionId || data.correctAnswer,
          correctAnswer: data.correctAnswer || data.correctOptionId,
          status: questionStatus
        } as Question;
      }

      return null;
    } catch (error: any) {
      if (error?.code !== 'permission-denied' && error?.code !== 'unavailable' && !error?.message?.includes('timeout')) {
        console.error(`Erro ao buscar questão remota ${questionId}:`, error);
      }
      return null;
    }
  }

  /**
   * Busca múltiplas questões por seus IDs mantendo a ordem exata da lista fornecida.
   * Utilizado pelo motor de execução de simulados e avaliações.
   */
  public static async getQuestionsByIds(questionIds: string[]): Promise<Question[]> {
    if (!questionIds || questionIds.length === 0) return [];

    try {
      const results = await Promise.all(
        questionIds.map(id => this.getQuestionById(id))
      );
      return results.filter((q): q is Question => q !== null);
    } catch (error) {
      console.error('Erro ao buscar questões por IDs:', error);
      return [];
    }
  }

  /**
   * Retorna uma lista direta de questões a partir de filtros informados.
   */
  public static async getQuestionsByFilters(
    filters: QuestionFilters = {},
    limitCount = 20
  ): Promise<Question[]> {
    const res = await this.getQuestions(filters, { limit: limitCount });
    return res.items;
  }

  /**
   * Retorna uma amostra de questões publicadas para estudantes.
   */
  public static async getPublishedQuestions(limitCount = 20): Promise<Question[]> {
    const res = await this.getQuestions({ status: 'published' }, { limit: limitCount });
    return res.items;
  }

  /**
   * Retorna a quantidade estimada de questões disponíveis para um filtro.
   * Utiliza contagem local para evitar chamadas de agregação remotas (RunAggregationQuery) lentas ou indisponíveis.
   */
  public static async getAvailableQuestionCount(filters: QuestionFilters = {}): Promise<number> {
    const requestedStatus = filters.status || 'published';
    return this.countDemoQuestions(filters, requestedStatus);
  }

  // ==========================================
  // MÉTODOS ADMINISTRATIVOS PREPARADOS
  // (Uso exclusivo por contexto administrativo seguro)
  // ==========================================

  /**
   * Cria uma nova questão no Firestore.
   * Reservado para painel administrativo futuro.
   */
  public static async createQuestion(
    questionData: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>,
    customId?: string
  ): Promise<Question> {
    const now = new Date().toISOString();
    const docRef = customId
      ? doc(this.firestore, this.COLLECTION_NAME, customId)
      : doc(collection(this.firestore, this.COLLECTION_NAME));

    const newQuestion: Question = {
      ...questionData,
      id: docRef.id,
      status: questionData.status || 'published',
      areaId: questionData.areaId || questionData.knowledgeArea,
      knowledgeArea: questionData.knowledgeArea || questionData.areaId || 'MT',
      correctOptionId: questionData.correctOptionId || questionData.correctAnswer || 'A',
      correctAnswer: questionData.correctAnswer || questionData.correctOptionId || 'A',
      version: questionData.version || 1,
      createdAt: now,
      updatedAt: now
    };

    await setDoc(docRef, newQuestion);
    return newQuestion;
  }

  /**
   * Atualiza dados de uma questão existente.
   * Reservado para painel administrativo futuro.
   */
  public static async updateQuestion(
    questionId: string,
    updates: Partial<Omit<Question, 'id' | 'createdAt'>>
  ): Promise<void> {
    const now = new Date().toISOString();
    const docRef = doc(this.firestore, this.COLLECTION_NAME, questionId);

    const safeUpdates = {
      ...updates,
      updatedAt: now
    };

    await updateDoc(docRef, safeUpdates);
  }

  /**
   * Arquiva logicamente uma questão (status: 'archived').
   * Questões arquivadas deixam imediatamente de ser exibidas para estudantes.
   */
  public static async archiveQuestion(questionId: string): Promise<void> {
    await this.updateQuestion(questionId, { status: 'archived' });
  }

  /**
   * Executa a inserção em lote (seed) das questões de demonstração no Firestore.
   * Deve ser executado em ambiente administrativo ou script seguro.
   */
  public static async seedDemoQuestions(
    questionsToSeed: Question[] = DEMO_QUESTIONS
  ): Promise<{ inserted: number; updated: number }> {
    const batch = writeBatch(this.firestore);
    let count = 0;

    for (const q of questionsToSeed) {
      const docRef = doc(this.firestore, this.COLLECTION_NAME, q.id);
      batch.set(docRef, q, { merge: true });
      count++;
    }

    await batch.commit();
    return { inserted: count, updated: 0 };
  }

  // ==========================================
  // MOTOR DE PRÁTICA & TENTATIVAS DE QUESTÕES
  // ==========================================

  private static readonly ATTEMPTS_COLLECTION = 'questionAttempts';
  private static readonly SESSIONS_COLLECTION = 'practiceSessions';
  private static readonly inMemorySessions = new Map<string, PracticeSession>();
  private static readonly inMemoryAttempts = new Map<string, QuestionAttempt[]>();

  private static getLocalSessionKey(userId: string): string {
    return `norto_practice_session_${userId}`;
  }

  private static getLocalAttemptsKey(userId: string): string {
    return `norto_attempts_${userId}`;
  }

  public static getCachedAttempts(userId: string): QuestionAttempt[] {
    if (!userId) return [];
    let list = this.inMemoryAttempts.get(userId);
    if (!list) {
      list = [];
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem(this.getLocalAttemptsKey(userId));
          if (raw) {
            list = JSON.parse(raw) as QuestionAttempt[];
          }
        } catch (e) {
          console.warn('Erro ao ler cache local de tentativas:', e);
        }
      }
      this.inMemoryAttempts.set(userId, list);
    }
    return list;
  }

  private static saveCachedAttempts(userId: string, attempts: QuestionAttempt[]): void {
    this.inMemoryAttempts.set(userId, attempts);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.getLocalAttemptsKey(userId), JSON.stringify(attempts.slice(0, 100)));
      } catch (e) {
        console.warn('Erro ao salvar cache de tentativas:', e);
      }
    }
  }

  /**
   * Registra uma tentativa individual de resolução de questão (QuestionAttempt).
   * Cada tentativa recebe um identificador único com timestamp para garantir que
   * repetições da mesma questão não sobrescrevam o histórico anterior.
   * Mode é forçado para 'practice' nesta etapa.
   */
  public static async recordQuestionAttempt(
    attemptData: Omit<QuestionAttempt, 'id' | 'attemptedAt'>,
    customId?: string
  ): Promise<QuestionAttempt> {
    const now = new Date().toISOString();
    const docId = customId || `attempt_${attemptData.userId}_${attemptData.questionId}_${Date.now()}`;
    const docRef = doc(this.firestore, this.ATTEMPTS_COLLECTION, docId);

    const attempt: QuestionAttempt = {
      ...attemptData,
      id: docId,
      mode: attemptData.mode || 'practice',
      sessionId: attemptData.sessionId || null,
      simulationId: attemptData.simulationId || null,
      selectedOptionId: attemptData.selectedOptionId || attemptData.selectedAnswer || '',
      selectedAnswer: attemptData.selectedAnswer || attemptData.selectedOptionId || '',
      isCorrect: !!attemptData.isCorrect,
      correct: !!attemptData.isCorrect,
      timeSpentSeconds: attemptData.timeSpentSeconds ?? attemptData.timeSpent ?? 0,
      timeSpent: attemptData.timeSpent ?? attemptData.timeSpentSeconds ?? 0,
      knowledgeArea: attemptData.knowledgeArea || attemptData.areaId || 'MT',
      areaId: attemptData.areaId || attemptData.knowledgeArea || 'MT',
      startedAt: attemptData.startedAt || now,
      answeredAt: attemptData.answeredAt || now,
      attemptedAt: now
    };

    // Atualiza cache em memória e localStorage imediatamente
    const currentList = this.getCachedAttempts(attemptData.userId);
    const updatedList = [attempt, ...currentList.filter(a => a.id !== attempt.id)];
    this.saveCachedAttempts(attemptData.userId, updatedList);

    // Persiste no Firestore em segundo plano somente se o usuário estiver autenticado com este UID
    try {
      const auth = getFirebaseAuth();
      if (auth.currentUser && auth.currentUser.uid === attemptData.userId) {
        setDoc(docRef, attempt).catch((error) => {
          if (error?.code !== 'permission-denied' && error?.code !== 'unavailable') {
            console.error('Erro ao persistir tentativa no Firestore remoto:', error);
          }
        });
      }
    } catch {
      // Ambiente sem Firebase Auth inicializado
    }

    return attempt;
  }

  /**
   * Consulta paginada do histórico detalhado de tentativas do usuário autenticado.
   * Ordenado rigorosamente por attemptedAt decrescente (mais recentes primeiro).
   * Suporta filtros por área, resultado (acerto/erro) e modo de prática.
   */
  public static async getUserAttempts(
    userId: string,
    filters?: AttemptFilters,
    options: { limit?: number; startAfterId?: string } = {}
  ): Promise<PaginatedResult<QuestionAttempt>> {
    const pageSize = options.limit || 10;
    if (!userId) {
      return { items: [], nextCursor: null, hasMore: false, total: 0 };
    }

    let isAuthed = false;
    try {
      const auth = getFirebaseAuth();
      isAuthed = auth.currentUser?.uid === userId;
    } catch {
      isAuthed = false;
    }

    let attempts: QuestionAttempt[] = [];

    if (isAuthed) {
      try {
        // Query base por usuário e ordenação temporal
        const q = query(
          collection(this.firestore, this.ATTEMPTS_COLLECTION),
          where('userId', '==', userId),
          orderBy('attemptedAt', 'desc'),
          limit(150)
        );

        const snap = await Promise.race([
          getDocs(q),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('getUserAttempts timeout')), 2500)
          )
        ]);
        attempts = snap.docs.map(docSnap => ({
          ...(docSnap.data() as QuestionAttempt),
          id: docSnap.id
        }));
      } catch (error: any) {
        if (error?.code !== 'permission-denied' && error?.code !== 'unavailable' && !error?.message?.includes('timeout')) {
          console.error('Erro ao buscar tentativas do usuário no Firestore:', error);
        }
      }
    }

    // Mescla com cache local se Firestore retornou vazio ou offline
    const cached = this.getCachedAttempts(userId);
    if (attempts.length === 0 && cached.length > 0) {
      attempts = [...cached];
    } else if (attempts.length > 0) {
      // Atualiza cache com as tentativas remotas
      this.saveCachedAttempts(userId, attempts);
    }

      // Aplica filtros em memória para garantir rapidez e zero erros de índice composto
      if (filters?.areaId) {
        attempts = attempts.filter(a => (a.knowledgeArea || a.areaId) === filters.areaId);
      }
      if (filters?.result && filters.result !== 'all') {
        const wantCorrect = filters.result === 'correct';
        attempts = attempts.filter(a => (a.isCorrect ?? a.correct) === wantCorrect);
      }
      if (filters?.mode && filters.mode !== 'all') {
        attempts = attempts.filter(a => a.mode === filters.mode);
      }

      // Ordena rigorosamente por timestamp decrescente
      attempts.sort((a, b) => new Date(b.attemptedAt).getTime() - new Date(a.attemptedAt).getTime());

      // Paginação incremental
      let startIndex = 0;
      if (options.startAfterId) {
        const foundIndex = attempts.findIndex(a => a.id === options.startAfterId);
        if (foundIndex >= 0) {
          startIndex = foundIndex + 1;
        }
      }

      const paginatedItems = attempts.slice(startIndex, startIndex + pageSize);
      const hasMore = startIndex + pageSize < attempts.length;
      const nextCursor = hasMore && paginatedItems.length > 0 ? paginatedItems[paginatedItems.length - 1].id : null;

      return {
        items: paginatedItems,
        nextCursor,
        hasMore,
        total: attempts.length
      };
  }

  /**
   * Consulta agregada do Caderno de Erros.
   * Agrupa todas as tentativas com erro por questionId para que uma mesma questão
   * com múltiplos erros apareça em um único card consolidado.
   * Apresenta contagem de erros, total de tentativas, último resultado e estado de revisão.
   */
  public static async getUserErrorNotebook(
    userId: string,
    filters?: { status?: 'all' | 'not_reviewed' | 'reviewed'; areaId?: string }
  ): Promise<ErrorNotebookItem[]> {
    if (!userId) return [];

    // 1. Obtém todas as tentativas do usuário (via Firestore ou cache)
    let allAttempts: QuestionAttempt[] = [];
    let isAuthed = false;
    try {
      const auth = getFirebaseAuth();
      isAuthed = auth.currentUser?.uid === userId;
    } catch {
      isAuthed = false;
    }

    if (isAuthed) {
      try {
        const q = query(
          collection(this.firestore, this.ATTEMPTS_COLLECTION),
          where('userId', '==', userId),
          orderBy('attemptedAt', 'desc'),
          limit(200)
        );
        const snap = await Promise.race([
          getDocs(q),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('getUserErrorNotebook timeout')), 2500)
          )
        ]);
        allAttempts = snap.docs.map(docSnap => ({
          ...(docSnap.data() as QuestionAttempt),
          id: docSnap.id
        }));
      } catch (e: any) {
        if (e?.code !== 'permission-denied' && e?.code !== 'unavailable' && !e?.message?.includes('timeout')) {
          console.error('Erro ao buscar tentativas remotas para o caderno de erros:', e);
        }
      }
    }

    if (allAttempts.length === 0) {
      allAttempts = this.getCachedAttempts(userId);
    }

    // 2. Obtém mapa de revisões do usuário
    const reviewsMap = await QuestionReviewService.getAllUserReviews(userId);

    // 3. Agrupa tentativas por questionId
    const groupsMap = new Map<string, QuestionAttempt[]>();
    for (const attempt of allAttempts) {
      const qId = attempt.questionId;
      if (!groupsMap.has(qId)) {
        groupsMap.set(qId, []);
      }
      groupsMap.get(qId)!.push(attempt);
    }

    // 4. Constrói a lista de itens do Caderno de Erros (apenas questões que possuem pelo menos 1 erro)
    const errorItems: ErrorNotebookItem[] = [];

    for (const [questionId, attempts] of groupsMap.entries()) {
      // Ordena as tentativas da mais antiga para a mais recente
      attempts.sort((a, b) => new Date(a.attemptedAt).getTime() - new Date(b.attemptedAt).getTime());

      const errorAttempts = attempts.filter(a => !(a.isCorrect ?? a.correct));
      const correctAttempts = attempts.filter(a => !!(a.isCorrect ?? a.correct));

      // Se nunca errou esta questão, não entra no Caderno de Erros
      if (errorAttempts.length === 0) {
        continue;
      }

      const firstError = errorAttempts[0];
      const lastAttempt = attempts[attempts.length - 1];
      const lastAttemptCorrect = !!(lastAttempt.isCorrect ?? lastAttempt.correct);

      // Estado de revisão
      const reviewRecord = reviewsMap.get(questionId);
      const reviewStatus = reviewRecord?.status || 'not_reviewed';
      const reviewedAt = reviewRecord?.reviewedAt || null;

      // Resolução dos dados da questão
      const question = DEMO_QUESTIONS.find(q => q.id === questionId) || null;
      const knowledgeArea = (lastAttempt.knowledgeArea || lastAttempt.areaId || question?.areaId) as any;
      const subjectId = lastAttempt.subjectId || question?.subjectId;
      const topicId = lastAttempt.topicId || question?.topicId;

      errorItems.push({
        questionId,
        question,
        totalAttempts: attempts.length,
        errorCount: errorAttempts.length,
        correctCount: correctAttempts.length,
        firstErrorAt: firstError.attemptedAt,
        lastAttemptAt: lastAttempt.attemptedAt,
        lastAttemptCorrect,
        reviewStatus,
        reviewedAt,
        knowledgeArea,
        subjectId,
        topicId
      });
    }

    // 5. Aplica filtros pedagógicos
    let filtered = errorItems;

    // Filtro por status de revisão ('not_reviewed' é a visão principal)
    if (filters?.status && filters.status !== 'all') {
      filtered = filtered.filter(item => item.reviewStatus === filters.status);
    }

    // Filtro por área de conhecimento
    if (filters?.areaId) {
      filtered = filtered.filter(item => {
        const area = item.knowledgeArea || item.question?.areaId;
        return area === filters.areaId;
      });
    }

    // 6. Ordena por última tentativa decrescente (mais recente no topo)
    filtered.sort((a, b) => new Date(b.lastAttemptAt).getTime() - new Date(a.lastAttemptAt).getTime());

    return filtered;
  }

  /**
   * Cria uma nova sessão interativa de prática (`PracticeSession`).
   * Salva a sessão no Firestore e sincroniza com o armazenamento local (localStorage)
   * para recuperação imediata em caso de recarregamento da página.
   */
  public static async createPracticeSession(params: {
    userId: string;
    questionIds: string[];
    filters?: PracticeSession['filters'];
  }): Promise<PracticeSession> {
    const now = new Date().toISOString();
    const sessionId = `session_practice_${params.userId}_${Date.now()}`;
    const docRef = doc(this.firestore, this.SESSIONS_COLLECTION, sessionId);

    const session: PracticeSession = {
      id: sessionId,
      userId: params.userId,
      mode: 'practice',
      questionIds: params.questionIds,
      currentIndex: 0,
      startedAt: now,
      completedAt: null,
      finishedAt: null,
      status: 'in_progress',
      answers: {},
      ...(params.filters ? { filters: params.filters } : {}),
      totalQuestions: params.questionIds.length,
      correctCount: 0,
      incorrectCount: 0,
      accuracy: 0,
      totalTimeSpentSeconds: 0,
      totalTime: 0,
      averageTime: 0,
      createdAt: now,
      updatedAt: now
    };

    // Cache em memória
    this.inMemorySessions.set(sessionId, session);

    // Cache local imediato para recuperação instantânea em recarregamentos
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.getLocalSessionKey(params.userId), JSON.stringify(session));
      } catch (e) {
        console.warn('Falha ao salvar sessão em localStorage:', e);
      }
    }

    // Persistência no Firestore em segundo plano somente se o usuário estiver autenticado com este UID
    try {
      const auth = getFirebaseAuth();
      if (auth.currentUser && auth.currentUser.uid === params.userId) {
        setDoc(docRef, session).catch((error) => {
          if (error?.code !== 'permission-denied' && error?.code !== 'unavailable') {
            console.error('Erro ao persistir sessão no Firestore remoto:', error);
          }
        });
      }
    } catch {
      // Ignora erro de acesso ao auth
    }

    return session;
  }

  /**
   * Obtém uma sessão de prática existente pelo ID.
   * Verifica permissão de acesso (apenas o próprio usuário).
   */
  public static async getPracticeSession(
    sessionId: string,
    userId?: string
  ): Promise<PracticeSession | null> {
    if (!sessionId) return null;

    // 1. Cache em memória primeiro (instantâneo)
    const inMem = this.inMemorySessions.get(sessionId);
    if (inMem && (!userId || inMem.userId === userId)) {
      return inMem;
    }

    // 2. Cache local (localStorage)
    if (userId && typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(this.getLocalSessionKey(userId));
        if (raw) {
          const cached = JSON.parse(raw) as PracticeSession;
          if (cached.id === sessionId && cached.userId === userId) {
            this.inMemorySessions.set(sessionId, cached);
            return cached;
          }
        }
      } catch (e) {
        console.warn('Falha ao ler cache local de sessão:', e);
      }
    }

    // 3. Tenta recuperar do Firestore com timeout protetivo somente se autenticado
    let isAuthed = false;
    try {
      const auth = getFirebaseAuth();
      isAuthed = !!auth.currentUser && (!userId || auth.currentUser.uid === userId);
    } catch {
      isAuthed = false;
    }

    if (isAuthed) {
      try {
        const docRef = doc(this.firestore, this.SESSIONS_COLLECTION, sessionId);
        const snap = await Promise.race([
          getDoc(docRef),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('getPracticeSession timeout')), 2000)
          )
        ]);

        if (snap.exists()) {
          const data = snap.data() as PracticeSession;
          if (userId && data.userId !== userId) {
            return null;
          }
          const session = { ...data, id: snap.id };
          this.inMemorySessions.set(sessionId, session);
          return session;
        }
      } catch (error: any) {
        if (error?.code !== 'permission-denied' && error?.code !== 'unavailable' && !error?.message?.includes('timeout')) {
          console.error('Erro ao ler sessão do Firestore:', error);
        }
      }
    }

    return null;
  }

  /**
   * Registra a resposta de uma questão dentro de uma sessão de prática:
   * 1. Determina se está correta
   * 2. Cria e persiste o QuestionAttempt independente no Firestore
   * 3. Atualiza o estado da sessão (respostas acumuladas, contadores e tempos)
   * 4. Dispara o evento lógico QUESTION_ANSWERED para futura integração
   */
  public static async savePracticeAnswer(params: {
    sessionId: string;
    userId: string;
    question: Question;
    selectedAnswer: string;
    timeSpentSeconds: number;
    startedAt?: string;
  }): Promise<{ session: PracticeSession; attempt: QuestionAttempt }> {
    const { sessionId, userId, question, selectedAnswer, timeSpentSeconds, startedAt } = params;
    const now = new Date().toISOString();

    const correctOption = question.correctOptionId || question.correctAnswer || '';
    const isCorrect = selectedAnswer.toUpperCase() === correctOption.toUpperCase();

    // 1. Registra o QuestionAttempt independente no Firestore
    const attempt = await this.recordQuestionAttempt({
      userId,
      questionId: question.id,
      mode: 'practice',
      sessionId,
      selectedOptionId: selectedAnswer,
      selectedAnswer,
      isCorrect,
      correct: isCorrect,
      timeSpentSeconds,
      timeSpent: timeSpentSeconds,
      knowledgeArea: question.areaId || question.knowledgeArea || 'MT',
      areaId: question.areaId || question.knowledgeArea || 'MT',
      subjectId: question.subjectId,
      topicId: question.topicId,
      startedAt: startedAt || now,
      answeredAt: now
    });

    // 2. Recupera ou constrói o estado atual da sessão
    let session = await this.getPracticeSession(sessionId, userId);
    if (!session) {
      session = {
        id: sessionId,
        userId,
        mode: 'practice',
        questionIds: [question.id],
        currentIndex: 0,
        startedAt: startedAt || now,
        completedAt: null,
        status: 'in_progress',
        answers: {},
        totalQuestions: 1,
        correctCount: 0,
        incorrectCount: 0,
        accuracy: 0,
        totalTimeSpentSeconds: 0,
        createdAt: now,
        updatedAt: now
      };
    }

    const updatedAnswers = {
      ...session.answers,
      [question.id]: {
        selectedAnswer,
        selectedOptionId: selectedAnswer,
        isCorrect,
        correct: isCorrect,
        timeSpentSeconds,
        timeSpent: timeSpentSeconds,
        startedAt: startedAt || now,
        answeredAt: now
      }
    };

    const answeredList = Object.values(updatedAnswers);
    const correctCount = answeredList.filter(a => a.isCorrect).length;
    const incorrectCount = answeredList.length - correctCount;
    const totalTimeSpentSeconds = answeredList.reduce((acc, a) => acc + (a.timeSpentSeconds || 0), 0);
    const accuracy = answeredList.length > 0 ? Math.round((correctCount / answeredList.length) * 100) : 0;
    const averageTime = answeredList.length > 0 ? Math.round(totalTimeSpentSeconds / answeredList.length) : 0;

    const updatedSession: PracticeSession = {
      ...session,
      answers: updatedAnswers,
      correctCount,
      incorrectCount,
      accuracy,
      totalTimeSpentSeconds,
      totalTime: totalTimeSpentSeconds,
      averageTime,
      updatedAt: now
    };

    // Atualiza cache em memória
    this.inMemorySessions.set(session.id, updatedSession);

    // Salva no localStorage para consistência instantânea
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.getLocalSessionKey(userId), JSON.stringify(updatedSession));
      } catch (e) {
        console.warn('Erro ao atualizar sessão em localStorage:', e);
      }
    }

    // Salva no Firestore em segundo plano sem travar a interface
    try {
      const auth = getFirebaseAuth();
      if (auth.currentUser && auth.currentUser.uid === userId) {
        const docRef = doc(this.firestore, this.SESSIONS_COLLECTION, sessionId);
        setDoc(docRef, updatedSession, { merge: true }).catch((error) => {
          if (error?.code !== 'permission-denied' && error?.code !== 'unavailable') {
            console.error('Erro ao atualizar sessão no Firestore remoto:', error);
          }
        });
      }
    } catch {
      // Ignora erro de acesso ao auth
    }

    // 4. Dispara evento lógico QUESTION_ANSWERED para módulos futuros (gamificação/analytics)
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(
          new CustomEvent('norto:question_answered', {
            detail: { attempt, session: updatedSession }
          })
        );
      } catch (e) {
        console.warn('Erro ao despachar evento norto:question_answered:', e);
      }
    }

    return { session: updatedSession, attempt };
  }

  /**
   * Finaliza uma sessão de prática, computando os totais finais de tempo e acurácia.
   */
  public static async finishPracticeSession(
    sessionId: string,
    userId: string
  ): Promise<PracticeSession> {
    const now = new Date().toISOString();
    let session = await this.getPracticeSession(sessionId, userId);

    if (!session) {
      throw new Error(`Sessão de prática ${sessionId} não encontrada.`);
    }

    const answeredList = Object.values(session.answers || {});
    const correctCount = answeredList.filter(a => a.isCorrect).length;
    const incorrectCount = answeredList.length - correctCount;
    const totalTimeSpentSeconds = answeredList.reduce((acc, a) => acc + (a.timeSpentSeconds || 0), 0);
    const accuracy = answeredList.length > 0 ? Math.round((correctCount / answeredList.length) * 100) : 0;
    const averageTime = answeredList.length > 0 ? Math.round(totalTimeSpentSeconds / answeredList.length) : 0;

    const completedSession: PracticeSession = {
      ...session,
      status: 'completed',
      completedAt: now,
      finishedAt: now,
      correctCount,
      incorrectCount,
      accuracy,
      totalTimeSpentSeconds,
      totalTime: totalTimeSpentSeconds,
      averageTime,
      updatedAt: now
    };

    // Atualiza cache em memória
    this.inMemorySessions.set(sessionId, completedSession);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.getLocalSessionKey(userId), JSON.stringify(completedSession));
      } catch (e) {
        console.warn('Erro ao atualizar sessão completada no cache local:', e);
      }
    }

    // Atualiza Firestore em segundo plano
    try {
      const auth = getFirebaseAuth();
      if (auth.currentUser && auth.currentUser.uid === userId) {
        const docRef = doc(this.firestore, this.SESSIONS_COLLECTION, sessionId);
        setDoc(docRef, completedSession, { merge: true }).catch((error) => {
          if (error?.code !== 'permission-denied' && error?.code !== 'unavailable') {
            console.error('Erro ao marcar sessão como concluída no Firestore:', error);
          }
        });
      }
    } catch {
      // Ignora erro de acesso ao auth
    }

    return completedSession;
  }

  /**
   * Abandona uma sessão de prática (ex: usuário sai antes de concluir todas as questões).
   * As questões já respondidas permanecem salvas, sem penalizar as não respondidas.
   */
  public static async abandonPracticeSession(
    sessionId: string,
    userId: string
  ): Promise<void> {
    const now = new Date().toISOString();

    const inMem = this.inMemorySessions.get(sessionId);
    if (inMem) {
      inMem.status = 'abandoned';
      inMem.abandonedAt = now;
      inMem.updatedAt = now;
    }

    try {
      const auth = getFirebaseAuth();
      if (auth.currentUser && auth.currentUser.uid === userId) {
        const docRef = doc(this.firestore, this.SESSIONS_COLLECTION, sessionId);
        setDoc(docRef, {
          status: 'abandoned',
          abandonedAt: now,
          updatedAt: now
        }, { merge: true }).catch((e) => {
          if (e?.code !== 'permission-denied' && e?.code !== 'unavailable') {
            console.error('Erro ao atualizar status de abandono no Firestore:', e);
          }
        });
      }
    } catch {
      // Ignora erro de acesso ao auth
    }

    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(this.getLocalSessionKey(userId));
        if (raw) {
          const cached = JSON.parse(raw);
          if (cached.id === sessionId) {
            localStorage.removeItem(this.getLocalSessionKey(userId));
          }
        }
      } catch (e) {
        console.warn('Erro ao limpar sessão abandonada do localStorage:', e);
      }
    }
  }

  /**
   * Tenta recuperar a sessão ativa em andamento para o usuário (ex: após refresh).
   */
  public static async getActivePracticeSession(userId: string): Promise<PracticeSession | null> {
    if (!userId) return null;

    // 1. Cache em memória primeiro (mais rápido)
    for (const s of this.inMemorySessions.values()) {
      if (s.userId === userId && s.status === 'in_progress') {
        return s;
      }
    }

    // 2. Tenta recuperar do localStorage
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(this.getLocalSessionKey(userId));
        if (raw) {
          const cached = JSON.parse(raw) as PracticeSession;
          if (cached.status === 'in_progress' && cached.userId === userId) {
            this.inMemorySessions.set(cached.id, cached);
            return cached;
          }
        }
      } catch (e) {
        console.warn('Erro ao ler sessão ativa do localStorage:', e);
      }
    }

    // 3. Consulta Firestore com timeout rápido somente se autenticado
    let isAuthed = false;
    try {
      const auth = getFirebaseAuth();
      isAuthed = auth.currentUser?.uid === userId;
    } catch {
      isAuthed = false;
    }

    if (isAuthed) {
      try {
        const q = query(
          collection(this.firestore, this.SESSIONS_COLLECTION),
          where('userId', '==', userId),
          where('status', '==', 'in_progress'),
          limit(1)
        );
        const snap = await Promise.race([
          getDocs(q),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('getActivePracticeSession timeout')), 2000)
          )
        ]);
        if (!snap.empty) {
          const docData = snap.docs[0].data() as PracticeSession;
          const session = { ...docData, id: snap.docs[0].id };
          this.inMemorySessions.set(session.id, session);
          return session;
        }
      } catch (e: any) {
        if (e?.code !== 'permission-denied' && e?.code !== 'unavailable' && !e?.message?.includes('timeout')) {
          console.error('Erro ao consultar sessão ativa no Firestore:', e);
        }
      }
    }

    return null;
  }

  // ==========================================
  // HELPERS INTERNOS DE FILTRAGEM
  // ==========================================

  private static filterDemoQuestions(
    filters: QuestionFilters,
    pagination: PaginationOptions,
    pageSize: number,
    requestedStatus: string
  ): PaginatedResult<Question> {
    let filtered = DEMO_QUESTIONS.filter(q => (q.status || 'published') === requestedStatus);

    if (filters.areaId) {
      filtered = filtered.filter(q => (q.areaId || q.knowledgeArea) === filters.areaId);
    }
    if (filters.subjectId) {
      filtered = filtered.filter(q => q.subjectId === filters.subjectId);
    }
    if (filters.topicId) {
      filtered = filtered.filter(q => q.topicId === filters.topicId);
    }
    if (filters.difficulty) {
      filtered = filtered.filter(q => q.difficulty === filters.difficulty);
    }
    if (filters.source) {
      filtered = filtered.filter(q => q.source === filters.source);
    }

    // Ordenação consistente por id
    filtered.sort((a, b) => a.id.localeCompare(b.id));

    // Cursor pagination
    let startIndex = 0;
    if (pagination.startAfterId) {
      const cursorIdx = filtered.findIndex(q => q.id === pagination.startAfterId);
      if (cursorIdx >= 0) {
        startIndex = cursorIdx + 1;
      }
    }

    const pagedItems = filtered.slice(startIndex, startIndex + pageSize);
    const hasMore = startIndex + pageSize < filtered.length;
    const nextCursor = hasMore && pagedItems.length > 0
      ? pagedItems[pagedItems.length - 1].id
      : null;

    return {
      items: pagedItems,
      nextCursor,
      hasMore,
      total: filtered.length
    };
  }

  private static countDemoQuestions(
    filters: QuestionFilters,
    requestedStatus: string
  ): number {
    return this.filterDemoQuestions(filters, {}, 9999, requestedStatus).items.length;
  }
}
