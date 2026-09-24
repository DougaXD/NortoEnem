import React from 'react';
import { useRouter } from '../../app/router/RouterContext';
import { useAuth } from '../../providers/AuthProvider';
import {
  Users,
  HelpCircle,
  FileCheck,
  Award,
  Layers,
  BarChart3,
  Settings,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';
import { PLATFORM_CONFIG } from '../../config/platform';

const ADMIN_NAV_ITEMS = [
  { path: '/admin/dashboard', label: 'Visão Geral', icon: BarChart3 },
  { path: '/admin/usuarios', label: 'Gestão de Usuários', icon: Users },
  { path: '/admin/questoes', label: 'Banco de Questões', icon: HelpCircle },
  { path: '/admin/simulados', label: 'Simulados & Provas', icon: FileCheck },
  { path: '/admin/conteudos', label: 'Conteúdos & Aulas', icon: Layers },
  { path: '/admin/gamificacao', label: 'Missões & Gamificação', icon: Award },
  { path: '/admin/configuracoes', label: 'Configurações', icon: Settings },
];

export const AdminAppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentPath, navigate } = useRouter();
  const { account } = useAuth();

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col md:flex-row">
      {/* Admin Sidebar */}
      <aside className="w-full md:w-64 bg-[#0D121F] border-r border-slate-800 p-4 shrink-0 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-xs">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white tracking-tight">Admin Console</h2>
                <p className="text-[10px] text-amber-400 font-semibold uppercase">{PLATFORM_CONFIG.name}</p>
              </div>
            </div>
          </div>

          <nav className="space-y-1">
            {ADMIN_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-slate-800">
          <button
            onClick={() => navigate('/app/inicio')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao App do Aluno</span>
          </button>
        </div>
      </aside>

      {/* Admin Main Body */}
      <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto overflow-y-auto">
        <div className="mb-6 flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
              Painel Administrativo Restrito
            </span>
            <h1 className="text-xl font-extrabold text-white">Console de Gestão</h1>
          </div>
          <div className="text-xs text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
            Sessão: <strong className="text-slate-200">{account?.email || 'admin@norto.com'}</strong>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
};
