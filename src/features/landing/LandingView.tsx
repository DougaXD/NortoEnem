import React from 'react';
import { useRouter } from '../../app/router/RouterContext';
import { PLATFORM_CONFIG } from '../../config/platform';
import { Button, Card, Badge } from '../../components/ui/DesignSystem';
import { BookOpen, CheckCircle, Flame, ArrowRight, ShieldCheck, Sparkles, Smartphone } from 'lucide-react';

export const LandingView: React.FC = () => {
  const { navigate } = useRouter();

  return (
    <div className="space-y-12 py-6 text-center max-w-4xl mx-auto">
      <div className="space-y-4">
        <Badge variant="primary" size="md" className="mx-auto">
          Preparação de Alta Performance para o ENEM
        </Badge>
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
          ESTUDE. PRATIQUE. <span className="text-blue-500">EVOLUA.</span>
        </h1>
        <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
          O Norto ENEM é a plataforma digital moderna desenvolvida para estudantes focados em nota 800+ e aprovação nos cursos mais concorridos do país.
        </p>
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            variant="primary"
            size="lg"
            icon={<ArrowRight className="w-4 h-4" />}
            onClick={() => navigate('/login')}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-semibold"
          >
            Continuar com Google
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
        <Card variant="elevated" padding="md">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-3">
            <Smartphone className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">PWA Instalável</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Funciona no celular como um app nativo, com carregamento rápido e suporte à instalação na tela de início.
          </p>
        </Card>

        <Card variant="elevated" padding="md">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
            <Flame className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">Constância & Streak</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Gamificação focada em consistência diária, acúmulo de XP pedagógico e acompanhamento de evolução por área.
          </p>
        </Card>

        <Card variant="elevated" padding="md">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-3">
            <Sparkles className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">Diagnóstico Preciso</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Mapeamento dos seus pontos fortes e fracos em Ciências Humanas, Natureza, Matemática e Linguagens.
          </p>
        </Card>
      </div>
    </div>
  );
};
