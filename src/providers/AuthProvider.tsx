import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { AuthService } from '../services/firebase/authService';
import type { UserAccount, StudentProfile } from '../types';

interface AuthContextType {
  user: FirebaseUser | null;
  firebaseUser: FirebaseUser | null;
  account: UserAccount | null;
  studentProfile: StudentProfile | null;
  loading: boolean;
  role: 'student' | 'admin' | 'guest';
  signInWithGoogle: () => Promise<string>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [account, setAccount] = useState<UserAccount | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const syncUserData = async (user: FirebaseUser) => {
    try {
      const result = await AuthService.syncUserAfterAuth(user);
      setAccount(result.account);
      setStudentProfile(result.studentProfile);
      setIsAdmin(result.isAdmin);
      return result;
    } catch (e) {
      console.error('Erro ao sincronizar dados do usuário:', e);
      return null;
    }
  };

  useEffect(() => {
    // Verifica eventual retorno de signInWithRedirect
    AuthService.handleRedirectResult().then((result) => {
      if (result) {
        setFirebaseUser(result.user);
        setAccount(result.account);
        setStudentProfile(result.studentProfile);
        setIsAdmin(result.isAdmin);
      }
    }).catch((e) => {
      console.warn('Verificação de redirect concluída:', e);
    });

    const unsubscribe = AuthService.subscribeToAuthState(async (user) => {
      setFirebaseUser(user);
      if (user) {
        await syncUserData(user);
      } else {
        setAccount(null);
        setStudentProfile(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async (): Promise<string> => {
    setLoading(true);
    try {
      const result = await AuthService.signInWithGoogle();
      setFirebaseUser(result.user);
      setAccount(result.account);
      setStudentProfile(result.studentProfile);
      setIsAdmin(result.isAdmin);
      return result.nextRoute;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await AuthService.logout();
    setFirebaseUser(null);
    setAccount(null);
    setStudentProfile(null);
    setIsAdmin(false);
  };

  const refreshProfile = async () => {
    if (firebaseUser) {
      await syncUserData(firebaseUser);
    }
  };

  // Papel determinado pela autorização real (Admin comprovado > Student > Guest)
  const role: 'student' | 'admin' | 'guest' = !firebaseUser
    ? 'guest'
    : isAdmin
    ? 'admin'
    : 'student';

  return (
    <AuthContext.Provider
      value={{
        user: firebaseUser,
        firebaseUser,
        account,
        studentProfile,
        loading,
        role,
        signInWithGoogle,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
}
