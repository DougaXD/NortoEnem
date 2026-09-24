import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseFirestore } from './config';
import { StudyPlanService } from '../studyPlanService';
import type { UserAccount, StudentProfile } from '../../types';

export interface AuthSyncResult {
  account: UserAccount;
  studentProfile: StudentProfile | null;
  isAdmin: boolean;
  isNewUser: boolean;
  nextRoute: string;
}

export class AuthService {
  private static get auth() {
    return getFirebaseAuth();
  }

  private static get firestore() {
    return getFirebaseFirestore();
  }

  /**
   * Monitora o estado da sessão do Firebase Auth com detecção resiliente
   */
  public static subscribeToAuthState(callback: (user: FirebaseUser | null) => void) {
    return onAuthStateChanged(this.auth, callback);
  }

  /**
   * Verifica autorização administrativa exclusivamente através de mecanismos seguros:
   * 1. Custom Claims do token do Firebase Auth (definidas no backend)
   * 2. Existência de registro autenticado e autorizado na coleção restrita /admins/{uid}
   * Não utiliza comparações de e-mail hardcoded no cliente.
   */
  public static async checkIsAdmin(user: FirebaseUser): Promise<boolean> {
    try {
      // 1. Verificação de Custom Claims no token criptográfico oficial
      const tokenResult = await user.getIdTokenResult();
      if (tokenResult.claims.role === 'admin' || tokenResult.claims.admin === true) {
        return true;
      }

      // 2. Consulta de leitura à coleção restrita /admins/{uid}, protegida pelas Firestore Security Rules
      const adminRef = doc(this.firestore, 'admins', user.uid);
      const adminSnap = await getDoc(adminRef);
      return adminSnap.exists() && adminSnap.data()?.role === 'admin';
    } catch {
      // Bloqueado pelas regras de segurança (comportamento esperado para qualquer estudante/usuário comum)
      return false;
    }
  }

  /**
   * Busca documento da conta do usuário em users/{uid}
   */
  public static async getUserAccount(uid: string): Promise<UserAccount | null> {
    try {
      const userRef = doc(this.firestore, 'users', uid);
      const snapshot = await getDoc(userRef);
      if (snapshot.exists()) {
        return snapshot.data() as UserAccount;
      }
      return null;
    } catch (error) {
      console.error('Erro ao buscar conta do usuário:', error);
      return null;
    }
  }

  /**
   * Busca perfil detalhado do estudante em studentProfiles/{uid}
   */
  public static async getStudentProfile(uid: string): Promise<StudentProfile | null> {
    try {
      const profileRef = doc(this.firestore, 'studentProfiles', uid);
      const snapshot = await getDoc(profileRef);
      if (snapshot.exists()) {
        return snapshot.data() as StudentProfile;
      }
      return null;
    } catch (error) {
      console.error('Erro ao buscar perfil do estudante:', error);
      return null;
    }
  }

  /**
   * Calcula de forma determinística a próxima rota após autenticação bem-sucedida,
   * baseando-se no estado real persistido nos documentos.
   */
  public static async calculateNextRoute(
    userId: string,
    isAdminUser: boolean,
    studentProfile: StudentProfile | null
  ): Promise<string> {
    if (isAdminUser) {
      return '/admin/dashboard';
    }

    if (!studentProfile || !studentProfile.onboardingCompleted) {
      return '/onboarding';
    }

    if (!studentProfile.diagnosticCompleted) {
      return '/diagnostico';
    }

    if (!studentProfile.hasActiveStudyPlan) {
      const activePlan = await StudyPlanService.getActivePlan(userId);
      if (!activePlan) {
        return '/plano-inicial';
      }
    }

    return '/app/inicio';
  }

  /**
   * Sincroniza e provisiona os documentos da conta do usuário após autenticação do Google.
   * Contas públicas recebem obrigatoriamente role = 'student'.
   */
  public static async syncUserAfterAuth(user: FirebaseUser): Promise<AuthSyncResult> {
    const now = new Date().toISOString();
    const displayName = user.displayName || user.email?.split('@')[0] || 'Estudante';

    // Dispara leituras em paralelo para minimizar tempo de espera de rede
    const [isAdmin, existing, existingProfile] = await Promise.all([
      this.checkIsAdmin(user),
      this.getUserAccount(user.uid),
      this.getStudentProfile(user.uid),
    ]);

    let account: UserAccount;
    let studentProfile: StudentProfile | null = null;
    let isNewUser = false;

    if (existing) {
      account = existing;
      studentProfile = existingProfile;

      // Atualização não-bloqueante de timestamp e foto em segundo plano
      updateDoc(doc(this.firestore, 'users', user.uid), {
        lastLoginAt: now,
        updatedAt: now,
        ...(user.photoURL && !existing.photoURL ? { photoURL: user.photoURL } : {}),
      }).catch(() => {});
    } else {
      isNewUser = true;
      // Regra de segurança: Todo usuário público é estritamente inicializado como 'student'
      account = {
        id: user.uid,
        displayName,
        email: user.email || '',
        photoURL: user.photoURL || undefined,
        role: 'student',
        status: 'active',
        entitlements: ['enem'],
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
      };

      studentProfile = {
        id: user.uid,
        userId: user.uid,
        name: displayName,
        schoolYear: '3ano',
        targetExam: 'ENEM 2026',
        goal: '',
        dailyStudyMinutes: 60,
        preferredStudyTimes: ['afternoon'],
        weakAreas: [],
        strongAreas: [],
        onboardingCompleted: false,
        diagnosticCompleted: false,
        hasActiveStudyPlan: false,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo',
        updatedAt: now,
      };

      const gamification = {
        id: user.uid,
        userId: user.uid,
        totalXp: 0,
        level: 1,
        currentStreak: 0,
        longestStreak: 0,
        updatedAt: now,
      };

      // Provisionamento atômico em lote (batch write = 1 único round-trip de rede)
      const batch = writeBatch(this.firestore);
      batch.set(doc(this.firestore, 'users', user.uid), account);
      batch.set(doc(this.firestore, 'studentProfiles', user.uid), studentProfile);
      batch.set(doc(this.firestore, 'userGamification', user.uid), gamification);
      await batch.commit();
    }

    const nextRoute = await this.calculateNextRoute(user.uid, isAdmin, studentProfile);

    return {
      account,
      studentProfile,
      isAdmin,
      isNewUser,
      nextRoute,
    };
  }

  /**
   * Processa retorno de autenticação via redirect caso tenha ocorrido
   */
  public static async handleRedirectResult(): Promise<(AuthSyncResult & { user: FirebaseUser }) | null> {
    try {
      const credential = await getRedirectResult(this.auth);
      if (credential && credential.user) {
        const syncResult = await this.syncUserAfterAuth(credential.user);
        return {
          user: credential.user,
          ...syncResult,
        };
      }
      return null;
    } catch (error) {
      console.warn('Verificação de redirect concluída sem pendências:', error);
      return null;
    }
  }

  /**
   * Fluxo principal oficial de Autenticação com o Google.
   * Utiliza GoogleAuthProvider com prompt de seleção de contas via setCustomParameters.
   */
  public static async signInWithGoogle(): Promise<AuthSyncResult & { user: FirebaseUser }> {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account',
    });

    const tStart = performance.now();

    try {
      const credential = await signInWithPopup(this.auth, provider);
      const tPopup = performance.now();

      const syncResult = await this.syncUserAfterAuth(credential.user);
      const tSync = performance.now();

      console.info(
        `[Norto Auth Perf] Popup: ${(tPopup - tStart).toFixed(0)}ms | Sincronização: ${(tSync - tPopup).toFixed(0)}ms | Total: ${(tSync - tStart).toFixed(0)}ms`
      );

      return {
        user: credential.user,
        ...syncResult,
      };
    } catch (error: any) {
      // Se popup for bloqueado pelo navegador em mobile, aciona fallback para redirect
      if (error?.code === 'auth/popup-blocked') {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile) {
          await signInWithRedirect(this.auth, provider);
          // Aguarda o redirecionamento
          return new Promise(() => {});
        }
      }
      throw error;
    }
  }

  /**
   * Encerra a sessão
   */
  public static async logout(): Promise<void> {
    await signOut(this.auth);
  }
}
