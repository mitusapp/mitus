import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Camera, MessageSquare, BarChart3, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const AnalyticsPage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [analytics, setAnalytics] = useState({
    rsvps: 0,
    uploads: 0,
    messages: 0,
    songs: 0,
    topContributors: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchAnalyticsData = useCallback(async () => {
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

    const { count: rsvps } = await supabase.from('rsvps').select('*', { count: 'exact', head: true }).eq('invitation_id', eventId);
    const { data: uploads, count: uploadsCount } = await supabase.from('uploads').select('guest_name', { count: 'exact' }).eq('event_id', eventId);
    const { count: messages } = await supabase.from('guestbook_messages').select('*', { count: 'exact', head: true }).eq('event_id', eventId);
    const { count: songs } = await supabase.from('song_suggestions').select('*', { count: 'exact', head: true }).eq('invitation_id', eventId);

    const contributorCounts = uploads.reduce((acc, { guest_name }) => {
      acc[guest_name] = (acc[guest_name] || 0) + 1;
      return acc;
    }, {});

    const topContributors = Object.entries(contributorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    setAnalytics({
      rsvps: rsvps || 0,
      uploads: uploadsCount || 0,
      messages: messages || 0,
      songs: songs || 0,
      topContributors,
    });

    setLoading(false);
  }, [eventId, navigate]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p>Cargando analíticas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="flex items-center mb-8">
            <Button variant="ghost" onClick={() => navigate(`/host/${eventId}`)} className="text-white hover:bg-white/10 mr-4">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">Analíticas del Evento</h1>
              <p className="text-gray-300">{event.title}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard icon={<Users />} title="RSVPs" value={analytics.rsvps} color="purple" />
            <StatCard icon={<Camera />} title="Fotos/Videos" value={analytics.uploads} color="blue" />
            <StatCard icon={<MessageSquare />} title="Mensajes" value={analytics.messages} color="green" />
            <StatCard icon={<Music />} title="Canciones" value={analytics.songs} color="pink" />
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-orange-300" />
              Top Colaboradores
            </h2>
            {analytics.topContributors.length > 0 ? (
              <ul className="space-y-3">
                {analytics.topContributors.map((contributor, index) => (
                  <li key={index} className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
                    <span className="font-medium text-white">{contributor.name}</span>
                    <span className="bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded-full">{contributor.count} subidas</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-400">Aún no hay colaboradores.</p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, title, value, color }) => {
  const colors = {
    purple: 'from-purple-600/20 to-purple-800/20 border-purple-500/30 text-purple-300',
    blue: 'from-blue-600/20 to-blue-800/20 border-blue-500/30 text-blue-300',
    green: 'from-green-600/20 to-green-800/20 border-green-500/30 text-green-300',
    pink: 'from-pink-600/20 to-pink-800/20 border-pink-500/30 text-pink-300',
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} backdrop-blur-sm rounded-2xl p-6 border`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm text-${color}-200`}>{title}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
        </div>
        {React.cloneElement(icon, { className: `w-8 h-8 text-${color}-300` })}
      </div>
    </div>
  );
};

export default AnalyticsPage;
