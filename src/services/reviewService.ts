import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { getFirebaseFirestore } from './firebase/config';
import type { UserQuestionReview } from '../types';

export class QuestionReviewService {
  private static readonly REVIEWS_COLLECTION = 'userQuestionReviews';
  private static readonly inMemoryReviews = new Map<string, Map<string, UserQuestionReview>>(); // userId -> Map<questionId, Review>

  private static get firestore() {
    return getFirebaseFirestore();
  }

  private static getLocalKey(userId: string): string {
    return `norto_reviews_${userId}`;
  }

  private static getDocId(userId: string, questionId: string): string {
    return `review_${userId}_${questionId}`;
  }

  /**
   * Obtém mapa em cache local de revisões do usuário
   */
  public static getCachedReviews(userId: string): Map<string, UserQuestionReview> {
    if (!userId) return new Map();

    let userMap = this.inMemoryReviews.get(userId);
    if (!userMap) {
      userMap = new Map<string, UserQuestionReview>();
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem(this.getLocalKey(userId));
          if (raw) {
            const list = JSON.parse(raw) as UserQuestionReview[];
            list.forEach(r => userMap!.set(r.questionId, r));
          }
        } catch (e) {
          console.warn('Erro ao ler cache local de revisões:', e);
        }
      }
      this.inMemoryReviews.set(userId, userMap);
    }
    return userMap;
  }

  private static saveCachedReviews(userId: string, reviewsMap: Map<string, UserQuestionReview>): void {
    this.inMemoryReviews.set(userId, reviewsMap);
    if (typeof window !== 'undefined') {
      try {
        const list = Array.from(reviewsMap.values());
        localStorage.setItem(this.getLocalKey(userId), JSON.stringify(list));
      } catch (e) {
        console.warn('Erro ao persistir cache local de revisões:', e);
      }
    }
  }

  /**
   * Obtém o estado de revisão de uma questão específica para o usuário
   */
  public static async getReview(userId: string, questionId: string): Promise<UserQuestionReview | null> {
    if (!userId || !questionId) return null;

    const cachedMap = this.getCachedReviews(userId);
    const cachedItem = cachedMap.get(questionId);
    if (cachedItem) {
      return cachedItem;
    }

    try {
      const docId = this.getDocId(userId, questionId);
      const docRef = doc(this.firestore, this.REVIEWS_COLLECTION, docId);
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        const data = snap.data() as UserQuestionReview;
        cachedMap.set(questionId, data);
        this.saveCachedReviews(userId, cachedMap);
        return data;
      }
    } catch (e) {
      console.warn('Aviso: falha ao buscar revisão no Firestore remoto:', e);
    }

    return null;
  }

  /**
   * Obtém todas as revisões do usuário para indexação rápida no caderno de erros
   */
  public static async getAllUserReviews(userId: string): Promise<Map<string, UserQuestionReview>> {
    if (!userId) return new Map();

    const cachedMap = this.getCachedReviews(userId);

    try {
      const q = query(
        collection(this.firestore, this.REVIEWS_COLLECTION),
        where('userId', '==', userId)
      );
      const snap = await getDocs(q);

      snap.forEach(docSnap => {
        const data = docSnap.data() as UserQuestionReview;
        if (data.questionId) {
          cachedMap.set(data.questionId, data);
        }
      });

      this.saveCachedReviews(userId, cachedMap);
      return cachedMap;
    } catch (e) {
      console.warn('Aviso: falha ao sincronizar revisões com Firestore remoto, usando cache:', e);
      return cachedMap;
    }
  }

  /**
   * Define o status de revisão ('not_reviewed' | 'reviewed') de uma questão no caderno de erros.
   * Não altera pontuação, não cria tentativas e não adiciona XP.
   */
  public static async setReviewStatus(
    userId: string,
    questionId: string,
    status: 'not_reviewed' | 'reviewed',
    lastAttemptCorrect = false
  ): Promise<UserQuestionReview> {
    if (!userId || !questionId) {
      throw new Error('userId e questionId são obrigatórios para atualizar revisão');
    }

    const now = new Date().toISOString();
    const docId = this.getDocId(userId, questionId);
    const docRef = doc(this.firestore, this.REVIEWS_COLLECTION, docId);

    const review: UserQuestionReview = {
      id: docId,
      userId,
      questionId,
      status,
      lastAttemptCorrect,
      reviewedAt: status === 'reviewed' ? now : null,
      updatedAt: now
    };

    // Atualização otimista em cache
    const cachedMap = this.getCachedReviews(userId);
    cachedMap.set(questionId, review);
    this.saveCachedReviews(userId, cachedMap);

    // Emite evento em tempo real
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(
          new CustomEvent('norto:review_changed', {
            detail: { userId, questionId, status, review }
          })
        );
      } catch (e) {
        console.warn('Erro ao emitir evento norto:review_changed:', e);
      }
    }

    // Persistência no Firestore
    try {
      await setDoc(docRef, review, { merge: true });
    } catch (error) {
      console.warn('Aviso: erro ao persistir status de revisão no Firestore remoto:', error);
    }

    return review;
  }
}
