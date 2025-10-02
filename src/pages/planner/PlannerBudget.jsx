import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Edit, DollarSign, TrendingUp, TrendingDown, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const BudgetForm = ({ formData, setFormData, handleSave, closeModal, providers }) => (
  <form onSubmit={handleSave} className="space-y-4 py-4">
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">Categoría</label>
        <input type="text" placeholder="Ej: Decoración" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} required className="w-full p-3 rounded bg-white/10 border border-white/20" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">Nombre del Gasto</label>
        <input type="text" placeholder="Ej: Flores" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required className="w-full p-3 rounded bg-white/10 border border-white/20" />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">Costo Estimado</label>
        <input type="number" placeholder="1000" value={formData.estimated_cost} onChange={(e) => setFormData({...formData, estimated_cost: e.target.value})} required className="w-full p-3 rounded bg-white/10 border border-white/20" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">Costo Real</label>
        <input type="number" placeholder="950" value={formData.actual_cost} onChange={(e) => setFormData({...formData, actual_cost: e.target.value})} className="w-full p-3 rounded bg-white/10 border border-white/20" />
      </div>
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-200 mb-2">Proveedor</label>
      <select value={formData.provider_id || ''} onChange={(e) => setFormData({...formData, provider_id: e.target.value || null})} className="w-full p-3 rounded bg-white/10 border border-white/20">
        <option value="">Sin proveedor</option>
        {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
    </div>
    <DialogFooter>
      <Button type="button" variant="ghost" onClick={closeModal}>Cancelar</Button>
      <Button type="submit" className="bg-green-600 hover:bg-green-700">Guardar Gasto</Button>
    </DialogFooter>
  </form>
);

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
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isPaymentsModalOpen, setIsPaymentsModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [formData, setFormData] = useState({ category: '', name: '', estimated_cost: '', actual_cost: '', provider_id: null });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: budgetData, error: budgetError } = await supabase.from('planner_budget_items').select('*, planner_providers(name)').eq('event_id', eventId).order('created_at', { ascending: false });
      if (budgetError) throw budgetError;
      setBudgetItems(budgetData);

      const budgetItemIds = budgetData.map(item => item.id);
      if (budgetItemIds.length > 0) {
        const { data: paymentsData, error: paymentsError } = await supabase.from('planner_payments').select('*').in('budget_item_id', budgetItemIds);
        if (paymentsError) throw paymentsError;
        const paymentsByItem = paymentsData.reduce((acc, p) => {
          if (!acc[p.budget_item_id]) acc[p.budget_item_id] = [];
          acc[p.budget_item_id].push(p);
          return acc;
        }, {});
        setPayments(paymentsByItem);
      }

      const { data: providersData, error: providersError } = await supabase.from('event_providers').select('planner_providers(*)').eq('event_id', eventId);
      if (providersError) throw providersError;
      setProviders(providersData.map(p => p.planner_providers));

    } catch (error) {
      toast({ title: "Error al cargar datos", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleOpenFormModal = (item = null) => {
    setCurrentItem(item);
    setFormData(item ? { category: item.category, name: item.name, estimated_cost: item.estimated_cost, actual_cost: item.actual_cost || '', provider_id: item.provider_id } : { category: '', name: '', estimated_cost: '', actual_cost: '', provider_id: null });
    setIsFormModalOpen(true);
  };

  const handleOpenPaymentsModal = (item) => {
    setCurrentItem(item);
    setIsPaymentsModalOpen(true);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    const { error } = await (currentItem
      ? supabase.from('planner_budget_items').update({ ...formData, event_id: eventId }).eq('id', currentItem.id)
      : supabase.from('planner_budget_items').insert({ ...formData, event_id: eventId })
    );
    if (error) toast({ title: "Error al guardar gasto", variant: "destructive" });
    else { toast({ title: `Gasto ${currentItem ? 'actualizado' : 'creado'}` }); setIsFormModalOpen(false); fetchData(); }
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

  const totalEstimated = budgetItems.reduce((sum, item) => sum + Number(item.estimated_cost), 0);
  const totalActual = budgetItems.reduce((sum, item) => sum + Number(item.actual_cost || item.estimated_cost), 0);
  const totalPaid = Object.values(payments).flat().reduce((sum, p) => sum + Number(p.amount), 0);
  const difference = totalEstimated - totalActual;

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <Button variant="ghost" onClick={() => navigate(`/host/${eventId}/planner`)} className="text-white hover:bg-white/10 mr-4"><ArrowLeft /></Button>
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
                <table className="w-full text-left min-w-[800px]">
                  <thead><tr className="border-b border-white/20"><th className="p-3">Gasto</th><th className="p-3">Proveedor</th><th className="p-3">Estimado</th><th className="p-3">Real</th><th className="p-3">Pagado</th><th className="p-3">Pendiente</th><th className="p-3">Acciones</th></tr></thead>
                  <tbody>
                    {budgetItems.map(item => {
                      const itemPayments = payments[item.id] || [];
                      const paidAmount = itemPayments.reduce((sum, p) => sum + Number(p.amount), 0);
                      const cost = Number(item.actual_cost || item.estimated_cost);
                      const pendingAmount = cost - paidAmount;
                      return (
                        <tr key={item.id} className="border-b border-white/10 hover:bg-white/5">
                          <td className="p-3"><p className="font-medium">{item.name}</p><p className="text-xs text-gray-400">{item.category}</p></td>
                          <td className="p-3 text-sm text-blue-300">{item.planner_providers?.name || 'N/A'}</td>
                          <td className="p-3 text-gray-300">${Number(item.estimated_cost).toLocaleString()}</td>
                          <td className="p-3">${Number(item.actual_cost || 0).toLocaleString()}</td>
                          <td className="p-3 text-green-300">${paidAmount.toLocaleString()}</td>
                          <td className={`p-3 ${pendingAmount > 0 ? 'text-orange-300' : 'text-gray-300'}`}>${pendingAmount.toLocaleString()}</td>
                          <td className="p-3"><div className="flex gap-1">
                            <Button onClick={() => handleOpenPaymentsModal(item)} size="icon" variant="ghost" className="h-8 w-8 text-green-400"><CreditCard className="w-4 h-4" /></Button>
                            <Button onClick={() => handleOpenFormModal(item)} size="icon" variant="ghost" className="h-8 w-8 text-blue-400"><Edit className="w-4 h-4" /></Button>
                            <Button onClick={() => handleDeleteItem(item.id)} size="icon" variant="ghost" className="h-8 w-8 text-red-400"><Trash2 className="w-4 h-4" /></Button>
                          </div></td>
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
          <BudgetForm formData={formData} setFormData={setFormData} handleSave={handleSaveItem} closeModal={() => setIsFormModalOpen(false)} providers={providers} />
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