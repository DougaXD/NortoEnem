import React, { useState } from 'react';
import { useAuth } from '../../providers/AuthProvider';
import { useRouter } from '../../app/router/RouterContext';
import { Card, Button, Input } from '../../components/ui/DesignSystem';
import { DataService } from '../../services/firebase/dataService';
import { Plus, CheckCircle2, Circle, Calendar, Clock, Sparkles } from 'lucide-react';
import type { StudentTask } from '../../types';

export const PlannerView: React.FC = () => {
  const { firebaseUser } = useAuth();
  const { navigate } = useRouter();
  const [tasks, setTasks] = useState<StudentTask[]>([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  React.useEffect(() => {
    if (firebaseUser) {
      DataService.getUserTasks(firebaseUser.uid).then((res) => {
        setTasks(res);
        setLoaded(true);
      });
    }
  }, [firebaseUser]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !firebaseUser) return;
    setLoading(true);
    try {
      const newTask = await DataService.createTask({
        userId: firebaseUser.uid,
        title: title.trim(),
        completed: false,
        category: 'study',
        dueDate: new Date().toISOString().split('T')[0],
      });
      setTasks((prev) => [newTask, ...prev]);
      setTitle('');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (taskId: string, current: boolean) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: !current } : t))
    );
    await DataService.toggleTaskCompletion(taskId, !current);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Cronograma & Checklist</h1>
          <p className="text-xs text-slate-400">Organize suas metas e revisões para o ENEM</p>
        </div>
      </div>

      {/* Formulário de Nova Tarefa */}
      <Card variant="elevated" padding="md">
        <form onSubmit={handleAddTask} className="flex gap-2">
          <Input
            placeholder="Nova meta de estudo (ex: 20 questões de Termodinâmica)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={loading}
            className="flex-1"
          />
          <Button type="submit" variant="primary" loading={loading} icon={<Plus className="w-4 h-4" />}>
            Adicionar
          </Button>
        </form>
      </Card>

      {/* Lista de Tarefas */}
      <div className="space-y-2">
        {tasks.length === 0 && loaded && (
          <p className="text-center text-xs text-slate-500 py-8">
            Nenhuma meta cadastrada ainda. Adicione sua primeira atividade acima!
          </p>
        )}
        {tasks.map((task) => (
          <div
            key={task.id}
            onClick={() => handleToggle(task.id, task.completed)}
            className="flex items-center justify-between p-3.5 rounded-xl bg-[#111827] border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <button className="text-blue-400 shrink-0">
                {task.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-500" />
                )}
              </button>
              <span className={`text-sm ${task.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                {task.title}
              </span>
            </div>
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {task.dueDate}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
