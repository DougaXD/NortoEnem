import type { Question, KnowledgeAreaId, MasteryClassification } from '../types';

/**
 * Configuração Central do Diagnóstico de Domínio Norto e Primeiro Plano de Estudos.
 * Todos os limites, pesos e parâmetros pedagógicos estão declarados aqui para evitar números mágicos.
 */

export const DIAGNOSTIC_CONFIG = {
  name: 'Diagnóstico de Domínio Inicial Norto',
  description: 'Mapeamento do nível de proficiência inicial do estudante nas 4 áreas objetivas do ENEM.',
  estimatedMinutesTotal: 20,
  estimatedMinutesPerQuestion: 2.5,
  minQuestionsForValidAnalysis: 2,

  // Limites percentuais de classificação de domínio
  thresholds: {
    attentionMax: 49.9,   // < 50% -> 'attention' (Precisa de atenção)
    developingMax: 69.9,  // 50% a 69% -> 'developing' (Em desenvolvimento)
    masteredMin: 70.0,    // >= 70% -> 'mastered' (Bom domínio)
  },

  // Áreas contempladas na triagem objetiva
  evaluatedAreas: ['MT', 'LC', 'CH', 'CN'] as KnowledgeAreaId[],
} as const;

export function classifyMastery(percentage: number, totalQuestions: number): MasteryClassification {
  if (totalQuestions < DIAGNOSTIC_CONFIG.minQuestionsForValidAnalysis) {
    return 'insufficient';
  }
  if (percentage < 50) {
    return 'attention';
  }
  if (percentage < 70) {
    return 'developing';
  }
  return 'mastered';
}

export function getClassificationLabel(classification: MasteryClassification): string {
  switch (classification) {
    case 'attention':
      return 'Precisa de atenção';
    case 'developing':
      return 'Em desenvolvimento';
    case 'mastered':
      return 'Bom domínio';
    case 'insufficient':
      return 'Dados insuficientes';
  }
}

export function getClassificationBadgeStyle(classification: MasteryClassification): string {
  switch (classification) {
    case 'attention':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    case 'developing':
      return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    case 'mastered':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    case 'insufficient':
      return 'bg-slate-500/10 text-slate-400 border-slate-700';
  }
}

export const STUDY_PLAN_CONFIG = {
  defaultDaysAhead: 7,
  allowedDailyMinutes: [30, 60, 90, 120, 180],
  defaultMinutes: 60,
  defaultDays: ['segunda', 'terca', 'quarta', 'quinta', 'sexta'],
  activityTypes: ['study', 'exercise', 'revision'] as const,
};

/**
 * Banco Piloto de Questões de Demonstração para o Diagnóstico de Domínio Norto.
 * Identificadas explicitamente como demonstração pedagógica com foco no formato e habilidades ENEM.
 */
export const INITIAL_DIAGNOSTIC_QUESTIONS: Question[] = [
  // --- MATEMÁTICA E SUAS TECNOLOGIAS (MT) ---
  {
    id: 'diag-mt-01',
    productId: 'enem',
    knowledgeArea: 'MT',
    subject: 'Matemática Básica',
    topic: 'Razão, Proporção e Regra de Três',
    difficulty: 'easy',
    statement: 'Um estudante organizou seu plano de estudos para o ENEM e constatou que consegue resolver 24 questões a cada 50 minutos mantendo o ritmo de leitura. Se ele dispuser de um bloco contínuo de 2 horas e 30 minutos (150 minutos) dedicado exclusivamente à prática, mantendo exatamente a mesma velocidade média, quantas questões ele resolverá?',
    options: [
      { id: 'A', text: '48 questões.' },
      { id: 'B', text: '60 questões.' },
      { id: 'C', text: '72 questões.' },
      { id: 'D', text: '84 questões.' },
      { id: 'E', text: '96 questões.' },
    ],
    correctOptionId: 'C',
    explanation: 'Como 150 minutos é exatamente o triplo de 50 minutos (150 / 50 = 3), mantendo a proporção direta, o estudante resolverá 24 * 3 = 72 questões.',
    source: 'Demonstração Pedagógica Norto (Habilidade H21 - Razões e Proporções)',
  },
  {
    id: 'diag-mt-02',
    productId: 'enem',
    knowledgeArea: 'MT',
    subject: 'Álgebra e Funções',
    topic: 'Função Afim e Interpretação Gráfica',
    difficulty: 'medium',
    statement: 'Uma plataforma digital de simulados cobra uma taxa fixa de inscrição de R$ 30,00 mais R$ 4,50 por simulado com correção comentada realizado. Se um aluno dispõe de um orçamento máximo de R$ 120,00 para investir nesses simulados, o número máximo de simulados completos que ele poderá realizar é:',
    options: [
      { id: 'A', text: '18 simulados.' },
      { id: 'B', text: '20 simulados.' },
      { id: 'C', text: '22 simulados.' },
      { id: 'D', text: '24 simulados.' },
      { id: 'E', text: '26 simulados.' },
    ],
    correctOptionId: 'B',
    explanation: 'A equação de custo é C(x) = 30 + 4,50x <= 120. Logo, 4,50x <= 90 -> x <= 90 / 4,50 = 20 simulados.',
    source: 'Demonstração Pedagógica Norto (Habilidade H19 - Modelagem Algébrica)',
  },

  // --- LINGUAGENS, CÓDIGOS E SUAS TECNOLOGIAS (LC) ---
  {
    id: 'diag-lc-01',
    productId: 'enem',
    knowledgeArea: 'LC',
    subject: 'Língua Portuguesa',
    topic: 'Funções da Linguagem e Intencionalidade Discursiva',
    difficulty: 'easy',
    statement: 'Analise o trecho a seguir, retirado de uma campanha educativa de saúde coletiva:\n\n"Lave as mãos com água e sabão por pelo menos 20 segundos antes de se alimentar. Proteja você e quem você ama. Cuide da sua comunidade hoje mesmo!"\n\nPredomina nesse texto a função da linguagem:',
    options: [
      { id: 'A', text: 'Metalinguística, pois o código explica o próprio ato comunicativo.' },
      { id: 'B', text: 'Conativa ou apelativa, caracterizada pelo uso de verbos no imperativo para persuadir o interlocutor.' },
      { id: 'C', text: 'Fática, voltada primariamente a testar e manter o canal de contato aberto.' },
      { id: 'D', text: 'Poética, focada na sonoridade e na exploração estética dos vocábulos.' },
      { id: 'E', text: 'Expressiva ou emotiva, centrada nos sentimentos confessionais do emissor.' },
    ],
    correctOptionId: 'B',
    explanation: 'O emprego explícito de verbos no imperativo ("Lave", "Proteja", "Cuide") direcionados diretamente ao leitor com objetivo persuasivo caracteriza a função conativa (ou apelativa).',
    source: 'Demonstração Pedagógica Norto (Habilidade H18 - Recursos Linguísticos e Persuasão)',
  },
  {
    id: 'diag-lc-02',
    productId: 'enem',
    knowledgeArea: 'LC',
    subject: 'Interpretação Textual',
    topic: 'Estratégias Argumentativas e Inferência Textual',
    difficulty: 'medium',
    statement: 'A rápida expansão dos algoritmos de recomendação em redes sociais não apenas personaliza o consumo de informações, mas também cria os chamados "filtros-bolha", nos quais o usuário passa a ser exposto predominantemente a opiniões que corroboram suas visões prévias.\n\nDe acordo com o texto, a consequência direta desse fenômeno para a formação cidadã do leitor é:',
    options: [
      { id: 'A', text: 'A ampliação imediata da capacidade crítica frente à pluralidade de fontes.' },
      { id: 'B', text: 'A redução do contato com o contraditório e o risco de polarização acentuada.' },
      { id: 'C', text: 'A eliminação completa das fake news nas plataformas digitais.' },
      { id: 'D', text: 'A democratização igualitária de visibilidade para todas as correntes de pensamento.' },
      { id: 'E', text: 'O desinteresse generalizado pela leitura de artigos analíticos e acadêmicos.' },
    ],
    correctOptionId: 'B',
    explanation: 'Ao confinar o leitor a opiniões que apenas confirmam o que ele já pensa ("filtros-bolha"), diminui-se o contato com ideias divergentes (contraditório), propiciando intolerância e polarização.',
    source: 'Demonstração Pedagógica Norto (Habilidade H24 - Interpretação e Impacto das TICs)',
  },

  // --- CIÊNCIAS HUMANAS E SUAS TECNOLOGIAS (CH) ---
  {
    id: 'diag-ch-01',
    productId: 'enem',
    knowledgeArea: 'CH',
    subject: 'História do Brasil',
    topic: 'Cidadania e Constituição Cidadã de 1988',
    difficulty: 'medium',
    statement: 'A Constituição Brasileira de 1988 ficou conhecida na historiografia política nacional como a "Constituição Cidadã" devido, principalmente:',
    options: [
      { id: 'A', text: 'À centralização do poder no Poder Executivo com poder de veto irrestrito.' },
      { id: 'B', text: 'À ampliação inédita dos direitos sociais, garantias fundamentais individuais e proteção aos grupos historicamente vulneráveis.' },
      { id: 'C', text: 'À suspensão das eleições diretas para governadores e prefeitos de capitais.' },
      { id: 'D', text: 'À exclusão dos analfabetos e jovens de 16 anos do corpo de eleitores ativos.' },
      { id: 'E', text: 'À priorização exclusiva de investimentos em indústrias de base estatais.' },
    ],
    correctOptionId: 'B',
    explanation: 'A Carta de 1988 consagrou um extenso rol de direitos fundamentais, prevendo seguridade social universal, saúde como dever do Estado, demarcação de terras indígenas e voto facultativo aos 16 anos.',
    source: 'Demonstração Pedagógica Norto (Habilidade H11 - Cidadania e Movimentos Sociais)',
  },
  {
    id: 'diag-ch-02',
    productId: 'enem',
    knowledgeArea: 'CH',
    subject: 'Geografia',
    topic: 'Urbanização Brasileira e Segregação Socioespacial',
    difficulty: 'medium',
    statement: 'O processo acelerado de urbanização no Brasil a partir da segunda metade do século XX, sem o correspondente planejamento de infraestrutura e habitação popular, produziu como principal marca das metrópoles:',
    options: [
      { id: 'A', text: 'A ocupação homogênea e integrada de todas as zonas periurbanas.' },
      { id: 'B', text: 'A autossuficiência econômica dos municípios periféricos em relação às capitais.' },
      { id: 'C', text: 'A macrocefalia urbana e a formação de periferias com carência de saneamento, mobilidade e serviços essenciais.' },
      { id: 'D', text: 'A erradicação dos fluxos pendulares diários de trabalhadores.' },
      { id: 'E', text: 'O decréscimo demográfico acentuado nas capitais do Sudeste e Sul.' },
    ],
    correctOptionId: 'C',
    explanation: 'A urbanização rápida e desordenada impulsionada pelo êxodo rural gerou macrocefalia urbana, empurrando as populações de menor renda para periferias desprovidas de serviços básicos (segregação socioespacial).',
    source: 'Demonstração Pedagógica Norto (Habilidade H17 - Dinâmica Populacional e Urbana)',
  },

  // --- CIÊNCIAS DA NATUREZA E SUAS TECNOLOGIAS (CN) ---
  {
    id: 'diag-cn-01',
    productId: 'enem',
    knowledgeArea: 'CN',
    subject: 'Biologia',
    topic: 'Ecologia e Ciclos Biogeoquímicos',
    difficulty: 'medium',
    statement: 'A eutrofização de corpos d’água doce provocada pelo despejo excessivo de efluentes domésticos e fertilizantes agrícolas ricos em compostos de nitrogênio e fósforo desencadeia, sequencialmente:',
    options: [
      { id: 'A', text: 'Proliferação descontrolada de algas superficiais, bloqueio da luz solar, morte de fotossintetizantes submersos e consumo do oxigênio dissolvido por decompositores.' },
      { id: 'B', text: 'Aumento imediato da taxa de oxigênio dissolvido e multiplicação da ictiofauna predadora.' },
      { id: 'C', text: 'Neutralização do pH da água e interrupção completa da atividade bacteriana aeróbica.' },
      { id: 'D', text: 'Precipitação rápida de metais pesados sem qualquer impacto na cadeia alimentar aquática.' },
      { id: 'E', text: 'Clareamento da coluna d’água por decantação de matéria orgânica.' },
    ],
    correctOptionId: 'A',
    explanation: 'O excesso de nutrientes causa floração algal (bloom). A camada de algas impede a penetração da luz, matando vegetais submersos. Bactérias decompositoras aeróbicas proliferam e consomem o oxigênio, levando à asfixia dos peixes.',
    source: 'Demonstração Pedagógica Norto (Habilidade H28 - Impactos Ambientais e Biologia)',
  },
  {
    id: 'diag-cn-02',
    productId: 'enem',
    knowledgeArea: 'CN',
    subject: 'Física',
    topic: 'Energia, Trabalho e Conservação',
    difficulty: 'medium',
    statement: 'Em uma usina hidrelétrica, a transformação energética principal que ocorre entre o represamento da água em grande altitude e o acionamento dos geradores nas turbinas é a conversão de:',
    options: [
      { id: 'A', text: 'Energia térmica em energia nuclear.' },
      { id: 'B', text: 'Energia potencial gravitacional em energia cinética da água, convertida em seguida em energia elétrica.' },
      { id: 'C', text: 'Energia química dos minerais em radiação eletromagnética.' },
      { id: 'D', text: 'Energia cinética do vento diretamente em potencial elástica.' },
      { id: 'E', text: 'Energia luminosa em calor latente de vaporização.' },
    ],
    correctOptionId: 'B',
    explanation: 'A água represada no desnível armazena energia potencial gravitacional. Ao descer pela tubulação forçada, converte-se em energia cinética (movimento), a qual movimenta as turbinas do gerador, produzindo energia elétrica.',
    source: 'Demonstração Pedagógica Norto (Habilidade H06 - Transformações de Energia)',
  },
];
