import React from 'react';
import { Card, Button, Badge } from '../../components/ui/DesignSystem';
import { useRouter } from '../../app/router/RouterContext';
import { ArrowLeft, Clock, Sparkles } from 'lucide-react';

export interface ModulePlaceholderProps {
  moduleName: string;
  category: 'student' | 'admin';
  description?: string;
  plannedFeatures?: string[];
}

export const ModulePlaceholder: React.FC<ModulePlaceholderProps> = ({
  moduleName,
  category,
  description = 'Este módulo faz parte da arquitetura oficial do Norto ENEM e será disponibilizado nas próximas etapas de implementação.',
  plannedFeatures,
}) => {
  const { navigate } = useRouter();

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card variant="elevated" padding="lg" className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">{moduleName}</h2>
                <Badge variant={category === 'admin' ? 'warning' : 'primary'} size="sm">
                  Arquitetura Preparada
                </Badge>
              </div>
              <p className="text-xs text-slate-400">Norto ENEM — Próxima Fase</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm text-slate-300 leading-relaxed">{description}</p>

          {plannedFeatures && plannedFeatures.length > 0 && (
            <div className="bg-[#0B0F19] rounded-xl p-4 border border-slate-800 space-y-2 mt-4">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>Capacidades Previstas para este Módulo:</span>
              </div>
              <ul className="space-y-1.5 pl-4 text-xs text-slate-400 list-disc">
                {plannedFeatures.map((feat, i) => (
                  <li key={i}>{feat}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="pt-2 flex justify-start">
          <Button
            variant="secondary"
            size="md"
            icon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => navigate(category === 'admin' ? '/admin/dashboard' : '/app/inicio')}
          >
            Voltar para {category === 'admin' ? 'o Painel Geral' : 'o Início'}
          </Button>
        </div>
      </Card>
    </div>
  );
};
