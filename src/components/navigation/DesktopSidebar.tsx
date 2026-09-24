import React from 'react';
import { useRouter } from '../../app/router/RouterContext';
import {
  LayoutDashboard,
  BookOpen,
  HelpCircle,
  FileCheck2,
  CalendarCheck,
  TrendingUp,
  Award,
  Sparkles,
  LogOut,
  ShieldAlert,
  ChevronRight,
} from 'lucide-react';
import { PLATFORM_CONFIG } from '../../config/platform';
import { useAuth } from '../../providers/AuthProvider';

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const STUDENT_NAV_ITEMS: NavItem[] = [
  { path: '/app/inicio', label: 'Início', icon: LayoutDashboard },
  { path: '/app/estudar', label: 'Estudo por Áreas', icon: BookOpen },
  { path: '/app/questoes', label: 'Banco de Questões', icon: HelpCircle },
  { path: '/app/simulados', label: 'Simulados', icon: FileCheck2 },
  { path: '/app/agenda', label: 'Cronograma & Tarefas', icon: CalendarCheck },
  { path: '/app/desempenho', label: 'Desempenho', icon: TrendingUp },
  { path: '/app/conquistas', label: 'Conquistas & XP', icon: Award },
  { path: '/app/tutor', label: 'Tutor IA', icon: Sparkles, badge: 'IA' },
];

export const DesktopSidebar: React.FC = () => {
  const { currentPath, navigate } = useRouter();
  const { account, logout } = useAuth();

  return (
    <aside className="hidden md:flex flex-col w-64 bg-[#0D1322] border-r border-slate-800/80 shrink-0 h-screen sticky top-0 z-30">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-emerald-500 flex items-center justify-center font-black text-white text-base shadow-sm shadow-blue-500/20">
              N
            </div>
            <span className="font-extrabold text-base tracking-tight text-white">
              {PLATFORM_CONFIG.name}
            </span>
          </div>
          <p className="text-[10px] font-semibold text-blue-400 tracking-wider mt-1 uppercase">
            {PLATFORM_CONFIG.tagline}
          </p>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Módulos de Preparação
        </div>
        {STUDENT_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isQuestionsModule = item.path === '/app/questoes';
          const isSimulationsModule = item.path === '/app/simulados';
          const isModuleActive = isQuestionsModule
            ? currentPath.startsWith('/app/questoes')
            : isSimulationsModule
            ? currentPath.startsWith('/app/simulados')
            : (currentPath === item.path || (item.path === '/app/inicio' && currentPath === '/app'));

          const isPrimaryHighlight =
            (isModuleActive && (!isQuestionsModule || currentPath === '/app/questoes')) ||
            (isSimulationsModule && currentPath.startsWith('/app/simulados'));

          return (
            <div key={item.path} className="space-y-1">
              <button
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                  isPrimaryHighlight
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                    : isModuleActive
                    ? 'bg-slate-800/80 text-blue-300'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 shrink-0 ${isPrimaryHighlight ? 'text-white' : isModuleActive ? 'text-blue-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                    isModuleActive ? 'bg-white/20 text-white' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>

              {/* Sub-itens contextuais do Módulo de Questões */}
              {isQuestionsModule && currentPath.startsWith('/app/questoes') && (
                <div className="pl-7 pr-2 py-1 space-y-1 border-l border-slate-800 ml-4 my-1">
                  <button
                    onClick={() => navigate('/app/questoes/historico')}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer flex items-center justify-between ${
                      currentPath === '/app/questoes/historico'
                        ? 'text-blue-400 bg-blue-500/10 font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <span>Histórico</span>
                  </button>
                  <button
                    onClick={() => navigate('/app/questoes/favoritos')}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer flex items-center justify-between ${
                      currentPath === '/app/questoes/favoritos'
                        ? 'text-amber-400 bg-amber-500/10 font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <span>Favoritos</span>
                  </button>
                  <button
                    onClick={() => navigate('/app/questoes/erros')}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer flex items-center justify-between ${
                      currentPath === '/app/questoes/erros'
                        ? 'text-rose-400 bg-rose-500/10 font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <span>Caderno de Erros</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* Separador se for admin */}
        {account?.role === 'admin' && (
          <div className="pt-4 mt-4 border-t border-slate-800/80">
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-amber-400">
              Administração
            </div>
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-amber-300 hover:bg-amber-500/10 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Painel Admin</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-amber-400/60" />
            </button>
          </div>
        )}
      </nav>

      {/* User Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-[#0A0E1A]">
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-200 shrink-0 overflow-hidden">
              {account?.photoURL ? (
                <img
                  src={account.photoURL}
                  alt={account.displayName || 'Avatar'}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                account?.displayName?.charAt(0).toUpperCase() || 'E'
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">
                {account?.displayName || 'Estudante'}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {account?.email || 'estudante@norto.com'}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Sair da conta"
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
