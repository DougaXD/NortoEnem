import React from 'react';
import { useRouter } from '../../../app/router/RouterContext';
import { BookOpen, History, Bookmark, AlertCircle } from 'lucide-react';

export const QuestionsSubNav: React.FC = () => {
  const { currentPath, navigate } = useRouter();

  const tabs = [
    {
      id: 'explore',
      label: 'Banco de Questões',
      path: '/app/questoes',
      icon: BookOpen,
      isActive: currentPath === '/app/questoes'
    },
    {
      id: 'history',
      label: 'Histórico',
      path: '/app/questoes/historico',
      icon: History,
      isActive: currentPath === '/app/questoes/historico'
    },
    {
      id: 'favorites',
      label: 'Favoritos',
      path: '/app/questoes/favoritos',
      icon: Bookmark,
      isActive: currentPath === '/app/questoes/favoritos'
    },
    {
      id: 'errors',
      label: 'Caderno de Erros',
      path: '/app/questoes/erros',
      icon: AlertCircle,
      isActive: currentPath === '/app/questoes/erros'
    }
  ];

  return (
    <nav
      aria-label="Navegação secundária do módulo de questões"
      className="w-full bg-[#111827] border border-slate-800 rounded-2xl p-1.5 sm:p-2 mb-6 shadow-sm overflow-x-auto no-scrollbar"
    >
      <div className="flex items-center gap-1 sm:gap-2 min-w-max">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap min-h-[40px] select-none ${
                tab.isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${tab.isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
