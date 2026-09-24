import React, { useEffect, useState, useCallback } from 'react';
import {
  SlidersHorizontal,
  X,
  RotateCcw,
  BookOpen,
  ChevronDown,
  Loader2
} from 'lucide-react';
import type { Question, QuestionFilters } from '../../types';
import { QuestionService } from '../../services/questionService';
import { resolveTaxonomyLabels } from '../../config/academicTaxonomy';
import { useAuth } from '../../providers/AuthProvider';
import { QuestionCard } from './components/QuestionCard';
import { QuestionFilterPanel } from './components/QuestionFilterPanel';
import { QuestionsSubNav } from './components/QuestionsSubNav';
import { Button } from '../../components/ui/DesignSystem';
import { EmptyState, ErrorState, Skeleton } from '../../components/feedback/StateViews';

export interface QuestionListViewProps {
  onSelectQuestion: (questionId: string) => void;
}

const PAGE_SIZE = 6;

export const QuestionListView: React.FC<QuestionListViewProps> = ({ onSelectQuestion }) => {
  const { firebaseUser, loading: authLoading } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filtros ativos
  const [filters, setFilters] = useState<QuestionFilters>({
    status: 'published'
  });

  // Controle de Paginação
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);

  // Modal de Filtros Mobile
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState<boolean>(false);

  // Carrega a primeira página com os filtros atuais
  const loadInitialQuestions = useCallback(async (currentFilters: QuestionFilters) => {
    setLoading(true);
    setError(null);

    try {
      // Operação essencial e única: obter lista de questões
      const pagedResult = await QuestionService.getQuestions(currentFilters, { limit: PAGE_SIZE });
      setQuestions(pagedResult.items);
      setNextCursor(pagedResult.nextCursor);
      setHasMore(pagedResult.hasMore);
    } catch (err) {
      console.error('Erro ao carregar banco de questões:', err);
      setError('Não foi possível carregar as questões. Verifique sua conexão e tente novamente.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Dispara nova consulta ao alterar filtros, aguardando o AuthProvider resolver o estado de autenticação
  useEffect(() => {
    if (authLoading) return;
    loadInitialQuestions(filters);
  }, [filters, authLoading, loadInitialQuestions]);

  // Carrega próxima página (incremental)
  const handleLoadMore = async () => {
    if (!nextCursor || loadingMore) return;

    setLoadingMore(true);
    try {
      const pagedResult = await QuestionService.getQuestions(filters, {
        limit: PAGE_SIZE,
        startAfterId: nextCursor
      });

      setQuestions((prev) => [...prev, ...pagedResult.items]);
      setNextCursor(pagedResult.nextCursor);
      setHasMore(pagedResult.hasMore);
    } catch (err) {
      console.error('Erro ao carregar mais questões:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleFilterChange = (newFilters: QuestionFilters) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({ status: 'published' });
  };

  // Contagem de filtros ativos (excluindo status padrão)
  const activeFiltersCount = [
    Boolean(filters.areaId),
    Boolean(filters.subjectId),
    Boolean(filters.topicId),
    Boolean(filters.difficulty)
  ].filter(Boolean).length;

  const { areaName, subjectName, topicName } = resolveTaxonomyLabels(
    filters.areaId,
    filters.subjectId,
    filters.topicId
  );

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Navegação Secundária do Módulo de Questões */}
      <QuestionsSubNav />

      {/* 1. Cabeçalho Oficial */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100 flex items-center gap-3">
            <span>Banco de Questões</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              ENEM
            </span>
          </h1>
          <p className="text-sm sm:text-base text-slate-400 mt-1 leading-relaxed">
            Pratique com questões organizadas por área, disciplina, assunto e dificuldade.
          </p>
        </div>

        {/* Contador / Indicador de Questões */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="px-3.5 py-1.5 rounded-xl bg-[#111827] border border-slate-800 text-xs sm:text-sm font-medium text-slate-300">
            {loading ? (
              <span className="text-slate-500">Carregando questões...</span>
            ) : questions.length === 0 ? (
              <span className="text-slate-400">Nenhuma questão encontrada</span>
            ) : (
              <span className="text-slate-200">
                {hasMore ? `${questions.length} questões carregadas` : `${questions.length} ${questions.length === 1 ? 'questão disponível' : 'questões disponíveis'}`}
              </span>
            )}
          </div>

          {/* Botão de Filtro Mobile */}
          <div className="lg:hidden">
            <Button
              variant={activeFiltersCount > 0 ? 'primary' : 'secondary'}
              size="md"
              icon={<SlidersHorizontal className="w-4 h-4" />}
              onClick={() => setIsMobileFilterOpen(true)}
            >
              Filtros {activeFiltersCount > 0 && `(${activeFiltersCount})`}
            </Button>
          </div>
        </div>
      </header>

      {/* 2. Chips de Filtros Ativos (quando houver) */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-[#111827]/60 border border-slate-800/80">
          <span className="text-xs text-slate-400 mr-1">Filtros ativos:</span>

          {filters.areaId && (
            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20 font-medium">
              <span>Área: {areaName}</span>
              <button
                type="button"
                onClick={() => handleFilterChange({ ...filters, areaId: undefined, subjectId: undefined, topicId: undefined })}
                className="hover:text-blue-100 cursor-pointer"
                aria-label="Remover filtro de área"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.subjectId && (
            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20 font-medium">
              <span>Disciplina: {subjectName}</span>
              <button
                type="button"
                onClick={() => handleFilterChange({ ...filters, subjectId: undefined, topicId: undefined })}
                className="hover:text-blue-100 cursor-pointer"
                aria-label="Remover filtro de disciplina"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.topicId && (
            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20 font-medium">
              <span>Assunto: {topicName}</span>
              <button
                type="button"
                onClick={() => handleFilterChange({ ...filters, topicId: undefined })}
                className="hover:text-blue-100 cursor-pointer"
                aria-label="Remover filtro de assunto"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.difficulty && (
            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20 font-medium">
              <span>
                Dificuldade: {
                  filters.difficulty === 'easy' ? 'Fácil' :
                  filters.difficulty === 'medium' ? 'Média' : 'Difícil'
                }
              </span>
              <button
                type="button"
                onClick={() => handleFilterChange({ ...filters, difficulty: undefined })}
                className="hover:text-blue-100 cursor-pointer"
                aria-label="Remover filtro de dificuldade"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          <button
            type="button"
            onClick={handleClearFilters}
            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 ml-auto transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Limpar todos</span>
          </button>
        </div>
      )}

      {/* 3. Estrutura Principal: Sidebar de Filtros no Desktop + Lista de Questões */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Painel Lateral Desktop (col-span-1) */}
        <aside className="hidden lg:block lg:col-span-1 p-5 rounded-2xl bg-[#111827] border border-slate-800 sticky top-20">
          <QuestionFilterPanel
            filters={filters}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearFilters}
          />
        </aside>

        {/* Lista de Resultados (col-span-3) */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          {/* Estado de Carregamento Inicial (Skeleton) */}
          {loading && (
            <div className="flex flex-col gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-6 rounded-2xl bg-[#111827] border border-slate-800 space-y-3">
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-24 rounded-md" />
                    <Skeleton className="h-5 w-16 rounded-md" />
                  </div>
                  <Skeleton className="h-4 w-48 rounded-md" />
                  <Skeleton className="h-16 w-full rounded-xl" />
                  <div className="flex justify-between pt-2">
                    <Skeleton className="h-4 w-28 rounded-md" />
                    <Skeleton className="h-4 w-20 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Estado de Erro */}
          {!loading && error && (
            <ErrorState
              title="Falha ao carregar questões"
              message={error}
              onRetry={() => loadInitialQuestions(filters)}
            />
          )}

          {/* Estado Vazio */}
          {!loading && !error && questions.length === 0 && (
            <EmptyState
              title="Nenhuma questão encontrada para esses filtros."
              description="Altere os filtros para tentar novamente."
              actionText={activeFiltersCount > 0 ? 'Limpar filtros' : undefined}
              onAction={activeFiltersCount > 0 ? handleClearFilters : undefined}
              icon={<BookOpen className="w-6 h-6 text-blue-400" />}
            />
          )}

          {/* Lista de Questões */}
          {!loading && !error && questions.length > 0 && (
            <div className="flex flex-col gap-4">
              {questions.map((question) => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  onSelect={onSelectQuestion}
                />
              ))}

              {/* Botão de Paginação Incremental */}
              {hasMore && (
                <div className="flex justify-center pt-4 pb-2">
                  <Button
                    variant="outline"
                    size="md"
                    loading={loadingMore}
                    icon={!loadingMore ? <ChevronDown className="w-4 h-4" /> : undefined}
                    onClick={handleLoadMore}
                    className="min-w-[200px]"
                  >
                    {loadingMore ? 'Carregando mais questões...' : 'Carregar mais questões'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 4. Modal de Filtros Mobile (Slide-over / Bottom Drawer) */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4">
          <div
            className="w-full max-w-lg bg-[#111827] border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-filter-title"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h2 id="mobile-filter-title" className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-blue-400" />
                <span>Filtros do Banco de Questões</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Fechar filtros"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <QuestionFilterPanel
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearFilters={handleClearFilters}
              isMobileModal={true}
              onCloseMobileModal={() => setIsMobileFilterOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
