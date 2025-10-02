import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'react-router-dom';
import { Search, User, Table, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const FindTablePage = () => {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const fetchEventData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select('id, title, cover_image_url, invitation_details')
      .eq('id', eventId)
      .single();

    if (error || !data) {
      toast({ title: "Evento no encontrado", variant: "destructive" });
    } else {
      setEvent(data);
    }
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    fetchEventData();
  }, [fetchEventData]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      toast({ title: "Nombre y apellido requeridos", variant: "destructive" });
      return;
    }
    setSearching(true);
    setSearched(true);
    setSearchResult(null);

    const { data: guests, error: guestError } = await supabase
      .from('guests')
      .select('id, first_name, last_name')
      .eq('event_id', eventId)
      .ilike('first_name', `%${firstName.trim()}%`)
      .ilike('last_name', `%${lastName.trim()}%`);

    if (guestError || !guests || guests.length === 0) {
      setSearching(false);
      return;
    }

    const bestMatch = guests[0];

    const { data: assignment, error: assignmentError } = await supabase
      .from('table_assignments')
      .select('table_id')
      .eq('guest_id', bestMatch.id)
      .single();

    if (assignmentError || !assignment) {
      setSearchResult({ guest: bestMatch, table: null });
      setSearching(false);
      return;
    }

    const { data: table, error: tableError } = await supabase
      .from('event_tables')
      .select('name')
      .eq('id', assignment.table_id)
      .single();

    if (tableError) {
      setSearching(false);
      return;
    }

    setSearchResult({ guest: bestMatch, table: table });
    setSearching(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  const hosts = event?.invitation_details?.hosts?.join(' y ');

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {event && (
          <div className="mb-6 text-center">
            <div className="aspect-video bg-gradient-to-br from-purple-600/30 to-blue-600/30 rounded-2xl border border-white/20 overflow-hidden mb-4">
              {event.cover_image_url ? (
                <img src={event.cover_image_url} alt={event.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><Camera className="w-16 h-16 text-white/50" /></div>
              )}
            </div>
            <h2 className="text-2xl font-bold text-white">{event.title}</h2>
            {hosts && <p className="text-lg text-purple-300">{hosts}</p>}
          </div>
        )}

        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8 shadow-2xl text-center">
          <Table className="w-16 h-16 mx-auto mb-4 text-pink-300" />
          <h1 className="text-3xl font-bold text-white mb-2">Encuentra tu Mesa</h1>
          <p className="text-gray-300 mb-6">Ingresa tu nombre y apellido para ver la mesa que te fue asignada.</p>
          
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2 text-left">Nombre(s)</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Tu nombre" required className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2 text-left">Apellido(s)</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Tu apellido" required className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500" />
              </div>
            </div>
            <Button type="submit" disabled={searching} className="w-full bg-pink-600 hover:bg-pink-700 text-white py-3 text-lg rounded-xl">
              {searching ? 'Buscando...' : <><Search className="w-5 h-5 mr-2" />Buscar</>}
            </Button>
          </form>
        </div>

        {searched && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
            {searching ? (
              <div className="text-center text-white">Cargando resultado...</div>
            ) : searchResult ? (
              <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8 text-center">
                <p className="text-lg text-gray-300">Hola, <span className="font-bold text-white">{searchResult.guest.first_name} {searchResult.guest.last_name}</span></p>
                {searchResult.table ? (
                  <>
                    <p className="text-xl text-white mt-2">Tu mesa es:</p>
                    <p className="text-6xl font-bold text-pink-400 my-4">{searchResult.table.name}</p>
                  </>
                ) : (
                  <p className="text-xl text-yellow-400 mt-4">Aún no tienes una mesa asignada. Por favor, consulta con el anfitrión.</p>
                )}
              </div>
            ) : (
              <div className="bg-red-900/50 border border-red-700 rounded-2xl p-6 text-center">
                <p className="text-red-300">No se encontró ningún invitado con ese nombre. Por favor, verifica que esté bien escrito.</p>
              </div>
            )}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default FindTablePage;