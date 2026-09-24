import type {
  KnowledgeAreaId,
  AcademicArea,
  AcademicSubject,
  AcademicTopic
} from '../types';

/**
 * Taxonomia Acadêmica Centralizada do Norto ENEM.
 * 
 * Hierarquia formal:
 * Área de Conhecimento (KnowledgeAreaId) -> Disciplina (AcademicSubject) -> Assunto (AcademicTopic)
 * 
 * Centraliza identificadores canônicos para evitar acoplamento a strings visuais nos componentes.
 */

export const ACADEMIC_TAXONOMY: Record<KnowledgeAreaId, AcademicArea> = {
  MT: {
    id: 'MT',
    name: 'Matemática e suas Tecnologias',
    shortName: 'Matemática',
    subjects: [
      {
        id: 'mt-matematica',
        name: 'Matemática',
        areaId: 'MT',
        topics: [
          {
            id: 'mt-aritmetica',
            name: 'Aritmética e Porcentagem',
            subjectId: 'mt-matematica',
            areaId: 'MT',
            description: 'Operações fundamentais, razões, proporções, regra de três e matemática financeira básica.'
          },
          {
            id: 'mt-funcoes',
            name: 'Funções e Álgebra',
            subjectId: 'mt-matematica',
            areaId: 'MT',
            description: 'Funções de 1º e 2º graus, equações, inequações e progressões (PA e PG).'
          },
          {
            id: 'mt-geometria',
            name: 'Geometria Plana e Espacial',
            subjectId: 'mt-matematica',
            areaId: 'MT',
            description: 'Áreas de figuras planas, trigonometria, volumes de prismas, cilindros e esferas.'
          },
          {
            id: 'mt-estatistica',
            name: 'Estatística e Probabilidade',
            subjectId: 'mt-matematica',
            areaId: 'MT',
            description: 'Média, mediana, moda, desvio padrão, interpretação de gráficos e probabilidade simples.'
          }
        ]
      }
    ]
  },
  LC: {
    id: 'LC',
    name: 'Linguagens, Códigos e suas Tecnologias',
    shortName: 'Linguagens',
    subjects: [
      {
        id: 'lc-lingua-portuguesa',
        name: 'Língua Portuguesa e Literatura',
        areaId: 'LC',
        topics: [
          {
            id: 'lc-interpretacao',
            name: 'Interpretação e Compreensão Textual',
            subjectId: 'lc-lingua-portuguesa',
            areaId: 'LC',
            description: 'Inferência de sentido, relação entre textos verbais e não verbais, efeitos de sentido.'
          },
          {
            id: 'lc-generos',
            name: 'Gêneros e Tipologias Textuais',
            subjectId: 'lc-lingua-portuguesa',
            areaId: 'LC',
            description: 'Artigo de opinião, crônica, notícia, reportagem, publicidade e estrutura argumentativa.'
          },
          {
            id: 'lc-recursos-expressivos',
            name: 'Figuras de Linguagem e Recursos Expressivos',
            subjectId: 'lc-lingua-portuguesa',
            areaId: 'LC',
            description: 'Metáfora, metonímia, ironia, antítese e variação linguística social e regional.'
          }
        ]
      },
      {
        id: 'lc-lingua-inglesa',
        name: 'Língua Estrangeira (Inglês)',
        areaId: 'LC',
        topics: [
          {
            id: 'lc-ingles-leitura',
            name: 'Compreensão Textual em Língua Inglesa',
            subjectId: 'lc-lingua-inglesa',
            areaId: 'LC',
            description: 'Leitura instrumental, identificação de ideias centrais, conectivos e vocabulário contextual.'
          }
        ]
      }
    ]
  },
  CH: {
    id: 'CH',
    name: 'Ciências Humanas e suas Tecnologias',
    shortName: 'Ciências Humanas',
    subjects: [
      {
        id: 'ch-historia',
        name: 'História',
        areaId: 'CH',
        topics: [
          {
            id: 'ch-brasil-colonia-imperio',
            name: 'Brasil Colônia e Império',
            subjectId: 'ch-historia',
            areaId: 'CH',
            description: 'Economia açucareira, mineração, escravidão, independência e crise monárquica.'
          },
          {
            id: 'ch-republica-cidadania',
            name: 'República, Cidadania e Movimentos Sociais',
            subjectId: 'ch-historia',
            areaId: 'CH',
            description: 'Era Vargas, regime militar de 1964, redemocratização e conquistas de direitos sociais.'
          }
        ]
      },
      {
        id: 'ch-geografia',
        name: 'Geografia',
        areaId: 'CH',
        topics: [
          {
            id: 'ch-urbanizacao-populacao',
            name: 'Urbanização e Dinâmica Populacional',
            subjectId: 'ch-geografia',
            areaId: 'CH',
            description: 'Megacidades, segregação socioespacial, transição demográfica e migrações.'
          },
          {
            id: 'ch-geopolitica-globalizacao',
            name: 'Geopolítica e Globalização',
            subjectId: 'ch-geografia',
            areaId: 'CH',
            description: 'Blocos econômicos, divisão internacional do trabalho e conflitos contemporâneos.'
          }
        ]
      },
      {
        id: 'ch-filosofia-sociologia',
        name: 'Filosofia e Sociologia',
        areaId: 'CH',
        topics: [
          {
            id: 'ch-cidadania-politica',
            name: 'Cidadania, Ética e Filosofia Política',
            subjectId: 'ch-filosofia-sociologia',
            areaId: 'CH',
            description: 'Contratualismo, iluminismo, direitos humanos e teorias da justiça.'
          }
        ]
      }
    ]
  },
  CN: {
    id: 'CN',
    name: 'Ciências da Natureza e suas Tecnologias',
    shortName: 'Ciências da Natureza',
    subjects: [
      {
        id: 'cn-biologia',
        name: 'Biologia',
        areaId: 'CN',
        topics: [
          {
            id: 'cn-ecologia-sustentabilidade',
            name: 'Ecologia e Sustentabilidade',
            subjectId: 'cn-biologia',
            areaId: 'CN',
            description: 'Cadeias alimentares, ciclos biogeoquímicos, desmatamento e conservação da biodiversidade.'
          },
          {
            id: 'cn-citologia-fisiologia',
            name: 'Citologia e Fisiologia Humana',
            subjectId: 'cn-biologia',
            areaId: 'CN',
            description: 'Metabolismo celular, imunologia, sistemas corporais e transmissão hereditária.'
          }
        ]
      },
      {
        id: 'cn-fisica',
        name: 'Física',
        areaId: 'CN',
        topics: [
          {
            id: 'cn-mecanica-energia',
            name: 'Mecânica e Conservação de Energia',
            subjectId: 'cn-fisica',
            areaId: 'CN',
            description: 'Cinemática escalar, Leis de Newton, trabalho, potência e transformações energéticas.'
          },
          {
            id: 'cn-eletricidade-ondas',
            name: 'Eletricidade e Fenômenos Ondulatórios',
            subjectId: 'cn-fisica',
            areaId: 'CN',
            description: 'Circuitos elétricos simples, consumo energético, ondas sonoras e eletromagnéticas.'
          }
        ]
      },
      {
        id: 'cn-quimica',
        name: 'Química',
        areaId: 'CN',
        topics: [
          {
            id: 'cn-quimica-geral-solucoes',
            name: 'Química Geral, Soluções e Estequiometria',
            subjectId: 'cn-quimica',
            areaId: 'CN',
            description: 'Tabela periódica, ligações químicas, cálculo estequiométrico e concentração de soluções.'
          },
          {
            id: 'cn-quimica-organica',
            name: 'Química Orgânica e Reações',
            subjectId: 'cn-quimica',
            areaId: 'CN',
            description: 'Funções orgânicas oxigenadas e nitrogenadas, isomeria, polímeros e combustíveis.'
          }
        ]
      }
    ]
  },
  RED: {
    id: 'RED',
    name: 'Redação',
    shortName: 'Redação',
    subjects: [
      {
        id: 'red-dissertativa',
        name: 'Texto Dissertativo-Argumentativo',
        areaId: 'RED',
        topics: [
          {
            id: 'red-proposta-intervencao',
            name: 'Proposta de Intervenção e Coesão',
            subjectId: 'red-dissertativa',
            areaId: 'RED',
            description: 'Cinco competências do ENEM, agentes, ações, meios e detalhamento.'
          }
        ]
      }
    ]
  }
};

// Índices internos para consultas em O(1) sem percorrer coleções
const subjectsMap = new Map<string, AcademicSubject>();
const topicsMap = new Map<string, AcademicTopic>();

Object.values(ACADEMIC_TAXONOMY).forEach(area => {
  area.subjects.forEach(subj => {
    subjectsMap.set(subj.id, subj);
    subj.topics.forEach(top => {
      topicsMap.set(top.id, top);
    });
  });
});

/**
 * Retorna todas as áreas acadêmicas disponíveis para o ENEM.
 */
export function getAcademicAreas(includeRedacao = false): AcademicArea[] {
  const areas = Object.values(ACADEMIC_TAXONOMY);
  if (!includeRedacao) {
    return areas.filter(a => a.id !== 'RED');
  }
  return areas;
}

/**
 * Retorna uma área acadêmica pelo seu ID.
 */
export function getAcademicAreaById(areaId: KnowledgeAreaId): AcademicArea | undefined {
  return ACADEMIC_TAXONOMY[areaId];
}

/**
 * Retorna as disciplinas pertencentes a uma área.
 */
export function getSubjectsByArea(areaId: KnowledgeAreaId): AcademicSubject[] {
  return ACADEMIC_TAXONOMY[areaId]?.subjects || [];
}

/**
 * Retorna uma disciplina pelo seu ID.
 */
export function getSubjectById(subjectId: string): AcademicSubject | undefined {
  return subjectsMap.get(subjectId);
}

/**
 * Retorna os tópicos/assuntos de uma disciplina.
 */
export function getTopicsBySubject(subjectId: string): AcademicTopic[] {
  return subjectsMap.get(subjectId)?.topics || [];
}

/**
 * Retorna um tópico/assunto pelo seu ID.
 */
export function getTopicById(topicId: string): AcademicTopic | undefined {
  return topicsMap.get(topicId);
}

/**
 * Resolve eficientemente os nomes legíveis para exibição sem consultas assíncronas ao banco.
 */
export function resolveTaxonomyLabels(
  areaId?: KnowledgeAreaId,
  subjectId?: string,
  topicId?: string
): {
  areaName: string;
  subjectName: string;
  topicName: string;
} {
  const area = areaId ? ACADEMIC_TAXONOMY[areaId] : undefined;
  const subject = subjectId ? subjectsMap.get(subjectId) : undefined;
  const topic = topicId ? topicsMap.get(topicId) : undefined;

  return {
    areaName: area ? area.name : (areaId || 'Área Geral'),
    subjectName: subject ? subject.name : (subjectId || 'Disciplina Geral'),
    topicName: topic ? topic.name : (topicId || 'Assunto Geral')
  };
}
