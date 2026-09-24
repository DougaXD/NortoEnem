import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { getFirebaseFirestore } from './firebase/config';
import type { StudentProfile } from '../types';

export class OnboardingService {
  private static get firestore() {
    return getFirebaseFirestore();
  }

  public static async getStudentProfile(userId: string): Promise<StudentProfile | null> {
    try {
      const snap = await getDoc(doc(this.firestore, 'studentProfiles', userId));
      if (snap.exists()) {
        return snap.data() as StudentProfile;
      }
      return null;
    } catch (error) {
      console.error('Erro ao carregar perfil do estudante no onboarding:', error);
      // Tentativa de recuperação via backup local
      try {
        const local = localStorage.getItem(`norto_profile_${userId}`);
        if (local) return JSON.parse(local) as StudentProfile;
      } catch {
        // Ignora erro de leitura local
      }
      return null;
    }
  }

  public static async saveOnboardingStep(
    userId: string,
    step: number,
    data: Partial<StudentProfile>
  ): Promise<void> {
    const payload = {
      ...data,
      userId,
      onboardingCurrentStep: step,
      updatedAt: new Date().toISOString(),
    };

    // Salva localmente primeiro para proteção imediata contra queda de conexão
    try {
      const existingLocal = localStorage.getItem(`norto_profile_${userId}`);
      const merged = existingLocal ? { ...JSON.parse(existingLocal), ...payload } : payload;
      localStorage.setItem(`norto_profile_${userId}`, JSON.stringify(merged));
    } catch (e) {
      console.warn('Falha no cache local do perfil:', e);
    }

    try {
      const profileRef = doc(this.firestore, 'studentProfiles', userId);
      const snap = await getDoc(profileRef);
      if (snap.exists()) {
        await updateDoc(profileRef, payload);
      } else {
        await setDoc(profileRef, {
          id: userId,
          onboardingCompleted: false,
          diagnosticCompleted: false,
          targetExam: 'enem',
          schoolYear: '3ano',
          goal: 'Preparação Geral ENEM',
          dailyStudyMinutes: 60,
          preferredStudyTimes: ['afternoon'],
          weakAreas: [],
          strongAreas: [],
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo',
          ...payload,
        });
      }
    } catch (error) {
      console.error('Erro ao persistir etapa de onboarding no Firestore:', error);
      throw error;
    }
  }

  public static async completeOnboarding(
    userId: string,
    finalData: Partial<StudentProfile>
  ): Promise<void> {
    const payload = {
      ...finalData,
      onboardingCompleted: true,
      onboardingCurrentStep: 6,
      diagnosticStatus: 'not_started' as const,
      updatedAt: new Date().toISOString(),
    };

    try {
      const profileRef = doc(this.firestore, 'studentProfiles', userId);
      await updateDoc(profileRef, payload);

      try {
        const existingLocal = localStorage.getItem(`norto_profile_${userId}`);
        const merged = existingLocal ? { ...JSON.parse(existingLocal), ...payload } : payload;
        localStorage.setItem(`norto_profile_${userId}`, JSON.stringify(merged));
      } catch {
        // Ignora falha local
      }
    } catch (error) {
      console.error('Erro ao concluir onboarding no Firestore:', error);
      throw error;
    }
  }
}
