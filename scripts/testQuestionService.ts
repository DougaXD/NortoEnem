import { QuestionService } from '../src/services/questionService';
import {
  getAcademicAreas,
  getAcademicAreaById,
  getSubjectsByArea,
  getTopicsBySubject,
  resolveTaxonomyLabels
} from '../src/config/academicTaxonomy';
import type { Question } from '../src/types';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 INICIANDO SUÍTE DE TESTES: BANCO DE QUESTÕES (CAMADA DE DADOS)');
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

  // 1. Taxonomia Acadêmica
  console.log('--- 1. Taxonomia Acadêmica ---');
  const areas = getAcademicAreas();
  assert(areas.length === 4, `Deve retornar as 4 áreas objetivas do ENEM (obtido: ${areas.length})`);
  
  const mtArea = getAcademicAreaById('MT');
  assert(mtArea?.name === 'Matemática e suas Tecnologias', 'Área MT deve ter o nome canônico correto');

  const mtSubjects = getSubjectsByArea('MT');
  assert(mtSubjects.length > 0 && mtSubjects[0].id === 'mt-matematica', 'MT deve conter a disciplina mt-matematica');

  const mtTopics = getTopicsBySubject('mt-matematica');
  assert(mtTopics.some(t => t.id === 'mt-aritmetica'), 'mt-matematica deve conter o assunto mt-aritmetica');

  const resolved = resolveTaxonomyLabels('MT', 'mt-matematica', 'mt-aritmetica');
  assert(
    resolved.areaName === 'Matemática e suas Tecnologias' &&
    resolved.subjectName === 'Matemática' &&
    resolved.topicName === 'Aritmética e Porcentagem',
    'resolveTaxonomyLabels deve resolver rótulos em O(1) com precisão'
  );

  // 2. Obter questões publicadas
  console.log('\n--- 2. Obter Questões Publicadas ---');
  const published = await QuestionService.getPublishedQuestions(20);
  assert(published.length >= 10, `Deve retornar questões publicadas (obtido: ${published.length})`);
  assert(published.every(q => (q.status || 'published') === 'published'), 'Todas as questões retornadas devem ter status published');

  // 3. Filtrar por área
  console.log('\n--- 3. Filtrar por Área ---');
  const mtQuestions = await QuestionService.getQuestionsByFilters({ areaId: 'MT' });
  assert(mtQuestions.length === 3, `Deve retornar exatamente 3 questões de MT (obtido: ${mtQuestions.length})`);
  assert(mtQuestions.every(q => (q.areaId || q.knowledgeArea) === 'MT'), 'Todas as questões devem pertencer à área MT');

  const lcQuestions = await QuestionService.getQuestionsByFilters({ areaId: 'LC' });
  assert(lcQuestions.length === 3, `Deve retornar exatamente 3 questões de LC (obtido: ${lcQuestions.length})`);

  const chQuestions = await QuestionService.getQuestionsByFilters({ areaId: 'CH' });
  assert(chQuestions.length === 3, `Deve retornar exatamente 3 questões de CH (obtido: ${chQuestions.length})`);

  const cnQuestions = await QuestionService.getQuestionsByFilters({ areaId: 'CN' });
  assert(cnQuestions.length === 3, `Deve retornar exatamente 3 questões de CN (obtido: ${cnQuestions.length})`);

  // 4. Filtrar por disciplina
  console.log('\n--- 4. Filtrar por Disciplina ---');
  const bioQuestions = await QuestionService.getQuestionsByFilters({ subjectId: 'cn-biologia' });
  assert(bioQuestions.length >= 1 && bioQuestions.every(q => q.subjectId === 'cn-biologia'), 'Filtro por cn-biologia deve retornar apenas questões de Biologia');

  // 5. Filtrar por assunto
  console.log('\n--- 5. Filtrar por Assunto ---');
  const aritmeticaQuestions = await QuestionService.getQuestionsByFilters({ topicId: 'mt-aritmetica' });
  assert(aritmeticaQuestions.length >= 1 && aritmeticaQuestions.every(q => q.topicId === 'mt-aritmetica'), 'Filtro por mt-aritmetica deve retornar apenas questões de Aritmética');

  // 6. Filtrar por dificuldade
  console.log('\n--- 6. Filtrar por Dificuldade ---');
  const easyQuestions = await QuestionService.getQuestionsByFilters({ difficulty: 'easy' });
  assert(easyQuestions.length >= 1 && easyQuestions.every(q => q.difficulty === 'easy'), 'Filtro por easy deve retornar apenas questões fáceis');

  const hardQuestions = await QuestionService.getQuestionsByFilters({ difficulty: 'hard' });
  assert(hardQuestions.length >= 1 && hardQuestions.every(q => q.difficulty === 'hard'), 'Filtro por hard deve retornar apenas questões difíceis');

  // 7. Consultar questão por ID
  console.log('\n--- 7. Consultar Questão por ID ---');
  const qId = 'demo-mt-01';
  const q1 = await QuestionService.getQuestionById(qId);
  assert(q1 !== null && q1.id === qId, `Deve encontrar questão pelo ID ${qId}`);
  assert(q1?.correctOptionId === 'A', 'Questão demo-mt-01 deve ter alternativa correta A');
  assert(q1?.options.length === 5, 'Questão deve possuir 5 alternativas');
  assert(typeof q1?.explanation === 'string' && q1.explanation.length > 20, 'Questão deve conter explicação pedagógica');

  // 8. Questão inexistente
  console.log('\n--- 8. Questão Inexistente ---');
  const qNull = await QuestionService.getQuestionById('id-que-nao-existe-9999');
  assert(qNull === null, 'Consulta por ID inexistente deve retornar null com segurança');

  // 9. Paginação
  console.log('\n--- 9. Paginação ---');
  const page1 = await QuestionService.getQuestions({}, { limit: 4 });
  assert(page1.items.length === 4, `Página 1 deve conter 4 itens (obtido: ${page1.items.length})`);
  assert(page1.hasMore === true, 'Página 1 deve indicar hasMore = true');
  assert(page1.nextCursor !== null, 'Página 1 deve fornecer nextCursor');

  const page2 = await QuestionService.getQuestions({}, { limit: 4, startAfterId: page1.nextCursor });
  assert(page2.items.length === 4, `Página 2 deve conter 4 itens (obtido: ${page2.items.length})`);
  assert(!page2.items.some(p2 => page1.items.some(p1 => p1.id === p2.id)), 'Página 2 não deve repetir itens da Página 1');

  // 10. Somente published para estudantes / draft e archived filtrados
  console.log('\n--- 10. Isolamento de Status (Draft/Archived) ---');
  const mockDraftQ: Question = {
    id: 'test-draft-01',
    productId: 'enem',
    areaId: 'MT',
    knowledgeArea: 'MT',
    subjectId: 'mt-matematica',
    subject: 'Matemática',
    topicId: 'mt-funcoes',
    topic: 'Funções',
    statement: 'Questão em rascunho',
    options: [{ id: 'A', text: 'Op' }],
    correctOptionId: 'A',
    difficulty: 'easy',
    status: 'draft',
    source: 'demo'
  };

  // getQuestions padrão só aceita published
  const studentView = await QuestionService.getQuestions({ status: 'published' });
  assert(!studentView.items.some(q => q.status === 'draft' || q.status === 'archived'), 'Consulta padrão do estudante NUNCA deve incluir draft ou archived');

  // getQuestionById para questão arquivada/draft
  const unpublishedTest = await QuestionService.getQuestionById('test-draft-01');
  assert(unpublishedTest === null, 'Estudante tentando acessar questão unpublished por ID deve receber null');

  // 11. Contagem disponível
  console.log('\n--- 11. Contagem Disponível ---');
  const totalCount = await QuestionService.getAvailableQuestionCount();
  assert(totalCount === 12, `Total de questões publicadas disponíveis deve ser 12 (obtido: ${totalCount})`);

  const mtCount = await QuestionService.getAvailableQuestionCount({ areaId: 'MT' });
  assert(mtCount === 3, `Total de questões de MT deve ser 3 (obtido: ${mtCount})`);

  console.log('\n====================================================');
  console.log(`📊 RESULTADO FINAL: ${passed} PASSARAM | ${failed} FALHARAM`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
