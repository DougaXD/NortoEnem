import React from 'react';
import { useRouter } from '../../app/router/RouterContext';
import { PLATFORM_CONFIG } from '../../config/platform';
import { Button } from '../ui/DesignSystem';

export const PublicLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { navigate, isAuthArea } = useRouter();

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col justify-between">
      <header className="border-b border-slate-800/80 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white text-base">
              N
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-white block">
                {PLATFORM_CONFIG.name}
              </span>
              <span className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider block">
                {PLATFORM_CONFIG.tagline}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!isAuthArea && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/login')}
                className="bg-blue-600 hover:bg-blue-500 text-white font-medium"
              >
                Entrar com Google
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col justify-center max-w-6xl mx-auto w-full p-6">
        {children}
      </main>

      <footer className="border-t border-slate-800/80 py-6 px-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} {PLATFORM_CONFIG.name}. Todos os direitos reservados.
      </footer>
    </div>
  );
};
