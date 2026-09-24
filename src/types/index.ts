// Tipos centrais do domínio Norto ENEM

export type UserRole = 'student' | 'admin' | 'editor' | 'reviewer' | 'support';
export type UserStatus = 'active' | 'suspended' | 'pending';

export interface UserAccount {
  id: string;
  displayName: string;
  email: string;
  photoURL?: string;
  role: UserRole;
  status: UserStatus;
  entitlements: string[]; // ex: ['enem']
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
}

export type SchoolYearOption = '1ano' | '2ano' | '3ano' | 'cursinho' | 'graduado';
export type StudyShift = 'morning' | 'afternoon' | 'night';

export interface StudentProfile {
  id: string;
  userId: string;
  name: string;
  schoolYear: SchoolYearOption;
  targetExam: string;
  goal: string;
  goalCustomDetail?: string;
  dailyStudyMinutes: number;
  preferredStudyTimes: StudyShift[];
  preferredStudyDays?: string[];
  weakAreas: string[];
  strongAreas: string[];
  notificationPreference?: 'yes' | 'later';
  studyPreferences?: Record<string, unknown>;
  onboardingCompleted: boolean;
  onboardingCurrentStep?: number;
  diagnosticCompleted: boolean;
  diagnosticStatus?: 'not_started' | 'in_progress' | 'completed';
  hasActiveStudyPlan?: boolean;
  timezone: string;
  updatedAt: string;
}

export type KnowledgeAreaId = 'CH' | 'CN' | 'LC' | 'MT' | 'RED';
export type QuestionDifficulty = 'easy' | 'medium' | 'hard';
export type QuestionStatus = 'draft' | 'published' | 'archived';
export type PracticeMode = 'practice' | 'diagnostic' | 'review' | 'simulation';

export interface QuestionOption {
  id: string; // 'A' | 'B' | 'C' | 'D' | 'E'
  text: string;
}

export interface Question {
  id: string;
  type?: 'multiple_choice' | 'essay' | 'diagnostic' | 'practice';
  productId: string;
  areaId?: KnowledgeAreaId;
  knowledgeArea: KnowledgeAreaId; // Compatibilidade retroativa
  subjectId?: string;
  subject: string;
  topicId?: string;
  topic: string;
  competencyId?: string | null;
  skillId?: string | null;
  statement: string;
  context?: string;
  image?: string;
  options: QuestionOption[];
  correctOptionId: string;
  correctAnswer?: string; // Sinônimo de correctOptionId
  explanation?: string;
  solution?: string;
  year?: number;
  sourceYear?: number | null;
  difficulty: QuestionDifficulty;
  source?: string;
  tags?: string[];
  status?: QuestionStatus;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
}

// Alias canônico solicitado para o Banco de Questões
export type QuestionItem = Question;

// ==== Taxonomia Acadêmica ====
export interface AcademicTopic {
  id: string;
  name: string;
  subjectId: string;
  areaId: KnowledgeAreaId;
  description?: string;
}

export interface AcademicSubject {
  id: string;
  name: string;
  areaId: KnowledgeAreaId;
  topics: AcademicTopic[];
}

export interface AcademicArea {
  id: KnowledgeAreaId;
  name: string;
  shortName: string;
  subjects: AcademicSubject[];
}

// ==== Filtros e Paginação do Banco de Questões ====
export interface QuestionFilters {
  areaId?: KnowledgeAreaId;
  subjectId?: string;
  topicId?: string;
  difficulty?: QuestionDifficulty;
  status?: QuestionStatus; // Padrão para estudantes: 'published'
  competencyId?: string | null;
  skillId?: string | null;
  source?: string;
}

export interface PaginationOptions {
  limit?: number;
  startAfterId?: string | null;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
  total?: number;
}

export interface QuestionAttempt {
  id: string;
  userId: string;
  questionId: string;
  mode?: PracticeMode;
  sessionId?: string | null;
  selectedOptionId: string;
  selectedAnswer?: string; // Sinônimo de selectedOptionId
  isCorrect: boolean;
  correct?: boolean; // Sinônimo de isCorrect
  timeSpentSeconds: number;
  timeSpent?: number; // Sinônimo em segundos
  knowledgeArea: KnowledgeAreaId;
  areaId?: KnowledgeAreaId;
  subjectId?: string;
  topicId?: string;
  diagnosticId?: string | null;
  simulationId?: string | null;
  attemptedAt: string;
  startedAt?: string;
  answeredAt?: string;
}

export interface PracticeSession {
  id: string;
  userId: string;
  mode: PracticeMode;
  questionIds: string[];
  currentIndex: number;
  startedAt: string;
  completedAt?: string | null;
  finishedAt?: string | null;
  abandonedAt?: string | null;
  status: 'not_started' | 'in_progress' | 'completed' | 'abandoned';
  answers: Record<string, {
    selectedAnswer: string;
    selectedOptionId?: string;
    isCorrect: boolean;
    correct?: boolean;
    timeSpentSeconds: number;
    timeSpent?: number;
    startedAt?: string;
    answeredAt: string;
  }>;
  filters?: {
    areaId?: string;
    subjectId?: string;
    topicId?: string;
    difficulty?: string;
    statusFilter?: string;
  };
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  accuracy?: number; // 0 a 100
  totalTimeSpentSeconds: number;
  totalTime?: number;
  averageTime?: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserFavorite {
  id: string;
  userId: string;
  questionId: string;
  favoritedAt: string;
}

export interface UserQuestionReview {
  id: string;
  userId: string;
  questionId: string;
  status: 'not_reviewed' | 'reviewed';
  lastAttemptCorrect: boolean;
  reviewedAt?: string | null;
  updatedAt: string;
}

export interface ErrorNotebookItem {
  questionId: string;
  question: Question | null;
  totalAttempts: number;
  errorCount: number;
  correctCount: number;
  firstErrorAt: string;
  lastAttemptAt: string;
  lastAttemptCorrect: boolean;
  reviewStatus: 'not_reviewed' | 'reviewed';
  reviewedAt?: string | null;
  knowledgeArea?: KnowledgeAreaId;
  subjectId?: string;
  topicId?: string;
}

export interface AttemptFilters {
  areaId?: string;
  result?: 'all' | 'correct' | 'incorrect';
  mode?: PracticeMode | 'all';
}

// ==== Diagnóstico de Domínio Norto ====
export type MasteryClassification = 'attention' | 'developing' | 'mastered' | 'insufficient';

export interface AreaDiagnosticResult {
  areaId: KnowledgeAreaId;
  areaName: string;
  total: number;
  correct: number;
  percentage: number;
  classification: MasteryClassification;
}

export interface DiagnosticResultSummary {
  overallPercentage: number;
  overallClassification: MasteryClassification;
  totalQuestions: number;
  totalCorrect: number;
  areaScores: Record<string, AreaDiagnosticResult>;
  attentionPoints: string[];
  strongPoints: string[];
  constructiveFeedback: string;
  averageTimeSeconds?: number;
}

export interface DiagnosticAttempt {
  id: string;
  userId: string;
  status: 'not_started' | 'in_progress' | 'completed';
  startedAt: string;
  completedAt?: string;
  currentQuestionIndex: number;
  answers: Record<string, {
    selectedOptionId: string;
    answeredAt: string;
    timeSpentSeconds?: number;
    isCorrect?: boolean;
  }>;
  results?: DiagnosticResultSummary;
}

// ==== Perfil de Desempenho e Histórico ====
export interface UserPerformanceArea {
  id: string;
  userId: string;
  areaId: KnowledgeAreaId;
  areaName: string;
  totalAnswered: number;
  totalCorrect: number;
  masteryIndex: number; // 0-100
  classification: MasteryClassification;
  source: 'diagnostic' | 'practice' | 'simulation';
  updatedAt: string;
  processedSessions?: string[];
}

export interface UserPerformanceTopic {
  id: string;
  userId: string;
  areaId: KnowledgeAreaId;
  subject: string;
  topic: string;
  totalAnswered: number;
  totalCorrect: number;
  masteryIndex: number;
  classification: MasteryClassification;
  updatedAt: string;
  processedSessions?: string[];
}

export interface PerformanceSnapshot {
  id: string;
  userId: string;
  snapshotType: 'diagnostic' | 'weekly';
  overallMastery: number;
  areaBreakdown: Record<string, number>;
  createdAt: string;
}

// ==== Primeiro Plano de Estudos Sugerido / Ativo ====
export interface StudyPlan {
  id: string;
  userId: string;
  title: string;
  status: 'suggested' | 'active' | 'archived';
  dailyMinutes: number;
  preferredDays: string[];
  priorityArea: KnowledgeAreaId;
  secondaryArea?: KnowledgeAreaId;
  focusAreas: KnowledgeAreaId[];
  itemsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserGamification {
  id: string;
  userId: string;
  totalXp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate?: string;
  updatedAt: string;
}

export type TaskCategory = 'study' | 'revision' | 'exercise' | 'essay';

export interface StudentTask {
  id: string;
  userId: string;
  title: string;
  description?: string;
  dueDate: string;
  completed: boolean;
  category: TaskCategory;
  knowledgeArea?: KnowledgeAreaId;
  estimatedMinutes?: number;
  priority?: 'high' | 'normal' | 'low';
  planId?: string;
  createdAt: string;
}

export interface DailyMission {
  id: string;
  title: string;
  description: string;
  targetCount: number;
  currentCount: number;
  xpReward: number;
  completed: boolean;
  category: string;
}

// ==== Motor de Simulados ENEM ====
export type SimulationType = 'full' | 'area' | 'custom';
export type SimulationStatus = 'draft' | 'published' | 'archived';
export type SimulationSessionStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'abandoned'
  | 'expired';
// Alias semântico para tentativas de simulado
export type SimulationAttemptStatus = SimulationSessionStatus;

export interface SimulationSection {
  id: string;
  title: string;
  areaId?: KnowledgeAreaId;
  questionIds: string[];
  questionCount: number;
  order: number;
  durationSeconds?: number;
}

export interface Simulation {
  id: string;
  title: string;
  description?: string;
  type: SimulationType;
  status: SimulationStatus;

  areaIds?: KnowledgeAreaId[];
  questionIds: string[];

  questionCount: number;

  durationSeconds?: number;

  allowResume: boolean;
  shuffleQuestions: boolean;
  shuffleAlternatives: boolean;

  version: number;

  sections?: SimulationSection[];

  createdAt: string;
  updatedAt: string;
}

export interface SimulationSession {
  id: string;
  userId: string;
  simulationId: string;

  status: SimulationSessionStatus;

  currentQuestionIndex: number;

  totalQuestions: number;
  answeredQuestions: number;

  startedAt: string;
  lastSavedAt: string;
  completedAt?: string | null;
  expiresAt?: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface SimulationAnswer {
  questionId: string;
  selectedAnswer?: string | null;
  answered: boolean;
  markedForReview?: boolean;
  timeSpentSeconds?: number;

  answeredAt?: string | null;
  updatedAt: string;
}

export interface SimulationAreaResult {
  areaId: KnowledgeAreaId;
  areaName: string;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  unansweredQuestions: number;
  percentage: number;
  classification?: MasteryClassification;
}

export interface SimulationSubjectResult {
  subjectId: string;
  subjectName: string;
  areaId: KnowledgeAreaId;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  unansweredQuestions: number;
  percentage: number;
  classification: MasteryClassification;
}

export interface SimulationTopicResult {
  topicId: string;
  topicName: string;
  subjectName: string;
  areaId: KnowledgeAreaId;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  unansweredQuestions: number;
  percentage: number;
  classification: MasteryClassification;
}

export interface SimulationQuestionCorrection {
  questionId: string;
  order: number;
  areaId: KnowledgeAreaId;
  subject?: string;
  topic?: string;
  statement: string;
  options: { id: string; text: string }[];
  selectedOptionId?: string | null;
  correctOptionId: string;
  isCorrect: boolean;
  isUnanswered: boolean;
  timeSpentSeconds: number;
  explanation?: string;
  markedForReview?: boolean;
}

export interface SimulationResult {
  id: string;
  sessionId: string;
  userId: string;
  simulationId: string;
  simulationTitle?: string;

  totalQuestions: number;
  answeredQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  unansweredQuestions: number;

  percentage: number; // Desempenho bruto de acerto (0 a 100), não pontuação TRI

  totalTimeSeconds: number;
  averageTimeSeconds: number;

  completedAt: string;

  areaResults?: SimulationAreaResult[];
  subjectResults?: SimulationSubjectResult[];
  topicResults?: SimulationTopicResult[];
  questionCorrections?: SimulationQuestionCorrection[];
}

export interface QuestionAnswerKey {
  questionId: string;
  correctOptionId: string;
  explanation?: string;
  solution?: string;
  updatedAt: string;
}

export interface SimulationFilters {
  type?: SimulationType;
  status?: SimulationStatus;
  areaId?: KnowledgeAreaId;
}
