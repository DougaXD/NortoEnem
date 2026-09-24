import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from '../../app/router/RouterContext';
import { useAuth } from '../../providers/AuthProvider';
import { QuestionService } from '../../services/questionService';
import type { QuestionAttempt, AttemptFilters } from '../../types';
import { QuestionsSubNav } from './components/QuestionsSubNav';
import { AttemptHistoryCard } from './components/AttemptHistoryCard';
import { Button } from '../../components/ui/DesignSystem';
import { EmptyState, ErrorState, Skeleton } from '../../components/feedback/StateViews';
import { RotateCcw, AlertTriangle, X, Filter } from 'lucide-react';

const PAGE_SIZE = 10;

export const HistoryListView: React.FC = () => {
  const { navigate } = useRouter();
  const { user } = useAuth();

  const [attempts, setAttempts] = useState<QuestionAttempt[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [filters, setFilters] = useState<AttemptFilters>({
    areaId: undefined,
    result: 'all',
    mode: 'all'
  });

  // Modal para avisar se a questão clicada estiver indisponível
  const [unavailableQuestionId, setUnavailableQuestionId] = useState<string | null>(null);

  // Paginação
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);

  const loadAttempts = useCallback(async (currentFilters: AttemptFilters) => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await QuestionService.getUserAttempts(user.uid, currentFilters, {
        limit: PAGE_SIZE
      });

      setAttempts(result.items);
      setNextCursor(result.nextCursor);
      setHasMore(result.hasMore);
      setTotalCount(result.total || result.items.length);
    } catch (err) {
      console.error('Erro ao carregar histórico de tentativas:', err);
      setError('Não foi possível carregar seu histórico. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    loadAttempts(filters);
  }, [filters, loadAttempts]);

  const handleLoadMore = async () => {
    if (!user?.uid || !nextCursor || loadingMore) return;

    setLoadingMore(true);
    try {
      const result = await QuestionService.getUserAttempts(user.uid, filters, {
        limit: PAGE_SIZE,
        startAfterId: nextCursor
      });

      setAttempts(prev => [...prev, ...result.items]);
      setNextCursor(result.nextCursor);
      setHasMore(result.hasMore);
    } catch (err) {
      console.error('Erro ao carregar mais tentativas do histórico:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleOpenQuestion = async (questionId: string) => {
    try {
      const q = await QuestionService.getQuestionById(questionId);
      if (q && q.status === 'published') {
        navigate(`/app/questoes/pratica/${questionId}`);
      } else {
        setUnavailableQuestionId(questionId);
      }
    } catch {
      setUnavailableQuestionId(questionId);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto">
      {/* 1. Navegação Secundária do Módulo de Questões */}
      <QuestionsSubNav />

      {/* 2. Cabeçalho da Página */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100 flex items-center gap-3">
            <span>Histórico de Resoluções</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {attempts.length} registradas
            </span>
          </h1>
          <p className="text-sm sm:text-base text-slate-400 mt-1 leading-relaxed">
            Consulte todas as suas tentativas individuais em ordem cronológica.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          icon={<RotateCcw className="w-4 h-4" />}
          onClick={() => loadAttempts(filters)}
          disabled={loading}
        >
          Atualizar
        </Button>
      </header>

      {/* 3. Filtros do Histórico */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-[#111827] border border-slate-800">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mr-1">
          <Filter className="w-4 h-4 text-blue-400" />
          <span>Filtros:</span>
        </div>

        {/* Filtro de Área */}
        <select
          value={filters.areaId || ''}
          onChange={(e) => setFilters(prev => ({ ...prev, areaId: e.target.value || undefined }))}
          aria-label="Filtrar histórico por área"
          className="bg-[#0B0F19] border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
        >
          <option value="">Todas as Áreas</option>
          <option value="MT">Matemática (MT)</option>
          <option value="CN">Ciências da Natureza (CN)</option>
          <option value="LC">Linguagens e Códigos (LC)</option>
          <option value="CH">Ciências Humanas (CH)</option>
        </select>

        {/* Filtro de Resultado */}
        <select
          value={filters.result || 'all'}
          onChange={(e) => setFilters(prev => ({ ...prev, result: e.target.value as any }))}
          aria-label="Filtrar histórico por resultado"
          className="bg-[#0B0F19] border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
        >
          <option value="all">Todos os Resultados</option>
          <option value="correct">Apenas Acertos</option>
          <option value="incorrect">Apenas Erros</option>
        </select>

        {/* Filtro de Modo */}
        <select
          value={filters.mode || 'all'}
          onChange={(e) => setFilters(prev => ({ ...prev, mode: e.target.value as any }))}
          aria-label="Filtrar histórico por modo"
          className="bg-[#0B0F19] border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
        >
          <option value="all">Todos os Modos</option>
          <option value="practice">Prática</option>
          <option value="diagnostic">Diagnóstico</option>
          <option value="simulation">Simulado</option>
        </select>

        {(filters.areaId || filters.result !== 'all' || filters.mode !== 'all') && (
          <button
            type="button"
            onClick={() => setFilters({ areaId: undefined, result: 'all', mode: 'all' })}
            className="text-xs text-blue-400 hover:text-blue-300 font-medium px-2 py-1 cursor-pointer"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* 4. Lista de Tentativas */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="p-5 rounded-2xl bg-[#111827] border border-slate-800 space-y-3">
              <Skeleton className="h-4 w-48 bg-slate-800" />
              <Skeleton className="h-4 w-full bg-slate-800/60" />
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState
          title="Erro ao carregar histórico"
          message={error}
          onRetry={() => loadAttempts(filters)}
        />
      ) : attempts.length === 0 ? (
        <EmptyState
          title="Você ainda não respondeu nenhuma questão."
          description="Inicie uma sessão de prática no banco de questões para que seus acertos, erros e tempos fiquem registrados aqui."
          action={
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate('/app/questoes')}
            >
              Explorar Banco de Questões
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {attempts.map(attempt => (
            <AttemptHistoryCard
              key={attempt.id}
              attempt={attempt}
              onOpenQuestion={handleOpenQuestion}
            />
          ))}

          {/* Carregamento Incremental */}
          {hasMore && (
            <div className="pt-4 flex justify-center">
              <Button
                variant="secondary"
                size="md"
                onClick={handleLoadMore}
                disabled={loadingMore}
                loading={loadingMore}
              >
                Carregar mais tentativas
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Modal / Diálogo se a questão estiver indisponível */}
      {unavailableQuestionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#111827] border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-amber-400">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-100 text-base">Questão Indisponível</h3>
              </div>
              <button
                type="button"
                onClick={() => setUnavailableQuestionId(null)}
                className="text-slate-400 hover:text-slate-200 p-1"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              Esta questão (#{unavailableQuestionId}) não está mais disponível para nova prática interativa, mas seu registro original continua preservado no seu histórico.
            </p>

            <div className="pt-2 flex justify-end">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setUnavailableQuestionId(null)}
              >
                Entendido
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
