import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, CheckCircle, XCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const RsvpPage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [rsvps, setRsvps] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRsvpData = useCallback(async () => {
    setLoading(true);

    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('id, title')
      .eq('id', eventId)
      .single();

    if (eventError || !eventData) {
      toast({ title: "Error", description: "No se pudo cargar el evento o no tienes permiso.", variant: "destructive" });
      navigate('/');
      return;
    }
    setEvent(eventData);

    const { data: rsvpData, error: rsvpError } = await supabase
      .from('rsvps')
      .select('*')
      .eq('invitation_id', eventId)
      .order('created_at', { ascending: false });

    if (rsvpError) {
      console.error('Error fetching RSVPs:', rsvpError);
    } else {
      setRsvps(rsvpData);
    }
    setLoading(false);
  }, [eventId, navigate]);

  useEffect(() => {
    fetchRsvpData();
  }, [fetchRsvpData]);

  const downloadCsv = () => {
    let csvContent = "data:text/csv;charset=utf-8,Nombre,Asiste,Acompañantes,Mensaje,Email,Teléfono,Fecha\n";
    rsvps.forEach(rsvp => {
      const row = [
        `"${rsvp.name}"`,
        `"${rsvp.attending === 'yes' ? 'Sí' : 'No'}"`,
        rsvp.party_size || 0,
        `"${rsvp.message ? rsvp.message.replace(/"/g, '""') : ''}"`,
        `"${rsvp.email || ''}"`,
        `"${rsvp.phone || ''}"`,
        `"${new Date(rsvp.created_at).toLocaleString()}"`
      ].join(",");
      csvContent += row + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `rsvps-${eventId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Descargando CSV", description: "La descarga de los RSVPs ha comenzado." });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p>Cargando RSVPs...</p>
        </div>
      </div>
    );
  }

  const attendingCount = rsvps.filter(r => r.attending === 'yes').reduce((sum, r) => sum + (r.party_size || 1), 0);
  const notAttendingCount = rsvps.filter(r => r.attending === 'no').length;

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <Button variant="ghost" onClick={() => navigate(`/host/${eventId}`)} className="text-white hover:bg-white/10 mr-4">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-white">Gestión de RSVP</h1>
                <p className="text-gray-300">{event.title}</p>
              </div>
            </div>
            <Button onClick={downloadCsv} className="bg-green-600 hover:bg-green-700 text-white">
              <Download className="w-4 h-4 mr-2" />
              Descargar CSV
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/10 p-6 rounded-2xl border border-white/20">
              <h3 className="text-gray-300 text-sm">Total Respuestas</h3>
              <p className="text-3xl font-bold text-white">{rsvps.length}</p>
            </div>
            <div className="bg-green-500/10 p-6 rounded-2xl border border-green-500/30">
              <h3 className="text-green-300 text-sm">Asistirán</h3>
              <p className="text-3xl font-bold text-white">{attendingCount}</p>
            </div>
            <div className="bg-red-500/10 p-6 rounded-2xl border border-red-500/30">
              <h3 className="text-red-300 text-sm">No Asistirán</h3>
              <p className="text-3xl font-bold text-white">{notAttendingCount}</p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-4">Lista de Invitados</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="p-3">Nombre</th>
                    <th className="p-3">Asistencia</th>
                    <th className="p-3">Acompañantes</th>
                    <th className="p-3">Mensaje</th>
                  </tr>
                </thead>
                <tbody>
                  {rsvps.map(rsvp => (
                    <tr key={rsvp.id} className="border-b border-white/10 hover:bg-white/5">
                      <td className="p-3 font-medium">{rsvp.name}</td>
                      <td className="p-3">
                        {rsvp.attending === 'yes' ? (
                          <span className="flex items-center text-green-400"><CheckCircle className="w-4 h-4 mr-2" /> Sí</span>
                        ) : (
                          <span className="flex items-center text-red-400"><XCircle className="w-4 h-4 mr-2" /> No</span>
                        )}
                      </td>
                      <td className="p-3">{rsvp.attending === 'yes' ? rsvp.party_size : 'N/A'}</td>
                      <td className="p-3 text-gray-300 max-w-xs truncate">{rsvp.message || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rsvps.length === 0 && <p className="text-center text-gray-400 py-8">Aún no hay respuestas de RSVP.</p>}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default RsvpPage;
