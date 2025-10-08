// src/pages/ProfileContactsPage.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Users, Search } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import LoadingSpinner from '@/components/LoadingSpinner';
import ProfileTabsNav from '@/components/profile/ProfileTabsNav';
import ProfileHeaderBar from '@/components/profile/ProfileHeaderBar';

const ProfileContactsPage = () => {
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
        .select('full_name, avatar_url')
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* === Barra superior: identidad izquierda / acciones derecha === */}
          <ProfileHeaderBar
            profile={profile}
            greeting="Gestiona tus proveedores y contactos."
            onEdit={() => navigate('/profile/edit')}
            onChat={() => console.log('Abrir chat')}
          />

          {/* === Barra de navegación sticky === */}
          <ProfileTabsNav />
          <div className="mt-6" />   {/* 24px aprox */}

          {/* === Contenido: Proveedores y contactos === */}
          <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
            <h1 className="text-3xl md:text-4xl font-bold text-[#1E1E1E] flex items-center gap-2">
              <Users className="w-6 h-6 text-[#B9A7F9]" /> Proveedores y contactos
            </h1>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="search"
                placeholder="Buscar proveedores o contactos..."
                className="w-full p-2 pl-9 rounded-lg border border-gray-300 bg-white text-sm text-[#1E1E1E] focus:ring-2 focus:ring-[#9E7977]"
              />
            </div>
          </div>

          <div className="text-center py-16 px-6 bg-white rounded-2xl border border-dashed border-[#DCD9D6]">
            <p className="text-[#5E5E5E]">
              Aquí administrarás tus proveedores y contactos del evento. (Pendiente de implementación)
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ProfileContactsPage;
