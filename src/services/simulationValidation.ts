import type {
  Simulation,
  SimulationSection,
  SimulationSession,
  SimulationAnswer,
  SimulationStatus,
  SimulationType,
  SimulationSessionStatus
} from '../types';

export interface ValidationError {
  field: string;
  message: string;
}

export class SimulationValidationError extends Error {
  public readonly errors: ValidationError[];

  constructor(message: string, errors: ValidationError[] = []) {
    super(message);
    this.name = 'SimulationValidationError';
    this.errors = errors;
  }
}

/**
 * Utilitários de validação defensiva para o Domínio de Simulados Norto ENEM.
 * Garante integridade antes de persistir dados no Firestore.
 */
export class SimulationValidation {
  private static readonly VALID_TYPES: SimulationType[] = ['full', 'area', 'custom'];
  private static readonly VALID_STATUSES: SimulationStatus[] = ['draft', 'published', 'archived'];
  private static readonly VALID_SESSION_STATUSES: SimulationSessionStatus[] = [
    'not_started',
    'in_progress',
    'completed',
    'abandoned',
    'expired'
  ];

  /**
   * Valida a definição/configuração de um simulado.
   */
  public static validateSimulation(
    data: Partial<Simulation>,
    isUpdate = false
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Título
    if (!isUpdate || data.title !== undefined) {
      if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
        errors.push({ field: 'title', message: 'O título do simulado é obrigatório.' });
      } else if (data.title.trim().length < 3) {
        errors.push({ field: 'title', message: 'O título deve possuir ao menos 3 caracteres.' });
      }
    }

    // Tipo
    if (!isUpdate || data.type !== undefined) {
      if (!data.type || !this.VALID_TYPES.includes(data.type)) {
        errors.push({
          field: 'type',
          message: `O tipo de simulado deve ser um de: ${this.VALID_TYPES.join(', ')}.`
        });
      }
    }

    // Status
    if (!isUpdate || data.status !== undefined) {
      if (!data.status || !this.VALID_STATUSES.includes(data.status)) {
        errors.push({
          field: 'status',
          message: `O status do simulado deve ser um de: ${this.VALID_STATUSES.join(', ')}.`
        });
      }
    }

    // Lista de Questões (questionIds)
    if (!isUpdate || data.questionIds !== undefined) {
      if (!Array.isArray(data.questionIds)) {
        errors.push({ field: 'questionIds', message: 'questionIds deve ser uma lista (array).' });
      } else if (!isUpdate && data.questionIds.length === 0) {
        errors.push({ field: 'questionIds', message: 'O simulado deve conter ao menos uma questão vinculada.' });
      }
    }

    // Quantidade de Questões (questionCount)
    if (!isUpdate || data.questionCount !== undefined) {
      if (typeof data.questionCount !== 'number' || data.questionCount < 1) {
        errors.push({ field: 'questionCount', message: 'A quantidade de questões deve ser um número maior que zero.' });
      } else if (data.questionIds && Array.isArray(data.questionIds) && data.questionCount !== data.questionIds.length) {
        errors.push({
          field: 'questionCount',
          message: `questionCount (${data.questionCount}) diverge da contagem real de questionIds (${data.questionIds.length}).`
        });
      }
    }

    // Duração em segundos (durationSeconds)
    if (data.durationSeconds !== undefined && data.durationSeconds !== null) {
      if (typeof data.durationSeconds !== 'number' || data.durationSeconds <= 0) {
        errors.push({
          field: 'durationSeconds',
          message: 'A duração do simulado, quando informada, deve ser um número positivo em segundos.'
        });
      }
    }

    // Versão (version)
    if (!isUpdate || data.version !== undefined) {
      if (typeof data.version !== 'number' || data.version < 1) {
        errors.push({ field: 'version', message: 'A versão do simulado deve ser um número inteiro >= 1.' });
      }
    }

    // Validação de seções (se presentes)
    if (data.sections !== undefined && data.sections !== null) {
      if (!Array.isArray(data.sections)) {
        errors.push({ field: 'sections', message: 'sections deve ser um array de seções.' });
      } else {
        data.sections.forEach((sec, idx) => {
          const secErrors = this.validateSection(sec, idx);
          errors.push(...secErrors);
        });
      }
    }

    return errors;
  }

  /**
   * Valida uma seção individual do simulado.
   */
  public static validateSection(sec: SimulationSection, index: number): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!sec.id || typeof sec.id !== 'string') {
      errors.push({ field: `sections[${index}].id`, message: 'Identificador de seção inválido.' });
    }
    if (!sec.title || typeof sec.title !== 'string') {
      errors.push({ field: `sections[${index}].title`, message: 'Título da seção obrigatório.' });
    }
    if (!Array.isArray(sec.questionIds)) {
      errors.push({ field: `sections[${index}].questionIds`, message: 'Lista de questões da seção deve ser um array.' });
    }
    if (typeof sec.order !== 'number' || sec.order < 0) {
      errors.push({ field: `sections[${index}].order`, message: 'Ordem da seção deve ser um número >= 0.' });
    }
    if (sec.durationSeconds !== undefined && (typeof sec.durationSeconds !== 'number' || sec.durationSeconds <= 0)) {
      errors.push({ field: `sections[${index}].durationSeconds`, message: 'Duração da seção deve ser positiva.' });
    }

    return errors;
  }

  /**
   * Valida o estado de uma sessão de simulado do estudante.
   */
  public static validateSession(data: Partial<SimulationSession>): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!data.userId || typeof data.userId !== 'string') {
      errors.push({ field: 'userId', message: 'Identificador de usuário (userId) obrigatório.' });
    }
    if (!data.simulationId || typeof data.simulationId !== 'string') {
      errors.push({ field: 'simulationId', message: 'A sessão deve estar vinculada a um simulado válido (simulationId).' });
    }
    if (data.status && !this.VALID_SESSION_STATUSES.includes(data.status)) {
      errors.push({
        field: 'status',
        message: `Status da sessão deve ser um de: ${this.VALID_SESSION_STATUSES.join(', ')}.`
      });
    }
    if (data.currentQuestionIndex !== undefined) {
      if (typeof data.currentQuestionIndex !== 'number' || data.currentQuestionIndex < 0) {
        errors.push({ field: 'currentQuestionIndex', message: 'O índice atual da questão não pode ser negativo.' });
      }
    }
    if (data.totalQuestions !== undefined && data.answeredQuestions !== undefined) {
      if (data.answeredQuestions > data.totalQuestions) {
        errors.push({
          field: 'answeredQuestions',
          message: `Questões respondidas (${data.answeredQuestions}) não pode ser maior que o total (${data.totalQuestions}).`
        });
      }
      if (data.answeredQuestions < 0) {
        errors.push({ field: 'answeredQuestions', message: 'Quantidade de questões respondidas não pode ser negativa.' });
      }
    }

    return errors;
  }

  /**
   * Valida resposta individual enviada pelo aluno.
   */
  public static validateAnswer(data: Partial<SimulationAnswer>): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!data.questionId || typeof data.questionId !== 'string') {
      errors.push({ field: 'questionId', message: 'Identificador da questão é obrigatório.' });
    }
    if (data.timeSpentSeconds !== undefined && data.timeSpentSeconds < 0) {
      errors.push({ field: 'timeSpentSeconds', message: 'O tempo gasto na questão não pode ser negativo.' });
    }

    return errors;
  }
}
