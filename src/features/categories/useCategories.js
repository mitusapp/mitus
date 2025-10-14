// FILE: src/features/categories/useCategories.js
import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

export function useCategories() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]); // globales + propias

  const fetchAll = useCallback(async () => {
    // PATCH B: evitar loading infinito cuando no hay usuario
    if (!user) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('app_categories')
      .select('*')
      .or(`user_id.is.null,user_id.eq.${user.id}`)
      .order('parent_id', { ascending: true })
      .order('name', { ascending: true });
    if (!error) setItems(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const parents = useMemo(() => items.filter(c => !c.parent_id), [items]);
  const childrenByParentId = useMemo(() => {
    const map = {};
    for (const c of items) {
      if (!c.parent_id) continue;
      if (!map[c.parent_id]) map[c.parent_id] = [];
      map[c.parent_id].push(c);
    }
    return map;
  }, [items]);

  const byId = useMemo(() => Object.fromEntries(items.map(c => [c.id, c])), [items]);

  const ensure = useCallback(async (name, parentId = null) => {
    if (!user) throw new Error('No user');
    // PATCH A: evitar duplicados global/usuario (comparar por nombre + padre, sin filtrar por user_id)
    const exists = items.find(c =>
      (c.parent_id || null) === (parentId || null) &&
      c.name.toLowerCase().trim() === String(name).toLowerCase().trim()
    );
    if (exists) return exists;

    const slug = String(name).trim()
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const { data, error } = await supabase
      .from('app_categories')
      .insert([{ name: String(name).trim(), slug, parent_id: parentId, user_id: user.id }])
      .select('*').single();
    if (error) throw error;
    await fetchAll();
    return data;
  }, [items, user, fetchAll]);

  const remove = useCallback(async (id) => {
    if (!user) throw new Error('No user');
    const cat = items.find(c => c.id === id);
    if (!cat) return;
    if (!cat.user_id || cat.user_id !== user.id) {
      throw new Error('Solo puedes eliminar tus categorías (no las globales).');
    }
    const { error } = await supabase
      .from('app_categories')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) throw error;
    await fetchAll();
  }, [items, user, fetchAll]);

  return { loading, items, parents, childrenByParentId, byId, refresh: fetchAll, ensure, remove };
}
