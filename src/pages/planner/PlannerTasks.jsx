import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Edit, CheckCircle, Circle, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const TaskForm = ({ formData, setFormData, handleSave, closeModal }) => (
  <form onSubmit={handleSave} className="space-y-4 py-4">
    <div>
      <label className="block text-sm font-medium text-gray-200 mb-2">Título de la Tarea</label>
      <input type="text" placeholder="Título" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} required className="w-full p-3 rounded bg-white/10 border border-white/20" />
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-200 mb-2">Descripción</label>
      <textarea placeholder="Descripción" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full p-3 rounded bg-white/10 border border-white/20 h-24" />
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-200 mb-2">Fecha Límite</label>
      <input type="date" value={formData.due_date ? formData.due_date.split('T')[0] : ''} onChange={(e) => setFormData({...formData, due_date: e.target.value})} className="w-full p-3 rounded bg-white/10 border border-white/20" style={{ colorScheme: 'dark' }} />
    </div>
    <DialogFooter>
      <Button type="button" variant="ghost" onClick={closeModal}>Cancelar</Button>
      <Button type="submit" className="bg-cyan-600 hover:bg-cyan-700">Guardar Tarea</Button>
    </DialogFooter>
  </form>
);

const PlannerTasks = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // list or kanban
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState(null);
  const [formData, setFormData] = useState({ title: '', description: '', due_date: '' });

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('planner_tasks').select('*').eq('event_id', eventId).order('created_at', { ascending: false });
    if (error) {
      toast({ title: "Error al cargar tareas", description: error.message, variant: "destructive" });
    } else {
      setTasks(data);
    }
    setLoading(false);
  }, [eventId]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleOpenModal = (task = null) => {
    setCurrentTask(task);
    setFormData(task ? { title: task.title, description: task.description || '', due_date: task.due_date } : { title: '', description: '', due_date: '' });
    setIsModalOpen(true);
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    const taskData = { ...formData, event_id: eventId };
    let error;
    if (currentTask) {
      ({ error } = await supabase.from('planner_tasks').update(taskData).eq('id', currentTask.id));
    } else {
      ({ error } = await supabase.from('planner_tasks').insert(taskData));
    }
    if (error) {
      toast({ title: "Error al guardar tarea", variant: "destructive" });
    } else {
      toast({ title: `Tarea ${currentTask ? 'actualizada' : 'creada'}` });
      setIsModalOpen(false);
      fetchTasks();
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("¿Seguro que quieres eliminar esta tarea?")) return;
    const { error } = await supabase.from('planner_tasks').delete().eq('id', taskId);
    if (error) { toast({ title: "Error al eliminar tarea", variant: "destructive" }); }
    else { toast({ title: "Tarea eliminada" }); fetchTasks(); }
  };

  const updateTaskStatus = async (taskId, status) => {
    const { error } = await supabase.from('planner_tasks').update({ status }).eq('id', taskId);
    if (error) { toast({ title: "Error al actualizar estado", variant: "destructive" }); }
    else { fetchTasks(); }
  };

  const columns = {
    pending: tasks.filter(t => t.status === 'pending'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    completed: tasks.filter(t => t.status === 'completed'),
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <Button variant="ghost" onClick={() => navigate(`/host/${eventId}`)} className="text-white hover:bg-white/10 mr-4"><ArrowLeft /></Button>
              <div><h1 className="text-2xl font-bold text-white">Tareas y Checklist</h1></div>
            </div>
            <div className="flex gap-4">
              <div className="flex bg-white/10 rounded-lg p-1"><Button variant={view === 'list' ? 'secondary' : 'ghost'} onClick={() => setView('list')} className="text-sm">Lista</Button><Button variant={view === 'kanban' ? 'secondary' : 'ghost'} onClick={() => setView('kanban')} className="text-sm">Kanban</Button></div>
              <Button onClick={() => handleOpenModal()} className="bg-cyan-600 hover:bg-cyan-700"><Plus className="w-4 h-4 mr-2" />Nueva Tarea</Button>
            </div>
          </div>

          {loading ? <div className="text-center text-white">Cargando tareas...</div> :
            view === 'list' ? (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 space-y-3">
                {tasks.map(task => (
                  <div key={task.id} className="flex items-center justify-between bg-white/5 p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                      <button onClick={() => updateTaskStatus(task.id, task.status === 'completed' ? 'pending' : 'completed')}>
                        {task.status === 'completed' ? <CheckCircle className="text-green-400" /> : <Circle className="text-gray-400" />}
                      </button>
                      <div>
                        <p className={`font-semibold text-white ${task.status === 'completed' && 'line-through text-gray-400'}`}>{task.title}</p>
                        <p className="text-sm text-gray-400">{task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Sin fecha'}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => handleOpenModal(task)} size="icon" variant="ghost" className="text-blue-400 hover:bg-blue-500/20"><Edit className="w-4 h-4" /></Button>
                      <Button onClick={() => handleDeleteTask(task.id)} size="icon" variant="ghost" className="text-red-400 hover:bg-red-500/20"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ))}
                {tasks.length === 0 && <p className="text-center text-gray-400 py-8">No hay tareas creadas.</p>}
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-6">
                {Object.entries(columns).map(([status, tasksInColumn]) => (
                  <div key={status} className="bg-white/10 rounded-2xl p-4 border border-white/20">
                    <h3 className="font-bold text-white mb-4 capitalize">{status.replace('_', ' ')} ({tasksInColumn.length})</h3>
                    <div className="space-y-3">
                      {tasksInColumn.map(task => (
                        <div key={task.id} className="bg-white/5 p-3 rounded-lg">
                          <p className="font-semibold text-white mb-1">{task.title}</p>
                          <p className="text-xs text-gray-400">{task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Sin fecha'}</p>
                          <div className="flex gap-2 mt-2">
                            <select value={task.status} onChange={(e) => updateTaskStatus(task.id, e.target.value)} className="text-xs p-1 rounded bg-white/10 border-white/20">
                              <option value="pending">Pendiente</option>
                              <option value="in_progress">En Progreso</option>
                              <option value="completed">Completada</option>
                            </select>
                            <Button onClick={() => handleOpenModal(task)} size="icon" variant="ghost" className="h-6 w-6 text-blue-400"><Edit className="w-3 h-3" /></Button>
                            <Button onClick={() => handleDeleteTask(task.id)} size="icon" variant="ghost" className="h-6 w-6 text-red-400"><Trash2 className="w-3 h-3" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </motion.div>
      </div>
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-slate-800/90 backdrop-blur-sm border-cyan-500 text-white">
          <DialogHeader><DialogTitle className="text-2xl">{currentTask ? 'Editar Tarea' : 'Crear Tarea'}</DialogTitle></DialogHeader>
          <TaskForm formData={formData} setFormData={setFormData} handleSave={handleSaveTask} closeModal={() => setIsModalOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlannerTasks;