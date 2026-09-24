import React from 'react';
import { useRouter } from '../../app/router/RouterContext';
import {
  LayoutDashboard,
  BookOpen,
  HelpCircle,
  FileCheck2,
  CalendarCheck,
} from 'lucide-react';

const MOBILE_TABS = [
  { path: '/app/inicio', label: 'Início', icon: LayoutDashboard },
  { path: '/app/estudar', label: 'Estudo', icon: BookOpen },
  { path: '/app/questoes', label: 'Questões', icon: HelpCircle },
  { path: '/app/simulados', label: 'Simulados', icon: FileCheck2 },
  { path: '/app/agenda', label: 'Agenda', icon: CalendarCheck },
];

export const MobileBottomNav: React.FC = () => {
  const { currentPath, navigate } = useRouter();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0B0F19]/95 backdrop-blur-md border-t border-slate-800/80 px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]"
    >
      <div className="flex items-center justify-around">
        {MOBILE_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            currentPath === tab.path ||
            (tab.path === '/app/questoes' && currentPath.startsWith('/app/questoes')) ||
            (tab.path === '/app/simulados' && currentPath.startsWith('/app/simulados')) ||
            (tab.path === '/app/inicio' && currentPath === '/app');
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center justify-center py-1 px-3 min-w-[56px] min-h-[44px] rounded-xl transition-all duration-150 no-select cursor-pointer ${
                isActive
                  ? 'text-blue-500 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
              <span className="text-[10px] mt-1 tracking-tight leading-none whitespace-nowrap">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
