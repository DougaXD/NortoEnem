// Design Tokens do Norto ENEM

export const THEME_COLORS = {
  bg: {
    base: '#0B0F19',
    surface: '#111827',
    elevated: '#1F2937',
    card: '#131B2E',
    sidebar: '#0D1322',
  },
  brand: {
    primary: '#2563EB',      // Azul foco/tecnologia
    primaryHover: '#1D4ED8',
    primaryLight: '#3B82F6',
    secondary: '#059669',    // Verde evolução
    secondaryLight: '#10B981',
    accent: '#F59E0B',       // Âmbar energia
    danger: '#EF4444',
  },
  text: {
    primary: '#F8FAFC',
    secondary: '#94A3B8',
    muted: '#64748B',
    accent: '#38BDF8',
  },
  border: {
    subtle: '#1E293B',
    default: '#334155',
    highlight: '#3B82F6',
  }
} as const;

export const KNOWLEDGE_AREAS = {
  CH: {
    id: 'CH',
    name: 'Ciências Humanas',
    shortName: 'Humanas',
    color: '#F59E0B',
    bgBadge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
  CN: {
    id: 'CN',
    name: 'Ciências da Natureza',
    shortName: 'Natureza',
    color: '#10B981',
    bgBadge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  LC: {
    id: 'LC',
    name: 'Linguagens e Códigos',
    shortName: 'Linguagens',
    color: '#3B82F6',
    bgBadge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
  MT: {
    id: 'MT',
    name: 'Matemática e suas Tecnologias',
    shortName: 'Matemática',
    color: '#8B5CF6',
    bgBadge: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  },
  RED: {
    id: 'RED',
    name: 'Redação Nota 1000',
    shortName: 'Redação',
    color: '#EC4899',
    bgBadge: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  },
} as const;

export type KnowledgeAreaKey = keyof typeof KNOWLEDGE_AREAS;
