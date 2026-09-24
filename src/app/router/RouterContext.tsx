import React, { createContext, useContext, useState, useEffect } from 'react';

export type AppRoute =
  // Área pública
  | '/'
  | '/login'
  | '/cadastro'
  | '/onboarding'
  | '/diagnostico'
  // Área do estudante (/app/*)
  | '/app'
  | '/app/inicio'
  | '/app/estudar'
  | '/app/questoes'
  | '/app/questoes/pratica'
  | `/app/questoes/pratica/${string}`
  | '/app/simulados'
  | '/app/redacao'
  | '/app/plano'
  | '/app/agenda'
  | '/app/desempenho'
  | '/app/conquistas'
  | '/app/biblioteca'
  | '/app/tutor'
  | '/app/notificacoes'
  | '/app/perfil'
  // Área administrativa (/admin/*)
  | '/admin'
  | '/admin/dashboard'
  | '/admin/usuarios'
  | '/admin/questoes'
  | '/admin/simulados'
  | '/admin/conteudos'
  | '/admin/redacoes'
  | '/admin/biblioteca'
  | '/admin/gamificacao'
  | '/admin/missoes'
  | '/admin/notificacoes'
  | '/admin/analytics'
  | '/admin/configuracoes';

interface RouterContextType {
  currentPath: string;
  navigate: (path: string) => void;
  isStudentArea: boolean;
  isAdminArea: boolean;
  isAuthArea: boolean;
  isPublicArea: boolean;
}

const RouterContext = createContext<RouterContextType | undefined>(undefined);

export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Inicializa a partir da URL atual do navegador ou padrão
  const [currentPath, setCurrentPath] = useState<string>(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash) return hash;
    const path = window.location.pathname;
    return path || '/app/inicio';
  });

  useEffect(() => {
    const handlePopState = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) {
        setCurrentPath(hash);
      } else {
        setCurrentPath(window.location.pathname || '/app/inicio');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    setCurrentPath(path);
    // Atualiza history e hash para suportar ambientes restritos de iframe
    try {
      window.history.pushState(null, '', `#${path}`);
    } catch {
      // Ignora erro em iframes sem permissão estrita de histórico
    }
  };

  const isStudentArea = currentPath.startsWith('/app');
  const isAdminArea = currentPath.startsWith('/admin');
  const isAuthArea = currentPath === '/login' || currentPath === '/cadastro';
  const isPublicArea = !isStudentArea && !isAdminArea && !isAuthArea;

  return (
    <RouterContext.Provider
      value={{
        currentPath,
        navigate,
        isStudentArea,
        isAdminArea,
        isAuthArea,
        isPublicArea,
      }}
    >
      {children}
    </RouterContext.Provider>
  );
};

export function useRouter() {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouter deve ser utilizado dentro de um RouterProvider');
  }
  return context;
}
