import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Video, Send, Heart, User, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const GuestBook = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [guestName, setGuestName] = useState('');
  const [activeTab, setActiveTab] = useState('text');
  const [textMessage, setTextMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchGuestbookData = useCallback(async () => {
    setLoading(true);
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('title')
      .eq('id', eventId)
      .single();

    if (eventError || !eventData) {
      toast({
        title: "Evento no encontrado",
        description: "El evento que buscas no existe.",
        variant: "destructive"
      });
      navigate('/');
      return;
    }
    setEvent(eventData);

    const { data: messagesData, error: messagesError } = await supabase
      .from('guestbook_messages')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
    } else {
      setMessages(messagesData);
    }
    setLoading(false);
  }, [eventId, navigate]);

  useEffect(() => {
    const storedGuestName = sessionStorage.getItem('guestName');
    if (!storedGuestName) {
      navigate(`/event/${eventId}`);
      return;
    }
    setGuestName(storedGuestName);
    fetchGuestbookData();
  }, [eventId, navigate, fetchGuestbookData]);

  const handleSubmitMessage = async () => {
    if (!textMessage.trim()) {
      toast({
        title: "Mensaje vacío",
        description: "Por favor escribe un mensaje antes de enviar",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);

    try {
      const message = {
        event_id: eventId,
        guest_name: guestName,
        type: 'text',
        content: textMessage.trim(),
      };

      const { data, error } = await supabase
        .from('guestbook_messages')
        .insert(message)
        .select()
        .single();

      if (error) throw error;

      setMessages(prev => [data, ...prev]);
      setTextMessage('');

      toast({
        title: "¡Mensaje enviado!",
        description: "Tu mensaje se ha agregado al libro de visitas"
      });

    } catch (error) {
      toast({
        title: "Error al enviar mensaje",
        description: error.message || "Hubo un problema. Inténtalo de nuevo.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleVideoMessage = () => {
    toast({
      title: "🚧 Esta función no está implementada aún",
      description: "¡Pero no te preocupes! Puedes solicitarla en tu próximo prompt! 🚀"
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p>Cargando libro de visitas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate(`/event/${eventId}`)}
              className="text-white hover:bg-white/10 mr-4"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">Libro de Visitas</h1>
              <p className="text-gray-300">Deja un mensaje especial para {event.title}</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
                <Heart className="w-5 h-5 mr-2 text-pink-300" />
                Deja tu mensaje, {guestName}
              </h2>

              <div className="flex bg-white/10 rounded-xl p-1 mb-6">
                <button
                  onClick={() => setActiveTab('text')}
                  className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-300 flex items-center justify-center ${
                    activeTab === 'text'
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Mensaje de Texto
                </button>
                <button
                  onClick={() => setActiveTab('video')}
                  className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-300 flex items-center justify-center ${
                    activeTab === 'video'
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Video className="w-4 h-4 mr-2" />
                  Video Mensaje
                </button>
              </div>

              {activeTab === 'text' && (
                <div className="space-y-4">
                  <textarea
                    value={textMessage}
                    onChange={(e) => setTextMessage(e.target.value)}
                    placeholder="Escribe un mensaje hermoso para los anfitriones..."
                    rows={6}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  />
                  
                  <Button
                    onClick={handleSubmitMessage}
                    disabled={!textMessage.trim() || submitting}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Enviar Mensaje
                      </>
                    )}
                  </Button>
                </div>
              )}

              {activeTab === 'video' && (
                <div className="text-center py-8">
                  <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-2xl p-8 border border-blue-500/30">
                    <Video className="w-16 h-16 text-blue-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Graba un Video Mensaje
                    </h3>
                    <p className="text-gray-300 mb-6">
                      Comparte tus mejores deseos en un video personal
                    </p>
                    <Button
                      onClick={handleVideoMessage}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-xl"
                    >
                      <Video className="w-4 h-4 mr-2" />
                      Iniciar Grabación
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
                <MessageSquare className="w-5 h-5 mr-2 text-blue-300" />
                Mensajes de los Invitados ({messages.length})
              </h2>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <Heart className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-300">
                      Aún no hay mensajes. ¡Sé el primero en dejar uno!
                    </p>
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center text-sm text-gray-300">
                          <User className="w-4 h-4 mr-2" />
                          <span className="font-medium text-white">{message.guest_name}</span>
                        </div>
                        <div className="flex items-center text-xs text-gray-400">
                          <Calendar className="w-3 h-3 mr-1" />
                          <span>{new Date(message.created_at).toLocaleDateString('es-ES')}</span>
                        </div>
                      </div>
                      
                      <p className="text-gray-200 leading-relaxed">
                        {message.content}
                      </p>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default GuestBook;