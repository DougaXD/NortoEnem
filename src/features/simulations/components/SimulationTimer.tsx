import React, { useEffect, useState, useRef } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

export interface SimulationTimerProps {
  expiresAt: string | null;
  isPaused?: boolean;
  onExpire?: () => void;
  className?: string;
}

/**
 * Componente resiliente de cronômetro para o Motor de Execução de Simulados.
 * 
 * Regra Arquitetural:
 * O tempo restante é SEMPRE calculado com base na diferença entre SimulationSession.expiresAt
 * e o horário atual (Date.now()), garantindo imunidade a recarregamento de página,
 * abas em segundo plano e imprecisão do setInterval.
 */
export const SimulationTimer: React.FC<SimulationTimerProps> = ({
  expiresAt,
  isPaused = false,
  onExpire,
  className = ''
}) => {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(() => {
    if (!expiresAt) return null;
    const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  });

  const hasExpiredRef = useRef<boolean>(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (!expiresAt || isPaused) return;

    // Função de sincronização precisa
    const syncRemainingTime = () => {
      const targetTime = new Date(expiresAt).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((targetTime - now) / 1000));
      
      setSecondsLeft(remaining);

      if (remaining <= 0 && !hasExpiredRef.current) {
        hasExpiredRef.current = true;
        if (onExpireRef.current) {
          onExpireRef.current();
        }
      }
    };

    // Sincroniza imediatamente
    syncRemainingTime();

    // Sincronização periódica a cada segundo
    const interval = setInterval(syncRemainingTime, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, isPaused]);

  if (secondsLeft === null) {
    return (
      <div
        id="simulation-timer-unlimited"
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300 text-xs sm:text-sm font-medium ${className}`}
      >
        <Clock className="w-4 h-4 text-slate-400" />
        <span>Sem limite de tempo</span>
      </div>
    );
  }

  // Formatação HH:MM:SS
  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;

  const formattedTime = hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const isCritical = secondsLeft <= 300; // Últimos 5 minutos
  const isExpired = secondsLeft <= 0;

  return (
    <div
      id="simulation-timer"
      role="timer"
      aria-live="polite"
      aria-label={`Tempo restante do simulado: ${formattedTime}`}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono transition-colors ${
        isExpired
          ? 'bg-rose-950/70 border-rose-600 text-rose-300 font-bold'
          : isCritical
          ? 'bg-amber-950/60 border-amber-500/70 text-amber-300 animate-pulse font-semibold'
          : 'bg-[#131B2E] border-slate-700/80 text-slate-200'
      } ${className}`}
    >
      {isCritical || isExpired ? (
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
      ) : (
        <Clock className="w-4 h-4 text-blue-400 shrink-0" />
      )}
      <div className="flex flex-col">
        <span className="text-xs sm:text-sm font-bold tracking-wider">{formattedTime}</span>
      </div>
      {isCritical && !isExpired && (
        <span className="hidden sm:inline text-[10px] text-amber-400 font-sans uppercase tracking-wider font-semibold">
          Restam &lt; 5 min
        </span>
      )}
    </div>
  );
};
