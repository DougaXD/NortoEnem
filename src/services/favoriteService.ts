import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  startAfter,
  DocumentSnapshot
} from 'firebase/firestore';
import { getFirebaseFirestore, getFirebaseAuth } from './firebase/config';
import type { UserFavorite, PaginatedResult } from '../types';

export class FavoriteService {
  private static readonly FAVORITES_COLLECTION = 'userFavorites';
  private static readonly inMemoryFavorites = new Map<string, Set<string>>(); // userId -> Set<questionId>

  private static get firestore() {
    return getFirebaseFirestore();
  }

  private static getLocalKey(userId: string): string {
    return `norto_favorites_${userId}`;
  }

  private static getDocId(userId: string, questionId: string): string {
    return `fav_${userId}_${questionId}`;
  }

  /**
   * Obtém o conjunto em cache local de IDs de questões favoritadas pelo usuário
   */
  public static getCachedFavoriteIds(userId: string): Set<string> {
    if (!userId) return new Set();

    let userSet = this.inMemoryFavorites.get(userId);
    if (!userSet) {
      userSet = new Set<string>();
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem(this.getLocalKey(userId));
          if (raw) {
            const list = JSON.parse(raw) as string[];
            list.forEach(id => userSet!.add(id));
          }
        } catch (e) {
          console.warn('Erro ao ler cache de favoritos:', e);
        }
      }
      this.inMemoryFavorites.set(userId, userSet);
    }
    return userSet;
  }

  private static saveCachedFavoriteIds(userId: string, ids: Set<string>): void {
    this.inMemoryFavorites.set(userId, ids);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.getLocalKey(userId), JSON.stringify(Array.from(ids)));
      } catch (e) {
        console.warn('Erro ao persistir cache de favoritos:', e);
      }
    }
  }

  /**
   * Verifica se uma questão específica está favoritada pelo usuário.
   * Utiliza o estado em cache sincronizado localmente, sem disparar leituras remotas redundantes.
   */
  public static isFavorited(userId: string, questionId: string): boolean {
    if (!userId || !questionId) return false;
    return this.getCachedFavoriteIds(userId).has(questionId);
  }

  /**
   * Alterna o estado de favorito de forma estritamente idempotente.
   * Não altera a coleção global questions e não cria tentativas.
   * Retorna true se a questão passou a ser favorita, false se foi desfavoritada.
   */
  public static async toggleFavorite(userId: string, questionId: string): Promise<boolean> {
    if (!userId || !questionId) {
      throw new Error('userId e questionId são obrigatórios para favoritar');
    }

    const docId = this.getDocId(userId, questionId);
    const docRef = doc(this.firestore, this.FAVORITES_COLLECTION, docId);
    const cached = this.getCachedFavoriteIds(userId);
    const currentlyFavorited = cached.has(questionId);

    const newFavoritedState = !currentlyFavorited;

    // Atualização otimista local
    if (newFavoritedState) {
      cached.add(questionId);
    } else {
      cached.delete(questionId);
    }
    this.saveCachedFavoriteIds(userId, cached);

    // Notifica a aplicação em tempo real
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(
          new CustomEvent('norto:favorite_changed', {
            detail: { userId, questionId, isFavorited: newFavoritedState }
          })
        );
      } catch (e) {
        console.warn('Erro ao emitir evento de favorito:', e);
      }
    }

    // Persistência no Firestore apenas se o usuário autenticado for o proprietário
    let authUid = '';
    try {
      const auth = getFirebaseAuth();
      authUid = auth.currentUser?.uid || '';
    } catch {
      authUid = '';
    }

    if (!authUid || authUid !== userId) {
      return newFavoritedState;
    }

    try {
      if (newFavoritedState) {
        const favoriteData: UserFavorite = {
          id: docId,
          userId,
          questionId,
          favoritedAt: new Date().toISOString()
        };
        await setDoc(docRef, favoriteData);
      } else {
        await deleteDoc(docRef);
      }
    } catch (error: any) {
      if (error?.code !== 'permission-denied' && error?.code !== 'unavailable') {
        console.warn('Aviso: erro ao persistir favorito no Firestore remoto:', error);
      }
    }

    return newFavoritedState;
  }

  /**
   * Obtém todos os IDs de questões favoritadas pelo usuário
   */
  public static async getUserFavoriteQuestionIds(userId: string): Promise<Set<string>> {
    if (!userId) return new Set();

    const cached = this.getCachedFavoriteIds(userId);

    let authUid = '';
    try {
      const auth = getFirebaseAuth();
      authUid = auth.currentUser?.uid || '';
    } catch {
      authUid = '';
    }

    if (!authUid || authUid !== userId) {
      return cached;
    }

    try {
      const q = query(
        collection(this.firestore, this.FAVORITES_COLLECTION),
        where('userId', '==', userId)
      );
      const snap = await getDocs(q);
      const remoteIds = new Set<string>();

      snap.forEach(docSnap => {
        const data = docSnap.data() as UserFavorite;
        if (data.questionId) {
          remoteIds.add(data.questionId);
        }
      });

      // Mescla com cache
      remoteIds.forEach(id => cached.add(id));
      this.saveCachedFavoriteIds(userId, cached);
      return cached;
    } catch (e: any) {
      if (e?.code !== 'permission-denied' && e?.code !== 'unavailable') {
        console.warn('Aviso: falha ao buscar favoritos no Firestore remoto, usando cache:', e);
      }
      return cached;
    }
  }

  /**
   * Consulta paginada dos registros de favoritos do usuário autenticado.
   */
  public static async getUserFavorites(
    userId: string,
    options: { limit?: number; startAfterId?: string } = {}
  ): Promise<PaginatedResult<UserFavorite>> {
    const pageSize = options.limit || 10;
    if (!userId) {
      return { items: [], nextCursor: null, hasMore: false, total: 0 };
    }

    let authUid = '';
    try {
      const auth = getFirebaseAuth();
      authUid = auth.currentUser?.uid || '';
    } catch {
      authUid = '';
    }

    if (!authUid || authUid !== userId) {
      const cached = Array.from(this.getCachedFavoriteIds(userId));
      const items: UserFavorite[] = cached.map(qId => ({
        id: this.getDocId(userId, qId),
        userId,
        questionId: qId,
        favoritedAt: new Date().toISOString()
      }));
      return {
        items: items.slice(0, pageSize),
        nextCursor: null,
        hasMore: false,
        total: items.length
      };
    }

    try {
      let q = query(
        collection(this.firestore, this.FAVORITES_COLLECTION),
        where('userId', '==', userId),
        orderBy('favoritedAt', 'desc'),
        limit(pageSize + 1)
      );

      if (options.startAfterId) {
        const cursorDocRef = doc(this.firestore, this.FAVORITES_COLLECTION, options.startAfterId);
        const cursorSnap = await getDoc(cursorDocRef);
        if (cursorSnap.exists()) {
          q = query(
            collection(this.firestore, this.FAVORITES_COLLECTION),
            where('userId', '==', userId),
            orderBy('favoritedAt', 'desc'),
            startAfter(cursorSnap),
            limit(pageSize + 1)
          );
        }
      }

      const snap = await getDocs(q);
      const docs = snap.docs;
      const hasMore = docs.length > pageSize;
      const pageDocs = hasMore ? docs.slice(0, pageSize) : docs;

      const items: UserFavorite[] = pageDocs.map(d => ({
        ...(d.data() as UserFavorite),
        id: d.id
      }));

      const nextCursor = hasMore && pageDocs.length > 0 ? pageDocs[pageDocs.length - 1].id : null;

      // Sincroniza o cache local com os itens encontrados
      const cached = this.getCachedFavoriteIds(userId);
      items.forEach(item => cached.add(item.questionId));
      this.saveCachedFavoriteIds(userId, cached);

      return {
        items,
        nextCursor,
        hasMore,
        total: items.length
      };
    } catch (error) {
      console.warn('Aviso: falha ao consultar favoritos no Firestore, buscando fallback local:', error);

      // Fallback local caso Firestore esteja offline
      const cached = Array.from(this.getCachedFavoriteIds(userId));
      const items: UserFavorite[] = cached.map(qId => ({
        id: this.getDocId(userId, qId),
        userId,
        questionId: qId,
        favoritedAt: new Date().toISOString()
      }));

      return {
        items: items.slice(0, pageSize),
        nextCursor: null,
        hasMore: false,
        total: items.length
      };
    }
  }
}
