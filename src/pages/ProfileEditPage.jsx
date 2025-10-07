// src/pages/ProfileEditPage.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { User as UserIcon, Save, Mail, Phone, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import LoadingSpinner from '@/components/LoadingSpinner';
import ProfileTabsNav from '@/components/profile/ProfileTabsNav';
import ProfileHeaderBar from '@/components/profile/ProfileHeaderBar';

const ProfileEditPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('full_name, email, avatar_url, phone')
        .eq('id', user.id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      setProfile(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-white py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          {/* === Barra superior: identidad izquierda / acciones derecha === */}
          <ProfileHeaderBar
            profile={profile}
            greeting="Edita tu perfil."
            onEdit={() => navigate('/profile/edit')}
            onChat={() => console.log('Abrir chat')}
          />

          {/* === Barra de navegación sticky === */}
          <ProfileTabsNav />

          {/* === Contenido: Editar Perfil (placeholder, sin lógica de guardado) === */}
          <div className="bg-white rounded-2xl border border-[#F8F3F2] p-6">
            <h1 className="text-3xl md:text-4xl font-bold text-[#1E1E1E] mb-6">Editar perfil</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-[#5E5E5E] mb-1" htmlFor="full_name">Nombre completo</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="full_name"
                    type="text"
                    defaultValue={profile?.full_name || ''}
                    className="w-full h-11 pl-10 pr-3 rounded-xl border border-gray-300 bg-white placeholder-slate-400 text-[#1E1E1E] focus:outline-none focus:ring-2 focus:ring-[#9E7977]"
                    placeholder="Tu nombre"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#5E5E5E] mb-1" htmlFor="email">Correo electrónico</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="email"
                    type="email"
                    value={profile?.email || ''}
                    readOnly
                    className="w-full h-11 pl-10 pr-3 rounded-xl border border-gray-300 bg-gray-50 placeholder-slate-400 text-[#1E1E1E] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#5E5E5E] mb-1" htmlFor="phone">Teléfono</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="phone"
                    type="tel"
                    defaultValue={profile?.phone || ''}
                    className="w-full h-11 pl-10 pr-3 rounded-xl border border-gray-300 bg-white placeholder-slate-400 text-[#1E1E1E] focus:outline-none focus:ring-2 focus:ring-[#9E7977]"
                    placeholder="Número de contacto"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#5E5E5E] mb-1" htmlFor="avatar">Avatar URL</label>
                <div className="relative">
                  <ImageIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="avatar"
                    type="url"
                    defaultValue={profile?.avatar_url || ''}
                    className="w-full h-11 pl-10 pr-3 rounded-xl border border-gray-300 bg-white placeholder-slate-400 text-[#1E1E1E] focus:outline-none focus:ring-2 focus:ring-[#9E7977]"
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button disabled className="h-11 px-4 rounded-xl bg-[#B9A7F9] text-white hover:bg-[#A793F2] disabled:opacity-60">
                <Save className="w-5 h-5 mr-2" /> Guardar cambios
              </Button>
            </div>
            <p className="text-xs text-[#8C8C8C] mt-2">(Acción de guardado pendiente de implementación)</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ProfileEditPage;
