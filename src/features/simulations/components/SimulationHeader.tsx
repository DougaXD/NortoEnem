import React from 'react';
import {
  LogOut,
  LayoutGrid,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Flag,
  FileCheck
} from 'lucide-react';
import { SimulationTimer } from './SimulationTimer';
import { Button } from '../../../components/ui/DesignSystem';

export interface SimulationHeaderProps {
  title: string;
  sectionTitle?: string;
  currentQuestionIndex: number;
  totalQuestions: number;
  answeredCount: number;
  reviewCount: number;
  expiresAt: string | null;
  saveStatus: 'saved' | 'saving' | 'error';
  onOpenQuestionMap: () => void;
  onExit: () => void;
  onFinish: () => void;
  onExpire: () => void;
}

export const SimulationHeader: React.FC<SimulationHeaderProps> = ({
  title,
  sectionTitle,
  currentQuestionIndex,
  totalQuestions,
  answeredCount,
  reviewCount,
  expiresAt,
  saveStatus,
  onOpenQuestionMap,
  onExit,
  onFinish,
  onExpire
}) => {
  return (
    <header
      id="simulation-header"
      className="sticky top-0 z-30 bg-[#0E1526]/95 backdrop-blur-md border-b border-slate-800 shadow-lg"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
        {/* Lado Esquerdo: Título da Prova, Caderno e Questão Atual */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            id="simulation-btn-exit"
            onClick={onExit}
            aria-label="Sair da prova e salvar progresso"
            title="Sair do simulado"
            className="p-1.5 sm:p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-700/60 transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xs sm:text-sm font-semibold text-slate-100 truncate max-w-[140px] sm:max-w-xs md:max-w-md">
                {title}
              </h1>
              {sectionTitle && (
                <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700 truncate max-w-[200px]">
                  {sectionTitle}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span className="font-medium text-slate-200">
                Questão {currentQuestionIndex + 1} de {totalQuestions}
              </span>
              <span className="text-slate-600">•</span>
              <span className="hidden sm:inline">
                {answeredCount}/{totalQuestions} respondidas
              </span>
              {reviewCount > 0 && (
                <>
                  <span className="hidden sm:inline text-slate-600">•</span>
                  <span className="hidden sm:inline-flex items-center gap-1 text-amber-400 font-medium">
                    <Flag className="w-3 h-3 fill-amber-400/40" />
                    {reviewCount} para revisão
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Centro/Direita: Indicador de Autosave, Cronômetro, Mapa e Finalizar */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Status de Salvamento */}
          <div
            id="simulation-save-indicator"
            className="hidden lg:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-slate-900/60 border border-slate-800"
            title={
              saveStatus === 'saving'
                ? 'Sincronizando com o servidor seguro...'
                : saveStatus === 'error'
                ? 'Falha momentânea na conexão remota. Suas respostas continuam salvas em seu navegador.'
                : 'Todas as respostas salvas em segurança'
            }
          >
            {saveStatus === 'saving' && (
              <>
                <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                <span className="text-blue-300 text-[11px]">Salvando...</span>
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-400 text-[11px]">Salvo</span>
              </>
            )}
            {saveStatus === 'error' && (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-300 text-[11px]">Salvo local</span>
              </>
            )}
          </div>

          {/* Cronômetro */}
          <SimulationTimer expiresAt={expiresAt} onExpire={onExpire} />

          {/* Botão de Mapa de Questões */}
          <button
            type="button"
            id="simulation-btn-map"
            onClick={onOpenQuestionMap}
            aria-label="Abrir mapa geral de questões do simulado"
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-slate-300 hover:text-white bg-[#131B2E] hover:bg-[#1A253E] border border-slate-700/80 transition-colors"
          >
            <LayoutGrid className="w-4 h-4 text-slate-400" />
            <span className="hidden sm:inline">Mapa</span>
          </button>

          {/* Botão Finalizar Simulado */}
          <Button
            id="simulation-btn-finish"
            variant="primary"
            size="sm"
            onClick={onFinish}
            className="!bg-emerald-600 hover:!bg-emerald-500 !border-emerald-500 text-xs sm:text-sm font-medium shadow-sm"
          >
            <FileCheck className="w-4 h-4 mr-1 sm:mr-1.5" />
            <span className="hidden xs:inline">Finalizar</span>
            <span className="xs:hidden">Fim</span>
          </Button>
        </div>
      </div>
    </header>
  );
};
