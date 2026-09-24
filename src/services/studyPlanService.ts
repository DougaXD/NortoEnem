import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  limit,
} from 'firebase/firestore';
import { getFirebaseFirestore } from './firebase/config';
import { STUDY_PLAN_CONFIG } from '../config/diagnosticConfig';
import { KNOWLEDGE_AREAS } from '../config/theme';
import type {
  StudyPlan,
  StudentTask,
  StudentProfile,
  DiagnosticResultSummary,
  KnowledgeAreaId,
  TaskCategory,
} from '../types';

export class StudyPlanService {
  private static get firestore() {
    return getFirebaseFirestore();
  }

  /**
   * Gera de forma determinística e balanceada o primeiro plano de estudos do aluno
   */
  public static async generateInitialPlan(
    userId: string,
    profile: StudentProfile,
    diagnosticSummary?: DiagnosticResultSummary | null
  ): Promise<{ plan: StudyPlan; tasks: StudentTask[] }> {
    const dailyMinutes = profile.dailyStudyMinutes || STUDY_PLAN_CONFIG.defaultMinutes;
    const preferredDays =
      profile.preferredStudyDays && profile.preferredStudyDays.length > 0
        ? profile.preferredStudyDays
        : STUDY_PLAN_CONFIG.defaultDays;

    // Determina a área prioritária (menor percentual do diagnóstico ou declarada como fraca)
    let priorityArea: KnowledgeAreaId = 'MT';
    let secondaryArea: KnowledgeAreaId = 'CN';

    if (diagnosticSummary && diagnosticSummary.areaScores) {
      const sortedAreas = Object.values(diagnosticSummary.areaScores).sort(
        (a, b) => a.percentage - b.percentage
      );
      if (sortedAreas[0]) priorityArea = sortedAreas[0].areaId;
      if (sortedAreas[1]) secondaryArea = sortedAreas[1].areaId;
    } else if (profile.weakAreas && profile.weakAreas.length > 0) {
      const firstWeak = profile.weakAreas[0].toLowerCase();
      if (firstWeak.includes('matemática') || firstWeak.includes('mt')) priorityArea = 'MT';
      else if (firstWeak.includes('natureza') || firstWeak.includes('cn')) priorityArea = 'CN';
      else if (firstWeak.includes('humanas') || firstWeak.includes('ch')) priorityArea = 'CH';
      else if (firstWeak.includes('linguagens') || firstWeak.includes('lc')) priorityArea = 'LC';
    }

    const focusAreas: KnowledgeAreaId[] = [priorityArea, secondaryArea, 'LC', 'CH'];
    const now = new Date();
    const planId = `plan_${userId}_${Date.now()}`;

    // Templates de atividades curriculares pedagógicas alinhadas ao ENEM
    const curriculumTemplates: Record<
      KnowledgeAreaId,
      Array<{ title: string; desc: string; category: TaskCategory }>
    > = {
      MT: [
        {
          title: 'Conceitos Fundamentais: Razão, Proporção e Escala',
          desc: 'Revise grandezas direta e inversamente proporcionais e leitura de escalas cartográficas.',
          category: 'study',
        },
        {
          title: 'Treino Prático: 8 Questões de Modelagem e Função Afim',
          desc: 'Resolução comentada de questões clássicas do ENEM sobre equações e gráficos do 1º grau.',
          category: 'exercise',
        },
        {
          title: 'Revisão Rápida: Geometria Espacial (Prismas e Cilindros)',
          desc: 'Fórmulas essenciais de volume e área superficial mais cobradas no exame.',
          category: 'revision',
        },
      ],
      CN: [
        {
          title: 'Ecologia Essencial: Cadeias Alimentares e Eutrofização',
          desc: 'Estudo dos ciclos biogeoquímicos e impactos da poluição aquática e biomagnificação.',
          category: 'study',
        },
        {
          title: 'Treino Prático: 8 Questões de Transformações de Energia',
          desc: 'Conservação de energia mecânica, cinética e rendimento elétrico estilo ENEM.',
          category: 'exercise',
        },
        {
          title: 'Revisão Ativa: Termoquímica e Reações Exotérmicas',
          desc: 'Cálculo de entalpia e leitura de diagramas energéticos.',
          category: 'revision',
        },
      ],
      LC: [
        {
          title: 'Interpretação e Funções da Linguagem',
          desc: 'Identificação da intencionalidade discursiva e recursos conativos/persuasivos.',
          category: 'study',
        },
        {
          title: 'Treino Prático: Variação Linguística e Gêneros Textuais',
          desc: 'Análise de charges, campanhas publicitárias e crônicas contemporâneas.',
          category: 'exercise',
        },
        {
          title: 'Revisão de Figuras de Linguagem Clássicas',
          desc: 'Metáfora, metonímia, antítese e ironia em questões aplicadas.',
          category: 'revision',
        },
      ],
      CH: [
        {
          title: 'Cidadania e Constituição Cidadã de 1988',
          desc: 'Avanços dos direitos sociais, transição democrática e conquistas civis.',
          category: 'study',
        },
        {
          title: 'Treino Prático: Urbanização e Segregação Socioespacial',
          desc: 'Processo de metropolização brasileira, conurbação e migrações pendulares.',
          category: 'exercise',
        },
        {
          title: 'Revisão: Filosofia Política e Iluminismo',
          desc: 'Contratualismo (Hobbes, Locke, Rousseau) e divisão de poderes segundo Montesquieu.',
          category: 'revision',
        },
      ],
      RED: [
        {
          title: 'Estrutura da Dissertação-Argumentativa Nota 1000',
          desc: 'A anatomia do texto do ENEM: introdução contextualizada, teses e repertório legitimado.',
          category: 'study',
        },
      ],
    };

    // Monta a grade de 7 dias com datas reais consecutivas
    const generatedTasks: Omit<StudentTask, 'id' | 'createdAt'>[] = [];

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() + dayOffset);
      const dateStr = targetDate.toISOString().split('T')[0];

      // Alternância pedagógica: dias pares recebem a área prioritária + suporte; dias ímpares recebem secundárias
      const primaryAreaForDay = dayOffset % 2 === 0 ? priorityArea : secondaryArea;
      const templates = curriculumTemplates[primaryAreaForDay] || curriculumTemplates.MT;
      const chosenTemplate = templates[dayOffset % templates.length];

      // Se o aluno tem 60 min ou menos: 1 tarefa de 30-45 min
      // Se tem mais de 60 min: 2 tarefas distribuídas
      const taskDuration = dailyMinutes <= 60 ? Math.min(dailyMinutes, 45) : Math.round(dailyMinutes * 0.6);

      generatedTasks.push({
        userId,
        planId,
        title: chosenTemplate.title,
        description: chosenTemplate.desc,
        category: chosenTemplate.category,
        knowledgeArea: primaryAreaForDay,
        dueDate: dateStr,
        estimatedMinutes: taskDuration,
        priority: primaryAreaForDay === priorityArea ? 'high' : 'normal',
        completed: false,
      });

      // Se tiver tempo diário maior que 60 min, adiciona uma atividade complementar de fixação
      if (dailyMinutes >= 90) {
        const compArea = dayOffset % 2 === 0 ? 'LC' : 'CH';
        const compTemplates = curriculumTemplates[compArea];
        const compChosen = compTemplates[dayOffset % compTemplates.length];
        generatedTasks.push({
          userId,
          planId,
          title: compChosen.title,
          description: compChosen.desc,
          category: 'exercise',
          knowledgeArea: compArea,
          dueDate: dateStr,
          estimatedMinutes: Math.round(dailyMinutes * 0.4),
          priority: 'normal',
          completed: false,
        });
      }
    }

    // Cria o plano na coleção studyPlans
    const priorityName = KNOWLEDGE_AREAS[priorityArea]?.name || priorityArea;
    const planDoc: StudyPlan = {
      id: planId,
      userId,
      title: `Plano de Estudos Inicial - Foco em ${priorityName}`,
      status: 'active',
      dailyMinutes,
      preferredDays,
      priorityArea,
      secondaryArea,
      focusAreas,
      itemsCount: generatedTasks.length,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    await setDoc(doc(this.firestore, 'studyPlans', planId), planDoc);

    // Cria as tarefas na coleção tasks
    const createdTasks: StudentTask[] = [];
    for (const t of generatedTasks) {
      const docRef = await addDoc(collection(this.firestore, 'tasks'), {
        ...t,
        createdAt: now.toISOString(),
      });
      createdTasks.push({
        ...t,
        id: docRef.id,
        createdAt: now.toISOString(),
      });
    }

    // Atualiza o perfil do estudante com status de plano ativo
    try {
      await updateDoc(doc(this.firestore, 'studentProfiles', userId), {
        hasActiveStudyPlan: true,
        updatedAt: now.toISOString(),
      });
    } catch (e) {
      console.warn('Falha ao atualizar hasActiveStudyPlan no perfil:', e);
    }

    return { plan: planDoc, tasks: createdTasks };
  }

  /**
   * Busca o plano de estudos atualmente ativo para o estudante
   */
  public static async getActivePlan(userId: string): Promise<StudyPlan | null> {
    try {
      const q = query(
        collection(this.firestore, 'studyPlans'),
        where('userId', '==', userId),
        where('status', '==', 'active'),
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        return { ...snap.docs[0].data(), id: snap.docs[0].id } as StudyPlan;
      }
      return null;
    } catch (e) {
      console.error('Erro ao buscar plano de estudos ativo:', e);
      return null;
    }
  }

  /**
   * Obtém as tarefas do estudante vinculadas ao plano ou recentes
   */
  public static async getStudentTasks(userId: string): Promise<StudentTask[]> {
    try {
      const q = query(
        collection(this.firestore, 'tasks'),
        where('userId', '==', userId),
        limit(20)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as StudentTask));
    } catch (e) {
      console.error('Erro ao buscar tarefas do plano do estudante:', e);
      return [];
    }
  }

  /**
   * Alterna conclusão de tarefa
   */
  public static async toggleTask(taskId: string, completed: boolean): Promise<void> {
    await updateDoc(doc(this.firestore, 'tasks', taskId), {
      completed,
    });
  }
}
