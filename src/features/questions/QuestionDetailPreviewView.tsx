import React, { useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, Compass, AlertCircle, Sparkles, Bookmark } from 'lucide-react';
import type { Question } from '../../types';
import { QuestionService } from '../../services/questionService';
import { FavoriteService } from '../../services/favoriteService';
import { useAuth } from '../../providers/AuthProvider';
import { KNOWLEDGE_AREAS } from '../../config/theme';
import { resolveTaxonomyLabels } from '../../config/academicTaxonomy';
import { Button } from '../../components/ui/DesignSystem';
import { LoadingState, ErrorState } from '../../components/feedback/StateViews';

export interface QuestionDetailPreviewViewProps {
  questionId: string;
  onBack: () => void;
  onStartPractice?: (questionId: string) => void;
}

export const QuestionDetailPreviewView: React.FC<QuestionDetailPreviewViewProps> = ({
  questionId,
  onBack,
  onStartPractice
}) => {
  const { user } = useAuth();
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorited, setIsFavorited] = useState<boolean>(false);

  useEffect(() => {
    if (!user?.uid || !questionId) return;
    setIsFavorited(FavoriteService.isFavorited(user.uid, questionId));

    const onFavChanged = (e: any) => {
      if (e.detail?.questionId === questionId) {
        setIsFavorited(!!e.detail.isFavorited);
      }
    };
    window.addEventListener('norto:favorite_changed', onFavChanged);
    return () => window.removeEventListener('norto:favorite_changed', onFavChanged);
  }, [user?.uid, questionId]);

  const handleToggleFavorite = async () => {
    if (!user?.uid || !questionId) return;
    try {
      const newState = await FavoriteService.toggleFavorite(user.uid, questionId);
      setIsFavorited(newState);
    } catch (err) {
      console.error('Erro ao alternar favorito:', err);
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function loadQuestion() {
      setLoading(true);
      setError(null);

      try {
        const item = await QuestionService.getQuestionById(questionId);
        if (isMounted) {
          if (!item) {
            setError('Questão não encontrada ou indisponível.');
          } else {
            setQuestion(item);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError('Ocorreu um erro ao carregar os dados da questão.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    if (questionId) {
      loadQuestion();
    } else {
      setError('ID de questão inválido.');
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [questionId]);

  if (loading) {
    return (
      <div className="py-12">
        <LoadingState message="Carregando detalhes da questão..." />
      </div>
    );
  }

  if (error || !question) {
    return (
      <div className="py-12 flex flex-col items-center">
        <ErrorState
          title="Não foi possível exibir a questão"
          message={error || 'A questão solicitada não foi localizada no banco.'}
          onRetry={onBack}
        />
        <div className="mt-4">
          <Button variant="secondary" size="md" icon={<ArrowLeft className="w-4 h-4" />} onClick={onBack}>
            Voltar para o Banco de Questões
          </Button>
        </div>
      </div>
    );
  }

  const areaKey = (question.areaId || question.knowledgeArea) as keyof typeof KNOWLEDGE_AREAS;
  const areaConfig = KNOWLEDGE_AREAS[areaKey] || {
    name: question.knowledgeArea || 'Geral',
    shortName: question.knowledgeArea || 'Geral',
    bgBadge: 'bg-slate-800 text-slate-300 border-slate-700'
  };

  const { subjectName, topicName } = resolveTaxonomyLabels(
    question.areaId || question.knowledgeArea,
    question.subjectId,
    question.topicId
  );

  const difficultyLabel = {
    easy: 'Fácil',
    medium: 'Média',
    hard: 'Difícil'
  }[question.difficulty || 'medium'];

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      {/* Botão de Retorno */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          icon={<ArrowLeft className="w-4 h-4" />}
          onClick={onBack}
          className="text-slate-400 hover:text-slate-100"
        >
          Voltar para o Banco de Questões
        </Button>
      </div>

      {/* Painel de Ação e Prática */}
      <div className="p-4 sm:p-5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 shrink-0 mt-0.5 sm:mt-0">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-blue-100 mb-0.5">
              Modo de Prática Ativa
            </h2>
            <p className="text-xs sm:text-sm text-blue-200/90 leading-relaxed">
              Pratique com seleção de alternativa, registro de tentativa, cronômetro e gabarito comentado.
            </p>
          </div>
        </div>

        {onStartPractice && (
          <Button
            variant="primary"
            size="md"
            icon={<Sparkles className="w-4 h-4" />}
            onClick={() => onStartPractice(question.id)}
            className="shrink-0 w-full sm:w-auto font-semibold shadow-md"
          >
            Resolver Agora
          </Button>
        )}
      </div>

      {/* Card Principal da Questão */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#111827] border border-slate-800 shadow-lg">
        {/* Metadados e Tags */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-5 mb-6 border-b border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${areaConfig.bgBadge}`}>
              {areaConfig.name}
            </span>

            <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
              Dificuldade: {difficultyLabel}
            </span>

            {question.source === 'demo' && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-slate-800/80 text-slate-400 border border-slate-700/60">
                Questão Demonstrativa (Demo)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleToggleFavorite}
              aria-label={isFavorited ? 'Remover dos favoritos' : 'Salvar questão nos favoritos'}
              title={isFavorited ? 'Salva nos favoritos' : 'Adicionar aos favoritos'}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
                isFavorited
                  ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                  : 'text-slate-400 hover:text-amber-400 bg-slate-800/80 border-slate-700/60'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isFavorited ? 'fill-amber-400' : ''}`} />
              <span>{isFavorited ? 'Salva' : 'Favoritar'}</span>
            </button>

            <span className="text-xs font-mono text-slate-500">
              Identificador: #{question.id}
            </span>
          </div>
        </div>

        {/* Trilha Taxonômica */}
        <div className="text-xs text-slate-400 mb-4 font-medium flex items-center gap-2">
          <span className="text-slate-200 font-semibold">{subjectName}</span>
          <span className="text-slate-600">/</span>
          <span className="text-slate-300">{topicName}</span>
        </div>

        {/* Enunciado */}
        <div className="mb-8">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Enunciado
          </h3>
          <p className="text-base sm:text-lg text-slate-100 leading-relaxed whitespace-pre-line">
            {question.statement}
          </p>
        </div>

        {/* Alternativas (Modo Leitura / Não Interativo) */}
        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Alternativas ({question.options?.length || 5})
          </h3>
          <div className="flex flex-col gap-3">
            {question.options?.map((opt) => (
              <div
                key={opt.id}
                className="flex items-start gap-3.5 p-4 rounded-xl bg-[#0E1524] border border-slate-800/90 text-slate-200 text-sm sm:text-base select-none"
              >
                <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 font-semibold flex items-center justify-center text-xs shrink-0 mt-0.5 border border-slate-700">
                  {opt.id}
                </div>
                <div className="flex-1 leading-relaxed text-slate-200">
                  {opt.text}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tags temáticas se houver */}
        {question.tags && question.tags.length > 0 && (
          <div className="mt-8 pt-5 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-500 mr-2">Tópicos relacionados:</span>
            {question.tags.map((tag) => (
              <span
                key={tag}
                className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800/60 text-slate-400 border border-slate-700/40 font-mono"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Ações Inferiores */}
      <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pb-8">
        <Button
          variant="secondary"
          size="md"
          icon={<ArrowLeft className="w-4 h-4" />}
          onClick={onBack}
          className="w-full sm:w-auto"
        >
          Voltar para a lista de questões
        </Button>

        {onStartPractice && (
          <Button
            variant="primary"
            size="lg"
            icon={<Sparkles className="w-4 h-4" />}
            onClick={() => onStartPractice(question.id)}
            className="w-full sm:w-auto font-semibold px-8 shadow-lg"
          >
            Resolver esta Questão
          </Button>
        )}
      </div>
    </div>
  );
};
