import { QuestionService } from '../src/services/questionService';
import { DEMO_QUESTIONS } from '../src/data/demoQuestions';

/**
 * Script utilitário seguro para semear (seed) questões no Firestore via Node/CLI.
 * Não expõe rotas públicas, botões secretos ou credenciais adicionais no cliente.
 * 
 * Uso via terminal/ambiente seguro:
 * npx tsx scripts/seedQuestions.ts
 */
async function main() {
  console.log('Iniciando inserção segura de questões de demonstração no Firestore...');
  console.log(`Total de questões a semear: ${DEMO_QUESTIONS.length}`);

  try {
    const result = await QuestionService.seedDemoQuestions(DEMO_QUESTIONS);
    console.log(`Seed finalizado com sucesso! ${result.inserted} questões inseridas/atualizadas.`);
    process.exit(0);
  } catch (error) {
    console.error('Falha ao semear questões:', error);
    process.exit(1);
  }
}

main();
