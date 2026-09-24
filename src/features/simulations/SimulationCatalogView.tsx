import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SlidersHorizontal, BookOpen, FileCheck2, Sparkles, RefreshCw, History, Layers } from 'lucide-react';
import { useRouter } from '../../app/router/RouterContext';
import { useAuth } from '../../providers/AuthProvider';
import type { Simulation, SimulationSession, SimulationResult } from '../../types';
import { SimulationService } from '../../services/simulationService';
import { SimulationCard } from './components/SimulationCard';
import {
  SimulationFilters,
  SimulationFiltersState
} from './components/SimulationFilters';
import { SimulationHistoryList } from './components/SimulationHistoryList';
import { EmptyState, ErrorState, Skeleton } from '../../components/feedback/StateViews';
import { Button } from '../../components/ui/DesignSystem';

export const SimulationCatalogView: React.FC = () => {
  const { navigate } = useRouter();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'catalog' | 'history'>('catalog');
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [activeSessionsMap, setActiveSessionsMap] = useState<Record<string, SimulationSession>>({});
  const [results, setResults] = useState<SimulationResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [filters, setFilters] = useState<SimulationFiltersState>({});
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState<boolean>(false);

  // Carrega catálogo, sessões ativas e histórico do estudante
  const loadCatalogData = useCallback(async (currentFilters: SimulationFiltersState) => {
    setLoading(true);
    setError(null);

    try {
      // 1. Consulta simulados publicados via SimulationService
      const fetchedSimulations = await SimulationService.getPublishedSimulations({
        type: currentFilters.type,
        areaId: currentFilters.areaId
      });

      // 2. Consulta sessões ativas e histórico de resultados do usuário logado
      let sessionsMap: Record<string, SimulationSession> = {};
      let userResults: SimulationResult[] = [];

      if (user?.uid) {
        const [activeSessions, hist] = await Promise.all([
          SimulationService.getUserActiveSessions(user.uid),
          SimulationService.getUserResults(user.uid)
        ]);
        sessionsMap = activeSessions;
        userResults = hist;
      }

      setSimulations(fetchedSimulations);
      setActiveSessionsMap(sessionsMap);
      setResults(userResults);
    } catch (err) {
      console.error('Erro ao carregar catálogo de simulados:', err);
      setError('Não foi possível carregar os simulados. Verifique sua conexão e tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    loadCatalogData(filters);
  }, [filters, loadCatalogData]);

  // Filtro local adicional de duração se especificado
  const filteredSimulations = useMemo(() => {
    if (!filters.durationRange) return simulations;

    return simulations.filter((sim) => {
      const dur = sim.durationSeconds || 0;
      if (filters.durationRange === 'short') {
        return dur > 0 && dur <= 3600; // até 60 min
      }
      if (filters.durationRange === 'medium') {
        return dur > 3600 && dur <= 7200; // até 120 min
      }
      if (filters.durationRange === 'long') {
        return dur > 7200; // mais de 120 min
      }
      return true;
    });
  }, [simulations, filters.durationRange]);

  const handleClearFilters = () => {
    setFilters({});
  };

  const handleSelectSimulation = (simId: string) => {
    navigate(`/app/simulados/${simId}`);
  };

  const activeFiltersCount = [
    filters.type,
    filters.areaId,
    filters.durationRange
  ].filter(Boolean).length;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8 animate-fade-in">
      {/* Header Principal da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <FileCheck2 className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
              Simulados
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
            Pratique em condições próximas às da prova e acompanhe sua evolução com métricas reais de tempo e acerto.
          </p>
        </div>

        {/* Botão de Filtros no Mobile */}
        <div className="sm:hidden flex items-center justify-between">
          <button
            onClick={() => setIsMobileFilterOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#111827] border border-slate-700 text-slate-200 hover:bg-[#151F33] transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4 text-blue-400" />
            <span>Filtros</span>
            {activeFiltersCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-blue-600 text-[11px] font-bold text-white flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>

          <span className="text-xs text-slate-400">
            {loading ? 'Carregando...' : `${filteredSimulations.length} simulados`}
          </span>
        </div>
      </div>

      {/* Abas Superiores: Catálogo vs Histórico */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-1">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeTab === 'catalog'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Caderno de Simulados</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeTab === 'history'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Meus Resultados</span>
          {results.length > 0 && (
            <span
              className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
                activeTab === 'history'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {results.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'history' ? (
        <SimulationHistoryList
          results={results}
          onSelectResult={(simId, sessionId, resultId) => {
            navigate(`/app/simulados/${simId}/resultado?sessionId=${sessionId}&resultId=${resultId}`);
          }}
          onExploreSimulations={() => setActiveTab('catalog')}
        />
      ) : (
        <>
          {/* Painel de Filtros Desktop */}
          <div className="hidden sm:block">
            <SimulationFilters
              filters={filters}
              onFilterChange={setFilters}
              onClearFilters={handleClearFilters}
            />
          </div>

          {/* Modal de Filtros Mobile */}
          {isMobileFilterOpen && (
            <SimulationFilters
              filters={filters}
              onFilterChange={setFilters}
              onClearFilters={handleClearFilters}
              isMobileModal={true}
              onCloseMobileModal={() => setIsMobileFilterOpen(false)}
            />
          )}

          {/* Conteúdo Principal / Estados */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-[#111827] border border-slate-800/80 rounded-2xl p-6 space-y-4"
                >
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-5 w-24 rounded-lg" />
                    <Skeleton className="h-5 w-20 rounded-lg" />
                  </div>
                  <Skeleton className="h-6 w-3/4 rounded-lg" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                  <div className="flex gap-4">
                    <Skeleton className="h-4 w-20 rounded-md" />
                    <Skeleton className="h-4 w-20 rounded-md" />
                  </div>
                  <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
                    <Skeleton className="h-4 w-28 rounded-md" />
                    <Skeleton className="h-8 w-24 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <ErrorState
              title="Erro ao carregar simulados"
              message={error}
              onRetry={() => loadCatalogData(filters)}
            />
          ) : filteredSimulations.length === 0 ? (
            <EmptyState
              title="Nenhum simulado encontrado"
              description="Não encontramos nenhum simulado com os filtros selecionados. Tente ajustar os parâmetros de busca."
              actionText="Limpar filtros"
              onAction={handleClearFilters}
              icon={<FileCheck2 className="w-6 h-6" />}
            />
          ) : (
            <div className="space-y-4">
              <div className="hidden sm:flex items-center justify-between text-xs text-slate-400">
                <span>
                  Mostrando <strong className="text-slate-200">{filteredSimulations.length}</strong> {filteredSimulations.length === 1 ? 'simulado disponível' : 'simulados disponíveis'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                {filteredSimulations.map((sim) => (
                  <SimulationCard
                    key={sim.id}
                    simulation={sim}
                    activeSession={activeSessionsMap[sim.id]}
                    onSelect={handleSelectSimulation}
                    onStartOrResume={(simId, hasActive) => {
                      if (hasActive) {
                        navigate(`/app/simulados/${simId}/executar`);
                      } else {
                        handleSelectSimulation(simId);
                      }
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
