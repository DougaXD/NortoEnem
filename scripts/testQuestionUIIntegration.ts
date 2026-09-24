import { QuestionService } from '../src/services/questionService';
import {
  getAcademicAreas,
  getSubjectsByArea,
  getTopicsBySubject,
  resolveTaxonomyLabels
} from '../src/config/academicTaxonomy';
import type { QuestionFilters } from '../src/types';

async function runUITests() {
  console.log('====================================================');
  console.log('🧪 TESTES DE INTEGRAÇÃO DA INTERFACE DO BANCO DE QUESTÕES');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`✅ [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${desc}`);
      failed++;
    }
  }

  // 1. Quantidade total sem filtros
  console.log('--- 1. Contagem Geral (Dataset Demo) ---');
  const totalCount = await QuestionService.getAvailableQuestionCount();
  assert(totalCount === 12, `Total sem filtros deve ser 12 (obtido: ${totalCount})`);

  const initialList = await QuestionService.getQuestions({}, { limit: 6 });
  assert(initialList.items.length === 6, `Primeira página deve trazer 6 itens (obtido: ${initialList.items.length})`);
  assert(initialList.hasMore === true, 'Deve indicar que há próxima página (hasMore: true)');
  assert(initialList.nextCursor !== null, 'nextCursor deve ser retornado');

  // 2. Contagem e filtragem por Área
  console.log('\n--- 2. Filtragem por Área (MT, LC, CH, CN) ---');
  const mtCount = await QuestionService.getAvailableQuestionCount({ areaId: 'MT' });
  assert(mtCount === 3, `Matemática (MT) deve possuir exatamente 3 questões (obtido: ${mtCount})`);

  const lcCount = await QuestionService.getAvailableQuestionCount({ areaId: 'LC' });
  assert(lcCount === 3, `Linguagens (LC) deve possuir exatamente 3 questões (obtido: ${lcCount})`);

  const chCount = await QuestionService.getAvailableQuestionCount({ areaId: 'CH' });
  assert(chCount === 3, `Ciências Humanas (CH) deve possuir exatamente 3 questões (obtido: ${chCount})`);

  const cnCount = await QuestionService.getAvailableQuestionCount({ areaId: 'CN' });
  assert(cnCount === 3, `Ciências da Natureza (CN) deve possuir exatamente 3 questões (obtido: ${cnCount})`);

  // 3. Disciplinas e Assuntos dependentes
  console.log('\n--- 3. Lógica de Filtros Dependentes ---');
  const mtSubjects = getSubjectsByArea('MT');
  assert(mtSubjects.length === 1 && mtSubjects[0].id === 'mt-matematica', 'MT deve oferecer a disciplina mt-matematica');

  const mtTopics = getTopicsBySubject('mt-matematica');
  assert(mtTopics.length === 4, `mt-matematica deve possuir 4 assuntos disponíveis (obtido: ${mtTopics.length})`);

  const lcSubjects = getSubjectsByArea('LC');
  assert(lcSubjects.length === 2, `LC deve oferecer 2 disciplinas (obtido: ${lcSubjects.length})`);

  // 4. Teste de troca de área e limpeza de filtros incompatíveis
  let currentFilters: QuestionFilters = {
    areaId: 'MT',
    subjectId: 'mt-matematica',
    topicId: 'mt-aritmetica',
    difficulty: 'easy'
  };

  // Simulação da lógica de troca de área no handler da UI
  const handleAreaChangeSim = (newAreaId: any) => {
    currentFilters = {
      ...currentFilters,
      areaId: newAreaId,
      subjectId: undefined,
      topicId: undefined
    };
  };

  handleAreaChangeSim('LC');
  assert(currentFilters.areaId === 'LC', 'Área alterada para LC');
  assert(currentFilters.subjectId === undefined, 'Disciplina incompatível mt-matematica foi devidamente limpa');
  assert(currentFilters.topicId === undefined, 'Assunto incompatível mt-aritmetica foi devidamente limpo');
  assert(currentFilters.difficulty === 'easy', 'Dificuldade preservada após troca de área');

  // 5. Combinação de filtros refinados
  console.log('\n--- 4. Combinação de Filtros Refinados ---');
  const filteredMT = await QuestionService.getQuestions({
    areaId: 'MT',
    subjectId: 'mt-matematica',
    topicId: 'mt-aritmetica'
  }, { limit: 10 });
  assert(filteredMT.items.length === 1, `Filtro MT -> Matemática -> Aritmética deve retornar 1 questão (obtido: ${filteredMT.items.length})`);
  assert(filteredMT.items[0].id === 'demo-mt-01', 'Questão retornada deve ser demo-mt-01');

  const filteredDifficult = await QuestionService.getQuestions({
    difficulty: 'hard'
  }, { limit: 10 });
  assert(filteredDifficult.items.length === 2, `Filtro de dificuldade Difícil deve retornar 2 questões (obtido: ${filteredDifficult.items.length})`);
  assert(filteredDifficult.items.every(q => q.difficulty === 'hard'), 'Todas as questões devem ter dificuldade hard');

  // 6. Paginação incremental
  console.log('\n--- 5. Paginação Incremental Completa ---');
  const page1 = await QuestionService.getQuestions({}, { limit: 6 });
  assert(page1.items.length === 6, 'Página 1 deve conter 6 itens');
  assert(page1.hasMore === true, 'Página 1 hasMore deve ser true');

  const page2 = await QuestionService.getQuestions({}, { limit: 6, startAfterId: page1.nextCursor });
  assert(page2.items.length === 6, 'Página 2 deve conter 6 itens');
  assert(page2.hasMore === false, 'Página 2 hasMore deve ser false (12 itens no total)');

  const combinedIds = new Set([...page1.items.map(q => q.id), ...page2.items.map(q => q.id)]);
  assert(combinedIds.size === 12, `Total de IDs únicos combinados deve ser 12 (obtido: ${combinedIds.size})`);

  // 7. Resolução de Questão por ID (Preparação para Abertura)
  console.log('\n--- 6. Consulta Individual para Abertura ---');
  const qItem = await QuestionService.getQuestionById('demo-cn-01');
  assert(qItem !== null && qItem.id === 'demo-cn-01', 'Deve recuperar questão demo-cn-01 por ID');
  assert(qItem?.options?.length === 5, 'Questão deve ter 5 alternativas');
  assert(qItem?.statement?.includes('efluentes domésticos'), 'Enunciado deve conter o texto autoral correto');

  const qInvalid = await QuestionService.getQuestionById('id-inexistente-123');
  assert(qInvalid === null, 'ID inexistente deve retornar null para a tela tratar com ErrorState');

  // 8. Estado vazio (Filtros sem resultado)
  console.log('\n--- 7. Estado Vazio (Filtros Incompatíveis) ---');
  // Se filtrar por uma combinação que não tem questões, deve retornar 0
  const emptyQuery = await QuestionService.getQuestions({
    areaId: 'MT',
    difficulty: 'hard',
    topicId: 'mt-aritmetica' // No dataset demo, mt-aritmetica é 'easy'
  });
  assert(emptyQuery.items.length === 0, 'Combinação sem itens deve retornar lista vazia (EmptyState)');

  console.log('\n====================================================');
  console.log(`📊 RESULTADO DOS TESTES DE UI: ${passed} PASSARAM | ${failed} FALHARAM`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runUITests();
