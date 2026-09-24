import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from '../../app/router/RouterContext';
import { useAuth } from '../../providers/AuthProvider';
import { FavoriteService } from '../../services/favoriteService';
import { QuestionService } from '../../services/questionService';
import type { UserFavorite, Question } from '../../types';
import { QuestionsSubNav } from './components/QuestionsSubNav';
import { FavoriteQuestionCard } from './components/FavoriteQuestionCard';
import { Button } from '../../components/ui/DesignSystem';
import { EmptyState, ErrorState, Skeleton } from '../../components/feedback/StateViews';
import { Bookmark, RotateCcw } from 'lucide-react';

interface FavoriteItemWithQuestion {
  favorite: UserFavorite;
  question: Question | null;
}

export const FavoritesListView: React.FC = () => {
  const { navigate } = useRouter();
  const { user } = useAuth();

  const [items, setItems] = useState<FavoriteItemWithQuestion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Paginação
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);

  const loadFavorites = useCallback(async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const pagedFavorites = await FavoriteService.getUserFavorites(user.uid, { limit: 12 });

      // Carrega os dados das questões em paralelo de forma controlada
      const enriched: FavoriteItemWithQuestion[] = await Promise.all(
        pagedFavorites.items.map(async (fav) => {
          try {
            const question = await QuestionService.getQuestionById(fav.questionId);
            return { favorite: fav, question };
          } catch {
            return { favorite: fav, question: null };
          }
        })
      );

      setItems(enriched);
      setNextCursor(pagedFavorites.nextCursor);
      setHasMore(pagedFavorites.hasMore);
    } catch (err) {
      console.error('Erro ao carregar favoritos:', err);
      setError('Não foi possível carregar suas questões favoritas. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const handleLoadMore = async () => {
    if (!user?.uid || !nextCursor || loadingMore) return;

    setLoadingMore(true);
    try {
      const pagedFavorites = await FavoriteService.getUserFavorites(user.uid, {
        limit: 12,
        startAfterId: nextCursor
      });

      const moreEnriched: FavoriteItemWithQuestion[] = await Promise.all(
        pagedFavorites.items.map(async (fav) => {
          try {
            const question = await QuestionService.getQuestionById(fav.questionId);
            return { favorite: fav, question };
          } catch {
            return { favorite: fav, question: null };
          }
        })
      );

      setItems(prev => [...prev, ...moreEnriched]);
      setNextCursor(pagedFavorites.nextCursor);
      setHasMore(pagedFavorites.hasMore);
    } catch (err) {
      console.error('Erro ao carregar mais favoritos:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleToggleFavorite = async (questionId: string) => {
    if (!user?.uid) return;

    try {
      await FavoriteService.toggleFavorite(user.uid, questionId);
      // Remove imediatamente da lista local
      setItems(prev => prev.filter(item => item.favorite.questionId !== questionId));
    } catch (err) {
      console.error('Erro ao desfavoritar questão:', err);
    }
  };

  const handleSelectQuestion = (questionId: string) => {
    navigate(`/app/questoes/pratica/${questionId}`);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto">
      {/* 1. SubNavegação */}
      <QuestionsSubNav />

      {/* 2. Cabeçalho */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100 flex items-center gap-3">
            <span>Questões Favoritas</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {items.length} salvas
            </span>
          </h1>
          <p className="text-sm sm:text-base text-slate-400 mt-1 leading-relaxed">
            Acesse rapidamente as questões que você guardou para revisar com mais atenção.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          icon={<RotateCcw className="w-4 h-4" />}
          onClick={loadFavorites}
          disabled={loading}
        >
          Atualizar
        </Button>
      </header>

      {/* 3. Lista de Favoritos */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="p-6 rounded-2xl bg-[#111827] border border-slate-800 space-y-4">
              <Skeleton className="h-5 w-40 bg-slate-800" />
              <Skeleton className="h-16 w-full bg-slate-800/60" />
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState
          title="Erro ao carregar favoritos"
          message={error}
          onRetry={loadFavorites}
        />
      ) : items.length === 0 ? (
        <EmptyState
          title="Você ainda não salvou nenhuma questão."
          description="Use o ícone de favorito para guardar questões importantes."
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
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map(({ favorite, question }) => (
              <FavoriteQuestionCard
                key={favorite.id}
                question={question}
                questionId={favorite.questionId}
                favoritedAt={favorite.favoritedAt}
                onSelect={handleSelectQuestion}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>

          {hasMore && (
            <div className="pt-4 flex justify-center">
              <Button
                variant="secondary"
                size="md"
                onClick={handleLoadMore}
                disabled={loadingMore}
                loading={loadingMore}
              >
                Carregar mais favoritos
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
