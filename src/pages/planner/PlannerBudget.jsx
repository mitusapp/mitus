// src/pages/planner/PlannerBudget.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Edit, DollarSign, TrendingUp, TrendingDown, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Baja' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
];

const BudgetForm = ({
  formData,
  setFormData,
  handleSave,
  closeModal,
  providers,
  teamMembers,
  scheduleRows,
  setScheduleRows
}) => {
  const [installmentsCount, setInstallmentsCount] = useState('');
  const [firstDueDate, setFirstDueDate] = useState(new Date().toISOString().split('T')[0]);

  const totalBase = Number(formData.actual_cost || formData.estimated_cost || 0) || 0;

  const generateSchedule = () => {
    const n = Number(installmentsCount);
    if (!n || n < 1) return toast({ title: 'Define cuántas cuotas', variant: 'destructive' });
    if (!totalBase) return toast({ title: 'Ingresa el costo estimado o real para distribuir', variant: 'destructive' });

    // Distribuye en partes iguales y ajusta el último centavo en la última cuota
    const base = Math.floor((totalBase / n) * 100) / 100;
    const rows = Array.from({ length: n }).map((_, i) => {
      const d = new Date(firstDueDate);
      d.setMonth(d.getMonth() + i);
      return {
        amount: base,
        due_date: d.toISOString().split('T')[0],
        priority: formData.priority || 'medium',
        assignee_team_id: formData.assignee_team_id || null,
      };
    });
    // Ajuste final para que la suma coincida exactamente
    const diff = (totalBase - rows.reduce((s, r) => s + Number(r.amount || 0), 0)).toFixed(2);
    rows[rows.length - 1].amount = Number(rows[rows.length - 1].amount) + Number(diff);
    setScheduleRows(rows);
  };

  return (
    <form onSubmit={handleSave} className="space-y-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-2">Categoría</label>
          <input type="text" placeholder="Ej: Decoración" value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            required className="w-full p-3 rounded bg-white/10 border border-white/20" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-2">Nombre del Gasto</label>
          <input type="text" placeholder="Ej: Flores" value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required className="w-full p-3 rounded bg-white/10 border border-white/20" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-2">Costo Estimado</label>
          <input type="number" placeholder="1000" value={formData.estimated_cost}
            onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })}
            required className="w-full p-3 rounded bg-white/10 border border-white/20" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-2">Costo Real</label>
          <input type="number" placeholder="950" value={formData.actual_cost}
            onChange={(e) => setFormData({ ...formData, actual_cost: e.target.value })}
            className="w-full p-3 rounded bg-white/10 border border-white/20" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-2">Proveedor</label>
          <select value={formData.provider_id || ''} onChange={(e) => setFormData({ ...formData, provider_id: e.target.value || null })}
            className="w-full p-3 rounded bg-white/10 border border-white/20">
            <option value="">Sin proveedor</option>
            {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-200 mb-2">Prioridad</label>
          <select value={formData.priority || ''} onChange={(e) => setFormData({ ...formData, priority: e.target.value || null })}
            className="w-full p-3 rounded bg-white/10 border border-white/20">
            <option value="">Sin prioridad</option>
            {PRIORITY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-200 mb-2">Responsable</label>
          <select value={formData.assignee_team_id || ''} onChange={(e) => setFormData({ ...formData, assignee_team_id: e.target.value || null })}
            className="w-full p-3 rounded bg-white/10 border border-white/20">
            <option value="">Sin responsable</option>
            {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
      </div>

      {/* ===== Calendario de pagos ===== */}
      <div className="border-t border-white/20 pt-4">
        <h4 className="font-semibold mb-3">Calendario de pagos</h4>
        <div className="grid grid-cols-3 gap-4 mb-3">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2"># de cuotas</label>
            <input type="number" min="1" value={installmentsCount}
              onChange={(e) => setInstallmentsCount(e.target.value)}
              className="w-full p-3 rounded bg-white/10 border border-white/20" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">1ª fecha de pago</label>
            <input type="date" value={firstDueDate} onChange={(e) => setFirstDueDate(e.target.value)}
              className="w-full p-3 rounded bg-white/10 border border-white/20" style={{ colorScheme: 'dark' }} />
          </div>
          <div className="flex items-end">
            <Button type="button" onClick={generateSchedule} className="w-full bg-green-600 hover:bg-green-700">
              Generar cuotas
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {scheduleRows.map((row, idx) => (
            <div key={idx} className="grid md:grid-cols-5 gap-2 items-center bg-white/5 p-2 rounded">
              <div className="text-sm text-gray-300">Cuota {idx + 1}</div>
              <input type="number" value={row.amount}
                onChange={e => {
                  const v = [...scheduleRows];
                  v[idx].amount = Number(e.target.value || 0);
                  setScheduleRows(v);
                }}
                className="p-2 rounded bg-white/10 border border-white/20" placeholder="Monto" />
              <input type="date" value={row.due_date}
                onChange={e => {
                  const v = [...scheduleRows];
                  v[idx].due_date = e.target.value;
                  setScheduleRows(v);
                }}
                className="p-2 rounded bg-white/10 border border-white/20" style={{ colorScheme: 'dark' }} />
              <select value={row.priority || ''} onChange={e => {
                const v = [...scheduleRows];
                v[idx].priority = e.target.value || null;
                setScheduleRows(v);
              }} className="p-2 rounded bg-white/10 border border-white/20">
                <option value="">Prioridad</option>
                {PRIORITY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              <select value={row.assignee_team_id || ''} onChange={e => {
                const v = [...scheduleRows];
                v[idx].assignee_team_id = e.target.value || null;
                setScheduleRows(v);
              }} className="p-2 rounded bg-white/10 border border-white/20">
                <option value="">Responsable</option>
                {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          ))}
          {scheduleRows.length === 0 && (
            <p className="text-sm text-gray-400">No hay cuotas configuradas. Puedes generarlas o añadirlas manualmente.</p>
          )}
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={closeModal}>Cancelar</Button>
        <Button type="submit" className="bg-green-600 hover:bg-green-700">Guardar Gasto</Button>
      </DialogFooter>
    </form>
  );
};

const PaymentsModal = ({ budgetItem, payments, onAddPayment, onDeletePayment, closeModal }) => {
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  const handleAdd = () => {
    if (amount > 0) {
      onAddPayment({ budget_item_id: budgetItem.id, amount, payment_date: paymentDate });
      setAmount('');
    }
  };

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const remaining = Number(budgetItem.actual_cost || budgetItem.estimated_cost) - totalPaid;

  return (
    <div className="py-4">
      <div className="space-y-2 mb-4">
        {payments.map(p => (
          <div key={p.id} className="flex justify-between items-center bg-white/5 p-2 rounded">
            <span>${Number(p.amount).toLocaleString()} - {new Date(p.payment_date).toLocaleDateString()}</span>
            <Button size="icon" variant="ghost" className="h-6 w-6 text-red-400" onClick={() => onDeletePayment(p.id)}><Trash2 className="w-4 h-4" /></Button>
          </div>
        ))}
        {payments.length === 0 && <p className="text-sm text-gray-400 text-center">No hay pagos registrados.</p>}
      </div>
      <div className="border-t border-white/20 pt-4 space-y-3">
        <div className="flex justify-between font-bold"><p>Total Pagado:</p> <p>${totalPaid.toLocaleString()}</p></div>
        <div className="flex justify-between font-bold"><p>Pendiente:</p> <p>${remaining.toLocaleString()}</p></div>
      </div>
      <div className="border-t border-white/20 pt-4 mt-4 space-y-2">
        <h4 className="font-semibold">Añadir Pago</h4>
        <input type="number" placeholder="Monto" value={amount} onChange={e => setAmount(e.target.value)} className="w-full p-2 rounded bg-white/10 border border-white/20" />
        <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="w-full p-2 rounded bg-white/10 border border-white/20" style={{ colorScheme: 'dark' }} />
        <Button onClick={handleAdd} className="w-full bg-green-600 hover:bg-green-700">Añadir Pago</Button>
      </div>
      <DialogFooter className="mt-4">
        <Button variant="ghost" onClick={closeModal}>Cerrar</Button>
      </DialogFooter>
    </div>
  );
};

const PlannerBudget = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [budgetItems, setBudgetItems] = useState([]);
  const [payments, setPayments] = useState({});
  const [schedules, setSchedules] = useState({}); // { budget_item_id: [rows] }
  const [providers, setProviders] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isPaymentsModalOpen, setIsPaymentsModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [formData, setFormData] = useState({
    category: '', name: '', estimated_cost: '', actual_cost: '', provider_id: null,
    priority: null, assignee_team_id: null
  });
  const [scheduleRows, setScheduleRows] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: budgetData, error: budgetError } = await supabase
        .from('planner_budget_items')
        .select('*, planner_providers(name)')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });
      if (budgetError) throw budgetError;
      setBudgetItems(budgetData || []);

      const budgetItemIds = (budgetData || []).map(item => item.id);

      if (budgetItemIds.length > 0) {
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('planner_payments')
          .select('*')
          .in('budget_item_id', budgetItemIds);
        if (paymentsError) throw paymentsError;
        const paymentsByItem = (paymentsData || []).reduce((acc, p) => {
          (acc[p.budget_item_id] ||= []).push(p);
          return acc;
        }, {});
        setPayments(paymentsByItem);

        const { data: schedData, error: schedErr } = await supabase
          .from('planner_payment_schedules')
          .select('*')
          .in('budget_item_id', budgetItemIds)
          .order('installment_no', { ascending: true });
        if (schedErr) throw schedErr;
        const schedByItem = (schedData || []).reduce((acc, r) => {
          (acc[r.budget_item_id] ||= []).push(r);
          return acc;
        }, {});
        setSchedules(schedByItem);
      }

      const { data: providersData, error: providersError } = await supabase
        .from('event_providers')
        .select('planner_providers(*)')
        .eq('event_id', eventId);
      if (providersError) throw providersError;
      setProviders((providersData || []).map(p => p.planner_providers));

      const { data: teamData, error: teamErr } = await supabase
        .from('planner_team')
        .select('id, name')
        .eq('event_id', eventId)
        .order('name', { ascending: true });
      if (teamErr) throw teamErr;
      setTeamMembers(teamData || []);

    } catch (error) {
      toast({ title: "Error al cargar datos", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleOpenFormModal = (item = null) => {
    setCurrentItem(item);
    setFormData(item
      ? {
          category: item.category, name: item.name,
          estimated_cost: item.estimated_cost, actual_cost: item.actual_cost || '',
          provider_id: item.provider_id || null, priority: item.priority || null,
          assignee_team_id: item.assignee_team_id || null
        }
      : { category: '', name: '', estimated_cost: '', actual_cost: '', provider_id: null, priority: null, assignee_team_id: null }
    );
    setScheduleRows(item ? (schedules[item.id]?.map(s => ({
      amount: s.amount,
      due_date: s.due_date,
      priority: s.priority || null,
      assignee_team_id: s.assignee_team_id || null
    })) || []) : []);
    setIsFormModalOpen(true);
  };

  const handleOpenPaymentsModal = (item) => {
    setCurrentItem(item);
    setIsPaymentsModalOpen(true);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();

    const payload = {
      ...formData,
      event_id: eventId,
      estimated_cost: formData.estimated_cost || 0,
      actual_cost: formData.actual_cost || null,
      provider_id: formData.provider_id || null,
      priority: formData.priority || null,
      assignee_team_id: formData.assignee_team_id || null,
    };

    try {
      let itemId;
      if (currentItem) {
        const { error } = await supabase.from('planner_budget_items').update(payload).eq('id', currentItem.id);
        if (error) throw error;
        itemId = currentItem.id;
      } else {
        const { data, error } = await supabase.from('planner_budget_items').insert(payload).select('id').single();
        if (error) throw error;
        itemId = data.id;
      }

      // --- Guardar calendario de pagos ---
      // Política: reemplazar el calendario actual por el nuevo (si hay filas configuradas)
      if (Array.isArray(scheduleRows)) {
        // borra previas
        await supabase.from('planner_payment_schedules').delete().eq('budget_item_id', itemId);
        // inserta nuevas (solo filas válidas)
        const rows = scheduleRows
          .filter(r => Number(r.amount) > 0 && r.due_date)
          .map((r, idx) => ({
            budget_item_id: itemId,
            installment_no: idx + 1,
            amount: Number(r.amount),
            due_date: r.due_date,
            priority: r.priority || null,
            assignee_team_id: r.assignee_team_id || null,
            status: 'upcoming',
          }));
        if (rows.length > 0) {
          const { error: schedErr } = await supabase.from('planner_payment_schedules').insert(rows);
          if (schedErr) throw schedErr;
        }
      }

      toast({ title: `Gasto ${currentItem ? 'actualizado' : 'creado'}` });
      setIsFormModalOpen(false);
      fetchData();
    } catch (error) {
      toast({ title: "Error al guardar gasto", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm("¿Seguro que quieres eliminar este gasto?")) return;
    const { error } = await supabase.from('planner_budget_items').delete().eq('id', itemId);
    if (error) toast({ title: "Error al eliminar gasto", variant: "destructive" });
    else { toast({ title: "Gasto eliminado" }); fetchData(); }
  };

  const handleAddPayment = async (paymentData) => {
    const { error } = await supabase.from('planner_payments').insert(paymentData);
    if (error) toast({ title: "Error al añadir pago", variant: "destructive" });
    else { toast({ title: "Pago añadido" }); fetchData(); }
  };

  const handleDeletePayment = async (paymentId) => {
    const { error } = await supabase.from('planner_payments').delete().eq('id', paymentId);
    if (error) toast({ title: "Error al eliminar pago", variant: "destructive" });
    else { toast({ title: "Pago eliminado" }); fetchData(); }
  };

  const totalEstimated = budgetItems.reduce((sum, item) => sum + Number(item.estimated_cost || 0), 0);
  const totalActual = budgetItems.reduce((sum, item) => sum + Number(item.actual_cost || item.estimated_cost || 0), 0);
  const totalPaid = Object.values(payments).flat().reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const difference = totalEstimated - totalActual;

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <Button variant="ghost" onClick={() => navigate(-1)} className="text-white hover:bg-white/10 mr-4"><ArrowLeft /></Button>
              <div><h1 className="text-2xl font-bold text-white">Presupuesto y Pagos</h1></div>
            </div>
            <Button onClick={() => handleOpenFormModal()} className="bg-green-600 hover:bg-green-700"><Plus className="w-4 h-4 mr-2" />Nuevo Gasto</Button>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/10 p-6 rounded-2xl border border-white/20"><h3 className="text-gray-300 text-sm">Total Estimado</h3><p className="text-3xl font-bold text-white">${totalEstimated.toLocaleString()}</p></div>
            <div className="bg-white/10 p-6 rounded-2xl border border-white/20"><h3 className="text-gray-300 text-sm">Total Pagado</h3><p className="text-3xl font-bold text-white">${totalPaid.toLocaleString()}</p></div>
            <div className={`p-6 rounded-2xl border ${difference >= 0 ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
              <h3 className={`text-sm ${difference >= 0 ? 'text-green-300' : 'text-red-300'}`}>Diferencia (Est vs Real)</h3>
              <p className="text-3xl font-bold text-white flex items-center">${Math.abs(difference).toLocaleString()} {difference >= 0 ? <TrendingUp className="w-6 h-6 ml-2 text-green-400"/> : <TrendingDown className="w-6 h-6 ml-2 text-red-400"/>}</p>
            </div>
          </div>

          {loading ? <div className="text-center text-white">Cargando presupuesto...</div> :
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[980px]">
                  <thead>
                    <tr className="border-b border-white/20 text-sm text-gray-300">
                      <th className="p-3">Gasto</th>
                      <th className="p-3">Proveedor</th>
                      <th className="p-3">Estimado</th>
                      <th className="p-3">Real</th>
                      <th className="p-3">Pagado</th>
                      <th className="p-3">Pendiente</th>
                      <th className="p-3">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {budgetItems.map(item => {
                      const itemPayments = payments[item.id] || [];
                      const paidAmount = itemPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
                      const cost = Number(item.actual_cost || item.estimated_cost || 0);
                      const pendingAmount = cost - paidAmount;
                      return (
                        <tr key={item.id} className="border-b border-white/10 hover:bg-white/5">
                          <td className="p-3">
                            <p className="font-medium">{item.name}</p>
                            <p className="text-xs text-gray-400">{item.category}</p>
                          </td>
                          <td className="p-3 text-sm text-blue-300">{item.planner_providers?.name || 'N/A'}</td>
                          <td className="p-3 text-gray-300">${Number(item.estimated_cost || 0).toLocaleString()}</td>
                          <td className="p-3">${Number(item.actual_cost || 0).toLocaleString()}</td>
                          <td className="p-3 text-green-300">${paidAmount.toLocaleString()}</td>
                          <td className={`p-3 ${pendingAmount > 0 ? 'text-orange-300' : 'text-gray-300'}`}>${pendingAmount.toLocaleString()}</td>
                          <td className="p-3">
                            <div className="flex gap-1">
                              <Button onClick={() => handleOpenPaymentsModal(item)} size="icon" variant="ghost" className="h-8 w-8 text-green-400"><CreditCard className="w-4 h-4" /></Button>
                              <Button onClick={() => handleOpenFormModal(item)} size="icon" variant="ghost" className="h-8 w-8 text-blue-400"><Edit className="w-4 h-4" /></Button>
                              <Button onClick={() => handleDeleteItem(item.id)} size="icon" variant="ghost" className="h-8 w-8 text-red-400"><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {budgetItems.length === 0 && <p className="text-center text-gray-400 py-8">No hay gastos registrados.</p>}
              </div>
            </div>
          }
        </motion.div>
      </div>

      <Dialog open={isFormModalOpen} onOpenChange={setIsFormModalOpen}>
        <DialogContent className="bg-slate-800/90 backdrop-blur-sm border-green-500 text-white">
          <DialogHeader><DialogTitle className="text-2xl">{currentItem ? 'Editar Gasto' : 'Crear Gasto'}</DialogTitle></DialogHeader>
          <BudgetForm
            formData={formData}
            setFormData={setFormData}
            handleSave={handleSaveItem}
            closeModal={() => setIsFormModalOpen(false)}
            providers={providers}
            teamMembers={teamMembers}
            scheduleRows={scheduleRows}
            setScheduleRows={setScheduleRows}
          />
        </DialogContent>
      </Dialog>
      {currentItem && <Dialog open={isPaymentsModalOpen} onOpenChange={setIsPaymentsModalOpen}>
        <DialogContent className="bg-slate-800/90 backdrop-blur-sm border-green-500 text-white">
          <DialogHeader><DialogTitle className="text-2xl">Pagos para: {currentItem.name}</DialogTitle></DialogHeader>
          <PaymentsModal budgetItem={currentItem} payments={payments[currentItem.id] || []} onAddPayment={handleAddPayment} onDeletePayment={handleDeletePayment} closeModal={() => setIsPaymentsModalOpen(false)} />
        </DialogContent>
      </Dialog>}
    </div>
  );
};

export default PlannerBudget;
