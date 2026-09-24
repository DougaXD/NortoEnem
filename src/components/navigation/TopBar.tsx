import React from 'react';
import { useRouter } from '../../app/router/RouterContext';
import { useAuth } from '../../providers/AuthProvider';
import { Bell, UserCircle } from 'lucide-react';
import { PLATFORM_CONFIG } from '../../config/platform';

export const TopBar: React.FC = () => {
  const { navigate } = useRouter();
  const { account } = useAuth();

  return (
    <header className="sticky top-0 z-20 bg-[#0B0F19]/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Mobile Brand / Page Indicator */}
        <div className="flex items-center gap-2.5">
          <div className="md:hidden flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center font-extrabold text-white text-xs">
              N
            </div>
            <span className="font-extrabold text-sm tracking-tight text-white">
              {PLATFORM_CONFIG.name}
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-400 bg-slate-900/60 px-3 py-1 rounded-full border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Foco ENEM 2026</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => navigate('/app/notificacoes')}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 rounded-xl transition-colors relative cursor-pointer"
            title="Notificações"
          >
            <Bell className="w-4 h-4" />
          </button>

          <button
            onClick={() => navigate('/app/perfil')}
            className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            {account?.photoURL ? (
              <img
                src={account.photoURL}
                alt={account.displayName || 'Avatar'}
                referrerPolicy="no-referrer"
                className="w-5 h-5 rounded-full object-cover border border-blue-500/40"
              />
            ) : (
              <UserCircle className="w-4 h-4 text-blue-400" />
            )}
            <span className="hidden sm:inline max-w-[120px] truncate">
              {account?.displayName || 'Perfil'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
