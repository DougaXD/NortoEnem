import type { Simulation } from '../types';
import { DEMO_QUESTIONS } from './demoQuestions';

/**
 * Simulados Demonstrativos Oficiais do Norto ENEM.
 * 
 * Fornecem dados de fallback para quando o Firestore ainda não tiver documentos
 * cadastrados na coleção 'simulations'. Todas as questões referenciam identificadores
 * válidos da taxonomia e do banco de demonstração.
 */
export const DEMO_SIMULATIONS: Simulation[] = [
  {
    id: 'sim-enem-express-01',
    title: 'Simulado Express ENEM — Todas as Áreas',
    description: 'Simulado compacto com 12 questões representativas abrangendo as 4 grandes áreas do conhecimento do ENEM (Matemática, Natureza, Linguagens e Humanas).',
    type: 'full',
    status: 'published',
    areaIds: ['MT', 'CN', 'LC', 'CH'],
    questionIds: DEMO_QUESTIONS.map(q => q.id),
    questionCount: DEMO_QUESTIONS.length,
    durationSeconds: 3600, // 60 minutos
    allowResume: true,
    shuffleQuestions: false,
    shuffleAlternatives: false,
    version: 1,
    sections: [
      {
        id: 'sec-mt',
        title: 'Matemática e suas Tecnologias',
        areaId: 'MT',
        questionIds: DEMO_QUESTIONS.filter(q => q.areaId === 'MT').map(q => q.id),
        questionCount: 3,
        order: 1,
        durationSeconds: 900
      },
      {
        id: 'sec-cn',
        title: 'Ciências da Natureza e suas Tecnologias',
        areaId: 'CN',
        questionIds: DEMO_QUESTIONS.filter(q => q.areaId === 'CN').map(q => q.id),
        questionCount: 3,
        order: 2,
        durationSeconds: 900
      },
      {
        id: 'sec-lc',
        title: 'Linguagens, Códigos e suas Tecnologias',
        areaId: 'LC',
        questionIds: DEMO_QUESTIONS.filter(q => q.areaId === 'LC').map(q => q.id),
        questionCount: 3,
        order: 3,
        durationSeconds: 900
      },
      {
        id: 'sec-ch',
        title: 'Ciências Humanas e suas Tecnologias',
        areaId: 'CH',
        questionIds: DEMO_QUESTIONS.filter(q => q.areaId === 'CH').map(q => q.id),
        questionCount: 3,
        order: 4,
        durationSeconds: 900
      }
    ],
    createdAt: '2026-09-17T00:00:00.000Z',
    updatedAt: '2026-09-17T00:00:00.000Z'
  },
  {
    id: 'sim-enem-exatas-02',
    title: 'Simulado Focado — Exatas e Natureza',
    description: 'Avaliação direcionada para as áreas de Matemática e Ciências da Natureza, ideal para treinar raciocínio lógico, interpretação de gráficos e resolução de problemas.',
    type: 'area',
    status: 'published',
    areaIds: ['MT', 'CN'],
    questionIds: DEMO_QUESTIONS.filter(q => q.areaId === 'MT' || q.areaId === 'CN').map(q => q.id),
    questionCount: 6,
    durationSeconds: 1800, // 30 minutos
    allowResume: true,
    shuffleQuestions: false,
    shuffleAlternatives: false,
    version: 1,
    sections: [
      {
        id: 'sec-mt-focus',
        title: 'Matemática e suas Tecnologias',
        areaId: 'MT',
        questionIds: DEMO_QUESTIONS.filter(q => q.areaId === 'MT').map(q => q.id),
        questionCount: 3,
        order: 1,
        durationSeconds: 900
      },
      {
        id: 'sec-cn-focus',
        title: 'Ciências da Natureza e suas Tecnologias',
        areaId: 'CN',
        questionIds: DEMO_QUESTIONS.filter(q => q.areaId === 'CN').map(q => q.id),
        questionCount: 3,
        order: 2,
        durationSeconds: 900
      }
    ],
    createdAt: '2026-09-17T00:00:00.000Z',
    updatedAt: '2026-09-17T00:00:00.000Z'
  }
];
