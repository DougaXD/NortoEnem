import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  limit,
  setDoc,
  addDoc,
  updateDoc
} from 'firebase/firestore';
import { getFirebaseFirestore } from './config';
import type {
  StudentProfile,
  UserGamification,
  StudentTask,
  Question,
  QuestionAttempt
} from '../../types';

export class DataService {
  private static get firestore() {
    return getFirebaseFirestore();
  }

  // ==== Gamificação & Streak ====
  public static async getUserGamification(userId: string): Promise<UserGamification | null> {
    try {
      const snap = await getDoc(doc(this.firestore, 'userGamification', userId));
      if (snap.exists()) {
        return snap.data() as UserGamification;
      }
      return null;
    } catch (e) {
      console.error('Erro ao buscar gamificação do usuário:', e);
      return null;
    }
  }

  // ==== Tarefas / Checklist do Estudante ====
  public static async getUserTasks(userId: string): Promise<StudentTask[]> {
    try {
      const q = query(
        collection(this.firestore, 'tasks'),
        where('userId', '==', userId),
        limit(20)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as StudentTask));
    } catch (e) {
      console.error('Erro ao buscar tarefas do estudante:', e);
      return [];
    }
  }

  public static async createTask(task: Omit<StudentTask, 'id' | 'createdAt'>): Promise<StudentTask> {
    const now = new Date().toISOString();
    const docRef = await addDoc(collection(this.firestore, 'tasks'), {
      ...task,
      createdAt: now,
    });
    return {
      ...task,
      id: docRef.id,
      createdAt: now,
    };
  }

  public static async toggleTaskCompletion(taskId: string, completed: boolean): Promise<void> {
    await updateDoc(doc(this.firestore, 'tasks', taskId), {
      completed,
    });
  }

  // ==== Perfil Estudante ====
  public static async updateStudentProfile(userId: string, data: Partial<StudentProfile>): Promise<void> {
    await updateDoc(doc(this.firestore, 'studentProfiles', userId), {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  }

  // ==== Histórico de Tentativas de Questões ====
  public static async getRecentAttempts(userId: string): Promise<QuestionAttempt[]> {
    try {
      const q = query(
        collection(this.firestore, 'questionAttempts'),
        where('userId', '==', userId),
        limit(10)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as QuestionAttempt));
    } catch (e) {
      console.error('Erro ao buscar tentativas de questões:', e);
      return [];
    }
  }
}
