import React from 'react';
import { useRouter } from './RouterContext';
import { useAuth } from '../../providers/AuthProvider';

// Layouts
import { PublicLayout } from '../../components/layout/PublicLayout';
import { StudentAppLayout } from '../../components/layout/StudentAppLayout';
import { AdminAppLayout } from '../../components/layout/AdminAppLayout';

// Views
import { LandingView } from '../../features/landing/LandingView';
import { AuthView } from '../../features/auth/AuthView';
import { DashboardView } from '../../features/dashboard/DashboardView';
import { PlannerView } from '../../features/planner/PlannerView';
import { OnboardingView } from '../../features/onboarding/OnboardingView';
import { DiagnosticView } from '../../features/diagnostic/DiagnosticView';
import { DiagnosticResultView } from '../../features/diagnostic/DiagnosticResultView';
import { InitialPlanView } from '../../features/diagnostic/InitialPlanView';
import { QuestionListView } from '../../features/questions/QuestionListView';
import { QuestionDetailPreviewView } from '../../features/questions/QuestionDetailPreviewView';
import { PracticeEngineView } from '../../features/questions/practice/PracticeEngineView';
import { HistoryListView } from '../../features/questions/HistoryListView';
import { FavoritesListView } from '../../features/questions/FavoritesListView';
import { ErrorNotebookListView } from '../../features/questions/ErrorNotebookListView';
import { SimulationCatalogView } from '../../features/simulations/SimulationCatalogView';
import { SimulationDetailView } from '../../features/simulations/SimulationDetailView';
import { SimulationRunnerView } from '../../features/simulations/SimulationRunnerView';
import { SimulationResultView } from '../../features/simulations/SimulationResultView';
import { ModulePlaceholder } from '../../components/feedback/ModulePlaceholder';
import { LoadingState } from '../../components/feedback/StateViews';
import { AuthService } from '../../services/firebase/authService';

export const AppRouterView: React.FC = () => {
  const { currentPath, navigate } = useRouter();
  const { firebaseUser, studentProfile, role, loading } = useAuth();

  // Redirecionamento automático caso já esteja autenticado ao acessar /login ou /cadastro
  React.useEffect(() => {
    if (!loading && firebaseUser && (currentPath === '/login' || currentPath === '/cadastro')) {
      AuthService.calculateNextRoute(firebaseUser.uid, role === 'admin', studentProfile).then((dest) => {
        navigate(dest);
      });
    }
  }, [loading, firebaseUser, currentPath, role, studentProfile, navigate]);

  // 1. Rotas Públicas & Autenticação
  if (currentPath === '/') {
    return (
      <PublicLayout>
        <LandingView />
      </PublicLayout>
    );
  }

  if (currentPath === '/login' || currentPath === '/cadastro') {
    if (loading) {
      return (
        <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
          <LoadingState message="Verificando sua sessão..." />
        </div>
      );
    }

    if (firebaseUser) {
      return (
        <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
          <LoadingState message="Redirecionando..." />
        </div>
      );
    }

    return (
      <PublicLayout>
        <AuthView />
      </PublicLayout>
    );
  }

  // Rotas do Funil de Entrada (Onboarding, Diagnóstico e Plano)
  if (
    currentPath === '/onboarding' ||
    currentPath === '/diagnostico' ||
    currentPath === '/diagnostico/resultado' ||
    currentPath === '/plano-inicial'
  ) {
    if (loading) {
      return (
        <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
          <LoadingState message="Carregando sua sessão..." />
        </div>
      );
    }

    if (!firebaseUser) {
      return (
        <PublicLayout>
          <AuthView />
        </PublicLayout>
      );
    }

    return (
      <StudentAppLayout>
        {(() => {
          switch (currentPath) {
            case '/onboarding':
              return <OnboardingView />;
            case '/diagnostico':
              return <DiagnosticView />;
            case '/diagnostico/resultado':
              return <DiagnosticResultView />;
            case '/plano-inicial':
              return <InitialPlanView />;
            default:
              return <OnboardingView />;
          }
        })()}
      </StudentAppLayout>
    );
  }

  // 2. Rotas Administrativas (/admin/*)
  if (currentPath.startsWith('/admin')) {
    if (loading) {
      return (
        <div className="min-h-screen bg-[#090D16] flex items-center justify-center">
          <LoadingState message="Verificando permissões administrativas..." />
        </div>
      );
    }

    if (!firebaseUser) {
      return (
        <PublicLayout>
          <AuthView />
        </PublicLayout>
      );
    }

    if (role !== 'admin') {
      return (
        <StudentAppLayout>
          <div className="p-8 text-center text-slate-300 max-w-md mx-auto my-12 bg-slate-900/60 border border-slate-800 rounded-2xl">
            <h2 className="text-lg font-bold text-red-400">Acesso Restrito</h2>
            <p className="text-xs text-slate-400 mt-2">
              Seu usuário não possui papel de administrador da plataforma Norto.
            </p>
            <button
              onClick={() => navigate('/app/inicio')}
              className="mt-5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl cursor-pointer"
            >
              Voltar à Área do Estudante
            </button>
          </div>
        </StudentAppLayout>
      );
    }

    return (
      <AdminAppLayout>
        {currentPath === '/admin' || currentPath === '/admin/dashboard' ? (
          <ModulePlaceholder
            moduleName="Visão Geral da Administração"
            category="admin"
            description="Painel de controle institucional para monitoramento de métricas, usuários, simulados e conteúdos do ecossistema Norto."
            plannedFeatures={[
              'Métricas globais de estudantes ativos e simulados realizados',
              'Gestão de banco de questões ENEM com tags por habilidade da Matriz de Referência',
              'Cadastramento de simulados oficiais e gabaritos',
              'Configurações de produtos (Norto ENEM, Concursos, etc.)',
            ]}
          />
        ) : (
          <ModulePlaceholder
            moduleName={`Módulo Administrativo: ${currentPath.replace('/admin/', '')}`}
            category="admin"
            plannedFeatures={[
              'Gestão de dados e permissões',
              'Auditoria e registros de segurança',
            ]}
          />
        )}
      </AdminAppLayout>
    );
  }

  // 3. Rotas do Estudante (/app/*)
  if (currentPath.startsWith('/app')) {
    if (loading) {
      return (
        <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
          <LoadingState message="Carregando sua sessão..." />
        </div>
      );
    }

    if (!firebaseUser) {
      return (
        <PublicLayout>
          <AuthView />
        </PublicLayout>
      );
    }

    // Modo de Execução Oficial de Simulado (Ambiente Focado de Prova)
    if (currentPath.startsWith('/app/simulados/') && currentPath.includes('/executar')) {
      const parts = currentPath.split('/app/simulados/')[1].split('/executar')[0];
      const simulationId = parts.split('?')[0];
      if (simulationId) {
        return (
          <SimulationRunnerView
            simulationId={simulationId}
            onExitToDetail={() => navigate(`/app/simulados/${simulationId}`)}
            onGoToCatalog={() => navigate('/app/simulados')}
            onGoToHome={() => navigate('/app/inicio')}
            onGoToResult={(_resultId, sessionId) =>
              navigate(`/app/simulados/${simulationId}/resultado?sessionId=${sessionId}`)
            }
          />
        );
      }
    }
  }

  // Renderização da Área do Estudante Autenticado
  return (
    <StudentAppLayout>
      {(() => {
        // Motor de Prática Interativa de Questões do Norto ENEM
        if (currentPath.startsWith('/app/questoes/pratica')) {
          const parts = currentPath.split('/app/questoes/pratica/');
          const rawId = parts[1] || '';
          const questionId = rawId.split('?')[0] || 'demo-mt-01';
          return (
            <PracticeEngineView
              questionId={questionId}
              onBack={() => navigate('/app/questoes')}
              onGoToHome={() => navigate('/app/inicio')}
            />
          );
        }

        // Detalhes e Leitura de Questão do Banco (com opção de iniciar prática)
        if (currentPath.startsWith('/app/questoes/detalhes') || currentPath.startsWith('/app/questoes/preview')) {
          const rawPart = currentPath.includes('/app/questoes/detalhes/')
            ? currentPath.split('/app/questoes/detalhes/')[1]
            : currentPath.split('/app/questoes/preview/')[1];
          const rawId = rawPart || '';
          const questionId = rawId.split('?')[0] || 'demo-mt-01';
          return (
            <QuestionDetailPreviewView
              questionId={questionId}
              onBack={() => navigate('/app/questoes')}
              onStartPractice={(qId) => navigate(`/app/questoes/pratica/${qId}`)}
            />
          );
        }

        // Relatório de Desempenho, Análise e Gabarito do Simulado (Etapa 04D)
        if (currentPath.startsWith('/app/simulados/') && currentPath.includes('/resultado')) {
          const afterBase = currentPath.split('/app/simulados/')[1];
          const simulationId = afterBase.split('/resultado')[0].split('?')[0];
          const queryString = currentPath.includes('?') ? currentPath.split('?')[1] : '';
          const urlParams = new URLSearchParams(queryString);
          const sessionId = urlParams.get('sessionId') || undefined;
          const resultId = urlParams.get('resultId') || undefined;

          if (simulationId) {
            return (
              <SimulationResultView
                simulationId={simulationId}
                sessionId={sessionId}
                resultId={resultId}
              />
            );
          }
        }

        // Detalhes e Configuração do Simulado
        if (currentPath.startsWith('/app/simulados/')) {
          const parts = currentPath.split('/app/simulados/');
          const rawId = parts[1] || '';
          const simulationId = rawId.split('?')[0];
          if (simulationId) {
            return <SimulationDetailView simulationId={simulationId} />;
          }
        }

        switch (currentPath) {
          case '/app':
          case '/app/inicio':
            return <DashboardView />;

          case '/app/agenda':
          case '/app/plano':
            return <PlannerView />;

          case '/app/estudar':
            return (
              <ModulePlaceholder
                moduleName="Estudo por Áreas do Conhecimento"
                category="student"
                description="Trilhas completas de estudo divididas por Ciências Humanas, Natureza, Linguagens e Matemática."
                plannedFeatures={[
                  'Trilhas pedagógicas orientadas pela Matriz de Referência do ENEM',
                  'Flashcards para memorização ativa',
                  'Mapas mentais e resumos esquemáticos',
                  'Controle de progresso por tópicos prioritários',
                ]}
              />
            );

          case '/app/questoes':
            return (
              <QuestionListView
                onSelectQuestion={(questionId) => {
                  navigate(`/app/questoes/pratica/${questionId}`);
                }}
              />
            );

          case '/app/questoes/historico':
            return <HistoryListView />;

          case '/app/questoes/favoritos':
            return <FavoritesListView />;

          case '/app/questoes/erros':
            return <ErrorNotebookListView />;

          case '/app/simulados':
            return <SimulationCatalogView />;

          case '/app/redacao':
            return (
              <ModulePlaceholder
                moduleName="Laboratório de Redação"
                category="student"
                description="Módulo de prática e correção dissertativa-argumentativa conforme as 5 competências do ENEM."
                plannedFeatures={[
                  'Banco de temas atuais com textos motivadores',
                  'Folha de redação virtual e upload de folha manuscrita',
                  'Avaliação detalhada por cada uma das 5 competências (200 pts cada)',
                ]}
              />
            );

          case '/app/desempenho':
            return (
              <ModulePlaceholder
                moduleName="Análise de Desempenho & Estatísticas"
                category="student"
                description="Relatórios detalhados com taxa de acertos, tempo médio por questão e evolução por matéria."
                plannedFeatures={[
                  'Gráficos de evolução temporal e consistência',
                  'Identificação das suas maiores lacunas de aprendizado',
                  'Comparativo com notas de corte do SiSU',
                ]}
              />
            );

          case '/app/conquistas':
            return (
              <ModulePlaceholder
                moduleName="Gamificação, Níveis e Conquistas"
                category="student"
                description="Sistema de recompensas baseado em esforço pedagógico, acertos e consistência de estudos."
                plannedFeatures={[
                  'Níveis de progressão de Estudante a Mestre ENEM',
                  'Badges de conquistas por metas batidas',
                  'Missões diárias e desafios semanais',
                ]}
              />
            );

          case '/app/biblioteca':
            return (
              <ModulePlaceholder
                moduleName="Biblioteca & Materiais"
                category="student"
                description="Acervo de apostilas, fórmulas, resumos e obras de apoio."
              />
            );

          case '/app/tutor':
            return (
              <ModulePlaceholder
                moduleName="Tutor com IA (Inteligência Pedagógica)"
                category="student"
                description="Assistente inteligente socrático treinado na Matriz ENEM para tirar dúvidas sem dar a resposta direta."
                plannedFeatures={[
                  'Explicações socráticas passo a passo',
                  'Dicas guiadas para resolução de questões difíceis',
                  'Sugestões de estudo personalizadas baseadas no seu histórico',
                ]}
              />
            );

          case '/app/notificacoes':
            return (
              <ModulePlaceholder
                moduleName="Central de Notificações"
                category="student"
                description="Avisos sobre simulados agendados, lembretes de metas diárias e prazos do ENEM."
              />
            );

          case '/app/perfil':
            return (
              <ModulePlaceholder
                moduleName="Perfil do Estudante & Configurações"
                category="student"
                description="Gerenciamento de metas, curso dos sonhos, rotina e preferências de estudo."
                plannedFeatures={[
                  'Alteração de curso alvo e nota de corte no SiSU',
                  'Ajuste de meta diária de estudos (minutos/dia)',
                  'Gerenciamento de conta e segurança',
                ]}
              />
            );

          default:
            return <DashboardView />;
        }
      })()}
    </StudentAppLayout>
  );
};
