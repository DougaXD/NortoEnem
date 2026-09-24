import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from '../../app/router/RouterContext';
import { useAuth } from '../../providers/AuthProvider';
import { QuestionService } from '../../services/questionService';
import { QuestionReviewService } from '../../services/reviewService';
import type { ErrorNotebookItem } from '../../types';
import { QuestionsSubNav } from './components/QuestionsSubNav';
import { ErrorQuestionCard } from './components/ErrorQuestionCard';
import { Button } from '../../components/ui/DesignSystem';
import { EmptyState, ErrorState, Skeleton } from '../../components/feedback/StateViews';
import { AlertCircle, RotateCcw, Filter, CheckCircle2, Clock } from 'lucide-react';

export const ErrorNotebookListView: React.FC = () => {
  const { navigate } = useRouter();
  const { user } = useAuth();

  const [items, setItems] = useState<ErrorNotebookItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros: 'not_reviewed' é a visão principal obrigatória
  const [activeTab, setActiveTab] = useState<'not_reviewed' | 'reviewed' | 'all'>('not_reviewed');
  const [selectedArea, setSelectedArea] = useState<string>('');

  const loadErrorNotebook = useCallback(async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const errorList = await QuestionService.getUserErrorNotebook(user.uid, {
        status: activeTab,
        areaId: selectedArea || undefined
      });

      setItems(errorList);
    } catch (err) {
      console.error('Erro ao carregar caderno de erros:', err);
      setError('Não foi possível carregar seu caderno de erros. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [user?.uid, activeTab, selectedArea]);

  useEffect(() => {
    loadErrorNotebook();
  }, [loadErrorNotebook]);

  const handleToggleReview = async (questionId: string, currentStatus: 'not_reviewed' | 'reviewed') => {
    if (!user?.uid) return;

    const newStatus = currentStatus === 'not_reviewed' ? 'reviewed' : 'not_reviewed';

    try {
      await QuestionReviewService.setReviewStatus(user.uid, questionId, newStatus);

      // Atualiza o estado da lista em tempo real
      setItems(prev => {
        if (activeTab === 'all') {
          return prev.map(item =>
            item.questionId === questionId
              ? { ...item, reviewStatus: newStatus, reviewedAt: newStatus === 'reviewed' ? new Date().toISOString() : null }
              : item
          );
        } else {
          // Se estamos na aba 'not_reviewed' ou 'reviewed', o item migra para a outra aba
          return prev.filter(item => item.questionId !== questionId);
        }
      });
    } catch (err) {
      console.error('Erro ao atualizar status de revisão:', err);
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
            <span>Caderno de Erros</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
              {items.length} {items.length === 1 ? 'questão' : 'questões'}
            </span>
          </h1>
          <p className="text-sm sm:text-base text-slate-400 mt-1 leading-relaxed">
            Revise as questões que apresentaram dificuldade para consolidar o aprendizado.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          icon={<RotateCcw className="w-4 h-4" />}
          onClick={loadErrorNotebook}
          disabled={loading}
        >
          Atualizar
        </Button>
      </header>

      {/* 3. Abas de Revisão e Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 sm:p-3 rounded-2xl bg-[#111827] border border-slate-800">
        {/* Abas: Não revisadas (padrão) / Revisadas / Todas */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('not_reviewed')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap min-h-[40px] ${
              activeTab === 'not_reviewed'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Não revisadas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reviewed')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap min-h-[40px] ${
              activeTab === 'reviewed'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Revisadas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap min-h-[40px] ${
              activeTab === 'all'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <span>Todas</span>
          </button>
        </div>

        {/* Filtro por Área */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-500 hidden sm:block" />
          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            aria-label="Filtrar caderno de erros por área"
            className="w-full sm:w-auto bg-[#0B0F19] border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer min-h-[40px] sm:min-h-0"
          >
            <option value="">Todas as Áreas</option>
            <option value="MT">Matemática (MT)</option>
            <option value="CN">Ciências da Natureza (CN)</option>
            <option value="LC">Linguagens e Códigos (LC)</option>
            <option value="CH">Ciências Humanas (CH)</option>
          </select>
        </div>
      </div>

      {/* 4. Lista do Caderno de Erros */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="p-6 rounded-2xl bg-[#111827] border border-slate-800 space-y-4">
              <Skeleton className="h-5 w-40 bg-slate-800" />
              <Skeleton className="h-20 w-full bg-slate-800/60" />
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState
          title="Erro ao carregar caderno de erros"
          message={error}
          onRetry={loadErrorNotebook}
        />
      ) : items.length === 0 ? (
        <EmptyState
          title="Seu caderno de erros está vazio."
          description={
            activeTab === 'not_reviewed'
              ? 'Parabéns! Não há erros pendentes de revisão pedagógica.'
              : activeTab === 'reviewed'
              ? 'Você ainda não marcou questões como revisadas.'
              : 'Nenhuma questão com erro registrada no seu histórico.'
          }
          action={
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate('/app/questoes')}
            >
              Praticar Questões
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => (
            <ErrorQuestionCard
              key={item.questionId}
              item={item}
              onSelect={handleSelectQuestion}
              onToggleReview={handleToggleReview}
            />
          ))}
        </div>
      )}
    </div>
  );
};
